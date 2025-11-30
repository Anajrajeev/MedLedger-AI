/**
 * Migration script to add user_files and shared_files tables
 * Run with: node scripts/migrate-records-tables.js
 */

const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("📁 Creating user_files table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
        drive_file_id TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('insurance', 'lab-results', 'consultations', 'prescriptions')),
        original_name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log("📁 Creating indexes for user_files...");
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_files_owner_wallet ON public.user_files(owner_wallet);
      CREATE INDEX IF NOT EXISTS idx_user_files_category ON public.user_files(category);
      CREATE INDEX IF NOT EXISTS idx_user_files_drive_file_id ON public.user_files(drive_file_id);
    `);

    console.log("📁 Creating shared_files table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.shared_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID NOT NULL REFERENCES public.user_files(id) ON DELETE CASCADE,
        doctor_wallet TEXT NOT NULL,
        encrypted_blob TEXT NOT NULL,
        expiry TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log("📁 Creating indexes for shared_files...");
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shared_files_file_id ON public.shared_files(file_id);
      CREATE INDEX IF NOT EXISTS idx_shared_files_doctor_wallet ON public.shared_files(doctor_wallet);
      CREATE INDEX IF NOT EXISTS idx_shared_files_expiry ON public.shared_files(expiry);
    `);

    await client.query("COMMIT");
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // Ignore rollback errors if connection is already closed
    }
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    try {
      client.release();
    } catch (releaseError) {
      // Ignore release errors
    }
    try {
      await pool.end();
    } catch (endError) {
      // Ignore pool end errors - connection may already be closed
      // This is common with Supabase connection pooling
    }
  }
}

migrate();

