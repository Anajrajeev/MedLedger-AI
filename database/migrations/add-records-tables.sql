-- Add user_files and shared_files tables for Patient Records feature

-- User Files table: stores metadata for encrypted files stored in Backblaze B2
CREATE TABLE IF NOT EXISTS public.user_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('insurance', 'lab-results', 'consultations', 'prescriptions')),
  original_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_files_owner_wallet ON public.user_files(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_user_files_category ON public.user_files(category);
CREATE INDEX IF NOT EXISTS idx_user_files_drive_file_id ON public.user_files(drive_file_id);

-- Shared Files table: tracks files shared with doctors
CREATE TABLE IF NOT EXISTS public.shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.user_files(id) ON DELETE CASCADE,
  doctor_wallet TEXT NOT NULL,
  encrypted_blob TEXT NOT NULL,  -- base64 of ECIES-encrypted file (encrypted for doctor's public key)
  expiry TIMESTAMPTZ,             -- NULL = indefinite access
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_shared_files_file_id ON public.shared_files(file_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_doctor_wallet ON public.shared_files(doctor_wallet);
CREATE INDEX IF NOT EXISTS idx_shared_files_expiry ON public.shared_files(expiry);

