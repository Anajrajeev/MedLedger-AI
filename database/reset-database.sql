    -- ============================================
    -- COMPLETE DATABASE RESET SCRIPT
    -- ============================================
    -- This script drops ALL tables in the public schema
    -- and then recreates all required tables from scratch
    -- ============================================

    -- Step 1: Drop ALL tables in public schema (in correct order to handle foreign keys)
    -- This will remove ALL tables including any that weren't in our original schema

    -- Drop tables that reference other tables first
    DROP TABLE IF EXISTS public.saved_patients CASCADE;
    DROP TABLE IF EXISTS public.access_requests CASCADE;
    DROP TABLE IF EXISTS public.doctor_patient_contacts CASCADE;
    DROP TABLE IF EXISTS public.public_profiles CASCADE;
    DROP TABLE IF EXISTS public.patient_profiles CASCADE;
    DROP TABLE IF EXISTS public.doctor_profiles CASCADE;
    DROP TABLE IF EXISTS public.hospital_profiles CASCADE;
    DROP TABLE IF EXISTS public.other_profiles CASCADE;
    DROP TABLE IF EXISTS public.permissions CASCADE;

    -- Drop any additional tables that might exist (from other migrations or tests)
    DROP TABLE IF EXISTS public.ai_results CASCADE;
    DROP TABLE IF EXISTS public.shared_records CASCADE;

    -- Drop the main users table last (parent table)
    DROP TABLE IF EXISTS public.users CASCADE;

    -- Step 2: Enable pgcrypto extension (for UUID generation)
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- Step 3: Create all required tables (from schema.sql)
    -- Users table: stores wallet address and role only
    CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'hospital', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes on users table
    CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON public.users(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
    CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login);

    -- Public Profiles table: stores public display information for doctors/hospitals
    CREATE TABLE IF NOT EXISTS public.public_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    credentials TEXT,
    specialty TEXT,
    organization TEXT,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'hospital', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_public_profiles_wallet_address ON public.public_profiles(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_public_profiles_role ON public.public_profiles(role);

    -- Patient profiles table
    CREATE TABLE public.patient_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    profile_cipher BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Doctor profiles table
    CREATE TABLE public.doctor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    profile_cipher BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Hospital profiles table
    CREATE TABLE public.hospital_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    profile_cipher BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Other profiles table
    CREATE TABLE public.other_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    profile_cipher BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Permissions table: Midnight Access Control Mirror
    CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_wallet TEXT NOT NULL,
    requester_wallet TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    midnight_tx_id TEXT,
    midnight_proof TEXT,
    status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE INDEX IF NOT EXISTS idx_permissions_all ON public.permissions (patient_wallet, requester_wallet, resource_id);
    CREATE INDEX IF NOT EXISTS idx_permissions_status ON public.permissions (status);
    CREATE INDEX IF NOT EXISTS idx_permissions_expires ON public.permissions (expires_at) WHERE expires_at IS NOT NULL;

    -- Doctor-Patient Contacts table
    CREATE TABLE IF NOT EXISTS public.doctor_patient_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    patient_wallet TEXT NOT NULL,
    patient_name_cipher BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (doctor_wallet, patient_wallet)
    );

    CREATE INDEX IF NOT EXISTS idx_doctor_patient_contacts_doctor ON public.doctor_patient_contacts (doctor_wallet);
    CREATE INDEX IF NOT EXISTS idx_doctor_patient_contacts_patient ON public.doctor_patient_contacts (patient_wallet);

    -- Access Requests table
    CREATE TABLE IF NOT EXISTS public.access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    patient_wallet TEXT NOT NULL,
    patient_name TEXT,
    record_types TEXT[] NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    midnight_tx TEXT,
    zk_proof_hash TEXT,
    aiken_tx TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_access_requests_doctor ON public.access_requests (doctor_wallet);
    CREATE INDEX IF NOT EXISTS idx_access_requests_patient ON public.access_requests (patient_wallet);
    CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests (status);
    CREATE INDEX IF NOT EXISTS idx_access_requests_doctor_status ON public.access_requests (doctor_wallet, status);
    CREATE INDEX IF NOT EXISTS idx_access_requests_patient_status ON public.access_requests (patient_wallet, status);

    -- Saved Patients table
    CREATE TABLE IF NOT EXISTS public.saved_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    patient_wallet TEXT NOT NULL,
    alias TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (doctor_wallet, patient_wallet)
    );

    CREATE INDEX IF NOT EXISTS idx_saved_patients_doctor ON public.saved_patients (doctor_wallet);
    CREATE INDEX IF NOT EXISTS idx_saved_patients_patient ON public.saved_patients (patient_wallet);

    -- ============================================
    -- RESET COMPLETE
    -- ============================================
    -- All tables have been dropped and recreated
    -- You can now verify with: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
    -- ============================================

