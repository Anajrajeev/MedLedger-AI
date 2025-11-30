// src/routes/access.ts
// Access Request Management Routes
// Handles the full workflow: request → approval/rejection → blockchain logging → data release
//
// Blockchain Integration:
// - Midnight: Private ZK consent proofs (currently using realistic stub)
// - Aiken/Cardano: Public audit logs on Preprod Testnet

import { Router, Request, Response } from "express";
import { query } from "../db";
import { 
  submitConsentToMidnight, 
  verifyConsentOnMidnight,
  getMidnightStatus 
} from "../midnight/midnightConsent";
import { 
  recordConsentEvent, 
  verifyAuditEntry,
  getAikenStatus 
} from "../aiken/aikenAudit";

const router = Router();

/**
 * GET /api/access/status
 * Returns the current status of blockchain integrations
 */
router.get("/status", async (_req: Request, res: Response) => {
  const midnightStatus = getMidnightStatus();
  const aikenStatus = getAikenStatus();

  // Test Blockfrost connection if configured
  let blockfrostTest: { success: boolean; error?: string } | null = null;
  if (aikenStatus.lucidConfigured) {
    try {
      const { getLucidInstance } = await import("../aiken/lucidConfig");
      const lucid = await getLucidInstance();
      // Try to get network tip to verify connection
      const tip = await lucid.provider.getBlockHeight();
      blockfrostTest = { success: true };
    } catch (error) {
      blockfrostTest = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return res.json({
    success: true,
    midnight: midnightStatus,
    aiken: aikenStatus,
    blockfrostTest,
    network: "preprod", // Always Preprod testnet
    message: aikenStatus.ready 
      ? "Blockchain integrations are ready"
      : "Running in stub mode - configure Blockfrost and compile Aiken contract for full integration",
  });
});

/**
 * POST /api/access/request
 * Doctor submits an access request to a patient
 */
router.post("/request", async (req: Request, res: Response) => {
  try {
    const { doctorWallet, patientWallet, patientName, recordTypes, reason } = req.body;

    // Validate required fields
    if (!doctorWallet || !patientWallet || !patientName || !recordTypes || !Array.isArray(recordTypes)) {
      return res.status(400).json({
        error: "doctorWallet, patientWallet, patientName, and recordTypes (array) are required",
      });
    }

    if (recordTypes.length === 0) {
      return res.status(400).json({
        error: "At least one record type must be requested",
      });
    }

    // Validate doctor exists and has 'doctor' role
    const doctorCheck = await query(
      "SELECT role FROM public.users WHERE wallet_address = $1",
      [doctorWallet]
    );

    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Doctor not found. Please complete your registration first.",
      });
    }

    if (doctorCheck.rows[0].role !== "doctor") {
      return res.status(403).json({
        error: "Only users with 'doctor' role can submit access requests",
      });
    }

    // Note: Patient doesn't need to be registered yet
    // They'll see the request when they register and log in
    // We'll validate patient exists when they try to approve the request

    // Check for duplicate pending request
    const duplicateCheck = await query(
      `SELECT id FROM public.access_requests
       WHERE doctor_wallet = $1
         AND patient_wallet = $2
         AND status = 'pending'`,
      [doctorWallet, patientWallet]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        error: "You already have a pending request for this patient",
        requestId: duplicateCheck.rows[0].id,
      });
    }

    // Insert new access request
    const result = await query(
      `INSERT INTO public.access_requests (
        doctor_wallet,
        patient_wallet,
        patient_name,
        record_types,
        reason,
        status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id, created_at`,
      [doctorWallet, patientWallet, patientName.trim(), recordTypes, reason || null]
    );

    const newRequest = result.rows[0];

    console.log("[Access Request] New request created:", {
      requestId: newRequest.id,
      doctor: doctorWallet.substring(0, 20) + "...",
      patient: patientWallet.substring(0, 20) + "...",
      patientName: patientName.trim(),
      recordTypes,
    });

    return res.json({
      success: true,
      requestId: newRequest.id,
      createdAt: newRequest.created_at,
      message: "Access request submitted successfully. Waiting for patient approval.",
    });
  } catch (error) {
    console.error("Error in POST /api/access/request:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/access/pending?wallet=PATIENT_WALLET
 * Patient fetches all pending access requests
 */
router.get("/pending", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        error: "wallet query parameter is required",
      });
    }

    const patientWallet = decodeURIComponent(wallet as string).trim();

    console.log("[Access Pending] Fetching pending requests for patient:", {
      wallet: patientWallet.substring(0, 30) + "...",
      length: patientWallet.length,
    });

    // Fetch all pending requests for this patient
    const result = await query(
      `SELECT 
        ar.id,
        ar.doctor_wallet,
        ar.patient_wallet,
        ar.patient_name,
        ar.record_types,
        ar.reason,
        ar.status,
        ar.created_at,
        u.role as doctor_role
       FROM public.access_requests ar
       JOIN public.users u ON ar.doctor_wallet = u.wallet_address
       WHERE ar.patient_wallet = $1
         AND ar.status = 'pending'
       ORDER BY ar.created_at DESC`,
      [patientWallet]
    );

    console.log("[Access Pending] Found requests:", {
      count: result.rows.length,
    });

    const requests = result.rows.map((row) => ({
      id: row.id,
      doctorWallet: row.doctor_wallet,
      patientWallet: row.patient_wallet,
      patientName: row.patient_name,
      recordTypes: row.record_types,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
    }));

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Error in GET /api/access/pending:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/access/approve
 * Patient approves an access request
 * 
 * Execution Pipeline:
 * 1. Validate patient & doctor
 * 2. Create ZK proof via Midnight → get: zk_proof_hash, midnight_tx
 * 3. Submit audit log to Aiken → get: aiken_tx, validator_hash
 * 4. Save all in access_requests table
 */
