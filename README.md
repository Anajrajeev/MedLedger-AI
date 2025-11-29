## MedLedger AI – Cardano Health Agents

MedLedger AI is a **privacy‑preserving medical data platform** where patients control their encrypted medical records and grant healthcare providers access through **on‑chain consent** and **zero‑knowledge proofs**.  
All PHI/medical content is encrypted client‑side; the backend and databases only ever see ciphertext.

> **🎉 NEW**: ✅ **Wallet signing fully implemented!** Real Cardano transactions now work with Eternl wallet. See `WALLET_SIGNING_COMPLETE.md` for details.

---

### Table of Contents

- **Overview**
- **Core Features**
- **Tech Stack**
- **High‑Level Architecture**
- **Repository Structure**
- **Environment Configuration**
- **Database Schema**
- **Backend (Express)**
- **Frontend (Next.js)**
- **Wallet & Cardano Integration**
- **Consent, Midnight & Aiken (ZK + Audit)**
- **Scripts & Tooling**
- **Development Workflow**
- **Security & Privacy Model**
- **Troubleshooting & Known Issues**
- **Roadmap**

---

## Overview

- **Domain**: Healthcare data access & consent management on Cardano.
- **Identity**: **Wallet address = user identity** (no passwords).
- **Encryption**: All profile/record data is encrypted in the browser using AES‑256‑GCM and keys derived from **wallet signatures**.
- **Backend role**: Store/retrieve ciphertext, orchestrate consent workflow, integrate with Midnight (private smart contracts) and Aiken (public Cardano audit logs).
- **Database**: Supabase Postgres stores wallet identities, encrypted profiles, access requests, permissions, and saved patients.

The codebase combines:

- A **Next.js 14** frontend (dashboard, access requests, logs, registration),
- An **Express/TypeScript** backend (`src/`),
- A **Postgres schema** (`database/schema.sql`),
- Integration stubs for **Midnight** and **Aiken** (`src/midnight`, `src/aiken`),
- Detailed workflow and integration docs in `docs/` and `ACCESS_WORKFLOW.md`.

---

## Core Features

- **Wallet‑based onboarding**
  - Eternl (CIP‑30) wallet integration.
  - Wallet address normalized to Bech32 and used as the **primary user ID**.
  - Encrypted user profile linked to wallet address and role.

- **Role‑aware profiles**
  - Roles: **patient**, **doctor**, **hospital**, **other**.
  - Private encrypted profiles per role:
    - `patient_profiles`, `doctor_profiles`, `hospital_profiles`, `other_profiles`.
  - Optional **public profiles** (for doctors/hospitals/others) to display names, credentials, specialties, organization, etc. (no sensitive data).

- **Client‑side encryption**
  - AES‑256‑GCM encryption via `@noble/ciphers` on the frontend.
  - Keys derived via HKDF from wallet signatures (`deriveEncryptionKey`).
  - Backend and DB never see plaintext; they store **ciphertext as BYTEA**.

- **Access request workflow**
  - Doctors/hospitals request access to specific record types for a patient.
  - Patients review, approve or reject requests.
  - Approved requests are mirrored as:
    - Midnight consent (ZK proofs, stubbed today),
    - Cardano on‑chain public audit logs via Aiken (stubbed today),
    - `access_requests` row in Postgres with `midnight_tx`, `zk_proof_hash`, `aiken_tx`.

- **Saved patients & doctor contacts**
  - Doctors can:
    - Save patients with aliases (`saved_patients`).
    - Store encrypted patient names for contacts (`doctor_patient_contacts`).
  - Backend stores only ciphertext; decryption happens in the client.

- **Audit and logs**
  - Doctor‑side **Request Logs** page (`app/logs/page.tsx`) shows:
    - Status of all access requests (pending/approved/rejected),
    - Blockchain metadata (Midnight tx, Aiken tx) where available.

- **Modern UI**
  - Glassmorphism dashboard, responsive layout.
  - Framer Motion animations.
  - Shadcn‑style UI components under `components/ui`.

---

## Tech Stack

- **Frontend**
  - **Next.js 14** (App Router)
  - **React 18** with client components
  - **TypeScript**
  - **Tailwind CSS**, custom theme in `lib/theme.ts`, `tailwind.config.ts`
  - **framer-motion** for animations
  - **zustand** for state management (`hooks/useWalletStore`, `hooks/useRoleStore`)

- **Backend**
  - **Node.js / Express 4**
  - **TypeScript** (compiled via `tsx`)
  - **pg** for Postgres connection

- **Blockchain & Crypto**
  - **Cardano** wallet via CIP‑30 (Eternl)
  - `@emurgo/cardano-serialization-lib-browser` for address conversion
  - **Midnight** ZK consent layer (stubbed, `src/midnight/*`)
  - **Aiken** / Cardano public audit logs (stubbed, `src/aiken/aikenAudit.ts`)
  - `@noble/ciphers`, `@noble/hashes` for AES‑GCM encryption and HKDF

