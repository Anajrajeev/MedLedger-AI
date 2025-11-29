/**
 * Generate a new AES-256-GCM encryption key for PROFILE_ENC_KEY
 * 
 * Usage: node scripts/generate-encryption-key.js
 */

const crypto = require("crypto");

const key = crypto.randomBytes(32).toString("hex");

console.log("\n🔐 Generated PROFILE_ENC_KEY:");
console.log("=".repeat(64));
console.log(key);
console.log("=".repeat(64));
console.log("\n✅ Copy this value to your .env file as PROFILE_ENC_KEY");
console.log("⚠️  Keep this key secure! Do not commit it to version control.\n");