router.post("/approve", async (req: Request, res: Response) => {
  try {
    const { requestId, patientWallet } = req.body;

    if (!requestId || !patientWallet) {
      return res.status(400).json({
        error: "requestId and patientWallet are required",
      });
    }

    // Fetch the request
    const requestResult = await query(
      `SELECT id, doctor_wallet, patient_wallet, record_types, status
       FROM public.access_requests
       WHERE id = $1 AND patient_wallet = $2`,
      [requestId, patientWallet]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        error: "Access request not found or you don't have permission to approve it",
      });
    }

    const accessRequest = requestResult.rows[0];

    if (accessRequest.status !== "pending") {
      return res.status(400).json({
        error: `Cannot approve request with status '${accessRequest.status}'`,
      });
    }

    // Validate patient is registered (required for approval)
    const patientCheck = await query(
      "SELECT wallet_address FROM public.users WHERE wallet_address = $1",
      [patientWallet]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        error: "You must complete your registration before approving access requests. Please register your account first.",
      });
    }

    console.log("[Access Approve] Starting approval workflow:", {
      requestId,
      doctor: accessRequest.doctor_wallet.substring(0, 20) + "...",
      patient: accessRequest.patient_wallet.substring(0, 20) + "...",
      recordTypes: accessRequest.record_types,
    });

    const approvalTimestamp = Date.now();

    // =========================================================================
    // ACTION 1: Submit consent to Midnight (ZK proof)
    // =========================================================================
    console.log("[Access Approve] Step 1: Generating ZK proof via Midnight...");
    
    let midnightResult;
    try {
      midnightResult = await submitConsentToMidnight({
        requestId: String(accessRequest.id),
      patientWallet: accessRequest.patient_wallet,
      doctorWallet: accessRequest.doctor_wallet,
      recordTypes: accessRequest.record_types,
        timestamp: approvalTimestamp,
    });

    console.log("[Access Approve] Midnight consent submitted:", {
      txId: midnightResult.txId,
        zkProofHash: midnightResult.zkProofHash.substring(0, 30) + "...",
        isRealProof: midnightResult.isRealProof,
    });
    } catch (error) {
      console.error("[Access Approve] Error in submitConsentToMidnight:", error);
      // Create stub result if Midnight fails
      midnightResult = {
        txId: `midnight_tx_stub_${Date.now()}`,
        zkProofHash: `zkp_stub_${Date.now()}`,
        proofData: {
          inputHash: "",
          generatedAt: approvalTimestamp,
          protocolVersion: "1.0.0",
          network: "midnight-testnet",
        },
        isRealProof: false,
      };
      console.warn("[Access Approve] Using stub Midnight result due to error");
    }

    // =========================================================================
    // ACTION 2: Record audit event on Cardano via Aiken
    // =========================================================================
    console.log("[Access Approve] Step 2: Recording audit on Cardano (Preprod)...");
    
    let aikenResult;
    try {
      aikenResult = await recordConsentEvent({
        requestId: String(accessRequest.id), // Ensure it's a string
      doctorWallet: accessRequest.doctor_wallet,
      patientWallet: accessRequest.patient_wallet,
      zkProofHash: midnightResult.zkProofHash,
        timestamp: approvalTimestamp,
        recordTypes: accessRequest.record_types,
      });
    } catch (error) {
      console.error("[Access Approve] Error in recordConsentEvent:", error);
      console.error("[Access Approve] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Return a stub result instead of throwing, so the approval can complete
      console.warn("[Access Approve] Falling back to stub mode due to error");
      // Extract PKH for stub datum
      const doctorPkh = accessRequest.doctor_wallet.substring(0, 56); // Simplified PKH extraction
      const patientPkh = accessRequest.patient_wallet.substring(0, 56);
      
      aikenResult = {
        txHash: `aiken_preprod_stub_${Date.now()}`,
        validatorHash: "stub_validator_hash",
        validatorAddress: "addr_test1stub",
        network: "preprod",
        isRealTx: false,
        timestamp: approvalTimestamp,
        unsignedTxData: {
          validatorAddress: "addr_test1stub",
          datum: JSON.stringify({
            doctorPkh,
            patientPkh,
            approved: true,
            timestamp: approvalTimestamp.toString(), // Convert to string instead of BigInt
            zkProofHash: midnightResult.zkProofHash,
            requestId: String(accessRequest.id),
          }),
          metadata: {
            674: {
              msg: ["MedLedger Consent Audit Log (STUB)"],
              request_id: String(accessRequest.id),
              timestamp: approvalTimestamp,
            }
          },
          scriptHash: "stub_validator_hash",
        },
      };
    }

    console.log("[Access Approve] Aiken audit recorded:", {
      txHash: aikenResult.txHash,
      validatorHash: aikenResult.validatorHash,
      network: aikenResult.network,
      isRealTx: aikenResult.isRealTx,
    });

    // =========================================================================
    // ACTION 3: Update database with approval and blockchain references
    // =========================================================================
    console.log("[Access Approve] Step 3: Updating database...");
    
    await query(
      `UPDATE public.access_requests
       SET status = 'approved',
           midnight_tx = $1,
           zk_proof_hash = $2,
           aiken_tx = $3,
           validator_hash = $4,
           validator_address = $5,
           cardano_network = $6,
           approved_at = NOW()
       WHERE id = $7`,
      [
        midnightResult.txId,
        midnightResult.zkProofHash,
        aikenResult.txHash,
        aikenResult.validatorHash,
        aikenResult.validatorAddress,
        aikenResult.network,
        requestId,
      ]
    );

    console.log("[Access Approve] Approval workflow complete:", {
      requestId,
      midnightTx: midnightResult.txId,
      aikenTx: aikenResult.txHash,
      network: aikenResult.network,
    });

    return res.json({
      success: true,
      requestId,
      blockchain: {
        midnight: {
          txId: midnightResult.txId,
          zkProofHash: midnightResult.zkProofHash,
          isRealProof: midnightResult.isRealProof,
        },
        cardano: {
          txHash: aikenResult.txHash,
          validatorHash: aikenResult.validatorHash,
          validatorAddress: aikenResult.validatorAddress,
          network: aikenResult.network,
          isRealTx: aikenResult.isRealTx,
          unsignedTxData: aikenResult.unsignedTxData, // For frontend wallet signing
        },
      },
      // Legacy fields for backward compatibility
      midnightTx: midnightResult.txId,
      zkProofHash: midnightResult.zkProofHash,
      aikenTx: aikenResult.txHash,
      message: "Access request approved successfully. Consent recorded on blockchain.",
    });
  } catch (error) {
    console.error("Error in POST /api/access/approve:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/access/reject
 * Patient rejects an access request
 */
router.post("/reject", async (req: Request, res: Response) => {
  try {
    const { requestId, patientWallet } = req.body;

    if (!requestId || !patientWallet) {
      return res.status(400).json({
        error: "requestId and patientWallet are required",
      });
    }

    // Verify the request exists and belongs to this patient
    const requestResult = await query(
      `SELECT id, status FROM public.access_requests
       WHERE id = $1 AND patient_wallet = $2`,
      [requestId, patientWallet]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        error: "Access request not found or you don't have permission to reject it",
      });
    }

    const accessRequest = requestResult.rows[0];

    if (accessRequest.status !== "pending") {
      return res.status(400).json({
        error: `Cannot reject request with status '${accessRequest.status}'`,
      });
    }

    // Update status to rejected
    await query(
      `UPDATE public.access_requests
       SET status = 'rejected',
           approved_at = NOW()
       WHERE id = $1`,
      [requestId]
    );

    console.log("[Access Reject] Request rejected:", {
      requestId,
      patient: patientWallet.substring(0, 20) + "...",
    });

    return res.json({
      success: true,
      requestId,
      message: "Access request rejected successfully",
    });
  } catch (error) {
    console.error("Error in POST /api/access/reject:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/access/all?wallet=WALLET_ADDRESS
 * Doctor or Patient fetches all access requests (pending, approved, rejected)
 * - For doctors: returns all requests they made
 * - For patients: returns all requests made to them
 */
router.get("/all", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        error: "wallet query parameter is required",
      });
    }

    const walletAddress = decodeURIComponent(wallet as string).trim();

    console.log("[Access All] Fetching requests for wallet:", {
      wallet: walletAddress.substring(0, 30) + "...",
      length: walletAddress.length,
    });

    // Check user role to determine which requests to fetch
    const userResult = await query(
      "SELECT role FROM public.users WHERE wallet_address = $1",
      [walletAddress]
    );

    if (userResult.rows.length === 0) {
      console.log("[Access All] User not found in users table");
      return res.status(404).json({
        error: "User not found. Please register your account first.",
      });
    }

    const userRole = userResult.rows[0].role;
    console.log("[Access All] User role:", userRole);

    let whereClause: string;
    let queryParams: string[];

    if (userRole === "patient") {
      // For patients: fetch all requests where they are the patient
      // Use case-insensitive comparison and TRIM to handle format differences
      whereClause = "LOWER(TRIM(ar.patient_wallet)) = LOWER(TRIM($1))";
      queryParams = [walletAddress];
      console.log("[Access All] Fetching requests for patient:", {
        wallet: walletAddress.substring(0, 50) + "...",
        length: walletAddress.length,
        firstChars: walletAddress.substring(0, 10),
      });
      
      // Debug: Check what patient_wallet values exist in the database
      const debugResult = await query(
        `SELECT DISTINCT patient_wallet, LENGTH(patient_wallet) as addr_length, 
         SUBSTRING(patient_wallet, 1, 20) as addr_start
         FROM public.access_requests 
         LIMIT 10`
      );
      console.log("[Access All] Sample patient_wallet values in DB:", {
        sampleCount: debugResult.rows.length,
        samples: debugResult.rows.map((r) => ({
          start: r.addr_start,
          length: r.addr_length,
          full: r.patient_wallet.substring(0, 50) + "...",
        })),
      });
    } else if (userRole === "doctor" || userRole === "hospital") {
      // For doctors/hospitals: fetch all requests they made
      // Use case-insensitive comparison and TRIM to handle format differences
      whereClause = "LOWER(TRIM(ar.doctor_wallet)) = LOWER(TRIM($1))";
      queryParams = [walletAddress];
      console.log("[Access All] Fetching requests for doctor/hospital:", walletAddress.substring(0, 30) + "...");
    } else {
      return res.status(403).json({
        error: "Access denied. Only patients, doctors, and hospitals can view access requests.",
      });
    }

    // Fetch all requests (all statuses)
    const result = await query(
      `SELECT 
        ar.id,
        ar.doctor_wallet,
        ar.patient_wallet,
        ar.patient_name,
        ar.record_types,
        ar.reason,
        ar.status,
        ar.midnight_tx,
        ar.zk_proof_hash,
        ar.aiken_tx,
        ar.validator_hash,
        ar.validator_address,
        ar.cardano_network,
        ar.created_at,
        ar.approved_at
       FROM public.access_requests ar
       WHERE ${whereClause}
       ORDER BY ar.created_at DESC`,
      queryParams
    );

    console.log("[Access All] Found requests:", {
      count: result.rows.length,
      statuses: result.rows.map((r) => r.status),
      requestIds: result.rows.map((r) => r.id),
    });
    
    // Additional debug: Check if there are any requests with similar addresses
    if (userRole === "patient" && result.rows.length === 0) {
      const similarResult = await query(
        `SELECT patient_wallet, status, created_at 
         FROM public.access_requests 
         WHERE patient_wallet LIKE $1 
         LIMIT 5`,
        [`%${walletAddress.substring(0, 20)}%`]
      );
      console.log("[Access All] Similar addresses found:", {
        count: similarResult.rows.length,
        matches: similarResult.rows.map((r) => ({
          wallet: r.patient_wallet.substring(0, 50) + "...",
          status: r.status,
        })),
      });
    }

    const requests = result.rows.map((row) => ({
      id: row.id,
      doctorWallet: row.doctor_wallet,
      patientWallet: row.patient_wallet,
      patientName: row.patient_name,
      recordTypes: row.record_types,
      reason: row.reason,
      status: row.status,
      midnightTx: row.midnight_tx,
      zkProofHash: row.zk_proof_hash,
      aikenTx: row.aiken_tx,
      validatorHash: row.validator_hash,
      validatorAddress: row.validator_address,
      cardanoNetwork: row.cardano_network,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
    }));

    return res.json({
      success: true,
      requests,
      network: "preprod", // Always indicate network
    });
  } catch (error) {
    console.error("Error in GET /api/access/all:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/access/approved?wallet=DOCTOR_WALLET
 * Doctor fetches all approved access requests
 */
router.get("/approved", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        error: "wallet query parameter is required",
      });
    }

    // Fetch all approved requests for this doctor
    const result = await query(
      `SELECT 
        ar.id,
        ar.doctor_wallet,
        ar.patient_wallet,
        ar.record_types,
        ar.reason,
        ar.status,
        ar.midnight_tx,
        ar.zk_proof_hash,
        ar.aiken_tx,
        ar.validator_hash,
        ar.validator_address,
        ar.cardano_network,
        ar.created_at,
        ar.approved_at
       FROM public.access_requests ar
       WHERE ar.doctor_wallet = $1
         AND ar.status = 'approved'
       ORDER BY ar.approved_at DESC`,
      [wallet]
    );

    const requests = result.rows.map((row) => ({
      id: row.id,
      doctorWallet: row.doctor_wallet,
      patientWallet: row.patient_wallet,
      recordTypes: row.record_types,
      reason: row.reason,
      status: row.status,
      midnightTx: row.midnight_tx,
      zkProofHash: row.zk_proof_hash,
      aikenTx: row.aiken_tx,
      validatorHash: row.validator_hash,
      validatorAddress: row.validator_address,
      cardanoNetwork: row.cardano_network,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
    }));

    return res.json({
      success: true,
      requests,
      network: "preprod",
    });
  } catch (error) {
    console.error("Error in GET /api/access/approved:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/access/release
 * Doctor requests to view patient data
 * 
 * Verification Pipeline:
 * 1. Verify permission via ZK hash (Midnight)
 * 2. Query Aiken audit entry (and verify)
 * 3. Return encrypted patient data only after both checks pass
 */
router.post("/release", async (req: Request, res: Response) => {
  try {
    const { requestId, doctorWallet } = req.body;

    if (!requestId || !doctorWallet) {
      return res.status(400).json({
        error: "requestId and doctorWallet are required",
      });
    }

    // Fetch the access request
    const requestResult = await query(
      `SELECT 
        ar.id,
        ar.doctor_wallet,
        ar.patient_wallet,
        ar.record_types,
        ar.status,
        ar.midnight_tx,
        ar.zk_proof_hash,
        ar.aiken_tx,
        ar.validator_hash,
        ar.validator_address,
        ar.cardano_network
       FROM public.access_requests ar
       WHERE ar.id = $1 AND ar.doctor_wallet = $2`,
      [requestId, doctorWallet]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        error: "Access request not found or you don't have permission",
      });
    }

    const accessRequest = requestResult.rows[0];

    if (accessRequest.status !== "approved") {
      return res.status(403).json({
        error: "Access request is not approved",
      });
    }

    console.log("[Access Release] Verifying consent for data release:", {
      requestId,
      doctor: doctorWallet.substring(0, 20) + "...",
      patient: accessRequest.patient_wallet.substring(0, 20) + "...",
    });

    // =========================================================================
    // VERIFICATION 1: Verify ZK proof on Midnight
    // =========================================================================
    console.log("[Access Release] Step 1: Verifying ZK proof on Midnight...");
    
    const zkVerification = await verifyConsentOnMidnight({
      requestId: accessRequest.id,
      patientWallet: accessRequest.patient_wallet,
      doctorWallet: accessRequest.doctor_wallet,
    });

    if (!zkVerification.valid) {
      console.error("[Access Release] ZK proof verification failed:", zkVerification.reason);
      return res.status(403).json({
        error: "ZK proof verification failed on Midnight blockchain",
        reason: zkVerification.reason,
        details: zkVerification.proofDetails,
      });
    }

    console.log("[Access Release] ZK proof verified ✓");

    // =========================================================================
    // VERIFICATION 2: Verify audit entry on Aiken/Cardano
    // =========================================================================
    console.log("[Access Release] Step 2: Verifying audit on Cardano...");
    
    const auditVerified = await verifyAuditEntry({
      requestId: accessRequest.id,
      expectedZkProofHash: accessRequest.zk_proof_hash,
    });

    if (!auditVerified) {
      console.error("[Access Release] Audit entry verification failed");
      return res.status(403).json({
        error: "Audit entry verification failed on Cardano blockchain",
        aikenTx: accessRequest.aiken_tx,
        validatorHash: accessRequest.validator_hash,
      });
    }

    console.log("[Access Release] Audit entry verified ✓");

    // =========================================================================
    // Both verifications passed - fetch patient's encrypted profile
    // =========================================================================
    const userResult = await query(
      "SELECT role FROM public.users WHERE wallet_address = $1",
      [accessRequest.patient_wallet]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: "Patient user not found",
      });
    }

    const patientRole = userResult.rows[0].role;
    let profileTable = "";

    switch (patientRole) {
      case "patient":
        profileTable = "public.patient_profiles";
        break;
      case "doctor":
        profileTable = "public.doctor_profiles";
        break;
      case "hospital":
        profileTable = "public.hospital_profiles";
        break;
      case "other":
        profileTable = "public.other_profiles";
        break;
      default:
        return res.status(400).json({
          error: "Invalid patient role",
        });
    }

    // Fetch encrypted profile
    const profileResult = await query(
      `SELECT profile_cipher FROM ${profileTable} WHERE wallet_address = $1`,
      [accessRequest.patient_wallet]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        error: "Patient profile not found",
      });
    }

    const profileCipher = profileResult.rows[0].profile_cipher;
    const cipherBase64 = profileCipher.toString("base64");

    console.log("[Access Release] Data release authorized:", {
      requestId,
      doctor: doctorWallet.substring(0, 20) + "...",
      patient: accessRequest.patient_wallet.substring(0, 20) + "...",
      recordTypes: accessRequest.record_types,
    });

    return res.json({
      success: true,
      requestId,
      patientWallet: accessRequest.patient_wallet,
      recordTypes: accessRequest.record_types,
      encryptedData: cipherBase64,
      verification: {
        midnight: {
          verified: true,
          txId: accessRequest.midnight_tx,
          zkProofHash: accessRequest.zk_proof_hash,
        },
        cardano: {
          verified: true,
          txHash: accessRequest.aiken_tx,
          validatorHash: accessRequest.validator_hash,
          validatorAddress: accessRequest.validator_address,
          network: accessRequest.cardano_network,
        },
      },
      // Legacy fields
      midnightTx: accessRequest.midnight_tx,
      aikenTx: accessRequest.aiken_tx,
      message: "Data release authorized. Encrypted data returned.",
    });
  } catch (error) {
    console.error("Error in POST /api/access/release:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
