# MedLedger AI - Privacy-Preserving Healthcare Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Cardano](https://img.shields.io/badge/Cardano-Preprod-orange.svg)](https://cardano.org/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000.svg)](https://vercel.com)

## 🎯 Problem Statement

Healthcare data management faces critical challenges in today's digital landscape:

- **Privacy Concerns**: Traditional healthcare systems store sensitive patient data in centralized databases, making them vulnerable to breaches and unauthorized access
- **Lack of Patient Control**: Patients have limited control over who can access their medical records and when
- **Audit Trail Gaps**: Healthcare providers struggle to maintain immutable, verifiable audit logs of data access and consent
- **Interoperability Issues**: Fragmented systems make it difficult for different healthcare providers to securely share patient information
- **Compliance Complexity**: Meeting HIPAA, GDPR, and other regulatory requirements for data privacy and consent management is complex and costly

## 💡 Our Solution

**MedLedger AI** is a revolutionary privacy-preserving healthcare platform that empowers patients with complete control over their medical data through blockchain technology and zero-knowledge proofs. Our platform ensures:

- **Patient Sovereignty**: Patients own and control their medical records through Cardano wallet-based identity
- **Zero-Knowledge Privacy**: Medical data is encrypted client-side and never decrypted by the backend
- **Immutable Consent**: Blockchain-based audit logs provide tamper-proof records of all access requests and approvals
- **Private Consent Verification**: Zero-knowledge proofs enable consent verification without revealing sensitive data
- **Seamless Access Control**: Healthcare providers can request access with full transparency, while patients maintain ultimate control

## 🚀 Use Cases

### For Patients
- **Secure Medical Records Storage**: Store encrypted medical records that only you can decrypt
- **Granular Access Control**: Approve or reject access requests from doctors, hospitals, or other healthcare providers
- **Complete Audit Trail**: View all access requests and see exactly who accessed your data and when
- **Portable Health Records**: Access your medical data from anywhere using your Cardano wallet

### For Healthcare Providers
- **Request Patient Data Access**: Submit access requests for specific record types (lab results, imaging, prescriptions, etc.)
- **Verify Consent**: Automatically verify patient consent through blockchain before accessing data
- **Compliance Ready**: Maintain immutable audit logs for regulatory compliance
- **Patient Management**: Save patient contacts and manage access requests efficiently

### For Healthcare Organizations
- **HIPAA/GDPR Compliance**: Built-in privacy controls and audit trails help meet regulatory requirements
- **Reduced Data Breach Risk**: Client-side encryption means no sensitive data stored on servers
- **Interoperability**: Standardized blockchain-based consent system works across different healthcare systems

---

## 🛠️ Tech Stack

### Frontend Framework
- **Next.js 14** (App Router)
  - Modern React framework with server-side rendering
  - File-based routing and API routes
  - Optimized performance and SEO

- **React 18**
  - Component-based UI architecture
  - Client-side state management
  - Hooks for functional components

- **TypeScript**
  - Type-safe development
  - Better IDE support and error catching
  - Improved code maintainability

### Styling & UI
- **Tailwind CSS**
  - Utility-first CSS framework
  - Custom theme configuration
  - Responsive design system

- **Framer Motion**
  - Smooth animations and transitions
  - Enhanced user experience
  - Glassmorphism effects

- **Radix UI**
  - Accessible component primitives
  - Unstyled, customizable components
  - Avatar, Label, Slot components

- **Lucide React**
  - Modern icon library
  - Consistent iconography
  - Lightweight and customizable

### State Management
- **Zustand**
  - Lightweight state management
  - Wallet connection state
  - User role persistence
  - No boilerplate required

### Backend
- **Node.js / Express 4**
  - RESTful API server
  - Middleware support (CORS, JSON parsing)
  - Error handling and routing

- **TypeScript (tsx)**
  - Type-safe backend code
  - Fast compilation and execution
  - Watch mode for development

