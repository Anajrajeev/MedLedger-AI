/* Global types for Cardano CIP-30 wallet APIs (Eternl) */

export interface CardanoWalletApi {
  getUsedAddresses: () => Promise<string[]>;
  getUnusedAddresses: () => Promise<string[]>;
  getChangeAddress: () => Promise<string | null>;
  // Other CIP-30 methods can be added here as needed
}

export interface CardanoEternlProvider {
  enable: () => Promise<CardanoWalletApi>;
  isEnabled?: () => Promise<boolean>;
}

export interface CardanoWindowObject {
  eternl?: CardanoEternlProvider;
  // other wallets could be added here (nami, flint, etc.)
}

declare global {
  interface Window {
    cardano?: CardanoWindowObject;
  }
}

export {};


