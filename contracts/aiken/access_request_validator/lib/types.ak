// MedLedger AI - Shared Types for Access Request Validator
// These types define the data structures stored on-chain as audit logs

/// Type alias for PubKeyHash (wallet address hash)
/// In Aiken, we use ByteArray for hashes
pub type PubKeyHash = ByteArray

/// ConsentDatum - The on-chain audit log entry
/// This is stored in the datum of UTxOs at the validator address
/// 
/// IMPORTANT: This does NOT contain any PHI (Protected Health Information)
/// Only stores:
/// - Wallet identifiers (hashes, not full addresses)
/// - Timestamps
/// - ZK proof references
/// - Approval status
pub type ConsentDatum {
  /// Hash of the doctor's wallet address
  doctor_pkh: PubKeyHash,
  
  /// Hash of the patient's wallet address  
  patient_pkh: PubKeyHash,
  
  /// Whether consent was approved (true) or revoked (false)
  approved: Bool,
  
  /// Unix timestamp (milliseconds) when consent was recorded
  timestamp: Int,
  
  /// Hash of the ZK proof from Midnight blockchain
  /// Links this public audit log to the private consent proof
  zk_proof_hash: ByteArray,
  
  /// Request ID (UUID as bytes) for correlation
  request_id: ByteArray,
}

/// ConsentRedeemer - Actions that can be performed on consent UTxOs
pub type ConsentRedeemer {
  /// Record new consent (creates audit log entry)
  RecordConsent
  
  /// Revoke existing consent (spends and recreates with approved=false)
  RevokeConsent
  
  /// Verify consent exists (reference input only, no spending)
  VerifyConsent
}

/// ValidatorParams - Parameters baked into the compiled validator
/// Used to ensure the validator is specific to MedLedger AI
pub type ValidatorParams {
  /// Admin public key hash (can be used for emergency actions)
  admin_pkh: PubKeyHash,
  
  /// Protocol version for future upgrades
  protocol_version: Int,
}

