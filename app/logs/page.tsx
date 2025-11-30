"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/hooks/useWalletStore";
import { useRoleStore } from "@/hooks/useRoleStore";
import { API_URL } from "@/lib/api-config";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  FlaskConical,
  Heart,
  Pill,
  Calendar,
  User,
  Link2,
  Shield,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Eye
} from "lucide-react";
import { shortenAddress } from "@/lib/address-utils";
import { SecureDocumentViewer } from "@/components/secure-doc-viewer";

interface AccessRequest {
  id: string;
  doctorWallet: string;
  patientWallet: string;
  patientName?: string;
  recordTypes: string[];
  reason?: string;
  status: "pending" | "approved" | "rejected";
  midnightTx?: string;
  zkProofHash?: string;
  aikenTx?: string;
  validatorHash?: string;
  validatorAddress?: string;
  cardanoNetwork?: string;
  createdAt: string;
  approvedAt?: string;
  doctorInfo?: {
    name?: string;
    credentials?: string;
    specialty?: string;
    hospital?: string;
    role?: string;
  };
}

const recordTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "insurance": FileText,
  "lab-results": FlaskConical,
  "consultations": FileText,
  "prescriptions": Pill,
};

const recordTypeLabels: Record<string, string> = {
  "insurance": "Insurance Documents",
  "lab-results": "Lab Results",
  "consultations": "Consultation Documents",
  "prescriptions": "Prescription History",
};

interface PatientFile {
  fileId: string;
  storageFileId: string;
  originalName: string;
  category: string;
  createdAt: string;
}

interface PatientFile {
  fileId: string;
  storageFileId: string;
  originalName: string;
  category: string;
  createdAt: string;
}

