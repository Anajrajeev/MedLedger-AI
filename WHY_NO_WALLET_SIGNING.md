# Why Wallet Signing Isn't Happening Yet

## The Current Architecture

### What's Working ✅
- **Wallet Connected**: Patient has Eternl wallet connected in browser
- **Backend Prepares Transaction**: Real Aiken validator, real Plutus datum
- **Transaction Ready**: Built and ready for signing

### What's Missing ❌
- **No CIP-30 Signing Step**: Frontend doesn't sign the transaction
- **No Blockchain Submission**: Transaction never sent to Cardano

## The Problem

Your approval flow currently works like this:

```
Patient Clicks "Approve"
         ↓
Frontend calls: POST /api/access/approve
         ↓
Backend: Builds transaction, returns data
         ↓
Frontend: Shows success message
         ↓
❌ TRANSACTION NEVER SIGNED OR SUBMITTED
```

## Why This Happens

### 1. Wallet is in Browser, Backend is on Server
- **Wallet (Eternl)**: Lives in the browser, has private keys
- **Backend (Express)**: Lives on server, can't access wallet
- **Problem**: Backend builds transaction but can't sign it

### 2. No Signing Step in Frontend
Looking at `app/access-requests/page.tsx` line 113-147:

```typescript
const handleApprove = async (requestId: string) => {
  // ❌ Just calls backend - no wallet interaction
  const response = await fetch('/api/access/approve', {
    method: 'POST',
    body: JSON.stringify({ requestId, patientWallet: address }),
  });
  
  // ❌ Shows success but transaction was never signed or submitted
  console.log("Access approved:", data);
}
```

**Missing**: No call to `window.cardano.eternl.signTx()` or similar.

### 3. Backend Can't Access Browser Wallet
The backend (Node.js/Express) runs on a server and has no access to:
- `window.cardano.eternl` 
- Private keys
- CIP-30 wallet API

## The Solution

You need to add wallet signing in the frontend. Here's what needs to happen:

### Option 1: Frontend Wallet Signing (Recommended)

```typescript
// In app/access-requests/page.tsx
const handleApprove = async (requestId: string) => {
  // 1. Get unsigned transaction data from backend
  const response = await fetch('/api/access/approve', {
    method: 'POST',
    body: JSON.stringify({ requestId, patientWallet: address }),
  });
  
  const { unsignedTxData } = await response.json();
  
  // 2. Connect to wallet
  const walletApi = await window.cardano.eternl.enable();
  
  // 3. Build transaction with Lucid
  import { Lucid, Blockfrost } from 'lucid-cardano';
  
  const provider = new Blockfrost(
    'https://cardano-preprod.blockfrost.io/api/v0',
    'preprodxS8ZaOu1xivxX7jfjMjT4lfIl9bG3y1q'
  );
  
  const lucid = await Lucid.new(provider, 'Preprod');
  lucid.selectWallet(walletApi);
  
  // 4. Build transaction
  const tx = await lucid
    .newTx()
    .payToContract(
      unsignedTxData.validatorAddress,
      { inline: unsignedTxData.datum },
      { lovelace: 2_000_000n }  // Lock 2 ADA
    )
    .attachMetadata(674, unsignedTxData.metadata)
    .complete();
  
  // 5. Sign with wallet
  const signedTx = await tx.sign().complete();
  
  // 6. Submit to Cardano blockchain
  const txHash = await signedTx.submit();
  
  console.log('Real transaction submitted:', txHash);
  console.log('View on explorer: https://preprod.cardanoscan.io/transaction/' + txHash);
};
```

### Option 2: Backend Wallet (For Testing Only)

Configure a funded backend wallet:
```typescript
// In src/routes/access.ts
import { submitRealConsentTransaction } from '../aiken/aikenAudit';

// After preparing transaction
const aikenResult = await submitRealConsentTransaction(
  entry,
  backendWalletApi  // Funded wallet on server
);
```

**Downside**: Requires storing private keys on server (not recommended for production).

## Why Option 1 is Better

### Frontend Wallet Signing (Recommended) ✅
- ✅ **Secure**: Private keys stay in user's wallet
- ✅ **Standard**: Uses CIP-30 (Cardano standard)
- ✅ **User Control**: Patient explicitly signs transaction
- ✅ **Production-ready**: Safe for mainnet

### Backend Wallet Signing (Not Recommended) ❌
- ❌ **Insecure**: Private keys on server
- ❌ **Centralized**: Server controls funds
- ❌ **Risk**: Server compromise = funds stolen
- ✅ **Easy for testing**: No frontend changes needed

## Current Status

### What Backend Does:
```
[Aiken Audit] Validator address: addr_test1wraa...  ✅ Real
[Aiken Audit] Validator hash: 62e06b1b9f17...       ✅ Real
[Aiken Audit] Datum prepared: {...}                 ✅ Real
[Aiken Audit] Ready for wallet signing              ✅ Ready
[Aiken Audit] Transaction prepared                  ✅ Prepared
```

### What's Missing:
```
❌ Frontend: Connect to wallet
❌ Frontend: Sign transaction with wallet
❌ Frontend: Submit transaction to Cardano
```

## Next Steps

### To Enable Real Transaction Submission:

1. **Add Lucid to Frontend** (already in dependencies):
   ```typescript
   import { Lucid, Blockfrost } from 'lucid-cardano';
   ```

2. **Modify handleApprove** in `app/access-requests/page.tsx`:
   - Get unsignedTxData from backend
   - Connect to wallet (window.cardano.eternl)
   - Build and sign transaction with Lucid
   - Submit to Cardano

3. **Get Preprod Testnet ADA**:
   - Visit: https://docs.cardano.org/cardano-testnet/tools/faucet/
   - Request test ADA for patient wallet
   - Ensure wallet is on Preprod network

4. **Test Real Transaction**:
   - Approve a request
   - Wallet will prompt for signature
   - Transaction submitted to blockchain
   - View on explorer

## Summary

**Why signing isn't happening:**
- Backend prepares transaction but can't access wallet
- Frontend doesn't have signing step implemented
- Wallet connection exists but isn't used for signing

**What needs to happen:**
- Add wallet signing step in frontend
- Use CIP-30 to sign the prepared transaction
- Submit signed transaction to Cardano

**Status:**
- Infrastructure: 100% ready ✅
- Backend: Preparing real transactions ✅
- Frontend: Missing signing step ❌

See the code examples above to implement wallet signing!

---

*The transaction building is working perfectly. You just need to add the signing step in the frontend to submit it to Cardano.*

