"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { User, Stethoscope, Building2, Users } from "lucide-react";
import { API_URL } from "@/lib/api-config";
import Image from "next/image";

interface RoleSelectionProps {
  walletAddress: string;
  onRoleSelected: (role: "patient" | "doctor" | "hospital" | "other") => void;
}

const roles = [
  {
    id: "patient" as const,
    label: "Patient",
    icon: User,
    description: "Manage your medical records and grant access to healthcare providers",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "doctor" as const,
    label: "Doctor",
    icon: Stethoscope,
    description: "Request access to patient records and create medical records",
    gradient: "from-teal-500 to-emerald-500",
  },
  {
    id: "hospital" as const,
    label: "Hospital",
    icon: Building2,
    description: "Manage hospital records and coordinate patient care",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    id: "other" as const,
    label: "Other",
    icon: Users,
    description: "For insurers, researchers, or other healthcare stakeholders",
    gradient: "from-gray-500 to-slate-500",
  },
];

export function RoleSelection({ walletAddress, onRoleSelected }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleRoleClick = async (role: "patient" | "doctor" | "hospital" | "other") => {
    setSelectedRole(role);
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/register-role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          role,
        }),
      });

      if (!response.ok) {
        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to register role");
        } else {
          // Response is HTML (likely 404 or error page)
          const text = await response.text();
          const apiUrl = API_URL || "http://localhost:4000";
          console.error("[RoleSelection] Backend not responding. Text response:", text.substring(0, 300));
          throw new Error(`Backend server not responding. Please ensure it's running on ${apiUrl}. Run 'npm run server:dev' in a separate terminal.`);
        }
      }

      const data = await response.json();
      console.log("[RoleSelection] Role registered successfully:", data);

      // Proceed to profile form
      onRoleSelected(role);
    } catch (err: any) {
      console.error("[RoleSelection] Error registering role:", err);
      
      // Handle different types of errors
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        // Network error - backend not reachable
        const apiUrl = API_URL || "http://localhost:4000";
        setError(`Cannot connect to backend server. Please ensure it's running on ${apiUrl}. Run 'npm run server:dev' in a separate terminal.`);
      } else if (err.message && err.message.includes("JSON")) {
        // JSON parsing error
        const apiUrl = API_URL || "http://localhost:4000";
        setError(`Backend server returned invalid response. Please check if the server is running on ${apiUrl}.`);
      } else {
        // Other errors
        setError(err?.message || "Failed to register role. Please try again.");
      }
      
      setSelectedRole(null);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20 flex items-center justify-center px-4 py-12 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl w-full space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center shadow-lg">
              <Image
                src="/logo.png"
                alt="MedLedger AI Logo"
                width={64}
                height={64}
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            Choose Your Role
          </h1>
          <p className="text-lg text-gray-600">
            Select the role that best describes you to get started
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            const isProcessing = isSubmitting && isSelected;

            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`glass-card p-8 cursor-pointer transition-all h-full flex flex-col ${
                    isSelected
                      ? "ring-2 ring-medical-blue shadow-xl"
                      : "hover:shadow-lg"
                  } ${isSubmitting && !isSelected ? "opacity-50 pointer-events-none" : ""}`}
                  onClick={() => !isSubmitting && handleRoleClick(role.id)}
                >
                  <div className="space-y-4 flex flex-col flex-1">
                    <div
                      className={`w-16 h-16 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}
                    >
                      <Icon className="w-8 h-8 text-white" strokeWidth={2} />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {role.label}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {role.description}
                      </p>
                    </div>

                    {isProcessing && (
                      <div className="flex items-center gap-2 text-medical-blue flex-shrink-0">
                        <div className="w-4 h-4 border-2 border-medical-blue border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium">Registering...</span>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

