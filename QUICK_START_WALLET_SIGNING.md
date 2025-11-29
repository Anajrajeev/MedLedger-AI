# Quick Start - Wallet Signing

## Prerequisites Checklist

- [ ] Eternl wallet installed (https://eternl.io)
- [ ] Wallet set to **Preprod Testnet** (Settings → Network → Preprod)
- [ ] Wallet has **3+ ADA** (from https://docs.cardano.org/cardano-testnet/tools/faucet/)
- [ ] Backend running (`npm run server:start`)
- [ ] Frontend running (`npm run dev`)

## Test Flow (5 Minutes)

### 1. Connect Wallet
```
Frontend → Click "Connect Wallet" → Select Eternl → Approve
```

### 2. Create Test Users
```bash
# If not already created
npm run create:test-users
```

### 3. Request Access (as Doctor)
```
1. Go to http://localhost:3000/access-requests
2. Enter patient wallet address
3. Select record types (Lab Results, etc.)
4. Click "Request Access"
```

### 4. Approve Access (as Patient) 🔐
```
1. Switch to patient wallet
2. Go to http://localhost:3000/access-requests
3. See pending request
4. Click "Approve"
5. ⚠️ WALLET POPUP APPEARS ⚠️
6. Review transaction in Eternl
7. Click "Sign"
8. Wait for confirmation
9. ✅ See TX hash and explorer link!
```

### 5. Verify on Blockchain
```
Click the explorer link → Should see:
- Transaction on https://preprod.cardanoscan.io
- 2 ADA locked at validator
- Metadata with "MedLedger Consent Audit"
- Datum with consent details
```

## Expected Console Output

```
[Approval] Step 1: Calling backend to prepare transaction...
[Approval] Backend response: {...}
[Approval] Unsigned TX data available: true
[Approval] Wallet available: true
[Approval] Step 2: Signing transaction with wallet...
[Transaction] Building consent transaction...
[Transaction] Validator address: addr_test1wraa...
[Lucid] Initializing for Preprod Testnet...
[Wallet] Connecting to eternl...
[Wallet] Connected to eternl successfully
[Transaction] Wallet address: addr1qy32...
[Transaction] Wallet balance: 10.5 ADA
[Transaction] Building transaction to lock 2 ADA at validator...
[Transaction] Transaction built successfully
[Transaction] Requesting wallet signature...

>>> WALLET POPUP APPEARS HERE <<<

[Transaction] Transaction signed successfully
[Transaction] Submitting to Cardano Preprod...
[Transaction] ✅ Transaction submitted successfully!
[Transaction] TX Hash: 8f3e2b1a9c7d...
[Transaction] View on explorer: https://preprod.cardanoscan.io/transaction/8f3e2b1a9c7d...
[Transaction] Waiting for confirmation...
[Transaction] ✅ Transaction confirmed on-chain!
[Approval] ✅ Transaction submitted successfully!
```

## Troubleshooting

### Error: "Wallet 'eternl' not found"
**Solution**: Install Eternl from https://eternl.io

### Error: "Insufficient funds. Need at least 3 ADA"
**Solution**: Get testnet ADA from faucet: https://docs.cardano.org/cardano-testnet/tools/faucet/

### Error: "User rejected signature"
**Solution**: Click "Sign" in the Eternl popup (don't cancel)

### No wallet popup appears
**Solution**: 
1. Check browser console for errors
2. Ensure wallet is on Preprod network
3. Try refreshing page and reconnecting wallet

### Transaction pending forever
**Solution**: 
1. Check preprod.cardanoscan.io for TX status
2. Transaction may take 20-60 seconds to confirm
3. Check wallet has enough ADA for fees

## What to Look For

### In Eternl Wallet Popup
- **To**: `addr_test1wraa5nahuldlygl73j479uan4w8lzyw95hfj42rjefvvt0sqc75ch`
- **Amount**: 2 ADA + fees (0.17 ADA)
- **Metadata**: Present
- **Network**: Preprod

### In UI After Signing
- Green success message
- Transaction hash (64 characters)
- Link to Cardano Explorer
- Request removed from list

### On Blockchain Explorer
- Transaction confirmed
- 1 input (your wallet)
- 2 outputs:
  - 2 ADA to validator address
  - Change back to your wallet
- Metadata section with:
  - `"674"` key
  - `"MedLedger Consent Audit"` message
  - Request ID
  - Timestamp

## Files to Check

1. **Backend logs**: Terminal running `npm run server:start`
2. **Frontend logs**: Browser console (F12)
3. **Database**: Check `access_requests` table for `aiken_tx` value
4. **Blockchain**: https://preprod.cardanoscan.io/transaction/{txHash}

## Success Criteria

✅ Wallet popup appeared  
✅ Transaction signed  
✅ TX hash received  
✅ Explorer link works  
✅ Transaction confirmed on-chain  
✅ 2 ADA locked at validator  
✅ Metadata present  
✅ Datum visible in explorer  

**If all ✅ = Implementation working perfectly!** 🎉

---

*Quick reference for testing real blockchain transactions*  
*Network: Preprod Testnet only*  
*Estimated time: 5 minutes*

