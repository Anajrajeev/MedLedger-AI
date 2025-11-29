/**
 * Complete Database Reset Script
 * 
 * Drops ALL tables in the public schema and recreates them from scratch
 * 
 * Usage: node scripts/reset-database.js
 * 
 * WARNING: This will DELETE ALL DATA in the public schema!
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

async function resetDatabase() {
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
    
    // Read reset script
    const resetScriptPath = path.join(__dirname, "..", "database", "reset-database.sql");
    const resetScript = fs.readFileSync(resetScriptPath, "utf8");

    console.log("⚠️  WARNING: This will DELETE ALL DATA in the public schema!");
    console.log("📝 Executing database reset...");
    
    // Execute reset script
    await pool.query(resetScript);

    console.log("✅ Database reset complete!");
    console.log("   All tables dropped and recreated");
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Created ${result.rows.length} tables:`);
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

  } catch (error) {
    console.error("❌ Database reset failed:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDatabase();