### Database
- **PostgreSQL (Supabase)**
  - Relational database for structured data
  - BYTEA columns for encrypted data storage
  - ACID compliance and transactions
  - Connection pooling for performance

### Blockchain & Cryptography

#### Cardano Integration
- **Cardano Blockchain**
  - Public, immutable audit logs
  - Smart contract execution
  - Preprod Testnet for development

- **Aiken Smart Contracts**
  - **Purpose**: Creates immutable, tamper-proof audit logs on Cardano
  - **What it does**: Records consent events (doctor, patient, timestamp, ZK proof hash) on-chain
  - **Why we use it**: Provides public verification of consent without storing sensitive medical data
  - **Location**: `contracts/aiken/access_request_validator/`
  - **Status**: ✅ Fully compiled and ready for Preprod Testnet

- **Lucid Cardano**
  - TypeScript library for Cardano interactions
  - Transaction building and signing
  - UTxO querying and management
  - Validator address computation

- **Blockfrost API**
  - Cardano blockchain data provider
  - Network information and UTxO queries
  - Transaction submission and tracking

#### Midnight Integration
- **Midnight Network**
  - **Purpose**: Private smart contract layer for zero-knowledge consent verification
  - **What it does**: Generates ZK proofs that prove consent was given without revealing patient/doctor identities or medical data
  - **Why we use it**: Enables private consent verification while maintaining auditability
  - **Status**: Stubbed implementation ready for production SDK integration
  - **Location**: `src/midnight/`

#### Wallet Integration
- **CIP-30 Standard**
  - Cardano wallet communication protocol
  - Eternl wallet support
  - Transaction signing and address management

- **Cardano Serialization Libraries**
  - Address format conversion (Hex ↔ Bech32)
  - Transaction serialization
  - Browser and Node.js support

### Encryption & Security
- **@noble/ciphers**
  - AES-256-GCM encryption
  - Client-side encryption/decryption
  - Authenticated encryption with associated data

- **@noble/hashes**
  - HKDF key derivation
  - SHA-256 hashing
  - Cryptographic primitives

- **Client-Side Encryption**
  - Keys derived from wallet signatures
  - Backend never sees plaintext
  - Zero-knowledge architecture

### AI & Agents

#### Masumi Network
- **Purpose**: Decentralized AI agent network for payments and identity management
- **What it does**: 
  - Handles payments for AI agent services
  - Provides identity verification
  - Manages agent registry
- **Why we use it**: Enables monetization and identity management for AI healthcare agents
- **Status**: Optional integration, can be enabled via environment variables
- **Location**: `src/masumi/`

#### AI Agents
- **Explainer Agent**: Explains medical records and test results in plain language
- **Appointment Agent**: Helps schedule and manage medical appointments
- **Insurance Agent**: Assists with insurance claims and coverage questions
- **Architecture**: Agents are separate services deployed independently, integrated via REST APIs

### Storage
- **Backblaze B2**
  - Cloud object storage for medical records
  - Encrypted file storage
  - Scalable and cost-effective

- **IPFS/Filecoin** (Planned)
  - Decentralized file storage
  - Content-addressed storage
  - Redundancy and availability

### Development Tools
- **ESLint**: Code linting and quality
- **PostCSS**: CSS processing
- **Autoprefixer**: Browser compatibility
- **ts-node/tsx**: TypeScript execution

---

## 📋 Prerequisites

Before setting up MedLedger AI, ensure you have the following installed:

