"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, BookOpen, Shield, Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { runExplainer, runExplainerWithPDF, runAppointment, runInsurance, runInsuranceWithPDF } from "@/lib/agentClient";
import { useWalletStore } from "@/hooks/useWalletStore";
import { deriveEncryptionKey, decryptProfile } from "@/lib/crypto/profileEncryption";
import { API_URL } from "@/lib/api-config";
import type { CardanoWalletApi } from "@/types/window";

interface AgentCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const agents: AgentCard[] = [
  {
    id: "appointment",
    title: "Appointment Agent",
    description: "Intelligently schedules and manages your medical appointments. Analyzes your calendar, suggests optimal times, sends reminders, and helps coordinate with healthcare providers based on your preferences and availability.",
    icon: Calendar,
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "explainer",
    title: "Explainer Agent",
    description: "Translates complex medical terminology and reports into easy-to-understand language. Helps you comprehend lab results, diagnosis reports, treatment plans, and medication instructions in plain English.",
    icon: BookOpen,
    color: "from-purple-500 to-purple-600",
  },
  {
    id: "insurance",
    title: "Insurance Agent",
    description: "Assists with insurance-related queries and claims. Helps you understand coverage details, estimate costs, track claim status, verify benefits, and navigate insurance paperwork efficiently.",
    icon: Shield,
    color: "from-green-500 to-green-600",
  },
];

interface PatientInfoModalData {
  name: string;
  age: string;
  location: string;
  pincode: string;
}

