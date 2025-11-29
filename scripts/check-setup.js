/**
 * Check and setup database and encryption key before starting dev server
 * 
 * This script:
 * 1. Checks if PROFILE_ENC_KEY exists, generates one if missing
 * 2. Checks if database table exists, creates it if missing
 * 3. Exits with code 0 if everything is ready
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

async function checkAndSetup() {
  let needsSetup = false;
  const errors = [];

  // Check encryption key
  const existingKey = process.env.PROFILE_ENC_KEY?.trim();
  const isValidKey = existingKey && existingKey.length === 64 && /^[0-9a-fA-F]+$/.test(existingKey);
  
  if (!existingKey || !isValidKey) {
    if (existingKey && !isValidKey) {
      console.log("🔑 PROFILE_ENC_KEY is invalid format, generating new key...");
    } else {
      console.log("🔑 PROFILE_ENC_KEY not found, generating new key...");
    }
    
    const key = crypto.randomBytes(32).toString("hex");
    
    // Read existing .env.local or create new
    const envPath = path.join(process.cwd(), ".env.local");
    let envContent = "";
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
      // Ensure file ends with newline
      if (!envContent.endsWith("\n")) {
        envContent += "\n";
      }
    }
    
    // Add or update PROFILE_ENC_KEY
    if (envContent.includes("PROFILE_ENC_KEY=")) {
      envContent = envContent.replace(
        /PROFILE_ENC_KEY=.*/g,
        `PROFILE_ENC_KEY=${key}`
      );
    } else {
      envContent += `PROFILE_ENC_KEY=${key}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Generated and saved PROFILE_ENC_KEY to .env.local");
    needsSetup = true;
    
    // Update process.env for current session
    process.env.PROFILE_ENC_KEY = key;
  } else {
    console.log("✅ PROFILE_ENC_KEY is set and valid");
  }

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

  // Report critical errors (should be none now since we auto-fix PROFILE_ENC_KEY)
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

