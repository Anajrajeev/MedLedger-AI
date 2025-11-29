"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LogOut, RefreshCw, Wallet2 } from "lucide-react";
import { useWalletStore } from "@/hooks/useWalletStore";
import { connectEternlWallet } from "@/lib/wallet-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shortenAddress, formatAddressForDisplay } from "@/lib/address-utils";
import { Copy, Check } from "lucide-react";

export function WalletSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const connected = useWalletStore((s) => s.connected);
  const walletName = useWalletStore((s) => s.walletName);
  const address = useWalletStore((s) => s.address);
  const setWallet = useWalletStore((s) => s.setWallet);
  const setError = useWalletStore((s) => s.setError);
  const disconnect = useWalletStore((s) => s.disconnect);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    setError(null);
    setIsOpen(false); // Close dropdown immediately

    try {
      const previousAddress = address;
      
      // First, disconnect from our app to clear the connection
      disconnect();
      
      // Small delay to ensure disconnect is processed and UI updates
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Now reconnect with forceReconnect flag - Eternl should show account selection
      const result = await connectEternlWallet(true);
      
      if (result) {
        // Check if the address actually changed
        if (result.address === previousAddress) {
          // Address didn't change - user might need to manually switch in Eternl
          console.warn("Address unchanged after reconnect. User may need to switch account in Eternl extension.");
          // Still update the wallet state, but user should know they might need to switch in Eternl
        }
        
        setWallet({ walletName: "eternl", address: result.address });
        if (typeof window !== "undefined") {
          window.localStorage.setItem("connectedWallet", "eternl");
        }
      }
    } catch (err: any) {
      console.error("Switch account error:", err);
      const errorMessage = err?.message || "Failed to reconnect wallet. Please try again.";
      setError(errorMessage);
      
      // If user cancelled, that's okay - just reset state
      if (err?.code === 1 || err?.message?.includes("reject") || err?.message?.includes("cancel")) {
        // User cancelled - reconnect with previous address
        if (previousAddress) {
          setWallet({ walletName: "eternl", address: previousAddress });
          if (typeof window !== "undefined") {
            window.localStorage.setItem("connectedWallet", "eternl");
          }
        }
        return;
      }
      
      // For other errors, show alert
      alert(`Unable to switch account: ${errorMessage}\n\nIf Eternl didn't show the account selection, please:\n1. Open Eternl extension\n2. Switch accounts there\n3. Try again here.`);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
  };

  const handleCopyAddress = async () => {
    if (!address) return;
    
    try {
      // Copy the raw address (remove any formatting/whitespace)
      const rawAddress = address.replace(/\s+/g, "").trim();
      await navigator.clipboard.writeText(rawAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  if (!connected || walletName !== "eternl") {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="hidden md:flex items-center gap-2 rounded-full bg-white/70 border border-medical-blue/20 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-white/90 hover:border-medical-blue/30 transition-all cursor-pointer"
      >
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-gray-500">Connected:</span>
        <span className="text-medical-blue font-semibold">Eternl</span>
        <span className="text-gray-500">•</span>
        <span className="font-mono text-[11px] text-gray-700">
          {shortenAddress(address)}
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-gray-500 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white/95 backdrop-blur-xl border border-white/50 shadow-xl z-50 overflow-hidden"
          >
            <div className="p-2">
              {/* Current Account Info */}
              <div className="px-3 py-2 rounded-lg bg-medical-blue/5 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Wallet2 className="w-4 h-4 text-medical-blue" />
                    <span className="text-xs font-semibold text-gray-900">
                      Current Account
                    </span>
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1 rounded hover:bg-medical-blue/10 transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-medical-blue break-all leading-relaxed select-all">
                  {formatAddressForDisplay(address)}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                >
                  <RefreshCw
                    className={cn(
                      "w-3.5 h-3.5 mr-2",
                      isReconnecting && "animate-spin"
                    )}
                  />
                  {isReconnecting ? "Reconnecting..." : "Switch Account"}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleDisconnect}
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Disconnect Wallet
                </Button>
              </div>

              {/* Info Text */}
              <p className="text-[10px] text-gray-500 mt-2 px-2">
                Click "Switch Account" to reconnect with a different Eternl
                account or address.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

