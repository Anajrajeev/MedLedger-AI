/**
 * Database Setup Script
 * 
 * Creates the users table in Supabase Postgres
 * 
 * Usage: node scripts/setup-database.js
 * 
 * Make sure DATABASE_URL is set in your .env file
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

async function setupDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in environment variables");
    console.error("   Please set DATABASE_URL in your .env.local file");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("🔌 Connecting to database...");
    
    // Read schema file
    const schemaPath = path.join(__dirname, "..", "database", "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    console.log("📝 Executing schema...");
    
    // Execute schema
    await pool.query(schema);

    console.log("✅ Database setup complete!");
    console.log("   Table 'users' created successfully");
    console.log("   Indexes created");
    console.log("   pgcrypto extension enabled");

    // Test query
    const result = await pool.query("SELECT COUNT(*) FROM public.users");
    console.log(`   Current user count: ${result.rows[0].count}`);

  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();

