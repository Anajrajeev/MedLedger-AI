/**
 * Database Connection (Supabase Postgres)
 * 
 * Backend NEVER decrypts data - only stores/retrieves ciphertext
 */

import { Pool } from "pg";
import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not found. Some features may not work.");
  // Don't throw error - allow server to start for testing
}

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : (null as any); // Will be created when DATABASE_URL is available

// Handle pool errors (if pool exists)
if (pool) {
  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
    process.exit(-1);
  });
}

/**
 * Execute a query with error handling
 */
export async function query(text: string, params?: any[]) {
  if (!pool) {
    throw new Error("Database not configured. Please set DATABASE_URL in .env.local");
  }
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error("Query error", { text, error });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient() {
  if (!pool) {
    throw new Error("Database not configured. Please set DATABASE_URL in .env.local");
  }
  return await pool.connect();
}

