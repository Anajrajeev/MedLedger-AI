// src/aiken/walletSigning.ts
// CIP-30 Wallet Signing Integration for Aiken Transactions
// Provides utilities for building and signing transactions with user wallets (Eternl, etc.)

import { getLucidInstance } from "./lucidConfig";
import { getValidator } from "./validatorLoader";

export interface WalletSigningResult {
  txHash: string;
  success: boolean;
  error?: string;
}

/**
 * Build and submit a consent transaction using CIP-30 wallet
 * This requires the user to have Eternl (or compatible) wallet connected
 * 
 * @param walletApi - CIP-30 wallet API object (from window.cardano.eternl.enable())
 * @param datum - Serialized Plutus datum
 * @param validatorAddress - Validator script address
 * @param metadata - Transaction metadata
 * @returns Transaction hash if successful
 */
export async function buildAndSignConsentTransaction(
  walletApi: any,
  datum: string,
  validatorAddress: string,
  metadata: any
): Promise<WalletSigningResult> {
  try {
    console.log("[Wallet Signing] Building consent transaction...");
    console.log("[Wallet Signing] Validator address:", validatorAddress);

    // Get Lucid instance
    const lucid = await getLucidInstance();
    
    // Connect wallet to Lucid
    lucid.selectWallet(walletApi);
    
    // Get validator script
    const validator = getValidator();
    const script = validator.script as { type: "PlutusV2"; script: string };
    
    // Get wallet address
    const walletAddress = await lucid.wallet.address();
    console.log("[Wallet Signing] Wallet address:", walletAddress);

    // Minimum ADA to lock at script (1 ADA for testing, 2 ADA recommended)
    const minLovelace = 2_000_000n; // 2 ADA

    // Build transaction
    const tx = await lucid
      .newTx()
      .payToContract(validatorAddress, { inline: datum }, { lovelace: minLovelace })
      .attachMetadata(674, metadata[674])
      .complete();

    console.log("[Wallet Signing] Transaction built, requesting signature...");

    // Sign transaction
    const signedTx = await tx.sign().complete();
    
    console.log("[Wallet Signing] Transaction signed, submitting...");

    // Submit transaction
    const txHash = await signedTx.submit();
    
    console.log("[Wallet Signing] Transaction submitted:", txHash);
    console.log("[Wallet Signing] View on Preprod explorer:");
    console.log(`  https://preprod.cardanoscan.io/transaction/${txHash}`);

    return {
      txHash,
      success: true,
    };
  } catch (error) {
    console.error("[Wallet Signing] Error:", error);
    return {
      txHash: "",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if a CIP-30 wallet is available and connected
 */
export async function isWalletConnected(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false; // Server-side
  }

  try {
    const cardano = (window as any).cardano;
    if (!cardano) {
      return false;
    }

    // Check for Eternl or any CIP-30 compatible wallet
    const wallets = ["eternl", "nami", "flint", "typhon"];
    for (const walletName of wallets) {
      if (cardano[walletName] && await cardano[walletName].isEnabled()) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get available CIP-30 wallets
 */
export function getAvailableWallets(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const cardano = (window as any).cardano;
  if (!cardano) {
    return [];
  }

  const wallets = ["eternl", "nami", "flint", "typhon", "lace"];
  return wallets.filter((name) => cardano[name]);
}

/**
 * Connect to a CIP-30 wallet
 * @param walletName - Name of the wallet (eternl, nami, etc.)
 * @returns Wallet API object
 */
export async function connectWallet(walletName: string = "eternl"): Promise<any> {
  if (typeof window === "undefined") {
    throw new Error("Wallet connection only available in browser");
  }

  const cardano = (window as any).cardano;
  if (!cardano || !cardano[walletName]) {
    throw new Error(`Wallet ${walletName} not found. Please install it.`);
  }

  try {
    const api = await cardano[walletName].enable();
    console.log(`[Wallet] Connected to ${walletName}`);
    return api;
  } catch (error) {
    console.error(`[Wallet] Failed to connect to ${walletName}:`, error);
    throw error;
  }
}

/**
 * Wait for transaction confirmation on-chain
 * @param txHash - Transaction hash to wait for
 * @param maxAttempts - Maximum number of polling attempts (default 60 = 5 minutes)
 * @returns true if confirmed, false if timeout
 */
export async function waitForTxConfirmation(
  txHash: string,
  maxAttempts: number = 60
): Promise<boolean> {
  console.log("[Wallet] Waiting for transaction confirmation:", txHash);

  const lucid = await getLucidInstance();

  for (let i = 0; i < maxAttempts; i++) {
    try {
      await lucid.awaitTx(txHash);
      console.log("[Wallet] Transaction confirmed!");
      return true;
    } catch {
      // Not confirmed yet, wait 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.warn("[Wallet] Transaction confirmation timeout");
  return false;
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(walletApi: any): Promise<{ lovelace: bigint }> {
  try {
    const lucid = await getLucidInstance();
    lucid.selectWallet(walletApi);

    const utxos = await lucid.wallet.getUtxos();
    let totalLovelace = 0n;

    for (const utxo of utxos) {
      totalLovelace += utxo.assets.lovelace || 0n;
    }

    return { lovelace: totalLovelace };
  } catch (error) {
    console.error("[Wallet] Error getting balance:", error);
    return { lovelace: 0n };
  }
}

