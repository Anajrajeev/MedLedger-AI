"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { DoctorCard } from "@/components/doctor-card";
import { AccessRequestList } from "@/components/access-request-list";
import { OnChainNotice } from "@/components/on-chain-notice";
import { ActionButtons } from "@/components/action-buttons";
import { Card } from "@/components/ui/card";
import { useWalletStore } from "@/hooks/useWalletStore";
import { useRoleStore } from "@/hooks/useRoleStore";
import { Inbox, Loader2, ExternalLink } from "lucide-react";
import { RequestAccessForm } from "@/components/request-access-form";
import { API_URL } from "@/lib/api-config";

interface PendingRequest {
  id: string;
  doctorWallet: string;
  patientWallet: string;
  recordTypes: string[];
  reason?: string;
  status: string;
  createdAt: string;
  doctorInfo?: {
    name?: string;
    credentials?: string;
    specialty?: string;
    hospital?: string;
    role?: string;
  };
}

export default function AccessRequestsPage() {
  const [accessRequests, setAccessRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<{ message: string; txHash?: string; explorerUrl?: string } | null>(null);

  const address = useWalletStore((s) => s.address);
  const connected = useWalletStore((s) => s.connected);
  const role = useRoleStore((s) => s.role);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!connected || !address || role !== "patient") {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/access/pending?wallet=${encodeURIComponent(address)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch access requests");
        }

        const data = await response.json();
        console.log("[Access Requests] Fetched requests:", data);
        
        // Fetch public profiles for each doctor/hospital (no decryption needed)
        const requestsWithProfiles = await Promise.all(
          (data.requests || []).map(async (request: PendingRequest) => {
            try {
              // Fetch PUBLIC profile (unencrypted, for display)
              const publicProfileResponse = await fetch(
                `${API_URL}/api/public-profile/${encodeURIComponent(request.doctorWallet)}`
              );
              
              if (publicProfileResponse.ok) {
                const publicProfileData = await publicProfileResponse.json();
                
                if (publicProfileData.exists) {
                  return {
                    ...request,
                    doctorInfo: {
                      name: publicProfileData.displayName,
                      credentials: publicProfileData.credentials,
                      specialty: publicProfileData.specialty,
                      hospital: publicProfileData.organization,
                      role: publicProfileData.role,
                    },
                  };
                }
              }
            } catch (profileError) {
              console.error("[Access Requests] Failed to fetch public profile:", profileError);
            }
            
            // Return request without profile if fetch failed
            return request;
          })
        );
        
        setAccessRequests(requestsWithProfiles);
      } catch (err: any) {
        console.error("Failed to fetch access requests:", err);
        setError(err?.message || "Failed to load access requests");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [connected, address, role]);

  const handleApprove = async (requestId: string) => {
    if (!address) return;

    setProcessingRequest(requestId);
    setError(null);
    setTxStatus(null);

    try {
      // Step 1: Call backend to prepare transaction
      setTxStatus({ message: 'Preparing transaction...' });
      console.log('[Approval] Step 1: Calling backend to prepare transaction...');
      
      const response = await fetch(`${API_URL}/api/access/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          patientWallet: address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to approve access request");
      }

      const data = await response.json();
      console.log('[Approval] Backend response:', data);

      // Step 2: Check if wallet signing is available and data is present
      const hasUnsignedTxData = data.blockchain?.cardano?.unsignedTxData;
      const walletAvailable = typeof window !== 'undefined' && (window as any).cardano?.eternl;

      console.log('[Approval] Unsigned TX data available:', !!hasUnsignedTxData);
      console.log('[Approval] Wallet available:', walletAvailable);

      if (hasUnsignedTxData && walletAvailable) {
        // Step 3: Sign and submit transaction with wallet
        setTxStatus({ message: 'Connecting to wallet...' });
        console.log('[Approval] Step 2: Signing transaction with wallet...');
        
        const unsignedTxData = data.blockchain.cardano.unsignedTxData;
        
        setTxStatus({ message: 'Building transaction... Please sign in your wallet.' });
        
        // Use Mesh SDK for browser-friendly transaction building
        const result = await (async () => {
          try {
            console.log('[Transaction] Building consent transaction...');
            console.log('[Transaction] Validator address:', unsignedTxData.validatorAddress);

            // Dynamic import of Mesh SDK - browser-friendly, no WASM issues
            const { MeshWallet } = await import('@meshsdk/core');

            // Connect to wallet
            console.log('[Wallet] Connecting to eternl...');
            if (typeof window === 'undefined' || !(window as any).cardano?.eternl) {
              throw new Error('Eternl wallet not found. Please install it.');
            }

            const walletApi = await (window as any).cardano.eternl.enable();
            const wallet = new MeshWallet(walletApi);
            
            const walletAddress = await wallet.getUsedAddresses();
            console.log('[Transaction] Wallet address:', walletAddress[0]?.substring(0, 30) + '...');

            // Check balance
            const balance = await wallet.getBalance();
            // Balance is an array of assets, find lovelace
            const lovelaceAsset = balance.find((asset: any) => asset.unit === 'lovelace');
            const lovelaceBalance = lovelaceAsset ? BigInt(lovelaceAsset.quantity) : BigInt(0);
            const balanceADA = Number(lovelaceBalance) / 1000000;
            
            console.log('[Transaction] Wallet balance:', balanceADA, 'ADA');
            
            if (lovelaceBalance < BigInt(3000000)) {
              throw new Error(`Insufficient funds. Need at least 3 ADA (have ${balanceADA.toFixed(2)} ADA). Get testnet ADA from faucet.`);
            }

            // Build transaction using Mesh SDK Transaction builder
            console.log('[Transaction] Building transaction to lock 2 ADA at validator...');
            
            const minLovelace = 2000000; // 2 ADA
            
            // Use MeshJS Transaction - pass wallet instance (MeshWallet)
            const { Transaction } = await import('@meshsdk/core');
            const tx = new Transaction({ initiator: wallet });
            
            // Send lovelace to validator address with inline datum
            tx.sendLovelace(
              {
                address: unsignedTxData.validatorAddress,
                datum: {
                  value: unsignedTxData.datum,
                  inline: true,
                },
              },
              minLovelace.toString()
            );
            
            // Add metadata
            tx.setMetadata(674, unsignedTxData.metadata[674]);
            
            // Build, sign, and submit using wallet methods
            const unsignedTx = await tx.build();
            const signedTx = await wallet.signTx(unsignedTx, true);
            const txHash = await wallet.submitTx(signedTx);

            console.log('[Transaction] ✅ Transaction submitted successfully!');
            console.log('[Transaction] TX Hash:', txHash);
            
            const explorerUrl = `https://preprod.cardanoscan.io/transaction/${txHash}`;
            console.log('[Transaction] View on explorer:', explorerUrl);

            return {
              success: true,
              txHash,
              explorerUrl,
            };
          } catch (error) {
            console.error('[Transaction] ❌ Transaction failed:', error);
            
            let errorMessage = 'Transaction failed';
            if (error instanceof Error) {
              errorMessage = error.message;
            } else {
              errorMessage = String(error);
            }

            return {
              success: false,
              error: errorMessage,
            };
          }
        })();
        
        if (result.success && result.txHash) {
          console.log('[Approval] ✅ Transaction submitted successfully!');
          console.log('[Approval] TX Hash:', result.txHash);
          
          setTxStatus({
            message: 'Transaction submitted to Cardano!',
            txHash: result.txHash,
            explorerUrl: result.explorerUrl,
          });

          // Optional: Update backend with real transaction hash
          try {
            await fetch(`${API_URL}/api/access/update-tx`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requestId,
                realTxHash: result.txHash,
                explorerUrl: result.explorerUrl,
              }),
            });
          } catch (updateError) {
            console.warn('[Approval] Failed to update backend with real TX hash:', updateError);
          }

          // Show success for 5 seconds before removing from list
          setTimeout(() => {
            setAccessRequests((prev) => prev.filter((req) => req.id !== requestId));
            setTxStatus(null);
          }, 5000);
        } else {
          throw new Error(result.error || 'Transaction failed');
        }
      } else {
        // No wallet signing - just show backend approval
        console.log('[Approval] ⚠️  Transaction prepared but not submitted (wallet signing not available)');
        setTxStatus({ 
          message: 'Request approved (transaction prepared but not submitted to blockchain)' 
        });
        
        setTimeout(() => {
          setAccessRequests((prev) => prev.filter((req) => req.id !== requestId));
          setTxStatus(null);
        }, 3000);
      }
    } catch (error: any) {
      console.error('[Approval] Failed:', error);
      setError(error?.message || "Failed to approve access request");
      setTxStatus(null);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    if (!address) return;

    setProcessingRequest(requestId);
    try {
      const response = await fetch(`${API_URL}/api/access/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          patientWallet: address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject access request");
      }

      // Remove from pending list
      setAccessRequests((prev) =>
        prev.filter((req) => req.id !== requestId)
      );
    } catch (error: any) {
      console.error("Failed to reject access:", error);
      setError(error?.message || "Failed to reject access request");
    } finally {
      setProcessingRequest(null);
    }
  };

  // Convert record types to format expected by AccessRequestList component
  const convertToRecordTypes = (request: PendingRequest) => {
    const recordTypeMap: Record<string, { label: string; icon: "lab" | "cardiac" | "prescription" | "consultation" }> = {
      "lab-results": { label: "Lab Results", icon: "lab" },
      "cardiac-evaluation": { label: "Cardiac Evaluation", icon: "cardiac" },
      "prescription-history": { label: "Prescription History", icon: "prescription" },
      "consultation-notes": { label: "Consultation Notes", icon: "consultation" },
    };

    return request.recordTypes.map((recordType) => ({
      id: recordType,
      label: recordTypeMap[recordType]?.label || recordType,
      icon: recordTypeMap[recordType]?.icon || "consultation",
    }));
  };

  if (!connected) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-12 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center py-20">
            <p className="text-gray-600">Please connect your wallet to view access requests.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20 overflow-y-auto">
      <Navbar />

      <main className="pt-24 pb-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-2"
          >
            <h1 className="text-4xl font-bold text-gray-900">
              {role === "doctor" || role === "hospital"
                ? "Request Patient Access"
                : "Access Requests"}
            </h1>
            <p className="text-lg text-gray-600">
              {role === "doctor" || role === "hospital"
                ? "Request access to patient medical records using their wallet address."
                : "Review and approve requests from healthcare professionals to access your medical records."}
            </p>
          </motion.div>

          {/* Request Access Form (for doctors/hospitals) */}
          {(role === "doctor" || role === "hospital") && address && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <RequestAccessForm
                requesterWallet={address}
                onRequestSubmitted={() => {
                  // Refresh requests list if needed
                  if (connected && address) {
                    // TODO: Refresh requests
                  }
                }}
              />
            </motion.div>
          )}

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          {/* Transaction Status */}
          {txStatus && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border px-4 py-3 rounded-lg ${
                txStatus.txHash
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              <div className="flex items-start gap-3">
                {!txStatus.txHash && (
                  <Loader2 className="w-5 h-5 animate-spin flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <p className="font-medium">{txStatus.message}</p>
                  {txStatus.txHash && (
                    <div className="space-y-1">
                      <p className="text-sm font-mono break-all">
                        TX: {txStatus.txHash}
                      </p>
                      {txStatus.explorerUrl && (
                        <a
                          href={txStatus.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                        >
                          View on Cardano Explorer
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {loading ? (
            <Card className="glass-card p-12 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </div>
            </Card>
          ) : role === "patient" && accessRequests.length === 0 ? (
            /* Empty State for Patients */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="glass-card p-16 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-medical-blue/10 to-medical-teal/10 flex items-center justify-center">
                    <Inbox className="w-10 h-10 text-medical-blue" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold text-gray-900">
                      No requests made as of now
                    </h3>
                    <p className="text-gray-600 max-w-md">
                      When healthcare professionals request access to your medical
                      records, they will appear here for your review.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ) : role === "patient" && accessRequests.length > 0 ? (
            /* Access Request Cards for Patients */
            <div className="space-y-6">
              {accessRequests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="glass-card p-8 space-y-8">
                    {/* Doctor/Hospital Information */}
                    {request.doctorInfo?.name ? (
                      <DoctorCard
                        name={request.doctorInfo.name}
                        credentials={request.doctorInfo.credentials || ""}
                        specialty={
                          request.doctorInfo.role === "hospital"
                            ? "Hospital"
                            : request.doctorInfo.specialty || "General Practice"
                        }
                        hospital={
                          request.doctorInfo.role === "hospital"
                            ? request.doctorInfo.name
                            : request.doctorInfo.hospital || "Medical Facility"
                        }
                        avatarUrl={undefined}
                      />
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-medical-blue to-medical-teal flex items-center justify-center text-white font-semibold text-lg">
                          {request.doctorWallet.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {request.doctorInfo?.role === "hospital" 
                              ? "Hospital" 
                              : request.doctorInfo?.role === "doctor"
                              ? "Doctor"
                              : "Healthcare Professional"}
                          </p>
                          <p className="text-sm text-gray-500 font-mono">
                            {request.doctorWallet.substring(0, 20)}...
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Request Details */}
                    <AccessRequestList
                      records={convertToRecordTypes(request)}
                      reason={request.reason}
                    />

                    {/* On-Chain Notice */}
                    <OnChainNotice />

                    {/* Action Buttons */}
                    <ActionButtons
                      onApprove={() => handleApprove(request.id)}
                      onDeny={() => handleDeny(request.id)}
                      isLoading={processingRequest === request.id}
                    />
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

