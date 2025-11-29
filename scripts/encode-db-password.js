/**
 * URL-encode a database password for use in connection strings
 * 
 * Usage: node scripts/encode-db-password.js "your password here"
 * 
 * Special characters that need encoding:
 * - * = %2A
 * - @ = %40
 * - : = %3A
 * - / = %2F
 * - ? = %3F
 * - # = %23
 * - [ = %5B
 * - ] = %5D
 */

const password = process.argv[2];

if (!password) {
  console.error("❌ Please provide a password as an argument");
  console.error("   Usage: node scripts/encode-db-password.js \"your password\"");
  process.exit(1);
}

// encodeURIComponent doesn't encode asterisk (*), so we need to handle it manually
// for PostgreSQL connection strings
let encoded = encodeURIComponent(password);
// Manually encode asterisk if present (some parsers have issues with it)
encoded = encoded.replace(/\*/g, "%2A");

console.log("\n🔐 Password Encoding Helper");
console.log("=".repeat(50));
console.log(`Original:  ${password}`);
console.log(`Encoded:   ${encoded}`);
console.log("=".repeat(50));
console.log("\n✅ Use the encoded version in your DATABASE_URL:");
console.log(`\n   DATABASE_URL=postgresql://postgres:${encoded}@your-host:5432/postgres\n`);