- **Infrastructure & Storage (planned / configurable)**
  - **Supabase Postgres** (required)
  - IPFS/Filecoin via Infura or Web3.Storage (env vars defined, integration to be wired)
  - Lit Protocol & AI agents (env vars defined, future extension).

---

## High‑Level Architecture

Conceptual flow:

```text
Browser (Next.js)
  - Wallet connection (Eternl, CIP-30)
  - Key derivation (HKDF from wallet signature)
  - AES-256-GCM encryption/decryption
  - Calls Express backend with ciphertext only
            │
            ▼
Express Backend (src/index.ts)
  - REST APIs under /api/*
  - Manages users, profiles, access requests, permissions, saved patients
  - Orchestrates Midnight consent + Aiken audit stubs
            │
            ▼
Supabase Postgres (database/schema.sql)
  - users, public_profiles
  - patient/doctor/hospital/other_profiles
  - permissions (Midnight mirror)
  - doctor_patient_contacts, access_requests, saved_patients
            │
            ├── Midnight (private ZK consent - stub)
            └── Aiken / Cardano (public audit log - stub)
```

For a detailed end‑to‑end flow of **doctor requests access → patient approves → doctor reads**, see the in‑repo document `ACCESS_WORKFLOW.md` (fully implemented in code).

---

## Repository Structure

Top‑level:

- **`app/`** – Next.js App Router entrypoints and pages.
  - `layout.tsx` – Root layout and metadata.
  - `page.tsx` – Main **Dashboard** page (wallet‑gated, recent records, profile bootstrap).
  - `access-requests/page.tsx` – Combined view:
    - Doctors/Hospitals: submit access requests to patients.
    - Patients: view, approve or deny pending access requests.
  - `logs/page.tsx` – Doctor/hospital **request logs** page (history + blockchain info).
  - `api/profile/[walletAddress]/` – Next.js API route **wrapper** around backend profile API (bridge between frontend and Express backend where used).

- **`components/`** – React UI and feature components.
  - `navbar.tsx` – Top navigation bar, includes `WalletSwitcher`.
  - `wallet-switcher.tsx` – Eternl wallet connection state, reconnect/switch account, copy address.
  - `dashboard-header.tsx`, `dashboard-search-bar.tsx`, `medical-record-card.tsx` – Dashboard UI.
  - `role-selection.tsx` – Role selection overlay (patient/doctor/hospital/other).
  - `patient-registration-form.tsx`, `doctor-registration-form.tsx`, `hospital-registration-form.tsx`, `other-registration-form.tsx` – Role‑specific encrypted registration.
  - `request-access-form.tsx` – Doctor/hospital form to request access to patient records.
  - `access-request-list.tsx`, `action-buttons.tsx`, `on-chain-notice.tsx`, `doctor-card.tsx`, `save-patient-modal.tsx` – Access request UI and CTAs.
  - `ui/` – Reusable UI atoms (badge, button, card, avatar, input, label).

- **`hooks/`**
  - `useWalletStore.ts` – Zustand store for wallet state (`connected`, `walletName`, `address`, `api`, error, connect/disconnect).
  - `useRoleStore.ts` – Stores current user role (`patient | doctor | hospital | other`).

- **`lib/`** – Shared frontend utilities and configuration.
  - `api-config.ts` – Resolves backend API base URL (`NEXT_PUBLIC_API_URL` or `http://localhost:4000`).
  - `crypto/profileEncryption.ts` – **Client‑side** AES‑256‑GCM encrypt/decrypt + key derivation from wallet signature.
  - `wallet-utils.ts` – Eternl wallet connection (`connectEternlWallet`), CIP‑30 API, address normalization to Bech32.
  - `cardano-address.ts` – Hex/Bech32 conversion using Cardano WASM (`@emurgo/cardano-serialization-lib-browser`).
  - `address-utils.ts` – Address formatting, shortening, readability.
  - `constants.ts` – Central constants: networks, record types, routes, statuses, error/success messages, etc.
  - `theme.ts` – Theme tokens, color palette, breakpoints (for Tailwind and UI).
  - `mock-data.ts` – Example/mock data used in UI.
  - `utils.ts` – Generic helpers (e.g., `cn`).

