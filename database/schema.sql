-- Drop existing users table if it exists
DROP TABLE IF EXISTS public.users;

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table with wallet address as identity
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Wallet address is the user's identity (unique constraint)
  wallet_address TEXT NOT NULL UNIQUE,
  
  -- Encrypted JSON blob of all profile data (AES-256-GCM)
  profile_cipher BYTEA NOT NULL,
  
  -- Track last login for analytics
  last_login TIMESTAMPTZ DEFAULT NOW(),
  
  -- Track account creation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on wallet_address for fast lookups
CREATE INDEX idx_users_wallet_address ON public.users(wallet_address);

-- Create index on last_login for analytics queries
CREATE INDEX idx_users_last_login ON public.users(last_login);

