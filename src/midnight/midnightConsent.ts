// src/midnight/midnightConsent.ts
// Midnight SDK Wrapper for ZK Consent Management
// 
// This module provides a realistic ZK-proof placeholder pipeline.
// The implementation uses SHA-256 hashing to generate deterministic proof hashes
// that can be verified later. When the real Midnight SDK is available,
// this can be swapped in with minimal changes.
//
// NETWORK: Configured for testnet (will use Midnight testnet when available)

import { createHash, randomUUID } from "crypto";

// =============================================================================
// TYPES
// =============================================================================

export interface ConsentSubmission {
  requestId: string;
  patientWallet: string;
  doctorWallet: string;
  recordTypes: string[];
  timestamp?: number;
}

export interface ConsentResult {
  txId: string;
  zkProofHash: string;
  proofData: ZKProofData;
  isRealProof: boolean;
}

export interface ConsentVerification {
  requestId: string;
  patientWallet: string;
  doctorWallet: string;
}

export interface ZKProofData {
  // Inputs used to generate the proof (non-sensitive)
  inputHash: string;
  
  // Timestamp when proof was generated
  generatedAt: number;
  
  // Protocol version for future upgrades
  protocolVersion: string;
  
  // Network identifier
  network: string;
}

export interface VerificationResult {
  valid: boolean;
  reason?: string;
  proofDetails?: {
    requestId: string;
    status: string;
    midnightTx: string | null;
    zkProofHash: string | null;
    approvedAt: string | null;
  };
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const PROTOCOL_VERSION = "1.0.0";
const NETWORK = "midnight-testnet"; // Will be real Midnight testnet

// Salt for proof generation (in production, this would be a secret)
const PROOF_SALT = process.env.MIDNIGHT_PROOF_SALT || "medledger-zk-consent-v1";

// =============================================================================
// ZK PROOF GENERATION
// =============================================================================

/**
 * Generate a deterministic ZK proof hash from consent parameters
 * 
 * This creates a SHA-256 hash that:
 * - Is deterministic (same inputs = same hash)
 * - Cannot be reversed to reveal original data
 * - Can be verified by recomputing with same inputs
 * - Includes timestamp for uniqueness
 * 
 * When real Midnight SDK is available, this will be replaced with
 * actual zero-knowledge proof generation.
 * 
 * @param consent - The consent submission parameters
 * @returns SHA-256 hash as hex string
 */
function generateZKProofHash(consent: ConsentSubmission): string {
  const timestamp = consent.timestamp || Date.now();
  
  // Combine all inputs in a deterministic order
  const inputs = [
    consent.patientWallet,
    consent.doctorWallet,
    timestamp.toString(),
    consent.recordTypes.sort().join(","),
    consent.requestId,
    PROOF_SALT,
  ].join("|");
  
  // Generate SHA-256 hash
  const hash = createHash("sha256")
    .update(inputs)
    .digest("hex");
  
  // Prefix with 'zkp_' for easy identification
  return `zkp_${hash}`;
}

/**
 * Generate the input hash (for verification without revealing full inputs)
 */
function generateInputHash(consent: ConsentSubmission): string {
  const inputs = [
    consent.patientWallet.substring(0, 20),
    consent.doctorWallet.substring(0, 20),
    consent.requestId,
  ].join("|");
  
  return createHash("sha256")
    .update(inputs)
    .digest("hex")
    .substring(0, 32);
}

/**
 * Generate a transaction ID for Midnight
 * In production, this will be a real Midnight blockchain transaction ID
 */
function generateMidnightTxId(): string {
  const timestamp = Date.now().toString(16);
  const random = randomUUID().replace(/-/g, "").substring(0, 16);
  return `midnight_tx_${timestamp}_${random}`;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Submit consent to Midnight blockchain
 * This creates a private ZK proof that:
 * - Patient has approved access
 * - Doctor is authorized to view specific record types
 * - No private data is leaked to the public chain
 *
 * @param consent - The consent submission details
 * @returns Transaction ID and ZK proof hash
 */
export async function submitConsentToMidnight(
  consent: ConsentSubmission
): Promise<ConsentResult> {
  const timestamp = consent.timestamp || Date.now();
  
  console.log("[Midnight] Submitting consent:", {
    requestId: consent.requestId,
    patient: consent.patientWallet.substring(0, 20) + "...",
    doctor: consent.doctorWallet.substring(0, 20) + "...",
    recordTypes: consent.recordTypes,
    network: NETWORK,
  });

  // Generate ZK proof hash
  const zkProofHash = generateZKProofHash({
    ...consent,
    timestamp,
  });

  // Generate input hash for verification metadata
  const inputHash = generateInputHash(consent);

  // Generate transaction ID
  const txId = generateMidnightTxId();

  // Prepare proof data
  const proofData: ZKProofData = {
    inputHash,
    generatedAt: timestamp,
    protocolVersion: PROTOCOL_VERSION,
    network: NETWORK,
  };

  console.log("[Midnight] ZK proof generated:", {
    txId,
    zkProofHash: zkProofHash.substring(0, 30) + "...",
    inputHash: inputHash.substring(0, 16) + "...",
    network: NETWORK,
  });

  // Simulate network delay (Midnight transaction confirmation)
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Store proof in database for later verification
  await storeProofInDatabase(consent.requestId, zkProofHash, txId, proofData);

  return {
    txId,
    zkProofHash,
    proofData,
    isRealProof: false, // Will be true when real Midnight SDK is integrated
  };
}

/**
 * Store proof data in database for verification
 * This creates a local record that mirrors what would be on Midnight
 */
async function storeProofInDatabase(
  requestId: string,
  zkProofHash: string,
  txId: string,
  proofData: ZKProofData
): Promise<void> {
  try {
    // Proof data is stored in access_requests table
    // via the approve route, so we just log here
    console.log("[Midnight] Proof data prepared for storage:", {
      requestId,
      zkProofHash: zkProofHash.substring(0, 30) + "...",
      txId,
    });
  } catch (error) {
    console.error("[Midnight] Error preparing proof storage:", error);
  }
}

/**
 * Verify consent on Midnight blockchain
 * Checks that a valid ZK proof exists for this access request
 *
 * @param verification - The verification request details
 * @returns Verification result with details
 */
export async function verifyConsentOnMidnight(
  verification: ConsentVerification
): Promise<VerificationResult> {
  console.log("[Midnight] Verifying consent:", {
    requestId: verification.requestId,
    patient: verification.patientWallet.substring(0, 20) + "...",
    doctor: verification.doctorWallet.substring(0, 20) + "...",
  });

  // Query local database (mirrors Midnight state)
  const { query } = await import("../db");

  try {
    const result = await query(
      `SELECT id, status, midnight_tx, zk_proof_hash, approved_at
       FROM public.access_requests
       WHERE id = $1
         AND patient_wallet = $2
         AND doctor_wallet = $3`,
      [
        verification.requestId,
        verification.patientWallet,
        verification.doctorWallet,
      ]
    );

    if (result.rows.length === 0) {
      console.log("[Midnight] No matching request found");
      return {
        valid: false,
        reason: "No matching access request found",
      };
    }

    const request = result.rows[0];

    // Check status
    if (request.status !== "approved") {
      console.log("[Midnight] Request not approved:", request.status);
      return {
        valid: false,
        reason: `Request status is '${request.status}', not 'approved'`,
        proofDetails: {
          requestId: request.id,
          status: request.status,
          midnightTx: request.midnight_tx,
          zkProofHash: request.zk_proof_hash,
          approvedAt: request.approved_at,
        },
      };
    }

    // Check that Midnight tx and proof exist
    if (!request.midnight_tx || !request.zk_proof_hash) {
      console.log("[Midnight] Missing transaction or proof hash");
      return {
        valid: false,
        reason: "Missing Midnight transaction or ZK proof hash",
        proofDetails: {
          requestId: request.id,
          status: request.status,
          midnightTx: request.midnight_tx,
          zkProofHash: request.zk_proof_hash,
          approvedAt: request.approved_at,
        },
      };
    }

    console.log("[Midnight] Consent verified successfully:", {
      requestId: verification.requestId,
      midnightTx: request.midnight_tx,
      zkProofHash: request.zk_proof_hash.substring(0, 30) + "...",
    });

    return {
      valid: true,
      proofDetails: {
        requestId: request.id,
        status: request.status,
        midnightTx: request.midnight_tx,
        zkProofHash: request.zk_proof_hash,
        approvedAt: request.approved_at,
      },
    };
  } catch (error) {
    console.error("[Midnight] Error verifying consent:", error);
    return {
      valid: false,
      reason: `Database error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

/**
 * Recompute and verify a ZK proof hash
 * Used to verify that a stored proof matches the expected inputs
 * 
 * @param consent - The original consent parameters
 * @param expectedHash - The stored ZK proof hash to verify against
 * @returns true if the computed hash matches
 */
export function verifyZKProofHash(
  consent: ConsentSubmission,
  expectedHash: string
): boolean {
  const computedHash = generateZKProofHash(consent);
  const matches = computedHash === expectedHash;
  
  console.log("[Midnight] Proof hash verification:", {
    matches,
    computed: computedHash.substring(0, 30) + "...",
    expected: expectedHash.substring(0, 30) + "...",
  });
  
  return matches;
}

/**
 * Revoke consent on Midnight blockchain
 * Creates a revocation proof that invalidates the original consent
 *
 * @param requestId - The access request ID to revoke
 * @param patientWallet - Patient wallet (must sign revocation)
 * @returns Transaction ID of the revocation
 */
export async function revokeConsentOnMidnight(
  requestId: string,
  patientWallet?: string
): Promise<{ txId: string; revokedAt: number }> {
  const revokedAt = Date.now();
  
  console.log("[Midnight] Revoking consent:", {
    requestId,
    patient: patientWallet?.substring(0, 20) + "...",
  });

  // Generate revocation transaction ID
  const txId = `midnight_revoke_${Date.now().toString(16)}_${randomUUID().replace(/-/g, "").substring(0, 8)}`;

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  console.log("[Midnight] Consent revoked:", {
    requestId,
    txId,
    revokedAt,
  });

  return {
    txId,
    revokedAt,
  };
}

/**
 * Get Midnight integration status
 * Useful for health checks and debugging
 */
export function getMidnightStatus(): {
  network: string;
  protocolVersion: string;
  sdkAvailable: boolean;
  ready: boolean;
} {
  return {
    network: NETWORK,
    protocolVersion: PROTOCOL_VERSION,
    sdkAvailable: false, // Will be true when real Midnight SDK is integrated
    ready: true, // Stub is always ready
  };
}
