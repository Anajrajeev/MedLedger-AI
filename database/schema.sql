-- Drop existing tables (in correct order to handle foreign keys)
DROP TABLE IF EXISTS public.saved_patients CASCADE;
DROP TABLE IF EXISTS public.access_requests CASCADE;
DROP TABLE IF EXISTS public.doctor_patient_contacts CASCADE;
DROP TABLE IF EXISTS public.public_profiles CASCADE;
DROP TABLE IF EXISTS public.patient_profiles CASCADE;
DROP TABLE IF EXISTS public.doctor_profiles CASCADE;
DROP TABLE IF EXISTS public.hospital_profiles CASCADE;
DROP TABLE IF EXISTS public.other_profiles CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Enable pgcrypto extension (for UUID generation)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table: stores wallet address and role only
-- This is the main identity table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Wallet address is the user's identity (unique constraint)
  wallet_address TEXT NOT NULL UNIQUE,
  
  -- User role: 'patient', 'doctor', 'hospital', 'other'
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'hospital', 'other')),
  
  -- Track account creation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Track last login for analytics
  last_login TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on wallet_address for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON public.users(wallet_address);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Create index on last_login for analytics queries
CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login);

-- Public Profiles table: stores public display information for doctors/hospitals
-- This allows patients to see doctor names without needing to decrypt private profiles
-- Only doctors, hospitals, and other healthcare providers should have public profiles
-- Patients do NOT have public profiles (privacy by default)
CREATE TABLE IF NOT EXISTS public.public_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References users table
  wallet_address TEXT NOT NULL UNIQUE REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  
  -- Public display name (e.g., "Dr. John Smith" or "City General Hospital")
  display_name TEXT NOT NULL,
  
  -- Optional public credentials (e.g., "MD", "RN", "Hospital License #12345")
  credentials TEXT,
  
  -- Specialty (for doctors) or type (for hospitals)
  specialty TEXT,
  
  -- Hospital/Organization name (for doctors) or main location (for hospitals)
  organization TEXT,
  
  -- User role (for filtering)
  role TEXT NOT NULL CHECK (role IN ('doctor', 'hospital', 'other')),
  
  -- When the public profile was created/updated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on wallet_address for fast lookups
CREATE INDEX IF NOT EXISTS idx_public_profiles_wallet_address
ON public.public_profiles (wallet_address);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_public_profiles_role
ON public.public_profiles (role);

-- Patient profiles table: stores encrypted profile data for patients
CREATE TABLE public.patient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References users table
  wallet_address TEXT NOT NULL UNIQUE REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  
  -- Encrypted profile data (ciphertext only, base64 encoded from client)
  -- Backend stores as BYTEA, never decrypts
  profile_cipher BYTEA NOT NULL,
  
  -- Track profile creation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor profiles table: stores encrypted profile data for doctors
CREATE TABLE public.doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References users table
  wallet_address TEXT NOT NULL UNIQUE REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  
  -- Encrypted profile data (ciphertext only, base64 encoded from client)
  -- Backend stores as BYTEA, never decrypts
  profile_cipher BYTEA NOT NULL,
  
  -- Track profile creation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hospital profiles table: stores encrypted profile data for hospitals
CREATE TABLE public.hospital_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References users table
  wallet_address TEXT NOT NULL UNIQUE REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  
  -- Encrypted profile data (ciphertext only, base64 encoded from client)
  -- Backend stores as BYTEA, never decrypts
  profile_cipher BYTEA NOT NULL,
  
  -- Track profile creation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Other profiles table: stores encrypted profile data for other roles
CREATE TABLE public.other_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References users table
  wallet_address TEXT NOT NULL UNIQUE REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  
  -- Encrypted profile data (ciphertext only, base64 encoded from client)
  -- Backend stores as BYTEA, never decrypts
  profile_cipher BYTEA NOT NULL,
  
  -- Track profile creation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table: Midnight Access Control Mirror
-- Represents consent given privately on Midnight blockchain
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who owns the data
  patient_wallet TEXT NOT NULL,
  
  -- Who is requesting access (doctor, insurer, AI agent, etc.)
  requester_wallet TEXT NOT NULL,
  
  -- What resource they're accessing (e.g., "lab_results", "prescriptions")
  resource_id TEXT NOT NULL,
  
  -- What they can do (e.g., "read", "write", "share")
  scope TEXT NOT NULL,

  -- When this permission expires (NULL = never expires)
  expires_at TIMESTAMPTZ,
  
  -- When permission was created
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Midnight blockchain transaction ID
  midnight_tx_id TEXT,
  
  -- Zero-knowledge proof from Midnight
  midnight_proof TEXT,
  
  -- Permission status: 'active', 'revoked', 'expired'
  status TEXT NOT NULL DEFAULT 'active'
);

