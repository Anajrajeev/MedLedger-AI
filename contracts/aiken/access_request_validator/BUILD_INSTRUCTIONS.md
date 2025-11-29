# MedLedger AI - Aiken Contract Build Instructions

## Prerequisites

1. Install Aiken CLI:
   ```bash
   # On Linux/macOS
   curl -sSfL https://install.aiken-lang.org | bash
   
   # On Windows (via Scoop)
   scoop bucket add aiken https://github.com/aiken-lang/scoop-bucket
   scoop install aiken
   ```

2. Verify installation:
   ```bash
   aiken --version
   ```

## Building the Contract

1. Navigate to the contract directory:
   ```bash
   cd contracts/aiken/access_request_validator
   ```

2. Build the contract:
   ```bash
   aiken build
   ```

3. This generates `plutus.json` with:
   - Compiled CBOR code
   - Script hash
   - Datum/Redeemer schemas

## Running Tests

```bash
aiken check
```

## Deployment to Preprod Testnet

### Step 1: Get Testnet ADA
- Visit [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnet/tools/faucet/)
- Request test ADA for your Eternl wallet (Preprod network)

### Step 2: Configure Eternl
- Open Eternl wallet
- Go to Settings → Network
- Select "Preprod Testnet"

### Step 3: Configure Backend
Set these environment variables:
```env
NEXT_PUBLIC_CARDANO_NETWORK=preprod
NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=preprodXXXXXXXXXXXX
BLOCKFROST_API_KEY=preprodXXXXXXXXXXXX
```

### Step 4: Deploy
The backend will automatically use the compiled validator when processing approvals.
The validator address is derived from the script hash in `plutus.json`.

## Contract Overview

### Validator Purpose
Creates an immutable audit log on Cardano that:
- Proves consent was given at a specific time
- Links to Midnight ZK proofs (via hash)
- Does NOT store any PHI
- Provides tamper-proof audit trail

### Datum Structure (ConsentDatum)
```
{
  doctor_pkh: PubKeyHash      // Doctor wallet hash
  patient_pkh: PubKeyHash     // Patient wallet hash  
  approved: Bool              // Consent status
  timestamp: Int              // Unix timestamp (ms)
  zk_proof_hash: ByteArray    // Midnight ZK proof hash
  request_id: ByteArray       // Request UUID
}
```

### Redeemer Actions
- `RecordConsent`: Create new audit log entry
- `RevokeConsent`: Mark consent as revoked
- `VerifyConsent`: Read-only verification

### Security Rules
1. Both doctor AND patient must sign for RecordConsent
2. Only patient can sign for RevokeConsent
3. ZK proof hash must be non-empty
4. Timestamp must be valid

## Network Warning

⚠️ **PREPROD TESTNET ONLY**

This contract is configured for Cardano Preprod Testnet.
DO NOT deploy to mainnet without:
- Security audit
- Formal verification
- Production key management

