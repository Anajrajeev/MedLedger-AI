// src/aiken/lucidConfig.ts
// Lucid Configuration for Cardano Preprod Testnet
// Provides connection to Blockfrost and wallet integration

// Use dynamic import for lucid-cardano (ESM module) to avoid CommonJS/ESM conflicts
type LucidModule = typeof import("lucid-cardano");

// Network configuration - PREPROD TESTNET ONLY
const NETWORK = "Preprod" as const;

// Environment variables for Blockfrost
const BLOCKFROST_URL = process.env.BLOCKFROST_API_URL || "https://cardano-preprod.blockfrost.io/api/v0";
const BLOCKFROST_PROJECT_ID = process.env.BLOCKFROST_API_KEY || process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || "";

// Singleton Lucid instance
let lucidInstance: Awaited<ReturnType<LucidModule["Lucid"]["new"]>> | null = null;

/**
 * Get or create a Lucid instance connected to Preprod Testnet
 * This is used for backend operations (no wallet signing)
 * 
 * @returns Lucid instance configured for Preprod
 */
export async function getLucidInstance() {
  if (lucidInstance) {
    return lucidInstance;
  }

  if (!BLOCKFROST_PROJECT_ID) {
    console.warn("[Lucid Config] WARNING: No Blockfrost API key configured. Using stub mode.");
    console.warn("[Lucid Config] Set BLOCKFROST_API_KEY in .env.local for real blockchain integration.");
    throw new Error("Blockfrost API key not configured. Set BLOCKFROST_API_KEY environment variable.");
  }

  try {
    console.log("[Lucid Config] Initializing Lucid for Preprod Testnet...");
    console.log("[Lucid Config] Blockfrost URL:", BLOCKFROST_URL);
    console.log("[Lucid Config] Blockfrost Project ID:", BLOCKFROST_PROJECT_ID.substring(0, 15) + "...");
    
    // Dynamic import to handle ESM module
    const { Blockfrost, Lucid } = await import("lucid-cardano");
    
    // Create Blockfrost provider with explicit URL
    // Note: Lucid's Blockfrost expects the base URL + /api/v0
    const provider = new Blockfrost(
      `${BLOCKFROST_URL}`,
      BLOCKFROST_PROJECT_ID
    );

    console.log("[Lucid Config] Provider URL:", BLOCKFROST_URL);

    lucidInstance = await Lucid.new(provider, NETWORK);
    
    console.log("[Lucid Config] Lucid initialized successfully");
    console.log("[Lucid Config] Network:", NETWORK);
    
    return lucidInstance;
  } catch (error) {
    console.error("[Lucid Config] Failed to initialize Lucid:", error);
    console.error("[Lucid Config] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Check if Lucid is properly configured
 * @returns true if Blockfrost API key is set
 */
export function isLucidConfigured(): boolean {
  return !!BLOCKFROST_PROJECT_ID && BLOCKFROST_PROJECT_ID.length > 0;
}

/**
 * Get the network being used
 * @returns The Cardano network (always Preprod for this implementation)
 */
export function getNetwork(): string {
  return NETWORK;
}

/**
 * Reset the Lucid instance (useful for testing)
 */
export function resetLucidInstance(): void {
  lucidInstance = null;
}

/**
 * Get Blockfrost configuration status
 */
export function getBlockfrostStatus(): {
  configured: boolean;
  network: string;
  url: string;
} {
  return {
    configured: isLucidConfigured(),
    network: NETWORK,
    url: BLOCKFROST_URL,
  };
}

