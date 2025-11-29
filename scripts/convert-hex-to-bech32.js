// scripts/convert-hex-to-bech32.js
// Convert existing hex addresses in database to bech32

const { Pool } = require("pg");
const CSL = require("@emurgo/cardano-serialization-lib-nodejs");
require("dotenv").config({ path: ".env.local" });

async function convertAddresses() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("🔄 Converting hex addresses to bech32...\n");

    // Get all users
    const usersResult = await pool.query(`
      SELECT id, wallet_address, role
      FROM public.users
    `);

    if (usersResult.rows.length === 0) {
      console.log("❌ No users found");
      await pool.end();
      return;
    }

    for (const user of usersResult.rows) {
      const hexAddress = user.wallet_address;
      
      // Check if already bech32
      if (hexAddress.startsWith('addr1') || hexAddress.startsWith('addr_test1')) {
        console.log(`✅ User ${user.id} already has bech32 address`);
        continue;
      }

      try {
        // Convert hex to bech32
        const addressBytes = Buffer.from(hexAddress, 'hex');
        const address = CSL.Address.from_bytes(addressBytes);
        const bech32Address = address.to_bech32();

        console.log(`\n📝 Converting user ${user.id}:`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Old (hex): ${hexAddress.substring(0, 30)}...`);
        console.log(`   New (bech32): ${bech32Address}`);

        // Update users table
        await pool.query(
          `UPDATE public.users SET wallet_address = $1 WHERE id = $2`,
          [bech32Address, user.id]
        );

        // Update role-specific profile table
        let profileTable = "";
        switch (user.role) {
          case "patient":
            profileTable = "public.patient_profiles";
            break;
          case "doctor":
            profileTable = "public.doctor_profiles";
            break;
          case "hospital":
            profileTable = "public.hospital_profiles";
            break;
          case "other":
            profileTable = "public.other_profiles";
            break;
        }

        if (profileTable) {
          const profileCheck = await pool.query(
            `SELECT 1 FROM ${profileTable} WHERE wallet_address = $1`,
            [hexAddress]
          );

          if (profileCheck.rows.length > 0) {
            await pool.query(
              `UPDATE ${profileTable} SET wallet_address = $1 WHERE wallet_address = $2`,
              [bech32Address, hexAddress]
            );
            console.log(`   ✅ Updated profile in ${profileTable}`);
          }
        }

        // Update access_requests table
        await pool.query(
          `UPDATE public.access_requests 
           SET doctor_wallet = $1 
           WHERE doctor_wallet = $2`,
          [bech32Address, hexAddress]
        );

        await pool.query(
          `UPDATE public.access_requests 
           SET patient_wallet = $1 
           WHERE patient_wallet = $2`,
          [bech32Address, hexAddress]
        );

        // Update saved_patients table
        await pool.query(
          `UPDATE public.saved_patients 
           SET doctor_wallet = $1 
           WHERE doctor_wallet = $2`,
          [bech32Address, hexAddress]
        );

        await pool.query(
          `UPDATE public.saved_patients 
           SET patient_wallet = $1 
           WHERE patient_wallet = $2`,
          [bech32Address, hexAddress]
        );

        console.log(`   ✅ Updated all references`);
      } catch (conversionError) {
        console.error(`   ❌ Failed to convert address for user ${user.id}:`, conversionError.message);
      }
    }

    console.log("\n✅ Conversion complete!");
    
    // Verify
    const verifyResult = await pool.query(`
      SELECT wallet_address, role
      FROM public.users
    `);

    console.log("\n📋 Current addresses:");
    verifyResult.rows.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.role}: ${user.wallet_address}`);
    });

    await pool.end();
  } catch (error) {
    console.error("❌ Error converting addresses:", error);
    process.exit(1);
  }
}

convertAddresses();

