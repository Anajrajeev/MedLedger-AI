# Backend Quick Start

## 🚀 Quick Setup (5 minutes)

### 1. Generate Encryption Key
```bash
npm run key:generate
```
Copy the output and add to `.env.local` as `PROFILE_ENC_KEY`

### 2. Create `.env.local`
```env
DATABASE_URL=postgresql://postgres:Medledger1*@db.lcewspeexqncnahwjxcv.supabase.co:5432/postgres
PROFILE_ENC_KEY=<paste_generated_key_here>
```

### 3. Setup Database
```bash
npm run db:setup
```

### 4. Start Server
```bash
npm run dev
```

## 📡 API Endpoints

### Check if User Exists (Auto-Login)
```bash
GET /api/profile/[walletAddress]
```

**Example:**
```bash
curl http://localhost:3000/api/profile/addr1qxxx...
```

**Response (exists):**
```json
{
  "exists": true,
  "profile": {
    "username": "John",
    "email": "john@example.com"
  }
}
```

**Response (not found):**
```json
{
  "exists": false
}
```

### Create/Update Profile
```bash
POST /api/profile
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "addr1qxxx...",
    "username": "John",
    "email": "john@example.com",
    "phone": "9999999999",
    "gender": "Male",
    "age": "21"
  }'
```

**Response:**
```json
{
  "ok": true
}
```

## 🔐 Security

- **Encryption:** AES-256-GCM
- **Key Storage:** Environment variable (never commit to git)
- **Database:** Encrypted binary storage
- **Identity:** Wallet address only (no passwords)

## 📁 Files Created

```
lib/
  ├── db.ts                          # Database connection
  └── crypto/profileEncryption.ts    # Encryption module

app/api/
  └── profile/
      ├── route.ts                   # POST /api/profile
      └── [walletAddress]/
          └── route.ts               # GET /api/profile/[walletAddress]

database/
  └── schema.sql                     # Database schema

scripts/
  ├── setup-database.js              # DB setup script
  └── generate-encryption-key.js    # Key generator
```

## ⚠️ Important Notes

1. **Never commit `.env.local`** - Contains sensitive keys
2. **Backup `PROFILE_ENC_KEY`** - If lost, profiles cannot be decrypted
3. **Database connection** - Uses SSL for Supabase
4. **Wallet address** - Must be unique (enforced by database)

## 🐛 Troubleshooting

**"PROFILE_ENC_KEY not set"**
→ Add to `.env.local` (64 hex characters)

**"DATABASE_URL not set"**
→ Add Supabase connection string to `.env.local`

**"Failed to decrypt profile"**
→ Encryption key may have changed (users need to re-register)

