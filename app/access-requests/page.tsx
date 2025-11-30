"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

import { deriveEncryptionKey } from "@/lib/crypto/profileEncryption";
import { decryptFile } from "@/lib/crypto/fileEncryption";
import { listFiles, getFile, base64ToBlob } from "@/lib/storage/b2";
import type { CardanoWalletApi } from "@/types/window";

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
      // Step 0: Grant access to files (Decrypt -> Upload for Doctor)
      const request = accessRequests.find(r => r.id === requestId);
      if (request) {
        setTxStatus({ message: 'Granting file access... Please sign to decrypt files.' });
        console.log('[Approval] Step 0: Granting file access...');

        // Get wallet API for decryption
        if (typeof window === "undefined" || !(window as any).cardano?.eternl) {
          throw new Error("Wallet not connected");
        }
        const walletApi = await (window as any).cardano.eternl.enable();
        if (!walletApi) {
          throw new Error("Failed to enable wallet");
        }

        // Derive key once
        const key = await deriveEncryptionKey(address, walletApi as CardanoWalletApi);

        // Process each requested record type
        for (const recordType of request.recordTypes) {
          console.log(`[Approval] Processing category: ${recordType}`);
          try {
            const files = await listFiles(address, recordType);

            for (const file of files) {
              console.log(`[Approval] Granting access to file: ${file.originalName}`);

              try {
                // 1. Get encrypted file (file.fileId is the B2 storage path)
                const encryptedBase64 = await getFile(file.fileId);
                const encryptedBlob = base64ToBlob(encryptedBase64);

                // 2. Decrypt
                const decryptedBuffer = await decryptFile(encryptedBlob, key);

                // 3. Convert back to base64 for upload
                const decryptedBlob = new Blob([decryptedBuffer]);
                const reader = new FileReader();
                const base64Data = await new Promise<string>((resolve, reject) => {
                  reader.onloadend = () => {
                    const res = reader.result as string;
                    resolve(res.includes(",") ? res.split(",")[1] : res);
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(decryptedBlob);
                });

                // 4. Get database ID for this file
                // We need to look it up since file.fileId is the B2 path
                // The API should return dbFileId, but if not, we'll need to look it up
                let dbFileId = (file as any).dbFileId;
                
                if (!dbFileId) {
                  // Look up database ID from B2 path
                  const lookupRes = await fetch(`${API_URL}/api/records/list?wallet=${encodeURIComponent(address)}&category=${encodeURIComponent(recordType)}`);
                  if (lookupRes.ok) {
                    const lookupData = await lookupRes.json();
                    const foundFile = lookupData.files?.find((f: any) => f.fileId === file.fileId);
                    if (foundFile?.dbFileId) {
                      dbFileId = foundFile.dbFileId;
                    }
                  }
                }

                // Use dbFileId if available, otherwise use fileId (B2 path) as fallback
                const fileIdToGrant = dbFileId || file.fileId;

                // 5. Upload to grant-file endpoint
                const grantResponse = await fetch(`${API_URL}/api/access/grant-file`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    requestId,
                    fileId: fileIdToGrant,
                    fileData: base64Data,
                    patientWallet: address
                  })
                });

                if (!grantResponse.ok) {
                  const errorData = await grantResponse.json();
                  console.error(`[Approval] Failed to grant file ${file.originalName}:`, errorData);
                  throw new Error(`Failed to grant file: ${errorData.error || "Unknown error"}`);
                }

                console.log(`[Approval] Successfully granted access to file: ${file.originalName} (DB ID: ${fileIdToGrant})`);
              } catch (fileError: any) {
                console.error(`[Approval] Error processing file ${file.originalName}:`, fileError);
                // Continue with other files even if one fails
              }
            }
          } catch (err) {
            console.error(`[Approval] Failed to grant files for ${recordType}:`, err);
            // Continue with other categories/files even if one fails
          }
        }
      }

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
      const isRealTx = data.blockchain?.cardano?.isRealTx !== false; // Default to true if not specified
      const walletAvailable = typeof window !== 'undefined' && (window as any).cardano?.eternl;

      console.log('[Approval] Unsigned TX data available:', !!hasUnsignedTxData);
      console.log('[Approval] Is real transaction:', isRealTx);
      console.log('[Approval] Wallet available:', walletAvailable);

      // Only attempt transaction if we have real transaction data (not stub mode)
      if (hasUnsignedTxData && walletAvailable && isRealTx) {
        // Step 3: Sign and submit transaction with wallet
        setTxStatus({ message: 'Connecting to wallet...' });
        console.log('[Approval] Step 2: Signing transaction with wallet...');

        const unsignedTxData = data.blockchain.cardano.unsignedTxData;

        setTxStatus({ message: 'Building transaction... Please sign in your wallet.' });

        // Define transaction submission function
        const submitTransaction = async () => {
          try {
            console.log('[Transaction] Building consent transaction...');
            console.log('[Transaction] Validator address:', unsignedTxData.validatorAddress);

            // Validate validator address is not a stub
            if (unsignedTxData.validatorAddress.includes('stub') || 
                !unsignedTxData.validatorAddress.startsWith('addr_test1') ||
                unsignedTxData.validatorAddress.length < 50) {
              throw new Error(
                'Invalid validator address. The system is running in stub mode. ' +
                'Please configure Blockfrost API key and compile the Aiken contract to enable real transactions.'
              );
            }

            // Dynamic import of Mesh SDK
            const { BrowserWallet, Transaction } = await import('@meshsdk/core');

            // Connect to wallet using MeshSDK
            console.log('[Wallet] Connecting to eternl via MeshSDK...');
            // Note: BrowserWallet.enable will throw if wallet not found or user rejects
            const wallet = await BrowserWallet.enable('eternl');

            // Get wallet address for logging
            const walletAddress = await wallet.getChangeAddress();
            console.log('[Transaction] Wallet address:', walletAddress?.substring(0, 30) + '...');

            // Check balance using MeshSDK
            const lovelaceBalanceStr = await wallet.getLovelace();
            const lovelaceBalance = BigInt(lovelaceBalanceStr);
            const balanceADA = Number(lovelaceBalance) / 1000000;

            console.log('[Transaction] Wallet balance:', balanceADA, 'ADA');

            if (lovelaceBalance < BigInt(3000000)) {
              throw new Error(`Insufficient funds. Need at least 3 ADA (have ${balanceADA.toFixed(2)} ADA).`);
            }

            // Build transaction
            console.log('[Transaction] Building transaction...');
            const minLovelace = 2000000; // 2 ADA

            // Pass the Mesh Wallet instance to Transaction
            const tx = new Transaction({ initiator: wallet });

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

            tx.setMetadata(674, unsignedTxData.metadata[674]);

            const unsignedTx = await tx.build();
            const signedTx = await wallet.signTx(unsignedTx, true);
            const txHash = await wallet.submitTx(signedTx);

            console.log('[Transaction] ✅ Transaction submitted successfully!');

            return {
              success: true,
              txHash,
              explorerUrl: `https://preprod.cardanoscan.io/transaction/${txHash}`,
            };
          } catch (error) {
            console.error('[Transaction] ❌ Transaction failed:', error);
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        };

        // Execute the transaction
        const result = await submitTransaction();

        if (result.success && result.txHash) {
          console.log('[Approval] ✅ Transaction submitted successfully!');

          setTxStatus({
            message: 'Transaction submitted to Cardano!',
            txHash: result.txHash,
            explorerUrl: result.explorerUrl,
          });

          // Update backend
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
            console.warn('[Approval] Failed to update backend:', updateError);
          }

          setTimeout(() => {
            setAccessRequests((prev) => prev.filter((req) => req.id !== requestId));
            setTxStatus(null);
          }, 5000);
        } else {
          throw new Error(result.error || 'Transaction failed');
        }
      } else {
        // Check why transaction wasn't submitted
        if (!isRealTx) {
          // Stub mode - blockchain not configured
          console.warn('[Approval] ⚠️ Running in stub mode - blockchain not configured');
          console.warn('[Approval] To enable real transactions:');
          console.warn('[Approval]   1. Set BLOCKFROST_API_KEY in .env.local');
          console.warn('[Approval]   2. Run "aiken build" in contracts/aiken/access_request_validator');
          setTxStatus({
            message: 'Request approved (stub mode - blockchain not configured)',
            error: 'Blockchain integration not configured. Transactions will not be submitted to Cardano. Please configure Blockfrost API key and compile Aiken contract.'
          });
        } else if (!walletAvailable) {
          // No wallet
          console.log('[Approval] ⚠️ Transaction prepared but not submitted (no wallet)');
          setTxStatus({
            message: 'Request approved (transaction prepared but not submitted to blockchain)'
          });
        } else {
          // No transaction data
          console.log('[Approval] ⚠️ Transaction data not available');
          setTxStatus({
            message: 'Request approved (transaction data not available)'
          });
        }

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
      "insurance": { label: "Insurance Documents", icon: "consultation" },
      "lab-results": { label: "Lab Results", icon: "lab" },
      "consultations": { label: "Consultation Documents", icon: "consultation" },
      "prescriptions": { label: "Prescription History", icon: "prescription" },
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
              className={`border px-4 py-3 rounded-lg ${txStatus.txHash
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
