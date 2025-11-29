# Backend Setup Guide

This guide explains how to set up the secure backend for MedLedger AI, where wallet addresses serve as user identity.

## Overview

The backend uses:
- **Supabase Postgres** for database storage
- **AES-256-GCM** encryption for user profiles
- **Next.js API Routes** for endpoints
- **Wallet address** as the primary user identity (no passwords)

## Prerequisites

1. Node.js 18+ installed
2. Supabase database with connection string
3. Environment variables configured

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `pg` - PostgreSQL client
- `@types/pg` - TypeScript types
- `dotenv` - Environment variable loader (for scripts)

### 2. Generate Encryption Key

Generate a secure AES-256-GCM encryption key:

```bash
npm run key:generate
```

This will output a 64-character hex string. Copy this value.

### 3. Configure Environment Variables

Create a `.env.local` file (or update existing `.env.local`):

```env
# Database connection (Supabase Postgres)
# ⚠️ IMPORTANT: Special characters in password must be URL-encoded
# Example: password "Medledger1*" becomes "Medledger1%2A"
# Use: node scripts/encode-db-password.js "your password" to encode
DATABASE_URL=postgresql://postgres:Medledger1%2A@db.lcewspeexqncnahwjxcv.supabase.co:5432/postgres

# Profile encryption key (64 hex characters)
PROFILE_ENC_KEY=your_generated_key_here
```

**⚠️ Important:**
- Never commit `.env.local` to version control
- Keep `PROFILE_ENC_KEY` secure - if lost, encrypted profiles cannot be decrypted
- The encryption key must be exactly 64 hex characters (32 bytes)
- **URL-encode special characters in database password** (`*` = `%2A`, `@` = `%40`, `:` = `%3A`, etc.)

### 4. Setup Database Schema

Run the database setup script to create the `users` table:

```bash
npm run db:setup
```

This script will:
- Drop existing `users` table (if any)
- Enable `pgcrypto` extension
- Create the `users` table with proper schema
- Create indexes for performance

**Schema:**
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  profile_cipher BYTEA NOT NULL,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### 5. Verify Setup

Start the development server:

```bash
npm run dev
```

The API routes are now available at:
- `GET /api/profile/[walletAddress]` - Check if user exists
- `POST /api/profile` - Create/update user profile

## API Endpoints

### GET /api/profile/[walletAddress]

**Purpose:** Check if wallet address exists and return decrypted profile (auto-login)

**Response (user exists):**
```json
{
  "exists": true,
  "profile": {
    "username": "John",
    "email": "john@example.com",
    "phone": "9999999999",
    "gender": "Male",
    "age": "21"
  }
}
```

**Response (user not found):**
```json
{
  "exists": false
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

### POST /api/profile

**Purpose:** Create or update encrypted user profile

**Request Body:**
```json
{
  "walletAddress": "addr1...",
  "username": "John",
  "email": "john@example.com",
  "phone": "9999999999",
  "gender": "Male",
  "age": "21"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

## Security Features

### Encryption

- **Algorithm:** AES-256-GCM
- **IV Length:** 12 bytes (96 bits)
- **Tag Length:** 16 bytes (128 bits)
- **Key Length:** 32 bytes (256 bits)

**Payload Format:**
```
[IV (12 bytes)] | [TAG (16 bytes)] | [CIPHERTEXT (variable)]
```

### Database

- Profile data is stored as encrypted binary (`BYTEA`)
- Wallet address is stored in plain text (required for lookups)
- Unique constraint on `wallet_address` prevents duplicates
- Indexes on `wallet_address` and `last_login` for performance

## File Structure

```
lib/
  ├── db.ts                    # Database connection pool
  └── crypto/
      └── profileEncryption.ts  # AES-256-GCM encryption/decryption

app/api/
  └── profile/
      ├── route.ts             # POST /api/profile
      └── [walletAddress]/
          └── route.ts         # GET /api/profile/[walletAddress]

database/
  └── schema.sql               # Database schema

scripts/
  ├── setup-database.js        # Database setup script
  └── generate-encryption-key.js # Key generation script
```

## Troubleshooting

### "PROFILE_ENC_KEY environment variable is not set"

Make sure `.env.local` exists and contains `PROFILE_ENC_KEY` with a 64-character hex string.

### "DATABASE_URL environment variable is not set"

Add `DATABASE_URL` to your `.env.local` file with your Supabase connection string.

### "Failed to decrypt profile data"

This usually means:
- The encryption key has changed
- The profile was encrypted with a different key
- The database contains corrupted data

**Solution:** Users will need to re-register if the key has changed.

### Database Connection Errors

1. Verify your Supabase connection string is correct
2. Check that your IP is whitelisted in Supabase (if required)
3. Ensure SSL is enabled (handled automatically in `lib/db.ts`)

## Next Steps

1. Integrate frontend wallet connection with these API endpoints
2. Add profile update functionality
3. Implement profile field validation
4. Add rate limiting for API endpoints
5. Set up monitoring and logging

