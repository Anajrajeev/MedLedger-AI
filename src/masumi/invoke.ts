/**
 * Masumi Gateway Integration
 * 
 * Invokes agents through Masumi Gateway
 */

// Using built-in fetch (Node.js 18+)

const GATEWAY = process.env.MASUMI_GATEWAY_URL;
const MASUMI_API_KEY = process.env.MASUMI_API_KEY;

export async function invokeAgent(agentId: string, payload: any) {
  if (!GATEWAY || GATEWAY === "<placeholder>" || GATEWAY === "") {
    throw new Error("Masumi Gateway URL not configured. Please set MASUMI_GATEWAY_URL in .env.local");
  }

  if (!MASUMI_API_KEY || MASUMI_API_KEY === "<placeholder>" || MASUMI_API_KEY === "") {
    throw new Error("Masumi API Key not configured. Please set MASUMI_API_KEY in .env.local");
  }

  if (!agentId || agentId === "<placeholder>" || agentId === "") {
    throw new Error("Agent ID is required and must be configured");
  }

  const url = `${GATEWAY}/v1/agents/${agentId}/invoke`;
  console.log(`[Masumi] Invoking agent ${agentId} at ${url}`);

  try {
    const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MASUMI_API_KEY}`,
      "Content-Type": "application/json",
    },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Agent invocation failed (${res.status}): ${errorText}`);
    }

    return res.json();
  } catch (error: any) {
    if (error.code === "ENOTFOUND" || error.message?.includes("getaddrinfo")) {
      throw new Error(`Cannot reach Masumi Gateway at ${GATEWAY}. Please verify the URL is correct and the service is available.`);
    }
    throw error;
  }
}

