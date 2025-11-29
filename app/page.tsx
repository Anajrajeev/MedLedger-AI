// Dashboard page gated by Eternl Cardano wallet (CIP-30)
"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardSearchBar } from "@/components/dashboard-search-bar";
import { MedicalRecordCard } from "@/components/medical-record-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/hooks/useWalletStore";
import { Wallet2 } from "lucide-react";
import { connectEternlWallet } from "@/lib/wallet-utils";

const recentRecords = [
  {
    id: "1",
    title: "Annual Lab Results",
    date: "Apr 15, 2024",
    description:
      "Blood panel and comprehensive metabolic profile from your annual physical.",
    variant: "lab" as const,
  },
  {
    id: "2",
    title: "Chest X-Ray Scan",
    date: "Mar 28, 2024",
    description:
      "Radiology report and images for routine chest screening. No abnormalities found.",
    variant: "imaging" as const,
  },
  {
    id: "3",
    title: "Prescription Update",
    date: "Mar 21, 2024",
    description:
      "Updated prescription for allergy medication from Dr. Evelyn Reed.",
    variant: "prescription" as const,
  },
];

export default function DashboardPage() {
  const [hasEternl, setHasEternl] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const connected = useWalletStore((s) => s.connected);
  const walletError = useWalletStore((s) => s.error);
  const setWallet = useWalletStore((s) => s.setWallet);
  const setError = useWalletStore((s) => s.setError);

  useEffect(() => {
    const checkAndReconnect = async () => {
      if (typeof window === "undefined") return;

      const eternl = window.cardano?.eternl;
      setHasEternl(!!eternl);

      if (!eternl) {
        setInitializing(false);
        return;
      }

      const shouldReconnect =
        window.localStorage.getItem("connectedWallet") === "eternl";

      if (!shouldReconnect) {
        setInitializing(false);
        return;
      }

      try {
        const result = await connectEternlWallet();
        if (result) {
          setWallet({ walletName: "eternl", address: result.address });
          if (typeof window !== "undefined") {
            window.localStorage.setItem("connectedWallet", "eternl");
          }
        }
      } catch (err: any) {
        console.error("Auto-connect Eternl failed", err);
        setError(err?.message || "Unable to auto-connect to Eternl.");
      } finally {
        setInitializing(false);
      }
    };

    void checkAndReconnect();
  }, [setError, setWallet]);

  const handleConnectClick = async () => {
    if (typeof window === "undefined") return;
    const eternl = window.cardano?.eternl;

    if (!eternl) {
      setHasEternl(false);
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const result = await connectEternlWallet();
      if (result) {
        setWallet({ walletName: "eternl", address: result.address });
        if (typeof window !== "undefined") {
          window.localStorage.setItem("connectedWallet", "eternl");
        }
      }
    } catch (err: any) {
      console.error("Eternl enable() failed", err);
      setError(err?.message || "Failed to connect Eternl wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUploadClick = () => {
    // Placeholder for future upload flow (IPFS/Filecoin + Lit)
    console.log("Upload new record clicked");
  };

  const handleSearchChange = (value: string) => {
    console.log("Searching records for:", value);
  };

  const stillLoadingProvider = initializing && hasEternl === null;
  const showNoWalletMessage =
    !stillLoadingProvider && hasEternl === false && !connected;
  const showConnectOverlay =
    !stillLoadingProvider && hasEternl && !connected && !showNoWalletMessage;

  return (
    <div className="min-h-screen relative">
      <Navbar />

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 md:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-10">
          {/* Welcome + Search */}
          <div className="space-y-4">
            <DashboardHeader patientName="Amelia" />
            <DashboardSearchBar
              onSearchChange={handleSearchChange}
              onUploadClick={handleUploadClick}
            />
          </div>

          {/* Recent Medical Files */}
          <section aria-labelledby="recent-medical-files-heading">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2
                  id="recent-medical-files-heading"
                  className="text-xl md:text-2xl font-semibold text-gray-900"
                >
                  Recent Medical Files
                </h2>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {recentRecords.map((record) => (
                <MedicalRecordCard
                  key={record.id}
                  title={record.title}
                  date={record.date}
                  description={record.description}
                  variant={record.variant}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Eternl not detected message */}
      {showNoWalletMessage && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 backdrop-blur-md px-4">
          <Card className="max-w-lg w-full glass-card py-8 px-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-medical-blue/10 text-medical-blue">
              <Wallet2 className="w-7 h-7" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Eternl wallet not detected
            </h2>
            <p className="text-sm text-gray-600">
              Eternl wallet is required to securely access your encrypted
              medical dashboard. Please install the Eternl browser extension and
              reload the page to continue using MedLedger AI.
            </p>
          </Card>
        </div>
      )}

      {/* Connect overlay */}
      {showConnectOverlay && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 backdrop-blur-md px-4">
          <Card className="max-w-lg w-full glass-card py-8 px-8 space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-medical-blue to-medical-teal text-white shadow-lg">
                <Wallet2 className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Connect Eternl Wallet
                </h2>
                <p className="text-sm text-gray-600">
                  Verify your identity with your Eternl Cardano wallet to unlock
                  your encrypted medical dashboard.
                </p>
              </div>
            </div>

            {walletError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {walletError}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                size="lg"
                className="bg-medical-blue text-white shadow-md shadow-medical-blue/30 hover:bg-medical-600"
                onClick={handleConnectClick}
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect Eternl Wallet"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