export default function AIPage() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userQueries, setUserQueries] = useState<Record<string, string>>({
    appointment: "Find nearby hospitals for a general checkup",
    explainer: "",
    insurance: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File | null>>({
    explainer: null,
    insurance: null,
  });
  const [conversationIds, setConversationIds] = useState<Record<string, string>>({
    insurance: `session-${Date.now()}`,
  });
  const [showPatientInfoModal, setShowPatientInfoModal] = useState(false);
  const [patientInfoModalData, setPatientInfoModalData] = useState<PatientInfoModalData>({
    name: "",
    age: "",
    location: "",
    pincode: "",
  });
  const [pendingAgentCall, setPendingAgentCall] = useState<(() => Promise<void>) | null>(null);
  
  const address = useWalletStore((s) => s.address);
  const connected = useWalletStore((s) => s.connected);

  /**
   * Fetch and decrypt patient profile from database
   * ALWAYS tries to get data from PostgreSQL first using wallet address
   * Returns patient info or null only if truly unavailable
   */
  const getPatientInfo = async (): Promise<{
    name?: string;
    age?: number;
    location?: string;
    pincode?: string;
    city?: string;
    state?: string;
    country?: string;
  } | null> => {
    console.log("[AI Page] Attempting to fetch patient info from PostgreSQL...");
    console.log("[AI Page] Wallet address:", address ? `${address.substring(0, 20)}...` : "not set");
    console.log("[AI Page] Wallet connected:", connected);

    // Check wallet connection first
    if (!address || !connected) {
      console.warn("[AI Page] Wallet not connected - cannot fetch patient data from DB");
      return null;
    }

    try {
      // Step 1: Get wallet API for decryption
      console.log("[AI Page] Step 1: Getting wallet API...");
      if (typeof window === "undefined" || !(window as any).cardano?.eternl) {
        console.warn("[AI Page] Wallet API not available in browser");
        return null;
      }

      console.log("[AI Page] Step 2: Enabling wallet...");
      const walletApi = await (window as any).cardano.eternl.enable();
      if (!walletApi) {
        console.warn("[AI Page] Failed to enable wallet API");
        return null;
      }
      console.log("[AI Page] Wallet API enabled successfully");

      // Step 2: Fetch encrypted profile from PostgreSQL via backend
      console.log("[AI Page] Step 3: Fetching encrypted profile from PostgreSQL...");
      const profileResponse = await fetch(`${API_URL}/api/profile/${encodeURIComponent(address)}`);
      
      if (!profileResponse.ok) {
        console.warn(`[AI Page] Profile fetch failed: ${profileResponse.status} ${profileResponse.statusText}`);
        if (profileResponse.status === 404) {
          console.warn("[AI Page] Profile not found in database - user may need to register");
        }
        return null;
      }

      const profileData = await profileResponse.json();
      console.log("[AI Page] Profile data received:", {
        exists: profileData.exists,
        hasCipher: !!profileData.cipher,
        role: profileData.role
      });

      if (!profileData.exists || !profileData.cipher) {
        console.warn("[AI Page] Profile exists but no cipher data found");
        return null;
      }

      // Step 3: Decrypt profile using wallet signing
      console.log("[AI Page] Step 4: Decrypting profile using wallet signature...");
      try {
        const encryptionKey = await deriveEncryptionKey(address, walletApi as CardanoWalletApi);
        console.log("[AI Page] Encryption key derived successfully");
        
        const profile = await decryptProfile(profileData.cipher, encryptionKey);
        console.log("[AI Page] Profile decrypted successfully from PostgreSQL:", { 
          username: profile.username,
          age: profile.age,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          hasEmail: !!profile.email,
          hasPhone: !!profile.phone
        });

        // Extract and return relevant fields
        // Note: pincode is not stored in profile, so we'll use a default based on location
        const getDefaultPincode = (city?: string, state?: string, country?: string): string => {
          // Default pincodes for common locations
          if (city?.toLowerCase().includes("new york") || state?.toLowerCase().includes("new york")) {
            return "10001";
          }
          if (city?.toLowerCase().includes("los angeles") || state?.toLowerCase().includes("california")) {
            return "90001";
          }
          if (city?.toLowerCase().includes("chicago") || state?.toLowerCase().includes("illinois")) {
            return "60601";
          }
          if (city?.toLowerCase().includes("houston") || state?.toLowerCase().includes("texas")) {
            return "77001";
          }
          // Default to NYC zip if no match
          return "10001";
        };

        const patientInfo = {
          name: profile.username || profile.name,
          age: profile.age,
          location: profile.city && profile.state 
            ? `${profile.city}, ${profile.state}` 
            : profile.city || profile.state || profile.country || undefined,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          pincode: getDefaultPincode(profile.city, profile.state, profile.country),
        };

        console.log("[AI Page] ✅ Successfully retrieved patient info from PostgreSQL:", patientInfo);
        return patientInfo;
      } catch (decryptError: any) {
        console.error("[AI Page] Failed to decrypt profile:", decryptError);
        if (decryptError.message?.includes("declined")) {
          console.warn("[AI Page] Wallet signing was declined by user");
        }
        return null;
      }
    } catch (error: any) {
      console.error("[AI Page] ❌ Failed to get patient info from PostgreSQL:", error);
      console.error("[AI Page] Error details:", {
        message: error.message,
        stack: error.stack
      });
      return null;
    }
  };

  const [modalResolve, setModalResolve] = useState<((value: { name: string; age: number; location: string; pincode: string } | null) => void) | null>(null);
  const [missingFields, setMissingFields] = useState<{ name?: boolean; age?: boolean; location?: boolean; pincode?: boolean }>({});

  /**
   * Prompt user for missing patient information
   */
  const promptForPatientInfo = async (
    fields: { name?: boolean; age?: boolean; location?: boolean; pincode?: boolean },
    existingInfo: { name?: string; age?: number; location?: string; pincode?: string } | null
  ): Promise<{ name: string; age: number; location: string; pincode: string } | null> => {
    return new Promise((resolve) => {
      // Set modal data with existing info or empty
      setPatientInfoModalData({
        name: existingInfo?.name || "",
        age: existingInfo?.age?.toString() || "",
        location: existingInfo?.location || "",
        pincode: existingInfo?.pincode || "",
      });

      setMissingFields(fields);
      // Store the resolve function directly
      setModalResolve(() => resolve);
      setShowPatientInfoModal(true);
    });
  };

  const handleModalSubmit = () => {
    const name = patientInfoModalData.name.trim();
    const age = parseInt(patientInfoModalData.age.trim());
    const location = patientInfoModalData.location.trim();
    const pincode = patientInfoModalData.pincode.trim();

    // Validate required fields
    if (missingFields.name && !name) {
      alert("Please enter your name");
      return;
    }
    if (missingFields.age && (!patientInfoModalData.age.trim() || isNaN(age) || age <= 0)) {
      alert("Please enter a valid age");
      return;
    }
    if (missingFields.location && !location) {
      alert("Please enter your location");
      return;
    }
    if (missingFields.pincode && !pincode) {
      alert("Please enter your pincode");
      return;
    }

    setShowPatientInfoModal(false);
    if (modalResolve) {
      modalResolve({
        name: name || "Patient",
        age: age || 35,
        location: location || "New York, NY",
        pincode: pincode || "10001",
      });
      setModalResolve(null);
    }
  };

  const handleModalCancel = () => {
    setShowPatientInfoModal(false);
    if (modalResolve) {
      modalResolve(null);
      setModalResolve(null);
    }
  };

  const handleRunAgent = async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    setLoading((prev) => ({ ...prev, [agentId]: true }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[agentId];
      return newErrors;
    });
    setResults((prev) => {
      const newResults = { ...prev };
      delete newResults[agentId];
      return newResults;
    });

    try {
      let response: {
        result?: any;
        job_id?: string;
        status?: string;
        conversation_id?: string;
        [key: string]: any;
      };
      
      // Get user's query input (required - button is disabled if empty)
      const userQuery = userQueries[agentId]?.trim();
      if (!userQuery) {
        setErrors((prev) => ({ ...prev, [agentId]: "Please enter a query" }));
        setLoading((prev) => ({ ...prev, [agentId]: false }));
        return;
      }
      
      // Build input based on agent type
      let defaultInput: any;
      
      if (agentId === "appointment") {
        // STEP 1: ALWAYS try to get patient info from PostgreSQL first
        console.log("[AI Page] [Appointment Agent] Step 1: Fetching patient data from PostgreSQL...");
        const patientInfo = await getPatientInfo();
        
        if (patientInfo) {
          console.log("[AI Page] [Appointment Agent] ✅ Patient data retrieved from PostgreSQL:", {
            hasName: !!patientInfo.name,
            hasAge: !!patientInfo.age,
            hasLocation: !!patientInfo.location,
            hasPincode: !!patientInfo.pincode
          });
        } else {
          console.log("[AI Page] [Appointment Agent] ⚠️ No patient data found in PostgreSQL");
        }
        
        // STEP 2: Check what's missing from DB
        const missingFields = {
          name: !patientInfo?.name,
          age: !patientInfo?.age,
          location: !patientInfo?.location && !patientInfo?.city,
          pincode: !patientInfo?.pincode,
        };

        console.log("[AI Page] [Appointment Agent] Missing fields check:", missingFields);

        // STEP 3: If anything is missing, prompt user (but use DB data as defaults)
        if (missingFields.name || missingFields.age || missingFields.location || missingFields.pincode) {
          console.log("[AI Page] [Appointment Agent] Some fields missing - prompting user for missing data");
          setLoading((prev) => ({ ...prev, [agentId]: false })); // Stop loading while modal is shown
          
          const userProvidedInfo = await promptForPatientInfo(missingFields, patientInfo);
          
          if (!userProvidedInfo) {
            // User cancelled
            console.log("[AI Page] [Appointment Agent] User cancelled patient info input");
            setLoading((prev) => ({ ...prev, [agentId]: false }));
            return;
          }

          // Use user-provided info (combining with any DB data)
          console.log("[AI Page] [Appointment Agent] Using user-provided info combined with DB data");
          defaultInput = {
            query: userQuery,
            pincode: userProvidedInfo.pincode,
            patient_info: {
              name: userProvidedInfo.name,
              age: userProvidedInfo.age,
              location: userProvidedInfo.location,
              // Include any additional fields from DB
              ...(patientInfo?.city && { city: patientInfo.city }),
              ...(patientInfo?.state && { state: patientInfo.state }),
              ...(patientInfo?.country && { country: patientInfo.country }),
            }
          };
          
          setLoading((prev) => ({ ...prev, [agentId]: true })); // Resume loading
        } else {
          // STEP 4: All info available from DB - use it directly
          console.log("[AI Page] [Appointment Agent] ✅ All required data available from PostgreSQL - using DB data");
          
          if (!patientInfo) {
            // Should not happen at this point, but handle gracefully
            console.error("[AI Page] [Appointment Agent] ❌ Patient info is null but missingFields check passed - this is a bug");
            setErrors((prev) => ({ ...prev, [agentId]: "Failed to retrieve patient information from database" }));
            setLoading((prev) => ({ ...prev, [agentId]: false }));
            return;
          }
          
          defaultInput = {
            query: userQuery,
            pincode: patientInfo.pincode,
            patient_info: {
              name: patientInfo.name,
              age: patientInfo.age,
              location: patientInfo.location || patientInfo.city || "New York, NY",
              ...(patientInfo.city && { city: patientInfo.city }),
              ...(patientInfo.state && { state: patientInfo.state }),
              ...(patientInfo.country && { country: patientInfo.country }),
            }
          };
          
          console.log("[AI Page] [Appointment Agent] Using patient data from PostgreSQL:", defaultInput.patient_info);
        }
      } else {
        defaultInput = { query: userQuery };
      }

      switch (agentId) {
        case "explainer":
          // Check if a file is uploaded - use PDF upload endpoint
          const uploadedFile = uploadedFiles.explainer;
          if (uploadedFile) {
            response = await runExplainerWithPDF(uploadedFile, defaultInput);
          } else {
            response = await runExplainer(defaultInput);
          }
          break;
        case "appointment":
          response = await runAppointment(defaultInput);
          break;
        case "insurance":
          // Check if a file is uploaded - use PDF upload endpoint
          const insuranceFile = uploadedFiles.insurance;
          if (insuranceFile) {
            response = await runInsuranceWithPDF(insuranceFile, defaultInput);
            // After successful upload, clear the file so user can ask questions
            setUploadedFiles((prev) => ({ ...prev, insurance: null }));
          } else {
            // Use conversation_id for insurance queries
            const conversationId = conversationIds.insurance || `session-${Date.now()}`;
            response = await runInsurance({ ...defaultInput, conversation_id: conversationId });
            // Update conversation_id if provided in response
            if (response.conversation_id) {
              setConversationIds((prev) => ({ ...prev, insurance: response.conversation_id }));
            }
          }
          break;
        default:
          throw new Error("Unknown agent");
      }

      // Handle job-based response format
      // Your agents return: { job_id, status, result: { ...actual_response... } }
      let displayResult = response;
      
      if (response.result) {
        // Extract the actual agent result
        displayResult = {
          ...response.result,
          job_id: response.job_id,
          status: response.status,
        };
      }
      
      setResults((prev) => ({ ...prev, [agentId]: displayResult }));
    } catch (error: any) {
      console.error(`[AI Page] ${agent.title} error:`, error);
      setErrors((prev) => ({ ...prev, [agentId]: error.message || "Failed to run agent" }));
    } finally {
      setLoading((prev) => ({ ...prev, [agentId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            AI Analysis
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Leverage AI-powered agents to simplify your healthcare management
          </p>
        </motion.div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Icon */}
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center mb-4 shadow-md`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {agent.title}
                </h2>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 flex-1 leading-relaxed">
                  {agent.description}
                </p>

                {/* User Input Field */}
                <div className="mb-4">
                  <label htmlFor={`query-${agent.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                    {agent.id === "explainer" 
                      ? "Text Query (or upload PDF below)" 
                      : agent.id === "insurance"
                      ? "Ask a Question (or upload document below to add to knowledge base)"
                      : "Your Query"}
                  </label>
                  <input
                    id={`query-${agent.id}`}
                    type="text"
                    value={userQueries[agent.id] || ""}
                    onChange={(e) => setUserQueries((prev) => ({ ...prev, [agent.id]: e.target.value }))}
                    placeholder={
                      agent.id === "appointment"
                        ? "Find nearby hospitals for a general checkup"
                        : agent.id === "explainer"
                        ? "Explain my lab results in simple terms (or upload PDF)"
                        : agent.id === "insurance"
                        ? "What is the sum insured for john doe"
                        : "Help me understand my insurance coverage"
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    disabled={loading[agent.id]}
                  />
                </div>

                {/* PDF Upload Field for Explainer Agent */}
                {agent.id === "explainer" && (
                  <div className="mb-4">
                    <label htmlFor={`file-${agent.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Medical Report PDF (Optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`file-${agent.id}`}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setUploadedFiles((prev) => ({ ...prev, [agent.id]: file }));
                          if (file) {
                            setUserQueries((prev) => ({ ...prev, [agent.id]: file.name }));
                          }
                        }}
                        className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                        disabled={loading[agent.id]}
                      />
                      {uploadedFiles[agent.id] && (
                        <button
                          onClick={() => {
                            setUploadedFiles((prev) => ({ ...prev, [agent.id]: null }));
                            setUserQueries((prev) => ({ ...prev, [agent.id]: "" }));
                            const fileInput = document.getElementById(`file-${agent.id}`) as HTMLInputElement;
                            if (fileInput) fileInput.value = "";
                          }}
                          className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={loading[agent.id]}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {uploadedFiles[agent.id] && (
                      <p className="mt-1 text-xs text-gray-500">
                        Selected: {uploadedFiles[agent.id]?.name} ({((uploadedFiles[agent.id]?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                )}

                {/* Run Agent Button */}
                <motion.button
                  whileHover={{ scale: loading[agent.id] ? 1 : 1.02 }}
                  whileTap={{ scale: loading[agent.id] ? 1 : 0.98 }}
                  onClick={() => handleRunAgent(agent.id)}
                  disabled={loading[agent.id] || (!userQueries[agent.id]?.trim() && !uploadedFiles[agent.id])}
                  className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading[agent.id] ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <span>Run Agent</span>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </>
                  )}
                </motion.button>

                {/* Error Display */}
                {errors[agent.id] && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">Error</p>
                        <p className="text-xs text-red-600 mt-1">{errors[agent.id]}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Result Display */}
                {results[agent.id] && !errors[agent.id] && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <p className="text-sm font-medium text-green-800">Response</p>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                      {(() => {
                        const result = results[agent.id];
                        // Format agent responses nicely
                        if (typeof result === "object" && result !== null) {
                          // Explainer agent response format
                          if (agent.id === "explainer" && result.summary) {
                            return (
                              <div className="space-y-3">
                                <div className="p-3 bg-purple-50 rounded-lg">
                                  <p className="font-semibold text-purple-900 mb-2">📋 Summary</p>
                                  <p className="text-sm">{result.summary}</p>
                                </div>
                                
                                {result.key_findings && result.key_findings.length > 0 && (
                                  <div className="mt-3">
                                    <p className="font-semibold text-gray-800 mb-2">🔍 Key Findings</p>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                      {result.key_findings.map((finding: string, idx: number) => (
                                        <li key={idx} className="text-gray-700">{finding}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {result.risk_prediction && (
                                  <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                                    <p className="font-semibold text-gray-800 mb-2">⚠️ Risk Assessment</p>
                                    <p className="text-sm mb-2">
                                      <strong>Overall Risk:</strong> <span className={`font-bold ${
                                        result.risk_prediction.overall_risk === "LOW" ? "text-green-600" :
                                        result.risk_prediction.overall_risk === "MEDIUM" ? "text-yellow-600" :
                                        "text-red-600"
                                      }`}>{result.risk_prediction.overall_risk}</span>
                                    </p>
                                    
                                    {result.risk_prediction.risk_assessments && result.risk_prediction.risk_assessments.length > 0 && (
                                      <div className="mt-2 space-y-2">
                                        {result.risk_prediction.risk_assessments.map((assessment: any, idx: number) => (
                                          <div key={idx} className="p-2 bg-white rounded border border-gray-200">
                                            <p className="font-semibold text-sm">{assessment.disease}</p>
                                            <p className="text-xs text-gray-600">
                                              Risk: <span className={`font-semibold ${
                                                assessment.risk_level === "LOW" ? "text-green-600" :
                                                assessment.risk_level === "MEDIUM" ? "text-yellow-600" :
                                                "text-red-600"
                                              }`}>{assessment.risk_level}</span> ({assessment.risk_score})
                                            </p>
                                            {assessment.recommendations && assessment.recommendations.length > 0 && (
                                              <div className="mt-1">
                                                <p className="text-xs font-semibold text-gray-700">Recommendations:</p>
                                                <ul className="list-disc list-inside text-xs text-gray-600">
                                                  {assessment.recommendations.map((rec: string, recIdx: number) => (
                                                    <li key={recIdx}>{rec}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {result.risk_prediction.requires_doctor_review && (
                                      <p className="mt-2 text-xs font-semibold text-red-600">⚠️ Requires doctor review</p>
                                    )}
                                  </div>
                                )}
                                
                                {result.confidence_estimate && (
                                  <p className="mt-2 text-xs text-gray-500">
                                    Confidence: {(result.confidence_estimate * 100).toFixed(0)}%
                                  </p>
                                )}
                              </div>
                            );
                          }
                          
                          // Insurance agent response format
                          if (agent.id === "insurance" && result.answer) {
                            return (
                              <div className="space-y-3">
                                <div className="p-3 bg-green-50 rounded-lg">
                                  <p className="font-semibold text-green-900 mb-2">💬 Answer</p>
                                  <p className="text-sm">{result.answer}</p>
                                </div>
                                
                                {result.sources && result.sources.length > 0 && (
                                  <div className="mt-3">
                                    <p className="font-semibold text-gray-800 mb-2 text-xs">📚 Sources</p>
                                    <ul className="list-disc list-inside space-y-1 text-xs">
                                      {result.sources.map((source: string, idx: number) => (
                                        <li key={idx} className="text-gray-600">{source}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {result.status && (
                                  <p className="mt-2 text-xs text-gray-500">
                                    Status: <span className={`font-semibold ${
                                      result.status === "success" ? "text-green-600" : "text-yellow-600"
                                    }`}>{result.status}</span>
                                  </p>
                                )}
                                
                                {result.conversation_id && (
                                  <p className="mt-1 text-xs text-gray-400">
                                    Session: {result.conversation_id}
                                  </p>
                                )}
                              </div>
                            );
                          }
                          
                          // Appointment agent response format
                          if (result.status === "appointment_scheduled" || result.selected_hospital) {
                            return (
                              <div className="space-y-2">
                                <p className="font-semibold text-green-700">✅ Appointment recommendations</p>
                                {result.specialty_determined && (
                                  <p><strong>Specialty:</strong> {result.specialty_determined}</p>
                                )}
                                {result.selected_hospital && (
                                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                    <p className="font-semibold">{result.selected_hospital.hospital_name}</p>
                                    <p className="text-xs text-gray-600">{result.selected_hospital.address}</p>
                                    {result.selected_hospital.phone && (
                                      <p className="text-xs">📞 {result.selected_hospital.phone}</p>
                                    )}
                                    {result.selected_hospital.rating && (
                                      <p className="text-xs">⭐ {result.selected_hospital.rating}</p>
                                    )}
                                  </div>
                                )}
                                {result.specialty_reasoning && (
                                  <p className="text-xs text-gray-500 italic mt-2">{result.specialty_reasoning}</p>
                                )}
                              </div>
                            );
                          }
                          // For other structured responses, show formatted JSON
                          return <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>;
                        }
                        // For string responses
                        return typeof result === "string" ? result : JSON.stringify(result, null, 2);
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 max-w-3xl mx-auto"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-medical-blue/10 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-medical-blue"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">AI-Powered Healthcare Assistance</h3>
              <p className="text-sm text-gray-600">
                Our AI agents use advanced machine learning to help you manage your healthcare needs. 
                All interactions are secure, private, and designed to make healthcare more accessible and understandable.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Patient Info Modal */}
      {showPatientInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Patient Information Required</h3>
              <button
                onClick={handleModalCancel}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Please provide the following information to continue:
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name {missingFields.name && "*"}
                </label>
                <input
                  type="text"
                  value={patientInfoModalData.name}
                  onChange={(e) => setPatientInfoModalData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age {missingFields.age && "*"}
                </label>
                <input
                  type="number"
                  value={patientInfoModalData.age}
                  onChange={(e) => setPatientInfoModalData(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="Enter your age"
                  min="1"
                  max="120"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location {missingFields.location && "*"}
                </label>
                <input
                  type="text"
                  value={patientInfoModalData.location}
                  onChange={(e) => setPatientInfoModalData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City, State (e.g., New York, NY)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode/Zip Code {missingFields.pincode && "*"}
                </label>
                <input
                  type="text"
                  value={patientInfoModalData.pincode}
                  onChange={(e) => setPatientInfoModalData(prev => ({ ...prev, pincode: e.target.value }))}
                  placeholder="Enter pincode (e.g., 10001)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleModalCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