### Required Software
1. **Node.js 18+** 
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **Git**
   - Download from [git-scm.com](https://git-scm.com/)
   - Verify installation: `git --version`

### Required Services & Accounts

1. **Supabase Account** (Free tier available)
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Get your database connection string

2. **Eternl Wallet** (Browser Extension)
   - Install from [eternl.io](https://eternl.io)
   - Create or import a wallet
   - Switch to Preprod Testnet for development

3. **Blockfrost API Key** (Optional, for blockchain features)
   - Sign up at [blockfrost.io](https://blockfrost.io)
   - Create a Preprod project
   - Get your API key

4. **Backblaze B2 Account** (Optional, for file storage)
   - Sign up at [backblaze.com](https://www.backblaze.com)
   - Create a bucket
   - Generate application keys

### Optional Services
- **Masumi Network Account** (for AI agent payments)
- **Infura Account** (for IPFS gateway)
- **Web3.Storage Account** (alternative IPFS storage)

---

## 🚀 Deployment Options

### Vercel Deployment (Recommended)

**MedLedger AI is now fully configured for Vercel deployment!** The application deploys both frontend and backend as a single deployment.

#### Prerequisites
- Vercel account (free tier works)
- GitHub repository access
- Supabase database (for data persistence)

#### Quick Deploy Steps

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repository: `Anajrajeev/MedLedger-AI`

2. **Configure Environment Variables:**
   Add these required variables in Vercel dashboard:
   ```
   DATABASE_URL=your_supabase_connection_string
   NEXT_PUBLIC_API_URL=https://your-deployment-url.vercel.app
   NEXT_PUBLIC_CARDANO_NETWORK=testnet
   NEXT_PUBLIC_ENABLE_AI_FEATURES=true
   NEXT_PUBLIC_ENABLE_INSURANCE_AUTOMATION=true
   NEXT_PUBLIC_ENABLE_DEMO_MODE=false
   ```

3. **Deploy:**
   - Click "Deploy"
   - Wait for build completion (2-5 minutes)
   - Your app will be live at `https://medledger-ai.vercel.app`

#### Post-Deployment Setup
- Update `NEXT_PUBLIC_API_URL` to your Vercel deployment URL
- Configure Blockfrost API key for Cardano features (optional)
- Set up Backblaze B2 for file storage (optional)

### Alternative: Separate Frontend/Backend
If you prefer separate deployments:
- **Frontend:** Deploy Next.js app to Vercel/Netlify
- **Backend:** Deploy Express app to Railway/Render/Fly.io
- Set `NEXT_PUBLIC_API_URL` to your backend URL

---

## 🚀 Quick Setup Guide (Local Development)

Follow these steps to get MedLedger AI running on your local machine:

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd "MedLedger AI"
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js and React dependencies
- Express backend dependencies
- Cardano and blockchain libraries
- UI components and styling libraries

### Step 3: Configure Environment Variables

1. **Copy the example environment file:**
   ```bash
   cp env.example .env.local
   ```

2. **Open `.env.local` in your editor** and configure the following:

   **Required Variables:**
   ```env
   # Database (REQUIRED)
   DATABASE_URL=postgresql://postgres:your_password@your-project-ref.supabase.co:5432/postgres
   
   # API URLs (REQUIRED)
   NEXT_PUBLIC_API_URL=http://localhost:4000
   FRONTEND_URL=http://localhost:3000
   PORT=4000
   ```

   **Important Notes:**
   - URL-encode special characters in your database password (use `*` = `%2A`, `@` = `%40`, `:` = `%3A`)
   - Use the **Session Pooler** connection string if you're on Windows (port 6543 instead of 5432)
   - See `docs/DATABASE_CONNECTION_FIX.md` for Supabase connection troubleshooting

   **Optional Variables (for full functionality):**
   ```env
   # Cardano Blockchain
   NEXT_PUBLIC_CARDANO_NETWORK=preprod
   BLOCKFROST_API_KEY=your_blockfrost_api_key
   NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=your_project_id
   
   # Backblaze B2 Storage
   B2_ACCOUNT_ID=your_b2_account_id
   B2_APPLICATION_KEY=your_b2_application_key
   B2_BUCKET_NAME=medledger-patient-records
   B2_BUCKET_ID=your_bucket_id
   
   # Masumi AI Agents (Optional)
   MASUMI_ENABLED=false
   EXPLAINER_AGENT_ENDPOINT=https://your-explainer-agent.example.com
   APPOINTMENT_AGENT_ENDPOINT=https://your-appointment-agent.example.com
   INSURANCE_AGENT_ENDPOINT=https://your-insurance-agent.example.com
   ```

### Step 4: Set Up the Database

1. **Run the database setup script:**
   ```bash
   npm run db:setup
   ```

   This will:
   - Create all required tables (users, profiles, access_requests, etc.)
   - Set up indexes for performance
   - Configure database schema

2. **Verify database connection:**
   ```bash
   npm run db:check-users
   ```

   If you encounter connection issues:
   - Check your `DATABASE_URL` is correct
   - Ensure special characters are URL-encoded
   - Try using Session Pooler connection string (port 6543)

### Step 5: Start the Backend Server

Open a terminal and run:

```bash
npm run server:dev
```

You should see:
```
🚀 MedLedger AI Backend running on http://localhost:4000
📡 Profile API: http://localhost:4000/api/profile
🔐 Permissions API: http://localhost:4000/api/permissions
...
```

**Verify backend is running:**
- Open browser: `http://localhost:4000/health`
- Should return: `{"status":"ok","message":"MedLedger AI Backend"}`

### Step 6: Start the Frontend

Open a **new terminal** (keep backend running) and run:

```bash
npm run dev
```

You should see:
```
✓ Ready in X seconds
○ Local: http://localhost:3000
```

### Step 7: Access the Application

1. **Open your browser** and navigate to: `http://localhost:3000`

2. **Install Eternl Wallet** (if not already installed):
   - Visit [eternl.io](https://eternl.io)
   - Install the browser extension
   - Create or import a wallet
   - **Important**: Switch to **Preprod Testnet** in wallet settings

3. **Connect Your Wallet**:
   - Click "Connect Wallet" on the dashboard
   - Approve the connection in Eternl
   - Your wallet address will be displayed

4. **Register Your Account**:
   - Select your role (Patient, Doctor, Hospital, or Other)
   - Fill in your profile information
   - Submit to create your encrypted profile

### Step 8: Test the Application

**As a Patient:**
1. Connect wallet and register as a patient
2. View the dashboard with your profile
3. Navigate to "Access Requests" to see any pending requests

**As a Doctor:**
1. Connect wallet and register as a doctor
2. Go to "Access Requests" page
3. Submit an access request to a patient's wallet address
4. View "Request Logs" to see the status of your requests

---

## 📁 Project Structure

```
MedLedger AI/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Main dashboard
│   ├── access-requests/  # Access request management
│   ├── logs/              # Request logs for doctors
│   ├── records/           # Medical records management
│   └── ai/                # AI agent interactions
│
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   ├── navbar.tsx         # Navigation bar
│   ├── wallet-switcher.tsx # Wallet connection UI
│   └── ...                # Feature components
│
├── src/                   # Express backend
│   ├── index.ts           # Server entry point
│   ├── db.ts              # Database connection
│   ├── routes/            # API route handlers
│   ├── aiken/             # Aiken/Cardano integration
│   ├── midnight/          # Midnight ZK integration
│   └── masumi/            # Masumi agent integration
│
├── lib/                   # Shared utilities
│   ├── crypto/            # Encryption functions
│   ├── storage/           # File storage utilities
│   └── ...                # Helper functions
│
├── hooks/                  # React hooks
│   ├── useWalletStore.ts  # Wallet state management
│   └── useRoleStore.ts    # User role management
│
├── contracts/             # Smart contracts
│   └── aiken/             # Aiken validator contracts
│
├── database/              # Database schemas
│   ├── schema.sql         # Main database schema
│   └── migrations/       # Database migrations
│
├── scripts/               # Utility scripts
│   ├── setup-database.js  # Database setup
│   └── ...                # Helper scripts
│
└── docs/                  # Documentation
    └── ...                # Additional documentation
```

---

## 🔧 Available Scripts

### Development
```bash
npm run dev              # Start Next.js frontend (port 3000)
npm run server:dev       # Start Express backend (port 4000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Database
```bash
npm run db:setup         # Create database tables
npm run db:reset         # Reset database (WARNING: deletes all data)
npm run db:check-users   # Check users in database
npm run db:migrate       # Run database migrations
```

---

## 🔐 Security Features

- **Client-Side Encryption**: All medical data encrypted in browser before sending to backend
- **Zero-Knowledge Architecture**: Backend never decrypts or sees plaintext data
- **Wallet-Based Identity**: No passwords, uses Cardano wallet addresses
- **Blockchain Audit Logs**: Immutable records of all access requests
- **Zero-Knowledge Proofs**: Private consent verification without data leakage
- **HTTPS/TLS**: Secure communication (in production)

---

## 🌐 API Endpoints

### Health Check
- `GET /health` - Server health status

### Profile Management
- `GET /api/profile/:walletAddress` - Get user profile
- `POST /api/profile` - Create/update profile

### Access Requests
- `POST /api/access/request` - Create access request
- `GET /api/access/pending` - Get pending requests
- `POST /api/access/approve` - Approve request
- `POST /api/access/reject` - Reject request
- `GET /api/access/all` - Get all requests (doctor view)

### Records
- `GET /api/records` - List medical records
- `POST /api/records` - Upload medical record
- `GET /api/records/:id` - Get specific record

### AI Agents
- `POST /api/agents/explain` - Explain medical record
- `POST /api/agents/appointment` - Schedule appointment
- `POST /api/agents/insurance` - Insurance assistance

---

## 🧪 Testing

```bash
# Test database connection
npm run db:check-users

# Test blockchain integration (if configured)
# Note: Requires Blockfrost API key
```

---

## 🐛 Troubleshooting

### Database Connection Issues
- **Problem**: Cannot connect to Supabase
- **Solution**: 
  1. Verify `DATABASE_URL` is correct
  2. URL-encode special characters in password
  3. Use Session Pooler connection (port 6543) on Windows
  4. Check Supabase project is active

### Wallet Not Detected
- **Problem**: Eternl wallet not found
- **Solution**:
  1. Install Eternl browser extension
  2. Unlock your wallet
  3. Refresh the page
  4. Check browser console for errors

### Port Already in Use
- **Problem**: Port 3000 or 4000 already in use
- **Solution**:
  1. Change `PORT` in `.env.local` for backend
  2. Update `NEXT_PUBLIC_API_URL` accordingly
  3. Kill process using the port: `npx kill-port 3000`

### Build Errors
- **Problem**: TypeScript or build errors
- **Solution**:
  1. Delete `node_modules` and `package-lock.json`
  2. Run `npm install` again
  3. Check TypeScript version compatibility

---

## 📚 Documentation

Additional documentation is available in the `docs/` directory:

- `docs/ACCESS_WORKFLOW.md` - Complete access request workflow
- `docs/AIKEN_INTEGRATION_COMPLETE.md` - Aiken blockchain integration guide
- `docs/BACKEND_SETUP.md` - Backend setup details
- `docs/DATABASE_CONNECTION_FIX.md` - Database connection troubleshooting

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Cardano Foundation** - Blockchain infrastructure
-**Hack2Skill team** - innovation Partner
- **Aiken Language** - Smart contract development
- **Midnight Network** - Zero-knowledge privacy layer
- **Masumi Network** - AI agent infrastructure
- **Supabase** - Database hosting
- **Next.js Team** - Frontend framework

---

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check the documentation in `docs/`
- Review troubleshooting section above

---

## 🗺️ Roadmap

### Current Status
- ✅ Core platform functionality
- ✅ Wallet-based authentication
- ✅ Client-side encryption
- ✅ Access request workflow
- ✅ Aiken blockchain integration (Preprod Testnet)
- ✅ Midnight ZK integration (stubbed)

### Upcoming Features
- 🔄 Real Midnight SDK integration
- 🔄 Mainnet deployment
- 🔄 Enhanced AI agent capabilities
- 🔄 IPFS/Filecoin storage integration
- 🔄 Mobile app support
- 🔄 Multi-wallet support

---

**Built with ❤️ for healthcare privacy and patient sovereignty**
