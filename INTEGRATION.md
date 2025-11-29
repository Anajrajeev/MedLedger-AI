# Frontend Integration Guide

## Overview

This backend is designed for a **privacy-preserving healthcare platform** where:

1. **Wallet address = User identity** (no usernames/passwords)
2. **All encryption/decryption happens on the frontend** using wallet signatures
3. **Backend NEVER decrypts data** - only stores/retrieves ciphertext
4. **Midnight blockchain** handles consent and access control privately

## Architecture

```
Frontend (Browser)
├── Wallet Connection (Eternl)
├── Key Derivation (from wallet signature)
├── Encryption/Decryption (AES-GCM)
└── API Calls (send/receive ciphertext only)

Backend (Express)
├── Store ciphertext (BYTEA in PostgreSQL)
├── Retrieve ciphertext (never decrypts)
└── Midnight integration (consent verification)

Database (Supabase Postgres)
├── users table (ciphertext only)
└── permissions table (Midnight consent records)
```

## Frontend Encryption Flow

### 1. Key Derivation

When a user connects their wallet, derive an encryption key from their wallet signature:

```typescript
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

async function deriveEncryptionKey(walletAddress: string, signature: string): Promise<Uint8Array> {
  // Sign a fixed message with the wallet
  const message = "MedLedger AI Profile Encryption Key";
  const signedMessage = await window.cardano.eternl.signMessage(walletAddress, message);
  
  // Derive key using HKDF
  const key = hkdf(sha256, signedMessage, undefined, undefined, 32);
  return key;
}
```

### 2. Encrypt Profile Data

Before sending to backend, encrypt the profile JSON:

```typescript
import { aes } from '@noble/ciphers/aes';
import { gcm } from '@noble/ciphers/gcm';

async function encryptProfile(profile: Record<string, any>, key: Uint8Array): Promise<string> {
  // Convert profile to JSON
  const plaintext = JSON.stringify(profile);
  const plaintextBytes = new TextEncoder().encode(plaintext);
  
  // Generate random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt using AES-256-GCM
  const cipher = gcm(aes(key, 256), iv);
  const ciphertext = cipher.encrypt(plaintextBytes);
  
  // Combine: IV (12 bytes) | TAG (16 bytes) | CIPHERTEXT
  const payload = new Uint8Array(12 + 16 + ciphertext.length);
  payload.set(iv, 0);
  payload.set(cipher.tag, 12);
  payload.set(ciphertext, 28);
  
  // Convert to base64 for transmission
  return btoa(String.fromCharCode(...payload));
}
```

### 3. Decrypt Profile Data

When receiving from backend, decrypt the ciphertext:

```typescript
async function decryptProfile(cipherBase64: string, key: Uint8Array): Promise<Record<string, any>> {
  // Decode base64
  const payload = Uint8Array.from(atob(cipherBase64), c => c.charCodeAt(0));
  
  // Extract components
  const iv = payload.slice(0, 12);
  const tag = payload.slice(12, 28);
  const ciphertext = payload.slice(28);
  
  // Decrypt using AES-256-GCM
  const cipher = gcm(aes(key, 256), iv);
  const plaintextBytes = cipher.decrypt(ciphertext, tag);
  
  // Convert to JSON
  const plaintext = new TextDecoder().decode(plaintextBytes);
  return JSON.parse(plaintext);
}
```

## API Endpoints

### Profile Endpoints

#### GET `/api/profile/:walletAddress`

Check if user exists and get encrypted profile.

**Response (user exists):**
```json
{
  "exists": true,
  "cipher": "base64-encoded-ciphertext"
}
```

**Response (user not found):**
```json
{
  "exists": false
}
```

**Frontend usage:**
```typescript
const response = await fetch(`http://localhost:4000/api/profile/${walletAddress}`);
const data = await response.json();