-- Create composite index for efficient permission lookups
CREATE INDEX IF NOT EXISTS idx_permissions_all
ON public.permissions (patient_wallet, requester_wallet, resource_id);

-- Create index on status for filtering active permissions
CREATE INDEX IF NOT EXISTS idx_permissions_status
ON public.permissions (status);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_permissions_expires
ON public.permissions (expires_at) WHERE expires_at IS NOT NULL;

-- Doctor-Patient Contacts table: stores encrypted patient information for doctors
-- Allows doctors to save patient wallet addresses and names for quick access
CREATE TABLE IF NOT EXISTS public.doctor_patient_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Doctor's wallet address (references users table)
  doctor_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  
  -- Patient's wallet address (not a foreign key, as patient might not be registered yet)
  patient_wallet TEXT NOT NULL,
  
  -- Encrypted patient name (ciphertext only, base64 encoded from client)
  -- Backend stores as BYTEA, never decrypts
  patient_name_cipher BYTEA NOT NULL,
  
  -- Track when contact was created
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one doctor can't save the same patient twice
  UNIQUE (doctor_wallet, patient_wallet)
);

-- Create index on doctor_wallet for fast lookups
CREATE INDEX IF NOT EXISTS idx_doctor_patient_contacts_doctor
ON public.doctor_patient_contacts (doctor_wallet);

-- Create index on patient_wallet for reverse lookups
CREATE INDEX IF NOT EXISTS idx_doctor_patient_contacts_patient
ON public.doctor_patient_contacts (patient_wallet);

-- Access Requests table: stores all doctor->patient access requests
-- Tracks the full workflow from request → approval/rejection → blockchain logging
LL,
  
  -- Patient name (for doctor's reference)
  patient_name TEXT,
  
  -- Array of record types requested (e.g., ['lab-results', 'cardiac-evaluation'])
  record_types TEXT[] NOT NULL,
  
  -- Optional reason for the request
  reason TEXT,
  
  -- Request status: 'pending', 'approved', 'rejected'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Midnight blockchain transaction ID (set on approval)
  midnight_tx TEXT,
  
  -- ZK proof hash from Midnight (set on approval)
  zk_proof_hash TEXT,
  
  -- Aiken public audit transaction ID (set on approval)
  aiken_tx TEXT,
  
  -- Aiken validator script hash (for verification)
  validator_hash TEXT,
  
  -- Aiken validator address on Cardano (Preprod testnet)
  validator_address TEXT,
  
  -- Cardano network used (preprod, mainnet, etc.)
  cardano_network TEXT DEFAULT 'preprod',
  
  -- When the request was created
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- When the request was approved/rejected
  approved_at TIMESTAMPTZ
);

-- Create index on doctor_wallet for doctors to fetch their requests
CREATE INDEX IF NOT EXISTS idx_access_requests_doctor
ON public.access_requests (doctor_wallet);

-- Create index on patient_wallet for patients to fetch pending requests
CREATE INDEX IF NOT EXISTS idx_access_requests_patient
ON public.access_requests (patient_wallet);

-- Create composite index for status filtering
CREATE INDEX IF NOT EXISTS idx_access_requests_status
ON public.aCREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Doctor requesting access (must be registered user with 'doctor' role)
  doctor_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  
  -- Patient whose records are being requested
  -- Note: Patient may not be registered yet - they'll see the request when they register
  patient_wallet TEXT NOT NUccess_requests (status);

-- Create composite index for doctor + status queries
CREATE INDEX IF NOT EXISTS idx_access_requests_doctor_status
ON public.access_requests (doctor_wallet, status);

-- Create composite index for patient + status queries
CREATE INDEX IF NOT EXISTS idx_access_requests_patient_status
ON public.access_requests (patient_wallet, status);

-- Saved Patients table: allows doctors to save patient wallet addresses with aliases
-- For quick access and repeated requests
CREATE TABLE IF NOT EXISTS public.saved_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Doctor's wallet address (must be registered doctor)
  doctor_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  
  -- Patient's wallet address (may or may not be registered yet)
  patient_wallet TEXT NOT NULL,
  
  -- Friendly alias/name for the patient
  alias TEXT NOT NULL,
  
  -- When this was saved
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one doctor can't save the same patient twice
  UNIQUE (doctor_wallet, patient_wallet)
);

-- Create index on doctor_wallet for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_patients_doctor
ON public.saved_patients (doctor_wallet);

-- Create index on patient_wallet for reverse lookups
CREATE INDEX IF NOT EXISTS idx_saved_patients_patient
ON public.saved_patients (patient_wallet);
