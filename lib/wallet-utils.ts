/**
 * Wallet connection utilities for Eternl Cardano wallet
 */

import type { CardanoWalletApi } from "@/types/window";

/**
 * Lazy load the address conversion utility to avoid WebAssembly loading issues
 */
async function convertToBech32(address: string): Promise<string> {
  // Check if already bech32
  if (address.startsWith('addr1') || address.startsWith('addr_test1')) {
    return address;
  }
  
  // Dynamically import to avoid loading WASM on server
  const { normalizeAddressToBech32 } = await import('./cardano-address');
  return await normalizeAddressToBech32(address);
}

/**
 * Helper function to get any available address from wallet
 * Tries multiple CIP-30 methods in order of preference
 * 
 * IMPORTANT: Returns the address in whatever format the wallet provides.
 * Eternl returns hex-encoded CBOR from getUsedAddresses() and bech32 from getChangeAddress().
 * We need to be consistent about which format we use.
 */
export async function getWalletAddress(
  api: CardanoWalletApi
): Promise<string | null> {
  try {
    // First, try to get used addresses (preferred for registered wallets)
    const used = await api.getUsedAddresses();
    console.log("[Wallet] getUsedAddresses returned:", {
      count: used?.length || 0,
      firstAddress: used && used.length > 0 ? used[0].substring(0, 30) + "..." : null,
      length: used && used.length > 0 ? used[0].length : 0,
      format: used && used.length > 0 ? (used[0].startsWith("addr") ? "bech32" : "hex") : "none",
    });
    
    if (used && used.length > 0) {
      const address = used[0];
      console.log("[Wallet] Using address from getUsedAddresses:", {
        preview: address.substring(0, 30) + "...",
        length: address.length,
        format: address.startsWith("addr1") || address.startsWith("addr_test1") ? "bech32" : "hex"
      });
      return address;
    }

    // Fallback to unused addresses
    const unused = await api.getUnusedAddresses();
    console.log("[Wallet] getUnusedAddresses returned:", {
      count: unused?.length || 0,
      firstAddress: unused && unused.length > 0 ? unused[0].substring(0, 30) + "..." : null,
      length: unused && unused.length > 0 ? unused[0].length : 0,
      format: unused && unused.length > 0 ? (unused[0].startsWith("addr") ? "bech32" : "hex") : "none",
    });
    
    if (unused && unused.length > 0) {
      const address = unused[0];
      console.log("[Wallet] Using address from getUnusedAddresses:", {
        preview: address.substring(0, 30) + "...",
        length: address.length,
        format: address.startsWith("addr1") || address.startsWith("addr_test1") ? "bech32" : "hex"
      });
      return address;
    }

    // Last resort: get change address
    const changeAddress = await api.getChangeAddress();
    console.log("[Wallet] getChangeAddress returned:", {
      address: changeAddress ? changeAddress.substring(0, 30) + "..." : null,
      length: changeAddress ? changeAddress.length : 0,
      format: changeAddress && (changeAddress.startsWith("addr1") || changeAddress.startsWith("addr_test1")) ? "bech32" : "hex",
    });
    
    if (changeAddress) {
      console.log("[Wallet] Using change address:", {
        preview: changeAddress.substring(0, 30) + "...",
        length: changeAddress.length,
        format: changeAddress.startsWith("addr1") || changeAddress.startsWith("addr_test1") ? "bech32" : "hex"
      });
      return changeAddress;
    }

    return null;
  } catch (err) {
    console.error("[Wallet] Error fetching wallet address", err);
    return null;
  }
}

/**
 * Connect to Eternl wallet and return the API and address
 * @param forceReconnect - If true, will attempt to force account reselection
 */
export async function connectEternlWallet(
  forceReconnect: boolean = false
): Promise<{
  api: CardanoWalletApi;
  address: string;
} | null> {
  if (typeof window === "undefined") return null;

  const eternl = window.cardano?.eternl;
  if (!eternl) {
    throw new Error("Eternl wallet not detected");
  }

  try {
    // Check if wallet is already enabled
    const isEnabled = await eternl.isEnabled?.();
    
    // If already enabled and we want to force reconnect, we need to handle it differently
    // Note: CIP-30 doesn't have a standard "disable" method, so we rely on the wallet
    // to show the account selection dialog when enable() is called again
    if (isEnabled && forceReconnect) {
      // Some wallets might need a small delay or the enable() call might still work
      // Eternl should show the account selection if called again
      console.log("Wallet already enabled, attempting to reconnect for account selection...");
    }

    const api = await eternl.enable();
    const rawAddress = await getWalletAddress(api);

    if (!rawAddress) {
      throw new Error(
        "Unable to retrieve wallet address. Please ensure your wallet is set up correctly."
      );
    }

    // ALWAYS convert to bech32 format for consistency
    console.log("[Wallet] Converting address to bech32 format...");
    const bech32Address = await convertToBech32(rawAddress);
    
    console.log("[Wallet] Final address:", {
      raw: rawAddress.substring(0, 30) + "...",
      bech32: bech32Address.substring(0, 30) + "...",
      rawLength: rawAddress.length,
      bech32Length: bech32Address.length,
    });

    return { api, address: bech32Address };
  } catch (err: any) {
    console.error("Failed to connect Eternl wallet", err);
    
    // Provide more helpful error messages
    if (err?.code === 1 || err?.message?.includes("User reject")) {
      throw new Error("Connection cancelled. Please try again and select an account.");
    }
    
    throw err;
  }
}

