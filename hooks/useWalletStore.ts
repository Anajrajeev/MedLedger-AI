import { create } from "zustand";

type SupportedWalletName = "eternl";

export interface WalletState {
  connected: boolean;
  walletName: SupportedWalletName | null;
  address: string | null;
  error: string | null;
  setWallet: (params: {
    walletName: SupportedWalletName;
    address: string;
  }) => void;
  setError: (message: string | null) => void;
  disconnect: () => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  connected: false,
  walletName: null,
  address: null,
  error: null,
  setWallet: ({ walletName, address }) =>
    set({
      connected: true,
      walletName,
      address,
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
      error: null,
    });
  },
  reset: () =>
    set({
      connected: false,
      walletName: null,
      address: null,
      error: null,
    }),
}));


