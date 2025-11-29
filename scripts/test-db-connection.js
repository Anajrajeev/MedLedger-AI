/**
 * Test database connection
 * 
 * This script helps diagnose database connection issues
 */

require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const dns = require("dns").promises;

async function testConnection() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in .env.local");
    process.exit(1);
  }

  // Parse connection string
  const url = new URL(process.env.DATABASE_URL);
  const hostname = url.hostname;
  const port = url.port || 5432;

  console.log("🔍 Testing Database Connection");
  console.log("=".repeat(50));
  console.log(`Hostname: ${hostname}`);
  console.log(`Port: ${port}`);
  console.log(`Database: ${url.pathname.slice(1)}`);
  console.log(`User: ${url.username}`);
  console.log("=".repeat(50));

  // Test DNS resolution
  console.log("\n1️⃣ Testing DNS resolution...");
  try {
    const addresses = await dns.resolve4(hostname);
    console.log(`✅ DNS resolved: ${addresses.join(", ")}`);
  } catch (error) {
    console.error(`❌ DNS resolution failed: ${error.message}`);
    console.error("\n💡 Possible issues:");
    console.error("   - Hostname is incorrect");
    console.error("   - Supabase project doesn't exist");
    console.error("   - Network/DNS issue");
    console.error("\n📝 To fix:");
    console.error("   1. Go to your Supabase project dashboard");
    console.error("   2. Settings → Database");
    console.error("   3. Copy the correct connection string");
    process.exit(1);
  }

  // Test TCP connection
  console.log("\n2️⃣ Testing TCP connection...");
  const net = require("net");
  const socket = new net.Socket();
  
  await new Promise((resolve, reject) => {
    socket.setTimeout(5000);
    socket.once("connect", () => {
      console.log(`✅ TCP connection successful to ${hostname}:${port}`);
      socket.destroy();
      resolve();
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("Connection timeout"));
    });
    socket.once("error", (err) => {
      socket.destroy();
      reject(err);
    });
    socket.connect(port, hostname);
  }).catch((error) => {
    console.error(`❌ TCP connection failed: ${error.message}`);
    console.error("\n💡 Possible issues:");
    console.error("   - Port 5432 is blocked by firewall");
    console.error("   - Supabase database is not accessible");
    process.exit(1);
  });

  // Test PostgreSQL connection
  console.log("\n3️⃣ Testing PostgreSQL authentication...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW(), version()");
    client.release();
    console.log("✅ PostgreSQL connection successful!");
    console.log(`   Server time: ${result.rows[0].now}`);
    console.log(`   PostgreSQL version: ${result.rows[0].version.split(" ")[0]} ${result.rows[0].version.split(" ")[1]}`);
    
    // Test if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log("✅ Users table exists");
    } else {
      console.log("⚠️  Users table does not exist (run: npm run db:setup)");
    }
    
    await pool.end();
    console.log("\n✨ All connection tests passed!");
  } catch (error) {
    console.error(`❌ PostgreSQL authentication failed: ${error.message}`);
    console.error("\n💡 Possible issues:");
    if (error.message.includes("password")) {
      console.error("   - Password is incorrect");
      console.error("   - Password encoding issue (special characters need URL encoding)");
    } else if (error.message.includes("does not exist")) {
      console.error("   - Database does not exist");
    } else {
      console.error("   - Authentication failed");
    }
    await pool.end();
    process.exit(1);
  }
}

testConnection().catch((error) => {
  console.error("\n❌ Test failed:", error.message);
  process.exit(1);
});