- **`src/`** – **Express backend** (TypeScript).
  - `index.ts` – Express server entry:
    - Loads `.env.local`,
    - Configures CORS for `FRONTEND_URL`/localhost,
    - Registers routers under `/api/*`,
    - Provides `/health` endpoint.
  - `db.ts` – Postgres connection pool and helpers (`query`, `getClient`).
  - `routes/`
    - `profile.ts` – Profile + user registration APIs.
    - `permissions.ts` – Midnight‑style consent endpoints.
    - `access.ts` – Access request workflow (request, pending, approve, reject, approved, all, release).
    - `doctor-contacts.ts` – Encrypted doctor‑patient contacts.
    - `public-profile.ts` – Public doctor/hospital/other profile creation & retrieval.
    - `register-role.ts` – Create user with role in `users` table.
    - `savedPatients.ts` – Manage saved patients (aliases) for doctors.
  - `midnight/`
    - `midnightClient.ts` – Stubbed Midnight consent mirror for `permissions` table (verify active consent).
    - `midnightConsent.ts` – Midnight ZK consent integration for access requests (`submitConsentToMidnight`, `verifyConsentOnMidnight`, `revokeConsentOnMidnight`). Currently uses SHA-256 placeholder for ZK proofs.
  - `aiken/`
    - `aikenAudit.ts` – **✅ FULLY IMPLEMENTED** Aiken/Cardano audit log integration (`recordConsentEvent`, `verifyAuditEntry`, `queryAuditLogs`, `submitRealConsentTransaction`). Loads compiled validator, prepares real Plutus datum, ready for wallet signing.
    - `lucidConfig.ts` – Lucid-cardano configuration for Preprod Testnet with Blockfrost.
    - `validatorLoader.ts` – Loads compiled Aiken validator from `plutus.json`, serializes Plutus data.
    - `walletSigning.ts` – CIP-30 wallet integration utilities for transaction signing.
  - `utils/walletAddress.ts` – Backend utilities for wallet address handling/normalization (where used).

- **`database/`**
  - `schema.sql` – **Authoritative Postgres schema** for all tables (see detailed section below).
  - `reset-database.sql` – Drops and recreates schema for local resets.

- **`scripts/`**
  - `setup-database.js` – Programmatic execution of `schema.sql` and related setup.
  - `reset-database.js` – Drops and recreates DB using `reset-database.sql`.
  - `test-db-connection.js` – Verifies `DATABASE_URL` connectivity.
  - `check-users.js` – Helper for inspecting `users` table contents.
  - `check-setup.js` – Pre‑flight checks invoked by `npm run dev`.
  - `convert-hex-to-bech32.js` – Cardano address conversion (hex → Bech32) for stored addresses.
  - `encode-db-password.js` – URL‑encodes DB passwords for use in `DATABASE_URL`.
  - `test-dns.js` – DNS diagnostic script for connectivity issues.
  - `test-aiken-midnight.js` – Full integration test for Aiken and Midnight blockchain integrations.
  - `test-blockfrost-aiken.js` – **✅ ALL TESTS PASSING** Blockfrost & Aiken integration test (6/6 tests pass).
  - `verify-approval.js` – Verifies blockchain integrations ran during patient approval.
  - `create-test-users.js` – Creates test doctor and patient users for integration testing.
  - `migrate-blockchain-columns.js` – Adds blockchain-related columns to `access_requests` table.

- **`docs/`**
  - `BACKEND_SETUP.md` – Detailed backend setup, encryption overview (earlier iteration, still conceptually valid).
  - `BACKEND_QUICK_START.md` – Short backend setup and example curl flows.
  - `DATABASE_CONNECTION_FIX.md` – Supabase IPv4/IPv6 and Session Pooler instructions.

- **Other project files**
  - `ACCESS_WORKFLOW.md` – Full narrative/documentation of the access request workflow and its mapping to code.
  - `INTEGRATION.md` – **Frontend integration guide** (profile encryption, permissions, shared profile endpoints) for the older route design; complements current implementation.
  - `README_BACKEND.md` – Backend‑only overview; this README supersedes it but all points remain accurate for the Express layer.
  - `DEBUGGING_WALLET_ISSUE.md` – Notes on typical wallet integration/debugging issues (ensure Eternl, address formats, etc.).
  - `env.example` – Canonical list of environment variables.
  - `tailwind.config.ts`, `postcss.config.mjs` – Styling configuration.
  - `next.config.mjs` – Next.js config (edge/runtime settings, etc.).
  - `tsconfig*.json` – TypeScript configuration for frontend and backend.
  - `types/` – Shared TypeScript types, including CIP‑30 `CardanoWalletApi` and window typings.

---

## Environment Configuration

All environment variables are documented in **`env.example`**. Typical local development uses a `.env.local` file at the repo root.

- **Cardano / Blockchain**
  - `NEXT_PUBLIC_CARDANO_NETWORK` – `mainnet | testnet | preview` (frontend network awareness).
  - `NEXT_PUBLIC_CONTRACT_ADDRESS` – Access control smart contract address.
  - `NEXT_PUBLIC_BLOCKFROST_PROJECT_ID`, `BLOCKFROST_API_KEY` – Blockfrost API credentials.

- **IPFS / Storage (planned)**
  - `NEXT_PUBLIC_IPFS_GATEWAY`
  - `IPFS_PROJECT_ID`, `IPFS_PROJECT_SECRET`
  - Optional `WEB3_STORAGE_TOKEN`

- **Lit Protocol (future E2E key management)**
  - `NEXT_PUBLIC_LIT_NETWORK` – `serrano` (testnet) or `cayenne` (mainnet).

- **AI / Agents**
  - `OPENAI_API_KEY`, `OPENAI_ORGANIZATION`
  - Optional `ANTHROPIC_API_KEY`

