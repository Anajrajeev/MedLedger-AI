/**
 * Test Explainer Agent Endpoint
 * Quick test to verify the endpoint is accessible
 */

require("dotenv").config({ path: ".env.local" });

const EXPLAINER_AGENT_ENDPOINT = process.env.EXPLAINER_AGENT_ENDPOINT;

async function testEndpoint() {
  if (!EXPLAINER_AGENT_ENDPOINT) {
    console.error("❌ EXPLAINER_AGENT_ENDPOINT not set in .env.local");
    process.exit(1);
  }

  console.log("🧪 Testing Explainer Agent Endpoint");
  console.log(`📍 Endpoint: ${EXPLAINER_AGENT_ENDPOINT}`);
  console.log("");

  const testPayload = {
    identifierFromPurchaser: `test-${Date.now()}`,
    input_data: {
      patient_id: "P-001",
      record_text: "Patient: 30 years old, male. Blood Pressure: 118/75 mmHg. Glucose: 92 mg/dL. Heart Rate: 70 bpm. No significant medical history. Physical examination normal.",
      metadata: {
        timestamp: Math.floor(Date.now() / 1000),
        source: "test"
      }
    }
  };

  const endpoints = [
    `${EXPLAINER_AGENT_ENDPOINT.replace(/\/+$/, "")}/start_job`,
    `${EXPLAINER_AGENT_ENDPOINT.replace(/\/+$/, "")}/start_job?Content-Type=application/json`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔗 Testing: ${endpoint}`);
      console.log(`📤 Request payload:`, JSON.stringify(testPayload, null, 2));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
      console.log(`📥 Response Headers:`, Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log(`📥 Response Body (first 500 chars):`, responseText.substring(0, 500));

      if (response.ok) {
        try {
          const json = JSON.parse(responseText);
          console.log(`\n✅ SUCCESS! Endpoint is working.`);
          console.log(`📊 Response structure:`, {
            hasJobId: !!json.job_id,
            hasStatus: !!json.status,
            hasResult: !!json.result,
            resultKeys: json.result ? Object.keys(json.result) : [],
          });
          process.exit(0);
        } catch (e) {
          console.log(`\n⚠️  Response is not JSON, but status is OK`);
          process.exit(0);
        }
      } else {
        console.log(`\n❌ Endpoint returned error status: ${response.status}`);
        if (response.status === 404) {
          console.log(`   This endpoint path doesn't exist.`);
        } else if (response.status === 400) {
          console.log(`   Bad request - check the payload format.`);
        } else if (response.status === 500) {
          console.log(`   Server error - service might be down or having issues.`);
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log(`\n⏱️  Timeout: Endpoint didn't respond within 30 seconds`);
        console.log(`   This usually means the service is down or unreachable.`);
      } else if (error.code === "ENOTFOUND" || error.message?.includes("getaddrinfo")) {
        console.log(`\n🌐 DNS Error: Cannot resolve hostname`);
        console.log(`   Check if the URL is correct: ${endpoint}`);
      } else {
        console.log(`\n❌ Error: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
      }
    }
  }

  console.log(`\n❌ All endpoint attempts failed.`);
  process.exit(1);
}

testEndpoint().catch(error => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});

