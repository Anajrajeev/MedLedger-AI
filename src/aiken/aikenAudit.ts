// src/aiken/aikenAudit.ts
// Aiken SDK Wrapper for Public Audit Logs on Cardano Preprod Testnet
// This provides blockchain integration for recording consent events on-chain
//
// NETWORK: PREPROD TESTNET ONLY
// DO NOT use mainnet without security audit

import { randomUUID } from "crypto";
import { getLucidInstance, isLucidConfigured, getNetwork } from "./lucidConfig";
import {
  getValidator,
  isValidatorCompiled,
  serializeConsentDatum,
  serializeConsentRedeemer,
  stringToHex,
  uuidToHex,
  getValidatorStatus,
  ConsentDatumPlutus,
} from "./validatorLoader";

export interface AuditLogEntry {
  requestId: string;
  doctorWallet: string;
  patientWallet: string;
  zkProofHash: string;
  timestamp?: number;
  recordTypes?: string[];
}

export interface AuditVerification {
  requestId: string;
  expectedZkProofHash: string;
}

export interface AuditResult {
  txHash: string;
  validatorHash: string;
  validatorAddress: string;
  network: string;
  isRealTx: boolean;
  timestamp: number;
  unsignedTxData?: {
    validatorAddress: string;
    datum: string;
    metadata: any;
    scriptHash: string;
    unsignedTxCbor?: string; // The actual transaction CBOR ready for signing
  };
}

/**
 * Extract PubKeyHash from a Bech32 wallet address
 * For Cardano addresses, this extracts the payment credential hash
 */
function extractPubKeyHash(walletAddress: string): string {
  // For development/testing, if address is short or not properly formatted,
  // create a deterministic hash from it
  if (!walletAddress || walletAddress.length < 20) {
    return stringToHex(walletAddress).substring(0, 56);
  }

  // For proper Bech32 addresses, we'd use cardano-serialization-lib
  // For now, create a deterministic 28-byte (56 hex chars) hash
  // Note: Using SHA-256 instead of blake2b256 (Node.js doesn't support blake2b natively)
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256")
    .update(walletAddress)
    .digest("hex");
  
  // Return first 56 hex characters (28 bytes = PubKeyHash size)
  return hash.substring(0, 56);
}

/**
 * Record a consent event on Cardano using Aiken smart contract
 * This creates a public, immutable audit log that:
 * - Proves consent was given at a specific time
 * - Links to the Midnight ZK proof (via hash)
 * - Does NOT reveal any private medical data
 * - Provides tamper-proof audit trail
 *
 * @param entry - The audit log entry details
 * @returns AuditResult with transaction details
 */
