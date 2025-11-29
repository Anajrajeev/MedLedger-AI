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
import { useRoleStore } from "@/hooks/useRoleStore";
import { Wallet2, Loader2 } from "lucide-react";
import { connectEternlWallet } from "@/lib/wallet-utils";
import { RoleSelection } from "@/components/role-selection";
import { PatientRegistrationForm } from "@/components/patient-registration-form";
import { DoctorRegistrationForm } from "@/components/doctor-registration-form";
import { HospitalRegistrationForm } from "@/components/hospital-registration-form";
import { OtherRegistrationForm } from "@/components/other-registration-form";
import { API_URL } from "@/lib/api-config";
import { deriveEncryptionKey, decryptProfile } from "@/lib/crypto/profileEncryption";

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

interface UserProfile {
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  age?: string;
}

type RegistrationStep = "role-selection" | "profile-form" | null;

export default function DashboardPage() {
  const [hasEternl, setHasEternl] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>(null);
  const [selectedRole, setSelectedRole] = useState<"patient" | "doctor" | "hospital" | "other" | null>(null);

  const connected = useWalletStore((s) => s.connected);
  const address = useWalletStore((s) => s.address);
  const walletApi = useWalletStore((s) => s.api);
  const walletError = useWalletStore((s) => s.error);
  const setWallet = useWalletStore((s) => s.setWallet);
  const setError = useWalletStore((s) => s.setError);
  
  const role = useRoleStore((s) => s.role);
  const setRole = useRoleStore((s) => s.setRole);

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
          setWallet({ walletName: "eternl", address: result.address, api: result.api });
          if (typeof window !== "undefined") {
            window.localStorage.setItem("connectedWallet", "eternl");
          }
          // Check if user profile exists - pass the API directly
          await checkUserProfile(result.address, result.api);
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

  // Check if user profile exists in database
  const checkUserProfile = async (walletAddress: string, api?: typeof walletApi) => {
    if (!walletAddress) return;

    setCheckingProfile(true);
    try {
      console.log("[Dashboard] Checking profile for wallet:", {
        address: walletAddress.substring(0, 30) + "...",
        length: walletAddress.length,
        isBech32: walletAddress.startsWith("addr"),
        fullAddress: walletAddress,
      });

      const encodedAddress = encodeURIComponent(walletAddress);
      const url = `${API_URL}/api/profile/${encodedAddress}`;
      console.log("[Dashboard] Fetching profile from:", url);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Dashboard] Profile check failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error("Failed to check user profile");
      }

      const data = await response.json();
      console.log("[Dashboard] Profile check response:", {
        exists: data.exists,
        hasRole: !!data.role,
        hasCipher: !!data.cipher,
        role: data.role,
      });

      if (data.exists) {
        // User exists - check if they have a profile
        if (data.role) {
          setRole(data.role);
          // IMPORTANT: Set selectedRole so registration form can show if needed
          setSelectedRole(data.role as "patient" | "doctor" | "hospital" | "other");
        }
        
        if (data.cipher) {
          // User has profile - decrypt it using wallet signature
          // Use the passed API or fall back to the store
          const apiToUse = api || walletApi;
          if (!apiToUse || !walletAddress) {
            console.error("[Dashboard] Wallet API or address not available for decryption", {
              hasApi: !!apiToUse,
              hasAddress: !!walletAddress,
            });
            setUserProfile({ username: "User" });
            setRegistrationStep(null);
          } else {
            try {
              console.log("[Dashboard] Decrypting profile...");
              // Derive encryption key from wallet signature
              const encryptionKey = await deriveEncryptionKey(walletAddress, apiToUse);
              // Decrypt profile
              const profile = await decryptProfile(data.cipher, encryptionKey);
              console.log("[Dashboard] Profile decrypted successfully:", profile);
              
              // For doctors/hospitals/others, fetch display name from public profile
              if (data.role !== "patient") {
                try {
                  const publicProfileResponse = await fetch(
                    `${API_URL}/api/public-profile/${encodeURIComponent(walletAddress)}`
                  );
                  if (publicProfileResponse.ok) {
                    const publicProfile = await publicProfileResponse.json();
                    if (publicProfile.exists && publicProfile.displayName) {
                      // Add display name to the decrypted profile
                      profile.name = publicProfile.displayName;
                      console.log("[Dashboard] Added display name from public profile:", publicProfile.displayName);
                    }
                  }
                } catch (publicProfileError) {
                  console.warn("[Dashboard] Failed to fetch public profile:", publicProfileError);
                  // Continue without public profile - will use fallback
                }
              }
              
              setUserProfile(profile);
              setRegistrationStep(null);
            } catch (decryptError: any) {
              console.error("[Dashboard] Failed to decrypt profile:", decryptError);
              
              // If user declined signing, show a helpful message
              if (decryptError?.message?.includes("declined") || decryptError?.message?.includes("approve")) {
                setError("Please approve the wallet signing request to access your encrypted profile. The signing is required to decrypt your data securely.");
                setUserProfile({ username: "User" });
                setRegistrationStep(null);
              } else {
                setUserProfile({ username: "User" });
                setRegistrationStep(null);
              }
            }
          }
        } else {
          // User exists but no profile - show registration form
          console.log("[Dashboard] User exists but no profile cipher, showing registration form");
          setUserProfile(null);
          setRegistrationStep("profile-form");
        }
      } else {
        // User doesn't exist - show role selection
        console.log("[Dashboard] User doesn't exist, showing role selection");
        setUserProfile(null);
        setRegistrationStep("role-selection");
      }
    } catch (err: any) {
      console.error("Failed to check user profile:", err);
      setRegistrationStep("role-selection");
    } finally {
      setCheckingProfile(false);
    }
  };

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
        setWallet({ walletName: "eternl", address: result.address, api: result.api });
        if (typeof window !== "undefined") {
          window.localStorage.setItem("connectedWallet", "eternl");
        }
        // Check if user profile exists
        await checkUserProfile(result.address, result.api);
      }
    } catch (err: any) {
      console.error("Eternl enable() failed", err);
      setError(err?.message || "Failed to connect Eternl wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRoleSelected = (role: "patient" | "doctor" | "hospital" | "other") => {
    setSelectedRole(role);
    setRole(role);
    setRegistrationStep("profile-form");
  };

  const handleRegistrationComplete = () => {
    // After registration, check profile again to get the new user data
    if (address) {
      checkUserProfile(address, walletApi);
    }
  };

  const handleUploadClick = () => {
    console.log("Upload new record clicked");
  };

  const handleSearchChange = (value: string) => {
    console.log("Searching records for:", value);
  };

  const stillLoadingProvider = initializing && hasEternl === null;
  const showNoWalletMessage =
    !stillLoadingProvider && hasEternl === false && !connected;
  const showConnectOverlay =
    !stillLoadingProvider &&
    hasEternl &&
    !connected &&
    !showNoWalletMessage &&
    !checkingProfile;
  const showDashboard = 
    connected && 
    !registrationStep && 
    !checkingProfile && 
    userProfile !== null &&
    role !== null; // Also require role to be set

  return (
    <div className="min-h-screen relative overflow-y-auto">
      <Navbar />

      {/* Main Content - Only show when wallet connected and profile checked */}
      {showDashboard && (
        <main className="pt-24 pb-12 px-4 md:px-8">
          <div className="mx-auto w-full max-w-6xl space-y-10">
            <div className="space-y-4">
              <DashboardHeader
                patientName={
                  userProfile?.username || 
                  userProfile?.name || 
                  "User"
                }
              />
              <DashboardSearchBar
                onSearchChange={handleSearchChange}
                onUploadClick={handleUploadClick}
              />
            </div>

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
      )}

      {/* Role Selection Overlay */}
      {connected && registrationStep === "role-selection" && address && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 backdrop-blur-md px-4">
          <RoleSelection
            walletAddress={address}
            onRoleSelected={handleRoleSelected}
          />
        </div>
      )}

      {/* Registration Form Overlay */}
      {connected && registrationStep === "profile-form" && address && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 backdrop-blur-md px-4 overflow-y-auto py-8">
          {selectedRole === "patient" && (
            <PatientRegistrationForm
              walletAddress={address}
              role="patient"
              onRegistrationComplete={handleRegistrationComplete}
            />
          )}
          {selectedRole === "doctor" && (
            <DoctorRegistrationForm
              walletAddress={address}
              role="doctor"
              onRegistrationComplete={handleRegistrationComplete}
            />
          )}
          {selectedRole === "hospital" && (
            <HospitalRegistrationForm
              walletAddress={address}
              role="hospital"
              onRegistrationComplete={handleRegistrationComplete}
            />
          )}
          {selectedRole === "other" && (
            <OtherRegistrationForm
              walletAddress={address}
              role="other"
              onRegistrationComplete={handleRegistrationComplete}
            />
          )}
          {!selectedRole && (
            <Card className="max-w-lg w-full glass-card py-8 px-8 text-center space-y-4">
              <p className="text-gray-600">Loading registration form...</p>
              <p className="text-sm text-gray-500">Role: {role || "Not set"}</p>
            </Card>
          )}
        </div>
      )}

      {/* Debug: Show state when nothing else is showing */}
      {connected && !checkingProfile && !registrationStep && userProfile === null && (
        <main className="pt-24 pb-12 px-4 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Card className="glass-card p-8 text-center space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Profile Not Found</h2>
              <p className="text-gray-600">
                Your wallet is connected but no profile was found. Please complete your registration.
              </p>
              <p className="text-sm text-gray-500">
                Role: {role || "Not set"} | Address: {address?.substring(0, 20)}...
              </p>
              <Button
                onClick={() => {
                  if (role) {
                    setSelectedRole(role);
                    setRegistrationStep("profile-form");
                  } else {
                    setRegistrationStep("role-selection");
                  }
                }}
              >
                {role ? "Complete Registration" : "Select Role"}
              </Button>
            </Card>
          </div>
        </main>
      )}

      {/* Checking Profile Loading State */}
      {connected && checkingProfile && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 backdrop-blur-md px-4">
          <Card className="max-w-lg w-full glass-card py-8 px-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-medical-blue/10 text-medical-blue">
              <Loader2 className="w-7 h-7 animate-spin" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Checking your profile...
            </h2>
            <p className="text-sm text-gray-600">
              Verifying your account information.
            </p>
          </Card>
        </div>
      )}

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
