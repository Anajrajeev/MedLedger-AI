/**
 * Check and setup database before starting dev server
 * 
 * This script:
 * 1. Checks if database tables exist, creates them if missing
 * 2. Exits with code 0 if everything is ready
 * 
 * Note: Encryption is handled on frontend using wallet signatures.
 * No server-side encryption keys are needed.
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

async function checkAndSetup() {
  let needsSetup = false;
  const errors = [];

  // Note: Encryption keys are now derived on frontend from wallet signatures
  // No server-side encryption keys needed
  console.log("✅ Encryption handled on frontend (no server keys needed)");

  // Check database connection and table
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === "") {
    console.warn("⚠️  DATABASE_URL not found in .env.local");
    console.warn("   Database setup will be skipped. Add DATABASE_URL to enable database features.");
  } else {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    try {
      // Check if users table exists
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);

      if (!result.rows[0].exists) {
        console.log("📊 Database table not found, creating schema...");
        
        // Read and execute schema
        const schemaPath = path.join(__dirname, "..", "database", "schema.sql");
        const schema = fs.readFileSync(schemaPath, "utf8");
        await pool.query(schema);
        
        console.log("✅ Database schema created");
        needsSetup = true;
      } else {
        console.log("✅ Database table exists");
      }
    } catch (error) {
      console.warn(`⚠️  Database check failed: ${error.message}`);
      console.warn("   Make sure DATABASE_URL is correct and database is accessible.");
      // Don't fail completely, just warn
    } finally {
      await pool.end();
    }
  }

  // Report critical errors
  if (errors.length > 0) {
    console.error("\n❌ Critical setup errors:");
    errors.forEach((err) => console.error(`   - ${err}`));
    console.error("\nPlease fix these errors and try again.\n");
    process.exit(1);
  }

  if (needsSetup) {
    console.log("\n✨ Setup complete! Starting dev server...\n");
  } else {
    console.log("✅ Everything is ready. Starting dev server...\n");
  }
  
  // Exit with success code to allow dev server to start
  process.exit(0);
}

checkAndSetup().catch((error) => {
  console.error("❌ Setup failed:", error.message);
  process.exit(1);
});

