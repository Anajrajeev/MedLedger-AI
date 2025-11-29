# Debugging Guide: Wallet Address Persistence Issue

## Problem Summary
Users are being asked to create a new account repeatedly even though they already registered with their wallet address.

## Root Cause
**Cardano wallet addresses can be returned in DIFFERENT formats:**

1. **Hex format** (114+ characters): `016cd943af71756e248a2f8be375df60af218d9446261b146e974f3751718f5a51fe7de4acdaa880025237565c0a259f17cde80d36baeb5710`
2. **Bech32 format** (63-103 characters): `addr1...` or `addr_test1...`

The CIP-30 wallet API returns different formats depending on which method is called:
- `getUsedAddresses()` → Usually returns hex-encoded CBOR
- `getUnusedAddresses()` → Usually returns hex-encoded CBOR
- `getChangeAddress()` → Usually returns bech32

**The issue**: When you first connect, Eternl returns HEX format. When you reconnect later, it might return BECH32 format (or vice versa). Since the database lookup is exact-match, it doesn't find the existing user.

## Current Database State
Run this to check: `npm run db:check-users`

Example output:
```
User 1:
  Role: doctor
  Address (short): 016cd943af71756e248a...d36baeb5710
  Address Length: 114  ← HEX FORMAT
  Full Address: 016cd943af71756e248a2f8be375df60af218d9446261b146e974f3751718f5a51fe7de4acdaa880025237565c0a259f17cde80d36baeb5710
```

## Solutions Implemented

### 1. Enhanced Logging
- Added detailed logging in `src/routes/profile.ts` to show:
  - Incoming wallet address format
  - Stored wallet address in database
  - Whether they match exactly
  
- Added logging in `lib/wallet-utils.ts` to show:
  - Which API method returned the address
  - Address format (bech32 vs hex)
  - Address length

- Added localStorage debugging in `app/page.tsx`:
  - `lastWalletAddress` - The address used in the last check
  - `lastCheckTime` - When the check happened
  - `lastApiResponse` - The API response received

### 2. Database Check Script
Created `scripts/check-users.js` - Run with:
```bash
npm run db:check-users
```

Shows:
- All registered users
- Their wallet addresses (full + shortened)
- Address format (length indicates hex vs bech32)
- Potential duplicates

### 3. Duplicate Prevention
The database already has `UNIQUE` constraint on `wallet_address` in the `users` table, preventing true duplicates. However, this only prevents duplicates of THE SAME FORMAT.

## How to Debug Your Issue

### Step 1: Check Browser Console
1. Open DevTools → Console
2. Look for `[Wallet]` logs showing address format
3. Look for `[Dashboard]` logs showing profile check
4. Look for `[Profile GET]` logs from backend

### Step 2: Check Browser localStorage
Open DevTools → Application → Local Storage, check:
```javascript
localStorage.getItem('lastWalletAddress')
localStorage.getItem('lastApiResponse')
localStorage.getItem('connectedWallet')
```

### Step 3: Check Backend Logs
Look at your Express server console for:
```
[Profile GET] Checking profile for wallet: {
  address: "...",
  length: 114, // or 63-103
  startsWithAddr: false, // or true
  fullAddress: "..."
}

[Profile GET] User lookup result: {
  found: false, // ← If this is false but you registered, there's a format mismatch
  storedAddress: "..."
}
```

### Step 4: Check Database
```bash
npm run db:check-users
```

Compare the address length:
- **114 characters** = HEX format
- **63-103 characters** = Bech32 format

### Step 5: Compare Formats
1. Note the address format when you FIRST register (check console logs)
2. Note the address format when you RECONNECT (check console logs)
3. If they're different, that's your problem!

## Temporary Workaround

If you need to test with a consistent account:

1. **Clear localStorage** to force fresh connection:
```javascript
localStorage.clear()
```

2. **Use the same wallet connection method** consistently (don't switch between browsers/devices)

3. **Check which format is stored**:
```bash
npm run db:check-users
```

## Permanent Fix Options

### Option A: Store Both Formats (Recommended)
Modify the database to store BOTH hex and bech32 formats, query against both.

### Option B: Convert Everything to One Format
- Install `@emurgo/cardano-serialization-lib-nodejs`
- Convert all addresses to bech32 before storing/querying
- This requires decoding CBOR and re-encoding to bech32

### Option C: Use Address Hash as Identifier
- Hash the address bytes and use that as the identifier
- Works regardless of encoding format

## Next Steps

1. **Reproduce the issue** with logging enabled
2. **Capture the console logs** showing:
   - Address format on first connection
   - Address format on reconnection
   - Database lookup result
3. **Share the logs** and we can implement the appropriate permanent fix

## Files Modified
- `src/routes/profile.ts` - Enhanced logging
- `lib/wallet-utils.ts` - Enhanced logging
- `app/page.tsx` - Added localStorage debugging
- `src/utils/walletAddress.ts` - New utility for address format detection
- `scripts/check-users.js` - New database inspection tool
- `package.json` - Added `db:check-users` script