if (data.exists) {
  const key = await deriveEncryptionKey(walletAddress, signature);
  const profile = await decryptProfile(data.cipher, key);
  // Use decrypted profile
}
```

#### POST `/api/profile`

Create/update encrypted profile.

**Request:**
```json
{
  "walletAddress": "addr1...",
  "cipher": "base64-encoded-ciphertext"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Frontend usage:**
```typescript
const profile = { username, email, phone, gender, age, country, state, city };
const key = await deriveEncryptionKey(walletAddress, signature);
const cipher = await encryptProfile(profile, key);

await fetch("http://localhost:4000/api/profile", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ walletAddress, cipher }),
});
```

#### GET `/api/profile/shared?patientWallet=...&requesterWallet=...`

Get patient's encrypted profile if requester has permission (via Midnight).

**Query parameters:**
- `patientWallet` - Wallet address of patient
- `requesterWallet` - Wallet address of requester (doctor/insurer/AI)
- `resourceId` (optional) - Resource being accessed (default: "profile")
- `scope` (optional) - Permission scope (default: "read")

**Response (access granted):**
```json
{
  "ok": true,
  "cipher": "base64-encoded-ciphertext"
}
```

**Response (access denied):**
```json
{
  "error": "Access denied",
  "message": "No valid consent found for this request"
}
```

### Permissions Endpoints (Midnight)

#### POST `/api/permissions/request`

Requester initiates access request (doesn't store anything yet).

**Request:**
```json
{
  "requesterWallet": "addr1...",
  "patientWallet": "addr1...",
  "resourceId": "lab_results",
  "scope": "read"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Request recorded; waiting for patient approval."
}
```

#### POST `/api/permissions/approve`

Patient approves access → creates Midnight transaction.

**Request:**
```json
{
  "patientWallet": "addr1...",
  "requesterWallet": "addr1...",
  "resourceId": "lab_results",
  "scope": "read",
  "expiresAt": "2024-12-31T23:59:59Z" // optional
}
```

**Response:**
```json
{
  "ok": true,
  "txId": "midnight_tx_...",
  "proof": "zk_proof_...",
  "message": "Consent approved and recorded on Midnight"
}
```

#### POST `/api/permissions/revoke`

Patient revokes access.

**Request:**
```json
{
  "patientWallet": "addr1...",
  "requesterWallet": "addr1...",
  "resourceId": "lab_results" // optional - if omitted, revokes all
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Permission revoked successfully"
}
```

## Complete Registration Flow

```typescript
// 1. User connects wallet
const walletAddress = await connectEternlWallet();
const signature = await signMessage("MedLedger AI Profile Encryption Key");

// 2. Derive encryption key
const key = await deriveEncryptionKey(walletAddress, signature);

// 3. Check if user exists
const checkResponse = await fetch(`/api/profile/${walletAddress}`);
const checkData = await checkResponse.json();

if (!checkData.exists) {
  // 4. Show registration form
  const profile = {
    username: "John",
    email: "john@example.com",
    phone: "+1234567890",
    gender: "Male",
    age: "25",
    country: "United States",
    state: "California",
    city: "San Francisco",
  };
  
  // 5. Encrypt profile
  const cipher = await encryptProfile(profile, key);
  
  // 6. Send to backend
  await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, cipher }),
  });
} else {
  // 7. Decrypt existing profile
  const profile = await decryptProfile(checkData.cipher, key);
  // Use profile data
}
```

## Complete Access Request Flow

```typescript
// 1. Doctor requests access
await fetch("/api/permissions/request", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    requesterWallet: doctorWallet,
    patientWallet: patientWallet,
    resourceId: "lab_results",
    scope: "read",
  }),
});

// 2. Patient approves (creates Midnight transaction)
const approveResponse = await fetch("/api/permissions/approve", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    patientWallet: patientWallet,
    requesterWallet: doctorWallet,
    resourceId: "lab_results",
    scope: "read",
    expiresAt: "2024-12-31T23:59:59Z",
  }),
});

const { txId, proof } = await approveResponse.json();

// 3. Doctor retrieves encrypted data
const dataResponse = await fetch(
  `/api/profile/shared?patientWallet=${patientWallet}&requesterWallet=${doctorWallet}&resourceId=lab_results`
);

if (dataResponse.ok) {
  const { cipher } = await dataResponse.json();
  // Doctor's frontend decrypts using their own key derivation
  // (Note: This requires a different key derivation scheme for shared data)
}
```

## Security Notes

1. **Backend NEVER decrypts** - All encryption/decryption happens on frontend
2. **Key derivation** - Use wallet signature to derive encryption key (never send key to backend)
3. **Midnight integration** - Real Midnight SDK will replace stub implementations
4. **Ciphertext only** - Backend only stores/retrieves base64-encoded ciphertext
5. **Consent verification** - Midnight blockchain ensures private, verifiable consent

## Required Frontend Dependencies

```json
{
  "@noble/hashes": "^1.3.0",
  "@noble/ciphers": "^0.6.0"
}
```

## Next Steps

1. Implement key derivation from wallet signature
2. Implement AES-GCM encryption/decryption on frontend
3. Update registration form to encrypt before sending
4. Update profile retrieval to decrypt after receiving
5. Integrate Midnight SDK when available (replace stub implementations)