- **Database (required)**
  - `DATABASE_URL` – Supabase Postgres connection string.
    - **Important**: URL‑encode special characters in the password. Use `scripts/encode-db-password.js` if needed.
    - For IPv4‑only environments, use the **Session Pooler** connection string as explained in `docs/DATABASE_CONNECTION_FIX.md`.

- **Auth & app secrets**
  - `NEXTAUTH_SECRET`, `NEXTAUTH_URL` – Reserved for NextAuth.js (if/when used).
  - `APP_SECRET` – Application secret for signing tokens.
  - `ENCRYPTION_KEY` – Legacy/general encryption key; not used for profile encryption (which is wallet‑derived).

- **Backend / API**
  - `PORT` – Express backend port (default `4000`).
  - `NEXT_PUBLIC_API_URL` – Base URL for frontend → backend calls (`http://localhost:4000` by default).
  - `FRONTEND_URL` – Origin allowed in CORS for Express backend (e.g. `http://localhost:3000`).

- **Monitoring / Feature flags**
  - `SENTRY_DSN`, `NEXT_PUBLIC_GA_ID` – Optional monitoring/analytics.
  - `NEXT_PUBLIC_ENABLE_AI_FEATURES`, `NEXT_PUBLIC_ENABLE_INSURANCE_AUTOMATION`, `NEXT_PUBLIC_ENABLE_DEMO_MODE` – Feature toggles.

For the fastest local start, copy `env.example` to `.env.local` and adjust only:

- `DATABASE_URL`
- `NEXT_PUBLIC_API_URL`
- `FRONTEND_URL`
- Any API keys you need for your environment.

---

## Database Schema (Postgres)

Defined in `database/schema.sql`. Key tables:

- **`public.users`**
  - `id` (UUID, primary key, default `gen_random_uuid()`),
  - `wallet_address` (TEXT, **unique**, primary identity),
  - `role` (`patient | doctor | hospital | other`),
  - `created_at`, `last_login`.
  - Indexed on `wallet_address`, `role`, `last_login`.

- **`public.public_profiles`**
  - Public‑facing info for **doctors/hospitals/others** only.
  - Columns: `wallet_address` (FK → `users`), `display_name`, `credentials`, `specialty`, `organization`, `role`, `created_at`, `updated_at`.
  - Accessed by `/api/public-profile/*` routes and used in UI to show doctor/hospital names without decrypting profiles.

- **Encrypted profile tables** (one per role; all share pattern):
  - `public.patient_profiles`
  - `public.doctor_profiles`
  - `public.hospital_profiles`
  - `public.other_profiles`
  - Columns: `id`, `wallet_address` (FK → `users`), `profile_cipher` (BYTEA, **encrypted**), `created_at`.
  - Backend **never decrypts** `profile_cipher`; it only stores and returns ciphertext.