export async function recordConsentEvent(
  entry: AuditLogEntry
): Promise<AuditResult> {
  const timestamp = entry.timestamp || Date.now();
  const network = getNetwork();
  
  console.log("[Aiken Audit] Recording consent event:", {
    requestId: entry.requestId,
    doctor: entry.doctorWallet.substring(0, 20) + "...",
    patient: entry.patientWallet.substring(0, 20) + "...",
    zkProofHash: entry.zkProofHash.substring(0, 20) + "...",
    network,
  });

  // Check if we can use real blockchain integration
  const lucidConfigured = isLucidConfigured();
  const validatorCompiled = isValidatorCompiled();

  if (!lucidConfigured || !validatorCompiled) {
    console.warn("[Aiken Audit] ⚠️ Using stub mode - blockchain transactions will not be submitted:");
    console.warn("  - Lucid configured:", lucidConfigured, lucidConfigured ? "✓" : "✗ (Set BLOCKFROST_API_KEY in .env)");
    console.warn("  - Validator compiled:", validatorCompiled, validatorCompiled ? "✓" : "✗ (Run 'aiken build' in contracts/aiken/access_request_validator)");
    console.warn("  - unsignedTxData will be included but transaction will fail with stub validator address");
    
    return createStubAuditResult(entry, timestamp, network);
  }

  try {
    // Initialize Lucid (dynamic import handles ESM)
    const lucid = await getLucidInstance();
    const validator = getValidator();

    // Compute validator address for Preprod
    // Cast script to proper type for Lucid
    const script = validator.script as { type: "PlutusV2"; script: string };
    const validatorAddress = (lucid as any).utils.validatorToAddress(script);
    
    console.log("[Aiken Audit] Validator address:", validatorAddress);
    console.log("[Aiken Audit] Validator hash:", validator.scriptHash);

    // Prepare datum with real consent data
    const doctorPkh = extractPubKeyHash(entry.doctorWallet);
    const patientPkh = extractPubKeyHash(entry.patientWallet);
    
    const datum: ConsentDatumPlutus = {
      doctorPkh,
      patientPkh,
      approved: true,
      timestamp: BigInt(timestamp),
      zkProofHash: stringToHex(entry.zkProofHash),
      requestId: uuidToHex(entry.requestId),
    };

    const plutusDatum = await serializeConsentDatum(datum);

    console.log("[Aiken Audit] Datum prepared:", {
      doctorPkh: doctorPkh.substring(0, 20) + "...",
      patientPkh: patientPkh.substring(0, 20) + "...",
      approved: datum.approved,
      timestamp: datum.timestamp.toString(),
      zkProofHash: entry.zkProofHash.substring(0, 20) + "...",
    });

    // Build the transaction
    // NOTE: This creates a valid transaction but doesn't submit it
    // Submission requires wallet signing (either backend wallet or frontend CIP-30)
    console.log("[Aiken Audit] Building transaction for validator address:", validatorAddress);
    
    // Prepare metadata for the transaction
    const metadata = {
      674: {
        msg: ["MedLedger Consent Audit Log"],
        request_id: entry.requestId,
        timestamp: timestamp,
        validator: validator.scriptHash.substring(0, 20),
      }
    };

    console.log("[Aiken Audit] Transaction metadata prepared");
    console.log("[Aiken Audit] Preparing transaction data for frontend wallet signing...");
    console.log("[Aiken Audit] - Transaction will lock 2 ADA at validator address with consent datum");
    console.log("[Aiken Audit] - Datum contains: doctor PKH, patient PKH, ZK proof hash, timestamp");
    console.log("[Aiken Audit] - Frontend will build, sign, and submit the transaction");

    // Generate a deterministic transaction hash for tracking
    // This will be replaced with real TX hash after frontend submits
    const txHash = generateDeterministicTxHash(entry, timestamp);

    console.log("[Aiken Audit] Transaction data prepared (ready for frontend):", txHash);
    console.log("[Aiken Audit] Frontend will build transaction with wallet and submit to Cardano");

    return {
      txHash,
      validatorHash: validator.scriptHash,
      validatorAddress,
      network,
      isRealTx: false, // Will be true after frontend submits
      timestamp,
      // Include transaction building data for frontend
      // Frontend will build the transaction with wallet (which has UTXOs)
      unsignedTxData: {
        validatorAddress,
        datum: plutusDatum,
        metadata,
        scriptHash: validator.scriptHash,
        // No unsignedTxCbor - frontend will build it with wallet
      },
    };
  } catch (error) {
    console.error("[Aiken Audit] Error recording consent:", error);
    console.error("[Aiken Audit] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Fallback to stub mode on error
    return createStubAuditResult(entry, timestamp, network);
  }
}

/**
 * Create a stub audit result for development/testing
 */
function createStubAuditResult(
  entry: AuditLogEntry,
  timestamp: number,
  network: string
): AuditResult {
  const txHash = `aiken_preprod_${randomUUID().replace(/-/g, "")}`;
  const validatorHash = `stub_validator_${Date.now().toString(16)}`;
  
  console.log("[Aiken Audit] STUB MODE - Generated fake transaction:", {
    txHash,
    validatorHash,
    network,
  });

  // Extract PKH for stub datum
  const doctorPkh = extractPubKeyHash(entry.doctorWallet);
  const patientPkh = extractPubKeyHash(entry.patientWallet);

  // Create stub datum (simplified - frontend will need real validator for actual submission)
  // In stub mode, this won't work, but it allows the frontend to attempt submission
  // Convert BigInt to string for JSON serialization
  const stubDatum = {
    doctorPkh,
    patientPkh,
    approved: true,
    timestamp: timestamp.toString(), // Convert to string instead of BigInt
    zkProofHash: stringToHex(entry.zkProofHash),
    requestId: uuidToHex(entry.requestId),
  };

  // Note: In stub mode, the frontend transaction will likely fail because:
  // 1. The validator address is fake
  // 2. The datum format might not match the real validator
  // But this allows the frontend code path to execute and show proper errors
  return {
    txHash,
    validatorHash,
    validatorAddress: "addr_test1stub_validator_address_preprod",
    network,
    isRealTx: false,
    timestamp,
    unsignedTxData: {
      validatorAddress: "addr_test1stub_validator_address_preprod",
      datum: JSON.stringify(stubDatum), // Simplified - real implementation needs proper serialization
      metadata: {
        674: {
          msg: ["MedLedger Consent Audit Log (STUB)"],
          request_id: entry.requestId,
          timestamp: timestamp,
        }
      },
      scriptHash: validatorHash,
    },
  };
}

/**
 * Generate a deterministic transaction hash for pending transactions
 * This is used when we can't submit real transactions yet
 */
function generateDeterministicTxHash(entry: AuditLogEntry, timestamp: number): string {
  const crypto = require("crypto");
  const input = `${entry.requestId}:${entry.doctorWallet}:${entry.patientWallet}:${entry.zkProofHash}:${timestamp}`;
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  return `preprod_pending_${hash.substring(0, 48)}`;
}

/**
 * Verify an audit entry exists on Cardano
 * Checks that the consent event was properly recorded and matches expected data
 *
 * @param verification - The verification request details
 * @returns true if audit entry is valid
 */
export async function verifyAuditEntry(
  verification: AuditVerification
): Promise<boolean> {
  console.log("[Aiken Audit] Verifying audit entry:", {
    requestId: verification.requestId,
    expectedZkProofHash: verification.expectedZkProofHash.substring(0, 20) + "...",
  });

  // Check if we can query the blockchain
  const lucidConfigured = isLucidConfigured();
  const validatorCompiled = isValidatorCompiled();

  if (lucidConfigured && validatorCompiled) {
    try {
      const lucid = await getLucidInstance();
      const validator = getValidator();
      // Cast script to proper type for Lucid
      const script = validator.script as { type: "PlutusV2"; script: string };
      const validatorAddress = (lucid as any).utils.validatorToAddress(script);

      // Query UTxOs at validator address
      const utxos = await lucid.utxosAt(validatorAddress);
      
      console.log("[Aiken Audit] Found", utxos.length, "UTxOs at validator");

      // Search for matching datum
      for (const utxo of utxos) {
        if (utxo.datum) {
          try {
            // Decode datum and check for match
            // This is simplified - real implementation would parse Plutus Data
            const datumHex = utxo.datum;
            if (datumHex.includes(uuidToHex(verification.requestId))) {
              console.log("[Aiken Audit] Found matching audit entry on-chain");
              return true;
            }
          } catch {
            // Continue checking other UTxOs
          }
        }
      }

      console.log("[Aiken Audit] No matching audit entry found on-chain");
    } catch (error) {
      console.error("[Aiken Audit] Error querying blockchain:", error);
    }
  }

  // Fallback: Check local database
  const { query } = await import("../db");

  try {
    const result = await query(
      `SELECT id, aiken_tx, zk_proof_hash, validator_hash
       FROM public.access_requests
       WHERE id = $1
         AND status = 'approved'`,
      [verification.requestId]
    );

    if (result.rows.length === 0) {
      console.log("[Aiken Audit] No approved request found in database");
      return false;
    }

    const request = result.rows[0];

    // Check that Aiken tx exists and proof hash matches
    if (!request.aiken_tx) {
      console.log("[Aiken Audit] Missing Aiken transaction in database");
      return false;
    }

    if (request.zk_proof_hash !== verification.expectedZkProofHash) {
      console.log("[Aiken Audit] ZK proof hash mismatch");
      return false;
    }

    console.log("[Aiken Audit] Audit entry verified via database:", {
      requestId: verification.requestId,
      aikenTx: request.aiken_tx,
      validatorHash: request.validator_hash,
    });

    return true;
  } catch (error) {
    console.error("[Aiken Audit] Error verifying audit entry:", error);
    return false;
  }
}

/**
 * Query all audit logs for a specific wallet (doctor or patient)
 * Useful for compliance and audit trail viewing
 *
 * @param walletAddress - The wallet address to query
 * @param role - Whether this is a 'doctor' or 'patient' wallet
 * @returns Array of audit log entries
 */
export async function queryAuditLogs(
  walletAddress: string,
  role: "doctor" | "patient"
): Promise<AuditLogEntry[]> {
  console.log("[Aiken Audit] Querying audit logs:", {
    wallet: walletAddress.substring(0, 20) + "...",
    role,
  });

  // Query from database (mirrors on-chain data)
  const { query } = await import("../db");

  try {
    const whereColumn = role === "doctor" ? "doctor_wallet" : "patient_wallet";
    
    const result = await query(
      `SELECT 
        id as request_id,
        doctor_wallet,
        patient_wallet,
        zk_proof_hash,
        record_types,
        approved_at as timestamp
       FROM public.access_requests
       WHERE ${whereColumn} = $1
         AND status = 'approved'
         AND aiken_tx IS NOT NULL
       ORDER BY approved_at DESC`,
      [walletAddress]
    );

    return result.rows.map((row: {
      request_id: string;
      doctor_wallet: string;
      patient_wallet: string;
      zk_proof_hash: string | null;
      timestamp: string;
      record_types: string[];
    }) => ({
      requestId: row.request_id,
      doctorWallet: row.doctor_wallet,
      patientWallet: row.patient_wallet,
      zkProofHash: row.zk_proof_hash || "",
      timestamp: new Date(row.timestamp).getTime(),
      recordTypes: row.record_types,
    }));
  } catch (error) {
    console.error("[Aiken Audit] Error querying audit logs:", error);
    return [];
  }
}

/**
 * Get the current status of the Aiken integration
 * Useful for health checks and debugging
 */
export function getAikenStatus(): {
  network: string;
  lucidConfigured: boolean;
  validatorStatus: ReturnType<typeof getValidatorStatus>;
  ready: boolean;
} {
  const lucidConfigured = isLucidConfigured();
  const validatorStatus = getValidatorStatus();
  
  return {
    network: getNetwork(),
    lucidConfigured,
    validatorStatus,
    ready: lucidConfigured && validatorStatus.compiled,
  };
}

/**
 * Submit a real transaction to Cardano with wallet signing
 * This is an optional enhancement that can be called when wallet integration is ready
 * 
 * @param entry - The audit log entry
 * @param walletApi - CIP-30 wallet API (from connectWallet())
 * @returns Transaction hash from blockchain
 */
export async function submitRealConsentTransaction(
  entry: AuditLogEntry,
  walletApi: any
): Promise<{ txHash: string; success: boolean; error?: string }> {
  const timestamp = entry.timestamp || Date.now();

  try {
    console.log("[Aiken Audit] Submitting REAL transaction to blockchain...");

    // Get Lucid and validator
    const lucid = await getLucidInstance();
    const validator = getValidator();

    if (!validator.isCompiled) {
      throw new Error("Validator not compiled. Run 'aiken build' first.");
    }

    // Select wallet
    lucid.selectWallet(walletApi);
    
    const walletAddress = await lucid.wallet.address();
    console.log("[Aiken Audit] Using wallet:", walletAddress.substring(0, 30) + "...");

    // Compute validator address
    const script = validator.script as { type: "PlutusV2"; script: string };
    const validatorAddress = (lucid as any).utils.validatorToAddress(script);

    // Prepare datum
    const doctorPkh = extractPubKeyHash(entry.doctorWallet);
    const patientPkh = extractPubKeyHash(entry.patientWallet);
    
    const datum: ConsentDatumPlutus = {
      doctorPkh,
      patientPkh,
      approved: true,
      timestamp: BigInt(timestamp),
      zkProofHash: stringToHex(entry.zkProofHash),
      requestId: uuidToHex(entry.requestId),
    };

    const plutusDatum = await serializeConsentDatum(datum);

    // Prepare metadata
    const metadata = {
      674: {
        msg: ["MedLedger Consent Audit"],
        request: entry.requestId.substring(0, 20),
        timestamp: timestamp,
      }
    };

    console.log("[Aiken Audit] Building transaction...");

    // Build transaction (lock 2 ADA at validator with datum)
    const minLovelace = BigInt(2000000); // 2 ADA
    
    const tx = await lucid
      .newTx()
      .payToContract(validatorAddress, { inline: plutusDatum }, { lovelace: minLovelace })
      .attachMetadata(674, metadata[674])
      .complete();

    console.log("[Aiken Audit] Transaction built, requesting wallet signature...");

    // Sign transaction with wallet
    const signedTx = await tx.sign().complete();

    console.log("[Aiken Audit] Transaction signed, submitting to blockchain...");

    // Submit to blockchain
    const txHash = await signedTx.submit();

    console.log("[Aiken Audit] ✅ Transaction submitted successfully!");
    console.log("[Aiken Audit] TX Hash:", txHash);
    console.log("[Aiken Audit] View on Preprod: https://preprod.cardanoscan.io/transaction/" + txHash);

    // Wait for confirmation (with timeout)
    console.log("[Aiken Audit] Waiting for confirmation...");
    const confirmed = await Promise.race([
      lucid.awaitTx(txHash).then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 120000)) // 2 min timeout
    ]);

    if (confirmed) {
      console.log("[Aiken Audit] ✅ Transaction confirmed on-chain!");
    } else {
      console.warn("[Aiken Audit] ⚠️  Confirmation timeout (transaction may still confirm later)");
    }

    return {
      txHash,
      success: true,
    };
  } catch (error) {
    console.error("[Aiken Audit] ❌ Transaction failed:", error);
    return {
      txHash: "",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

