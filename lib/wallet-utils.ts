/**
 * Wallet connection utilities for Eternl Cardano wallet
 */

import type { CardanoWalletApi } from "@/types/window";

/**
 * Helper function to get any available address from wallet
 * Tries multiple CIP-30 methods in order of preference
 */
export async function getWalletAddress(
  api: CardanoWalletApi
): Promise<string | null> {
  try {
    // First, try to get used addresses (preferred)
    const used = await api.getUsedAddresses();
    console.log("getUsedAddresses returned:", used);
    if (used && used.length > 0) {
      const address = used[0];
      console.log("Using address from getUsedAddresses:", address.substring(0, 20) + "...", "Type:", address.startsWith("addr1") || address.startsWith("addr_test1") ? "bech32" : "hex");
      return address;
    }

    // Fallback to unused addresses
    const unused = await api.getUnusedAddresses();
    console.log("getUnusedAddresses returned:", unused);
    if (unused && unused.length > 0) {
      const address = unused[0];
      console.log("Using address from getUnusedAddresses:", address.substring(0, 20) + "...", "Type:", address.startsWith("addr1") || address.startsWith("addr_test1") ? "bech32" : "hex");
      return address;
    }

    // Last resort: get change address
    const changeAddress = await api.getChangeAddress();
    console.log("getChangeAddress returned:", changeAddress);
    if (changeAddress) {
      console.log("Using change address:", changeAddress.substring(0, 20) + "...", "Type:", changeAddress.startsWith("addr1") || changeAddress.startsWith("addr_test1") ? "bech32" : "hex");
      return changeAddress;
    }

    return null;
  } catch (err) {
    console.error("Error fetching wallet address", err);
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
    const address = await getWalletAddress(api);

    if (!address) {
      throw new Error(
        "Unable to retrieve wallet address. Please ensure your wallet is set up correctly."
      );
    }

    return { api, address };
  } catch (err: any) {
    console.error("Failed to connect Eternl wallet", err);
    
    // Provide more helpful error messages
    if (err?.code === 1 || err?.message?.includes("User reject")) {
      throw new Error("Connection cancelled. Please try again and select an account.");
    }
    
    throw err;
  }
}