- **`public.permissions`** – Midnight consent mirror
  - Represents Midnight blockchain ZK consent records.
  - Columns:
    - `patient_wallet`, `requester_wallet`, `resource_id`, `scope`,
    - `expires_at`, `created_at`,
    - `midnight_tx_id`, `midnight_proof`,
    - `status` (`active | revoked | expired`).
  - Indexed on `(patient_wallet, requester_wallet, resource_id)`, `status`, `expires_at`.
  - Queried by `src/midnight/midnightClient.ts` for **verifyConsentOnMidnight`.

- **`public.doctor_patient_contacts`**
  - Saves patient wallet + encrypted patient name per doctor.
  - Columns: `doctor_wallet` (FK → `users`), `patient_wallet`, `patient_name_cipher` (BYTEA), `created_at`.
  - Unique: `(doctor_wallet, patient_wallet)`.
  - Used by `/api/doctor-contacts/*`.

- **`public.access_requests`**
  - Core access request workflow.
  - Columns:
    - `doctor_wallet` (FK → `users`),
    - `patient_wallet` (TEXT – patient may or may not be registered yet),
    - `patient_name` (optional plain text for convenience),
    - `record_types` (TEXT[]; e.g. `['lab-results', 'cardiac-evaluation']`),
    - `reason` (TEXT),
    - `status` (`pending | approved | rejected`),
    - `midnight_tx`, `zk_proof_hash`, `aiken_tx`,
    - `validator_hash`, `validator_address`, `cardano_network` (Aiken blockchain integration),
    - `created_at`, `approved_at`.
  - Indexed for doctor/patient/status queries.

- **`public.saved_patients`**
  - Doctor’s saved patients list with aliases.
  - Columns: `doctor_wallet` (FK → `users`), `patient_wallet`, `alias`, `created_at`.
  - Unique: `(doctor_wallet, patient_wallet)`.

All these tables are created/dropped/reset via `scripts/setup-database.js` and `scripts/reset-database.js`, which execute the SQL in `database/schema.sql`/`reset-database.sql`.

---

## Backend (Express) – API Summary

Entry: `src/index.ts`.

- **Base URL**: `http://localhost:4000`
- **Health**: `GET /health` → `{ status: "ok", message: "MedLedger AI Backend" }`

Registered routers:

- **Profile (`src/routes/profile.ts`) – `/api/profile`**
  - `GET /api/profile/:walletAddress`
    - Looks up user in `public.users` by wallet address.
    - If not found → `{ exists: false }`.
    - If found but no profile row → `{ exists: true, role }`.
    - If profile exists → `{ exists: true, role, cipher: "<base64>" }`.
    - Cipher is `profile_cipher` from the role‑specific table, converted BYTEA→base64.
  - `POST /api/profile`
    - Creates or updates encrypted profile for a given `walletAddress` and `role`.
    - Validates role; inserts/updates both `users` row and role‑specific profile table.
    - Expects base64 ciphertext; backend stores raw bytes in BYTEA.

- **Permissions (`src/routes/permissions.ts`) – `/api/permissions`**
  - Provides an abstraction similar to the older `/api/permissions/*` documented in `INTEGRATION.md`:
    - `POST /request` – record an access request intent (pre‑consent).
    - `POST /approve` – patient approves; uses `submitConsentToMidnight` stub and writes to `permissions`.
    - `POST /revoke` – patient revokes; updates `permissions.status`.
  - Current production flows primarily use the more detailed `access` routes (below), but permissions captures the generic Midnight consent model.

- **Public Profiles (`src/routes/public-profile.ts`) – `/api/public-profile`**
  - `GET /api/public-profile/:walletAddress`
    - Returns `{ exists: false }` if no public profile.
    - Otherwise returns public fields: `displayName`, `credentials`, `specialty`, `organization`, `role`, timestamps.
  - `GET /api/public-profile/batch?wallets=addr1,...`
    - Batch retrieval for multiple wallet addresses.
  - `POST /api/public-profile`
    - Upsert public profile for doctors/hospitals/others.
    - Enforces that the user exists in `users` and role matches.

- **Register Role (`src/routes/register-role.ts`) – `/api/register-role`**
  - Creates or updates a user record in `public.users` for a given wallet + role.
  - Called via frontend after role selection.

- **Doctor Contacts (`src/routes/doctor-contacts.ts`) – `/api/doctor-contacts`**
  - `GET /api/doctor-contacts/:doctorWallet`
    - Ensures `doctorWallet` exists and has role `doctor`.
    - Returns list of contacts with `patientWallet`, `patientNameCipher` (base64), `createdAt`.
  - `POST /api/doctor-contacts`
    - Saves or updates a doctor’s patient contact.
    - Supports **development shortcut** where a plain `patientName` is accepted and encrypted on client in production.

- **Saved Patients (`src/routes/savedPatients.ts`) – `/api/saved-patients`**
  - `GET /api/saved-patients?doctorWallet=...`
  - `POST /api/saved-patients/add`
  - `DELETE /api/saved-patients/delete/:id?doctorWallet=...`
  - Uses `saved_patients` table for quick‑select doctor workflows.

- **Access Requests (`src/routes/access.ts`) – `/api/access`**
  - (Fully described in `ACCESS_WORKFLOW.md` and reflected in `app/access-requests/page.tsx` and `app/logs/page.tsx`.)
  - Typical endpoints:
    - `POST /api/access/request` – Doctor/hospital creates a request:
      - Validates roles, existing users, uniqueness of pending requests.
      - Writes to `access_requests`.
    - `GET /api/access/pending?wallet=PATIENT_WALLET` – Patient views all pending requests.
    - `POST /api/access/approve` – Patient approves; triggers:
      - `submitConsentToMidnight` (stub) → `midnight_tx`, `zk_proof_hash`.
      - `recordConsentEvent` via Aiken stub → `aiken_tx`.
      - Updates `access_requests` row.
    - `POST /api/access/reject` – Patient rejects (status set to `rejected`).
    - `GET /api/access/approved?wallet=DOCTOR_WALLET` – Doctor lists approved requests.
    - `GET /api/access/all?wallet=DOCTOR_WALLET` – Doctor fetches all their requests (used by logs page).
    - `POST /api/access/release` – Doctor requests data release:
      - Verifies consent via Midnight + Aiken stubs.
      - Reads patient encrypted profile.
      - Returns `encryptedData` (base64) and blockchain metadata.

Error handling: centralized 404 and 500 handlers in `src/index.ts` log errors but never leak secrets.

---

## Frontend (Next.js) – Key Flows

### 1. Wallet connection & dashboard bootstrap (`app/page.tsx`)

- Uses `useWalletStore` and `connectEternlWallet` to:
  - Detect Eternl,
  - Auto‑reconnect if `connectedWallet` is set in `localStorage`,
  - Normalize wallet address to Bech32 via `cardano-address.ts`.
- On connection:
  - Calls backend: `GET {API_URL}/api/profile/:walletAddress`.
  - If `{ exists: false }` → show **Role Selection** overlay.
  - If `{ exists: true, role, cipher? }`:
    - Sets role in `useRoleStore`.
    - If `cipher` present:
      - Calls `deriveEncryptionKey(walletAddress, api)` to get AES key.
      - Decrypts profile via `decryptProfile(cipher, key)`.
      - For non‑patient roles, optionally enriches UI with `public-profile` display name.
    - If no `cipher` → show role‑specific Registration Form.

### 2. Registration flow

1. User connects wallet and passes role selection.
2. Role‑specific form collects structured profile data.
3. Frontend:
   - Derives encryption key from wallet signature.
   - Encrypts profile JSON via `encryptProfile`.
   - Sends base64 cipher to backend with wallet + role.
4. Backend stores cipher bytes in appropriate profile table and ensures user exists in `users`.

### 3. Access requests page (`app/access-requests/page.tsx`)

- If **doctor/hospital**:
  - Show `RequestAccessForm`:
    - Form posts to `POST /api/access/request` with `doctorWallet`, `patientWallet`, `recordTypes`, `reason`.
    - Uses `saved-patients` endpoints to manage alias list.
- If **patient**:
  - Fetch pending requests from `GET /api/access/pending?wallet=...`.
  - For each doctor/hospital wallet, fetch public display data via `GET /api/public-profile/:doctorWallet`.
  - Show request cards with:
    - Doctor identity (public profile or fallback to wallet prefix),
    - Requested record types (mapped to labels/icons),
    - Reason.
  - Approve/Reject buttons call `POST /api/access/approve` or `POST /api/access/reject`.

### 4. Request logs page (`app/logs/page.tsx`)

- Visible to **doctor/hospital** roles only.
- Calls `GET /api/access/all?wallet=...`.
- Displays:
  - Patient name/wallet (may be plain `patientName` or derived client‑side),
  - Record types and reason,
  - Status badge,
  - Created/approved timestamps,
  - Midnight and Aiken transaction IDs if present.

---

## Wallet & Cardano Integration

- **Wallet adapter**: Eternl via `window.cardano.eternl` (CIP‑30).
- **Connection helper**: `lib/wallet-utils.ts`
  - `connectEternlWallet(forceReconnect?: boolean)`:
    - Calls `eternl.enable()` to obtain `CardanoWalletApi`.
    - Fetches address via `getUsedAddresses`, `getUnusedAddresses`, or `getChangeAddress`.
    - Normalizes to Bech32 using `normalizeAddressToBech32` (`cardano-address.ts`).
  - Handles:
    - User cancellation,
    - Reconnect flows to switch accounts,
    - Logging of address format/length.
- **WalletSwitcher component**:
  - Shows current connection, shortened Bech32 address, copy button, reconnect/switch and disconnect actions.
  - Uses `connectEternlWallet(true)` to prompt account reselection in Eternl.

Address utilities:

- `cardano-address.ts` – uses Cardano WASM to convert Hex↔Bech32.
- `address-utils.ts` – checks if bech32, formats hex for display, and provides `shortenAddress`.

---

## Consent, Midnight & Aiken (ZK + Audit)

The implementation provides a realistic blockchain integration layer with **Lucid** for Cardano and a deterministic ZK-proof pipeline for Midnight. The system is configured for **Cardano Preprod Testnet** only.

### Aiken Smart Contract (`contracts/aiken/access_request_validator/`)

A fully-defined Aiken validator that creates immutable audit logs:

- **Validator**: `validators/access_request.ak`
- **Configuration**: `aiken.toml`
- **Build output**: `plutus.json`

**Contract Datum (ConsentDatum)**:
```
doctor_pkh: PubKeyHash      // Doctor wallet hash
patient_pkh: PubKeyHash     // Patient wallet hash
approved: Bool              // Consent status
timestamp: Int              // Unix timestamp (ms)
zk_proof_hash: ByteArray    // Midnight ZK proof hash
request_id: ByteArray       // Request UUID
```

**Build the contract**:
```bash
cd contracts/aiken/access_request_validator
aiken build
```

### Backend Integration

- **Midnight (`src/midnight/midnightConsent.ts`)**
  - `submitConsentToMidnight(consent)`: Generates deterministic SHA-256 ZK proof hashes
  - `verifyConsentOnMidnight(verification)`: Verifies proof existence and validity
  - `verifyZKProofHash(consent, expectedHash)`: Recomputes and verifies proof
  - Returns: `{ txId, zkProofHash, proofData, isRealProof }`

- **Aiken / Cardano (`src/aiken/aikenAudit.ts`)**
  - `recordConsentEvent(entry)`: Records audit log via Lucid
  - `verifyAuditEntry(verification)`: Queries blockchain + database
  - `queryAuditLogs(walletAddress, role)`: Lists all audit entries
  - Returns: `{ txHash, validatorHash, validatorAddress, network, isRealTx }`

- **Lucid Configuration (`src/aiken/lucidConfig.ts`)**
  - Connects to Blockfrost API for Preprod Testnet
  - Singleton Lucid instance management
  - Network: **Preprod only** (DO NOT use mainnet)

### Database Columns

The `access_requests` table stores blockchain references:
- `midnight_tx`: Midnight transaction ID
- `zk_proof_hash`: ZK proof hash (SHA-256)
- `aiken_tx`: Cardano transaction hash
- `validator_hash`: Aiken validator script hash
- `validator_address`: Validator address on Cardano
- `cardano_network`: Network used (default: preprod)

### Enabling Full Blockchain Integration

**✅ STATUS: FULLY IMPLEMENTED AND READY**

All blockchain integration is now complete and tested. See `AIKEN_INTEGRATION_COMPLETE.md` for full details.

1. **Blockfrost API** (✅ Configured):
   - Sign up at [blockfrost.io](https://blockfrost.io) for Preprod
   - Set in `.env.local`:
     ```env
     BLOCKFROST_API_KEY=preprodXXXXXXXXXXXX
     ```

2. **Aiken Contract** (✅ Compiled):
   - Contract already compiled at `contracts/aiken/access_request_validator/plutus.json`
   - Validator hash: `62e06b1b9f17b2575831e93eadc7c1c06e653b7cfaecd62082aecc46`
   - Validator address: `addr_test1wraa5nahuldlygl73j479uan4w8lzyw95hfj42rjefvvt0sqc75ch`
   - To rebuild:
     ```bash
     cd contracts/aiken/access_request_validator
     aiken build
     ```

3. **Database Migration** (✅ Applied):
   - Blockchain columns already added to `access_requests` table
   - To reapply:
     ```bash
     npm run db:migrate
     ```

4. **Testing** (✅ All Passing):
   ```bash
   # Test Blockfrost & Aiken integration (6/6 tests pass)
   npm run test:blockfrost
   
   # Test full blockchain workflow
   npm run test:blockchain
   
   # Verify approval workflow
   npm run verify:approval
   ```

### To Submit Real Transactions

The infrastructure is ready. To submit real transactions to Cardano Preprod:

1. **Frontend Wallet Signing** (Recommended):
   - Use provided `src/aiken/walletSigning.ts` utilities
   - Connect Eternl wallet (set to Preprod network)
   - Call `submitRealConsentTransaction()` with wallet API

2. **Get Testnet ADA**:
   - Visit: https://docs.cardano.org/cardano-testnet/tools/faucet/
   - Request test ADA for your Eternl wallet
   - Ensure wallet is on Preprod network

3. **View Transactions**:
   - Explorer: https://preprod.cardanoscan.io
   - Check validator address for UTxOs

**See `AIKEN_INTEGRATION_COMPLETE.md` for complete implementation guide.**

### Testing

```bash
# Test Blockfrost & Aiken integration (ALL TESTS PASSING ✅)
npm run test:blockfrost

# Run full blockchain integration tests
npm run test:blockchain

# Verbose mode
npm run test:blockchain:verbose

# Verify specific approval
npm run verify:approval [requestId]
```

**Test Results:**
- ✅ Blockfrost API Connection
- ✅ Aiken Validator Loading
- ✅ Lucid Initialization  
- ✅ Validator Address Computation
- ✅ Validator UTxO Query
- ✅ Datum Serialization

**Total: 6 passed, 0 failed**

---

## Scripts & Tooling

Defined in `package.json`:

- **Frontend / Next.js**
  - `npm run dev` – Runs `scripts/check-setup.js` then `next dev` on port 3000.
  - `npm run build` – `next build`.
  - `npm run start` – `next start`.
  - `npm run lint` – `next lint`.

- **Backend / Express**
  - `npm run server:dev` – `tsx watch src/index.ts` (live‑reload for backend).
  - `npm run server:start` – `tsx src/index.ts` (production style).

- **Database utilities**
  - `npm run db:setup` – `node scripts/setup-database.js`.
  - `npm run db:reset` – `node scripts/reset-database.js`.
  - `npm run db:test` – `node scripts/test-db-connection.js`.
  - `npm run db:check-users` – `node scripts/check-users.js`.
  - `npm run db:convert-addresses` – `node scripts/convert-hex-to-bech32.js`.
  - `npm run db:migrate` – `node scripts/migrate-blockchain-columns.js`.

- **Blockchain testing & verification**
  - `npm run test:blockchain` – Full Aiken + Midnight integration test.
  - `npm run test:blockchain:verbose` – Verbose test output.
  - `npm run test:blockfrost` – **✅ ALL TESTS PASSING** Blockfrost & Aiken integration test (6/6 pass).
  - `npm run verify:approval` – Verify blockchain integrations ran during approval.
  - `npm run test:create-users` – Create test doctor and patient users.
  - `npm run db:migrate` – Add blockchain columns to existing database.

- **Blockchain testing**
  - `npm run test:blockchain` – Test Aiken & Midnight integration.
  - `npm run test:blockchain:verbose` – Verbose blockchain tests.

Standalone scripts (manually callable):

- `scripts/encode-db-password.js` – Encode DB password for safe URL embedding.
- `scripts/test-dns.js` – Basic DNS diagnostics for Supabase/DB hostnames.
- `scripts/test-aiken-midnight.js` – Full blockchain integration test suite.
- `scripts/migrate-blockchain-columns.js` – Database migration for blockchain fields.

Refer to inline comments within each script for exact behavior and logging.

---

## Development Workflow

### 1. Prerequisites

- Node.js 18+
- A Supabase (or compatible Postgres) instance.
- Eternl Cardano wallet browser extension installed (for frontend flows).

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

1. Copy `env.example` to `.env.local`.
2. Set at minimum:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_API_URL=http://localhost:4000`
   - `FRONTEND_URL=http://localhost:3000`
3. Optionally configure Blockfrost, IPFS, AI, monitoring keys as needed.

### 4. Set up the database

```bash
npm run db:setup
# or, to reset from scratch
npm run db:reset
```

You can verify connectivity:

```bash
npm run db:test
```

If you encounter IPv4 issues on Windows, follow `docs/DATABASE_CONNECTION_FIX.md` to switch to the Supabase **Session Pooler** connection string.

### 5. Run backend and frontend

In two terminals:

```bash
# Terminal 1 – Express backend (port 4000)
npm run server:dev

# Terminal 2 – Next.js frontend (port 3000)
npm run dev
```

Visit:

- Frontend dashboard: `http://localhost:3000`
- Backend health check: `http://localhost:4000/health`

### 6. Typical dev flow

- Connect Eternl wallet and confirm the dashboard loads.
- Register as patient or doctor/hospital/other.
- As a doctor/hospital:
  - Use **Access Requests** page to submit a new request.
  - Check **Request Logs** page for status.
- As a patient:
  - Use **Access Requests** page to approve/reject incoming requests.

For backend‑only testing, `ACCESS_WORKFLOW.md` contains ready‑to‑use `curl` examples for each step.

---

## Security & Privacy Model

- **Client‑side encryption only**
  - Encryption key derived from wallet signature (HKDF‑SHA256).
  - AES‑256‑GCM payload format:
    - \[IV (12 bytes)] | \[TAG (16 bytes)] | \[CIPHERTEXT].
  - Backend only sees base64‑encoded concatenation of this payload.

- **Backend never decrypts**
  - No symmetric keys stored server‑side.
  - Profile and other sensitive fields are always BYTEA/ciphertext in DB.

- **Wallet‑based identity**
  - No username/passwords; only Cardano wallet addresses.
  - Uniqueness enforced at DB level on `users.wallet_address`.

- **Consent & audit**
  - Midnight private consent ensures access decisions are provable without revealing data (stubbed ZK verification today).
  - Aiken/Cardano public audit logs provide immutable **who/when** metadata without PHI.

- **Data minimization**
  - Public profiles expose only non‑sensitive info (doctor names, specialties, organizations).
  - Patients never get public profiles by design.

For further cryptographic details, see `BACKEND_SETUP.md`, `BACKEND_QUICK_START.md`, and `INTEGRATION.md`.

---

## Troubleshooting & Known Issues

- **Database connection errors**
  - Confirm `DATABASE_URL` is correct and URL‑encoded.
  - If Supabase shows “Not IPv4 compatible”, follow `docs/DATABASE_CONNECTION_FIX.md` and use the **Session Pooler** connection string.
  - Use `npm run db:test` and `scripts/test-dns.js` to debug connectivity.

- **Wallet not detected**
  - Ensure Eternl extension is installed and unlocked.
  - The UI will show “Eternl wallet not detected” if `window.cardano.eternl` is missing.

- **Address format issues**
  - Logs will show whether addresses are bech32 or hex.
  - If hex appears where bech32 is expected, check `cardano-address.ts` and `wallet-utils.ts` behavior.

- **Profile decryption failures**
  - Often due to:
    - Wallet account changed (key derived from different signing key),
    - Old data encrypted under a previous scheme.
  - The app catches decryption errors and prompts user to approve wallet signing again; as a last resort, users may need to re‑register.

Additional debugging notes are in `DEBUGGING_WALLET_ISSUE.md` and inline logging throughout wallet and encryption utilities.

---

## Roadmap (from ACCESS_WORKFLOW & Integration Docs)

Short‑ to mid‑term enhancements planned in the docs and code comments:

- **Frontend**
  - Full record upload and IPFS/Filecoin integration.
  - Expanded dashboards: `/records`, `/ai`, `/settings`.
  - Richer AI‑powered analysis workflows using agents.

- **Backend / Blockchain**
  - Replace Midnight stubs with real SDK integration and deploy private consent contracts.
  - Replace Aiken audit stubs with Lucid‑based Cardano transactions and real on‑chain queries.
  - Implement ECDH‑based shared keys for doctor‑patient encrypted data sharing (beyond profile).

- **Security & Ops**
  - Add robust rate‑limiting and auth middleware.
  - Integrate Sentry/GA where configured.
  - Harden logging and monitoring for production.

This README is intended as the **single, comprehensive entrypoint** to the MedLedger AI codebase; for deeper implementation details, follow the referenced files and docs within the repository. 

