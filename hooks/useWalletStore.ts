import { create } from "zustand";
import type { CardanoWalletApi } from "@/types/window";

type SupportedWalletName = "eternl";

export interface WalletState {
  connected: boolean;
  walletName: SupportedWalletName | null;
  address: string | null;
  api: CardanoWalletApi | null; // Store wallet API for encryption
  error: string | null;
  setWallet: (params: {
    walletName: SupportedWalletName;
    address: string;
    api: CardanoWalletApi;
  }) => void;
  setError: (message: string | null) => void;
  disconnect: () => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  connected: false,
  walletName: null,
  address: null,
  api: null,
  error: null,
  setWallet: ({ walletName, address, api }) =>
    set({
      connected: true,
      walletName,
      address,
      api,
      error: null,
    }),
  setError: (message) => set({ error: message }),
  disconnect: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("connectedWallet");
    }
    set({
      connected: false,
      walletName: null,
      address: null,
      api: null,
      error: null,
    });
  },
  reset: () =>
    set({
      connected: false,
      walletName: null,
      address: null,
      api: null,
      error: null,
    }),
}));