export default function RequestLogsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [viewingFiles, setViewingFiles] = useState<{ requestId: string; files: PatientFile[] } | null>(null);
  const [loadingFiles, setLoadingFiles] = useState<string | null>(null);
  const [viewingFileContent, setViewingFileContent] = useState<{ name: string; data: ArrayBuffer } | null>(null);

  const address = useWalletStore((s) => s.address);
  const connected = useWalletStore((s) => s.connected);
  const role = useRoleStore((s) => s.role);

  const fetchRequests = React.useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      console.log("[Request Logs] Fetching requests for:", {
        address: address.substring(0, 20) + "...",
        role,
        fullAddress: address,
        apiUrl: `${API_URL}/api/access/all?wallet=${encodeURIComponent(address)}`,
      });

      const response = await fetch(
        `${API_URL}/api/access/all?wallet=${encodeURIComponent(address)}`
      );

      console.log("[Request Logs] API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[Request Logs] API error:", errorData);
        throw new Error(errorData.error || "Failed to fetch requests");
      }

      const data = await response.json();
      console.log("[Request Logs] Received data:", {
        requestCount: data.requests?.length || 0,
        requests: data.requests,
      });

      // If user is a patient, fetch public profiles for each doctor/hospital
      if (role === "patient") {
        const requestsWithProfiles = await Promise.all(
          (data.requests || []).map(async (request: AccessRequest) => {
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
              console.error("[Request Logs] Failed to fetch public profile:", profileError);
            }

            // Return request without profile if fetch failed
            return request;
          })
        );

        console.log("[Request Logs] Setting requests with profiles:", requestsWithProfiles.length);
        setRequests(requestsWithProfiles);
      } else {
        setRequests(data.requests || []);
      }
    } catch (err: any) {
      console.error("[Request Logs] Failed to fetch requests:", err);
      setError(err?.message || "Failed to load request logs");
    } finally {
      setLoading(false);
    }
  }, [address, role]);

  useEffect(() => {
    if (connected && address && (role === "doctor" || role === "hospital" || role === "patient")) {
      fetchRequests();
    } else {
      setLoading(false);
    }
  }, [connected, address, role, fetchRequests]);

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const fetchPatientFiles = async (requestId: string, doctorWallet: string) => {
    console.log("[Request Logs] fetchPatientFiles called:", { requestId, doctorWallet });

    if (loadingFiles === requestId) {
      console.log("[Request Logs] Already loading files for this request");
      return; // Prevent duplicate requests
    }

    if (!doctorWallet) {
      console.error("[Request Logs] Doctor wallet not available");
      setError("Wallet not connected");
      return;
    }

    setLoadingFiles(requestId);
    setError(null);

    try {
      const url = `${API_URL}/api/records/list-for-doctor?requestId=${encodeURIComponent(requestId)}&doctorWallet=${encodeURIComponent(doctorWallet)}`;
      console.log("[Request Logs] Fetching files from:", url);

      const response = await fetch(url);

      console.log("[Request Logs] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[Request Logs] Error response:", errorData);
        throw new Error(errorData.error || "Failed to fetch patient files");
      }

      const data = await response.json();
      console.log("[Request Logs] Files received:", data);
      setViewingFiles({ requestId, files: data.files || [] });
    } catch (err: any) {
      console.error("[Request Logs] Failed to fetch files:", err);
      setError(err.message || "Failed to load patient files");
      setViewingFiles(null);
    } finally {
      setLoadingFiles(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCardanoExplorerUrl = (txHash: string, network: string = "preprod") => {
    const baseUrl = network === "mainnet"
      ? "https://cardanoscan.io/transaction"
      : "https://preprod.cardanoscan.io/transaction";
    return `${baseUrl}/${txHash}`;
  };

  const BlockchainField = ({
    label,
    value,
    fieldId,
    isWarning = false,
    explorerUrl
  }: {
    label: string;
    value: string | null | undefined;
    fieldId: string;
    isWarning?: boolean;
    explorerUrl?: string;
  }) => {
    if (!value) {
      return (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            {label}
            <AlertTriangle className="w-3 h-3 text-amber-500" />
          </p>
          <p className="font-mono text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            Missing - Not recorded
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="flex items-center gap-2">
          <p className={`font-mono text-xs truncate max-w-[200px] ${isWarning ? 'text-amber-600' : 'text-gray-700'}`}>
            {value}
          </p>
          <button
            onClick={() => copyToClipboard(value, fieldId)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copiedField === fieldId ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3 text-gray-400" />
            )}
          </button>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="View on Explorer"
            >
              <ExternalLink className="w-3 h-3 text-blue-500" />
            </a>
          )}
        </div>
      </div>
    );
  };

  const hasBlockchainWarnings = (request: AccessRequest) => {
    if (request.status !== "approved") return false;
    return !request.midnightTx || !request.zkProofHash || !request.aikenTx;
  };

  if (!connected) {
    return (
      <div className="min-h-screen">
        <main className="pt-24 pb-12 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center py-20">
            <p className="text-gray-600">Please connect your wallet to view request logs.</p>
          </div>
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20 overflow-y-auto">
      <main className="pt-24 pb-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-gray-900">Request Logs</h1>
              <Badge variant="outline" className="text-xs">
                Network: Preprod Testnet
              </Badge>
            </div>
            <p className="text-lg text-gray-600">
              {role === "patient"
                ? "View all access requests made to your medical records and their approval status."
                : "View all access requests and their blockchain verification status."}
            </p>
          </motion.div>

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

          {/* Loading State */}
          {loading ? (
            <Card className="glass-card p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
                <p className="text-gray-600">Loading request logs...</p>
              </div>
            </Card>
          ) : requests.length === 0 ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="glass-card p-16 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-medical-blue/10 to-medical-teal/10 flex items-center justify-center">
                    <FileText className="w-10 h-10 text-medical-blue" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold text-gray-900">
                      No requests yet
                    </h3>
                    <p className="text-gray-600 max-w-md">
                      {role === "patient"
                        ? "You haven't received any access requests yet. When healthcare professionals request access to your medical records, they will appear here."
                        : "You haven't made any access requests yet. Visit the Access Requests page to request access to patient records."}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ) : (
            /* Request List */
            <div className="space-y-6">
              {requests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="glass-card p-6 space-y-4">
                    {/* Header with Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {role === "patient" ? (
                          /* For patients: Show doctor/hospital info */
                          <div className="flex items-center gap-3 mb-2">
                            <User className="w-5 h-5 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {request.doctorInfo?.name ||
                                  (request.doctorInfo?.role === "hospital" ? "Hospital" :
                                    request.doctorInfo?.role === "doctor" ? "Doctor" :
                                      "Healthcare Professional")}
                              </p>
                              {request.doctorInfo?.credentials && (
                                <p className="text-xs text-gray-600">
                                  {request.doctorInfo.credentials}
                                  {request.doctorInfo.specialty && ` • ${request.doctorInfo.specialty}`}
                                </p>
                              )}
                              {request.doctorInfo?.hospital && request.doctorInfo.role !== "hospital" && (
                                <p className="text-xs text-gray-500">
                                  {request.doctorInfo.hospital}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 font-mono mt-1">
                                {shortenAddress(request.doctorWallet, 12)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* For doctors/hospitals: Show patient info */
                          <div className="flex items-center gap-3 mb-2">
                            <User className="w-5 h-5 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {request.patientName || "Patient"}
                              </p>
                              <p className="text-xs text-gray-500 font-mono">
                                {shortenAddress(request.patientWallet, 12)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasBlockchainWarnings(request) && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Incomplete
                          </Badge>
                        )}
                        {getStatusBadge(request.status)}
                      </div>
                    </div>

                    {/* Record Types */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Requested Record Types:</p>
                      <div className="flex flex-wrap gap-2">
                        {request.recordTypes.map((recordType) => {
                          const Icon = recordTypeIcons[recordType] || FileText;
                          const label = recordTypeLabels[recordType] || recordType;
                          return (
                            <Badge
                              key={recordType}
                              variant="outline"
                              className="flex items-center gap-1.5"
                            >
                              <Icon className="w-3 h-3" />
                              {label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reason */}
                    {request.reason && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-700">Reason:</p>
                        <p className="text-sm text-gray-600">{request.reason}</p>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>Created: {formatDate(request.createdAt)}</span>
                      </div>
                      {request.approvedAt && (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {request.status === "approved" ? "Approved" : "Updated"}:{" "}
                            {formatDate(request.approvedAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Blockchain Verification (if approved) */}
                    {request.status === "approved" && (
                      <div className="pt-4 border-t border-gray-200 space-y-4">
                        {/* Section Header */}
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-600" />
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Blockchain Verification
                          </p>
                          {request.cardanoNetwork && (
                            <Badge variant="outline" className="text-xs">
                              {request.cardanoNetwork}
                            </Badge>
                          )}
                        </div>

                        {/* Midnight ZK Proofs */}
                        <div className="bg-purple-50/50 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Link2 className="w-4 h-4 text-purple-600" />
                            <p className="text-xs font-semibold text-purple-700 uppercase">
                              Midnight (ZK Proof Layer)
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <BlockchainField
                              label="ZK Proof Hash"
                              value={request.zkProofHash}
                              fieldId={`${request.id}-zkproof`}
                            />
                            <BlockchainField
                              label="Midnight TX"
                              value={request.midnightTx}
                              fieldId={`${request.id}-midnight`}
                            />
                          </div>
                        </div>

                        {/* Cardano/Aiken Audit */}
                        <div className="bg-blue-50/50 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Link2 className="w-4 h-4 text-blue-600" />
                            <p className="text-xs font-semibold text-blue-700 uppercase">
                              Cardano (Public Audit Log)
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <BlockchainField
                              label="Aiken TX"
                              value={request.aikenTx}
                              fieldId={`${request.id}-aiken`}
                              explorerUrl={request.aikenTx && !request.aikenTx.startsWith("aiken_") && !request.aikenTx.startsWith("preprod_")
                                ? getCardanoExplorerUrl(request.aikenTx, request.cardanoNetwork)
                                : undefined
                              }
                            />
                            <BlockchainField
                              label="Validator Hash"
                              value={request.validatorHash}
                              fieldId={`${request.id}-validator`}
                            />
                          </div>
                          {request.validatorAddress && (
                            <BlockchainField
                              label="Validator Address"
                              value={request.validatorAddress}
                              fieldId={`${request.id}-validatoraddr`}
                            />
                          )}
                        </div>

                        {/* Warning if incomplete */}
                        {hasBlockchainWarnings(request) && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-700">
                              <p className="font-medium">Incomplete Blockchain Records</p>
                              <p className="text-xs mt-1">
                                Some blockchain transaction data is missing. This may indicate the approval
                                occurred before blockchain integration was fully implemented, or there was
                                an error during the blockchain submission process.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* View Files Button (for doctors on approved requests) */}
                    {role !== "patient" && request.status === "approved" && address && (
                      <div className="pt-4 border-t border-gray-200">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("[Request Logs] Button clicked for request:", request.id);
                            fetchPatientFiles(request.id, address);
                          }}
                          disabled={loadingFiles === request.id || !address}
                          className="flex items-center gap-2 px-4 py-2 bg-medical-blue text-white rounded-lg hover:bg-medical-blue/90 transition-colors disabled:opacity-50 cursor-pointer"
                          type="button"
                        >
                          {loadingFiles === request.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Loading Files...</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              <span>View Patient Files</span>
                            </>
                          )}
                        </button>

                        {/* Display Files */}
                        {viewingFiles?.requestId === request.id && viewingFiles.files.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium text-gray-700">Available Files:</p>
                            <div className="grid grid-cols-1 gap-2">
                              {viewingFiles.files.map((file) => (
                                <div
                                  key={file.fileId}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-gray-500" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {file.originalName}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {recordTypeLabels[file.category] || file.category} • {formatDate(file.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      try {
                                        // file.fileId is the database ID from list-for-doctor
                                        // Try to get from granted_files (decrypted file)
                                        const res = await fetch(`${API_URL}/api/access/view-granted-file?requestId=${request.id}&fileId=${file.fileId}&doctorWallet=${address}`);

                                        if (!res.ok) {
                                          const errData = await res.json();
                                          if (res.status === 404) {
                                            // File not in granted_files - this means the patient hasn't processed it yet
                                            // or the approval happened before the grant-file feature was added
                                            throw new Error("NOT_GRANTED");
                                          }
                                          throw new Error(errData.error || "Failed to fetch file content");
                                        }

                                        const data = await res.json();
                                        const fileData = data.fileData;

                                        // Convert base64 to ArrayBuffer
                                        const binaryString = window.atob(fileData);
                                        const len = binaryString.length;
                                        const bytes = new Uint8Array(len);
                                        for (let i = 0; i < len; i++) {
                                          bytes[i] = binaryString.charCodeAt(i);
                                        }

                                        // Open viewer
                                        setViewingFileContent({
                                          name: file.originalName,
                                          data: bytes.buffer
                                        });
                                      } catch (err: any) {
                                        console.error("Failed to view file:", err);
                                        if (err.message === "NOT_GRANTED") {
                                          alert("File not accessible. This file may not have been granted yet. The patient needs to approve the request to grant access to all files in the approved categories.");
                                        } else {
                                          alert(`Failed to view file: ${err.message}`);
                                        }
                                      }
                                    }}
                                    className="px-3 py-1 text-sm bg-medical-blue text-white rounded hover:bg-medical-blue/90 transition-colors"
                                  >
                                    View
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {viewingFiles?.requestId === request.id && viewingFiles.files.length === 0 && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                            No files available for the requested categories.
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Secure Document Viewer Modal */}
      {viewingFileContent && (
        <SecureDocumentViewer
          fileData={viewingFileContent.data}
          fileName={viewingFileContent.name}
          onClose={() => setViewingFileContent(null)}
        />
      )}
    </div>
  );
}
