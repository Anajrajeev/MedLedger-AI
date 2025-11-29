/**
 * Quick DNS test for Supabase hostname
 */

const dns = require("dns").promises;

const hostname = "db.lcewspeexqncnahwjxcv.supabase.co";

async function testDNS() {
  console.log(`Testing DNS resolution for: ${hostname}\n`);
  
  try {
    // Try IPv4
    console.log("1️⃣ Trying IPv4 (A record)...");
    try {
      const ipv4 = await dns.resolve4(hostname);
      console.log(`✅ IPv4 resolved: ${ipv4.join(", ")}`);
    } catch (err) {
      console.log(`❌ IPv4 failed: ${err.message}`);
    }
    
    // Try IPv6
    console.log("\n2️⃣ Trying IPv6 (AAAA record)...");
    try {
      const ipv6 = await dns.resolve6(hostname);
      console.log(`✅ IPv6 resolved: ${ipv6.join(", ")}`);
    } catch (err) {
      console.log(`❌ IPv6 failed: ${err.message}`);
    }
    
    // Try both
    console.log("\n3️⃣ Trying any address...");
    try {
      const any = await dns.lookup(hostname, { all: true });
      console.log(`✅ Found addresses:`);
      any.forEach(addr => {
        console.log(`   ${addr.address} (${addr.family === 4 ? 'IPv4' : 'IPv6'})`);
      });
    } catch (err) {
      console.log(`❌ Lookup failed: ${err.message}`);
      console.log("\n💡 This hostname is IPv6-only. You need to use Session Pooler.");
      console.log("   Go to Supabase → Settings → Database → Change to 'Session Pooler'");
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testDNS();

