# MedLedger AI Backend

## Architecture Overview

This is a **privacy-preserving healthcare platform backend** built with Express.js and TypeScript.

### Key Principles

1. **Wallet Address = Identity** - No usernames/passwords, wallet address is the permanent user ID
2. **Frontend-Only Encryption** - All encryption/decryption happens on the frontend using wallet signatures
3. **Backend Never Decrypts** - Backend only stores/retrieves ciphertext (base64-encoded)
4. **Midnight Integration** - Private smart contract layer for consent and access control

## Project Structure

```
src/
  ├── index.ts              # Express server entry point
  ├── db.ts                 # Database connection (Supabase Postgres)
  ├── routes/
  │   ├── profile.ts        # Profile endpoints (ciphertext only)
  │   └── permissions.ts    # Midnight consent endpoints
  └── midnight/
      └── midnightClient.ts  # Midnight blockchain abstraction
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres
PORT=4000
```

### 3. Setup Database

```bash
npm run db:setup
```

This creates:
- `users` table (stores ciphertext only)
- `permissions` table (Midnight consent records)

### 4. Start Backend Server

```bash
npm run server:dev
```

Server runs on `http://localhost:4000`

## API Endpoints

### Profile Endpoints

- `GET /api/profile/:walletAddress` - Check if user exists, get encrypted profile
- `POST /api/profile` - Create/update encrypted profile (ciphertext only)
- `GET /api/profile/shared` - Get patient's encrypted profile if requester has permission

### Permissions Endpoints (Midnight)

- `POST /api/permissions/request` - Requester initiates access request
- `POST /api/permissions/approve` - Patient approves → creates Midnight transaction
- `POST /api/permissions/revoke` - Patient revokes access

See `INTEGRATION.md` for detailed API documentation and frontend integration guide.

## Important Notes

### ⚠️ Backend NEVER Decrypts

- Backend receives base64-encoded ciphertext from frontend
- Backend stores ciphertext as BYTEA in PostgreSQL
- Backend returns ciphertext to frontend
- **All decryption happens on the frontend**

### 🔐 Encryption Flow

1. Frontend derives encryption key from wallet signature
2. Frontend encrypts profile data using AES-256-GCM
3. Frontend sends base64-encoded ciphertext to backend
4. Backend stores ciphertext as-is
5. Frontend retrieves ciphertext and decrypts it

### 🌙 Midnight Integration

- Currently uses stub implementations
- Real Midnight SDK will replace stubs when available
- Stubs generate fake transaction IDs and proofs for testing

## Development

### Run Backend Server

```bash
npm run server:dev    # Development with watch mode
npm run server:start # Production mode
```

### Run Frontend (Next.js)

```bash
npm run dev          # Next.js dev server (port 3000)
```

### Database Setup

```bash
npm run db:setup     # Create tables
npm run db:test      # Test connection
```

## Security

- ✅ No server-side encryption keys
- ✅ Backend never sees plaintext data
- ✅ Wallet signature-based key derivation (frontend)
- ✅ Midnight blockchain for private consent
- ✅ Zero-knowledge proofs for access verification

## Next Steps

1. Implement frontend encryption/decryption (see `INTEGRATION.md`)
2. Integrate real Midnight SDK (replace stubs in `src/midnight/midnightClient.ts`)
3. Add authentication middleware if needed
4. Add rate limiting for production
5. Add logging and monitoring

