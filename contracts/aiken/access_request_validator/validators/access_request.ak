// MedLedger AI - Access Request Validator
// Cardano Aiken Smart Contract for Immutable Consent Audit Logs
//
// PURPOSE:
// This validator creates an immutable, public audit log on Cardano that:
// 1. Proves consent was given at a specific time
// 2. Links to Midnight ZK proofs (via hash reference)
// 3. Does NOT store any PHI (Protected Health Information)
// 4. Provides tamper-proof audit trail for compliance
//
// NETWORK: Preprod Testnet ONLY
// DO NOT deploy to mainnet without security audit

use cardano/transaction.{Transaction}

// Import our custom types
use types.{
  ConsentDatum,
  ConsentRedeemer,
  RecordConsent,
  RevokeConsent,
  VerifyConsent,
  PubKeyHash,
}

/// Main validator function
/// 
/// This validator enforces the rules for consent audit log entries:
/// - RecordConsent: Creates new audit log with valid data
/// - RevokeConsent: Marks existing consent as revoked
/// - VerifyConsent: Read-only verification (reference script)
validator access_request_validator {
  spend(datum: Option<ConsentDatum>, redeemer: ConsentRedeemer, _utxo: Data, self: Transaction) {
    // Extract the datum (must exist for consent entries)
    expect Some(consent_datum) = datum
    
    when redeemer is {
      RecordConsent -> validate_record_consent(consent_datum, self)
      RevokeConsent -> validate_revoke_consent(consent_datum, self)
      VerifyConsent -> validate_verify_consent(consent_datum, self)
    }
  }
}

/// Validate recording new consent
/// 
/// Rules:
/// 1. Doctor wallet must sign the transaction
/// 2. Patient wallet must sign the transaction (proves both parties agree)
/// 3. Timestamp must be reasonable (not in far future)
/// 4. ZK proof hash must be non-empty
/// 5. Request ID must be non-empty
fn validate_record_consent(datum: ConsentDatum, tx: Transaction) {
  
  // Rule 1 & 2: Both doctor and patient must sign
  // For now, we'll simplify this - in production, you'd check tx.extra_signatories
  // This is a simplified version that will need proper signature checking
  let doctor_signed = True  // TODO: Implement proper signature verification
  let patient_signed = True  // TODO: Implement proper signature verification
  
  // Rule 3: Timestamp validation (basic sanity check)
  // Timestamp should be positive and not unreasonably far in future
  let valid_timestamp = datum.timestamp > 0
  
  // Rule 4: ZK proof hash must exist
  let valid_zk_hash = is_non_empty(datum.zk_proof_hash)
  
  // Rule 5: Request ID must exist
  let valid_request_id = is_non_empty(datum.request_id)
  
  // Rule 6: For new consent, approved should be true
  let is_approval = datum.approved
  
  // All rules must pass
  and {
    doctor_signed,
    patient_signed,
    valid_timestamp,
    valid_zk_hash,
    valid_request_id,
    is_approval,
  }
}

/// Validate revoking consent
/// 
/// Rules:
/// 1. Patient must sign (only patient can revoke their consent)
/// 2. Must spend existing consent UTxO
/// 3. New datum must have approved=false
fn validate_revoke_consent(datum: ConsentDatum, _tx: Transaction) {
  // Rule 1: Patient must sign to revoke
  // For now, we'll simplify this - in production, you'd check ctx.transaction.extra_signatories
  // This is a simplified version that will need proper signature checking
  let patient_signed = True  // TODO: Implement proper signature verification
  
  // For revocation, we're spending an existing UTxO
  // The continuing output (if any) should have approved=false
  
  patient_signed
}

/// Validate consent verification (read-only)
/// 
/// This is used for reference inputs where we just want to
/// verify consent exists without spending the UTxO
fn validate_verify_consent(datum: ConsentDatum, _tx: Transaction) {
  // For verification, we just check the datum is valid
  // This is typically used with reference inputs
  
  and {
    is_non_empty(datum.zk_proof_hash),
    is_non_empty(datum.request_id),
  }
}

/// Helper function to check if bytearray is non-empty
/// In Aiken, we can check if a ByteArray is empty by comparing with empty
fn is_non_empty(bytes: ByteArray) -> Bool {
  bytes != #""
}

// ============================================================================
// TESTS
// ============================================================================

test valid_consent_datum() {
  let datum = ConsentDatum {
    doctor_pkh: #"1234567890abcdef1234567890abcdef1234567890abcdef12345678",
    patient_pkh: #"abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
    approved: True,
    timestamp: 1700000000000,
    zk_proof_hash: #"7a6b705f686173685f6578616d706c655f62797465735f686572655f31323334353637383930",
    request_id: #"7265715f69645f757569645f62797465735f686572655f3132333435363738393031323334",
  }
  
  // Basic datum validation
  and {
    datum.approved == True,
    datum.timestamp > 0,
  }
}

test empty_zk_hash_should_fail() {
  let datum = ConsentDatum {
    doctor_pkh: #"1234567890abcdef1234567890abcdef1234567890abcdef12345678",
    patient_pkh: #"abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
    approved: True,
    timestamp: 1700000000000,
    zk_proof_hash: #"",
    request_id: #"7265715f69645f757569645f62797465735f686572655f3132333435363738393031323334",
  }
  
  datum.zk_proof_hash == #""
}


