// scripts/check-users.js
// Helper script to check what users are in the database

const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function checkUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("🔍 Checking users in database...\n");

    const result = await pool.query(`
      SELECT 
        id,
        wallet_address,
        role,
        created_at,
        last_login,
        LENGTH(wallet_address) as address_length,
        SUBSTRING(wallet_address, 1, 20) || '...' || SUBSTRING(wallet_address, LENGTH(wallet_address) - 10) as short_address
      FROM public.users 
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log("❌ No users found in database");
    } else {
      console.log(`✅ Found ${result.rows.length} user(s):\n`);
      result.rows.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Address (short): ${user.short_address}`);
        console.log(`  Address Length: ${user.address_length}`);
        console.log(`  Created: ${user.created_at}`);
        console.log(`  Last Login: ${user.last_login || "Never"}`);
        console.log(`  Full Address: ${user.wallet_address}`);
        console.log("");
      });

      // Check for potential duplicates (addresses that are similar but not identical)
      const duplicateCheck = await pool.query(`
        SELECT 
          wallet_address,
          COUNT(*) as count
        FROM public.users
        GROUP BY wallet_address
        HAVING COUNT(*) > 1
      `);

      if (duplicateCheck.rows.length > 0) {
        console.log("⚠️  WARNING: Found duplicate wallet addresses:");
        duplicateCheck.rows.forEach((dup) => {
          console.log(`  ${dup.wallet_address}: ${dup.count} entries`);
        });
      }
    }

    await pool.end();
  } catch (error) {
    console.error("❌ Error checking users:", error);
    process.exit(1);
  }
}

checkUsers();

