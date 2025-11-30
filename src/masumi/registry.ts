/**
 * Masumi Registry Integration
 * 
 * Fetches agent metadata from Masumi Registry
 */

// Using built-in fetch (Node.js 18+)

const REGISTRY_URL = process.env.MASUMI_REGISTRY_URL;
const MASUMI_API_KEY = process.env.MASUMI_API_KEY;

export async function getAgentMetadata(agentId: string) {
  if (!REGISTRY_URL || REGISTRY_URL === "<placeholder>" || REGISTRY_URL === "") {
    throw new Error("Masumi Registry URL not configured. Please set MASUMI_REGISTRY_URL in .env.local");
  }

  if (!MASUMI_API_KEY || MASUMI_API_KEY === "<placeholder>" || MASUMI_API_KEY === "") {
    throw new Error("Masumi API Key not configured. Please set MASUMI_API_KEY in .env.local");
  }

  const res = await fetch(`${REGISTRY_URL}/v1/agents/${agentId}`, {
    headers: {
      "Authorization": `Bearer ${MASUMI_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Registry lookup failed: ${text}`);
  }

  return res.json();
}

