"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlaskConical, Heart, Pill, FileText, Loader2, UserPlus, Trash2 } from "lucide-react";
import { API_URL } from "@/lib/api-config";
import { SavePatientModal } from "@/components/save-patient-modal";

interface RequestAccessFormProps {
  requesterWallet: string;
  onRequestSubmitted: () => void;
}

interface SavedPatient {
  id: string;
  patientWallet: string;
  alias: string;
  createdAt: string;
}

const recordTypes = [
  { id: "lab_results", label: "Lab Results", icon: FlaskConical },
  { id: "cardiac_evaluation", label: "Cardiac Evaluation", icon: Heart },
  { id: "prescription_history", label: "Prescription History", icon: Pill },
  { id: "consultation_notes", label: "Consultation Notes", icon: FileText },
];

export function RequestAccessForm({
  requesterWallet,
  onRequestSubmitted,
}: RequestAccessFormProps) {
  const [patientWallet, setPatientWallet] = useState("");
  const [patientName, setPatientName] = useState("");
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Saved patients state
  const [savedPatients, setSavedPatients] = useState<SavedPatient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Load saved patients on mount
  useEffect(() => {
    if (requesterWallet) {
      loadSavedPatients();
    }
  }, [requesterWallet]);

  const loadSavedPatients = async () => {
    setLoadingPatients(true);
    try {
      const response = await fetch(`${API_URL}/api/saved-patients?doctorWallet=${encodeURIComponent(requesterWallet)}`);
      if (response.ok) {
        const data = await response.json();
        setSavedPatients(data.savedPatients || []);
      } else {
        const errorData = await response.json();
        console.error("Failed to load saved patients:", errorData.error);
      }
    } catch (err) {
      console.error("Failed to load saved patients:", err);
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleRecordToggle = (recordId: string) => {
    setSelectedRecords((prev) =>
      prev.includes(recordId)
        ? prev.filter((id) => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleSelectPatient = (wallet: string, alias?: string) => {
    setPatientWallet(wallet);
    if (alias) {
      setPatientName(alias);
    }
  };

  const handleDeletePatient = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this saved patient?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/saved-patients/delete/${contactId}?doctorWallet=${encodeURIComponent(requesterWallet)}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await loadSavedPatients();
        // Clear selected patient if it was deleted
        const deleted = savedPatients.find((p) => p.id === contactId);
        if (deleted && patientWallet === deleted.patientWallet) {
          setPatientWallet("");
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete patient");
      }
    } catch (err) {
      console.error("Failed to delete patient:", err);
      setError("Failed to delete patient. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    if (!patientWallet.trim()) {
      setError("Patient wallet address is required");
      setIsSubmitting(false);
      return;
    }

    if (!patientName.trim()) {
      setError("Patient name is required");
      setIsSubmitting(false);
      return;
    }

    if (selectedRecords.length === 0) {
      setError("Please select at least one record type");
      setIsSubmitting(false);
      return;
    }

    try {
      // Submit a single access request with all selected record types
      const response = await fetch(`${API_URL}/api/access/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorWallet: requesterWallet,
          patientWallet: patientWallet.trim(),
          patientName: patientName.trim(),
          recordTypes: selectedRecords,
          reason: reason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit access request");
      }

      const data = await response.json();

      setSuccess(true);
      setTimeout(() => {
        setPatientWallet("");
        setPatientName("");
        setSelectedRecords([]);
        setReason("");
        setSuccess(false);
        onRequestSubmitted();
      }, 2000);
    } catch (err: any) {
      console.error("Request access error:", err);
      setError(err?.message || "Failed to submit access request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="glass-card p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Request Patient Access</h2>
            <p className="text-sm text-gray-600">
              Enter the patient's wallet address to request access to their medical records.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Save Patient
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            Access request submitted successfully! The patient will be notified.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Saved Patients Dropdown */}
          {savedPatients.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Saved Patients (Quick Select)
              </Label>
              <div className="space-y-2">
                {savedPatients.map((patient) => {
                  const patientAlias = patient.alias || "Unknown Patient";
                  const isSelected = patientWallet === patient.patientWallet;
                  return (
                    <div
                      key={patient.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-medical-blue bg-medical-blue/10"
                          : "border-gray-200 bg-white/50 hover:border-medical-blue/50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectPatient(patient.patientWallet, patient.alias)}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium text-gray-900">{patientAlias}</div>
                        <div className="text-xs font-mono text-gray-500 truncate">
                          {patient.patientWallet}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePatient(patient.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Delete patient"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="patientWallet" className="text-sm font-medium text-gray-700">
              Patient Wallet Address *
            </Label>
            <Input
              id="patientWallet"
              type="text"
              value={patientWallet}
              onChange={(e) => setPatientWallet(e.target.value)}
              placeholder="addr1..."
              className="w-full font-mono text-sm"
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-gray-500">
              Enter the Cardano wallet address of the patient you want to request access from.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="patientName" className="text-sm font-medium text-gray-700">
              Patient Name *
            </Label>
            <Input
              id="patientName"
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter patient's full name"
              className="w-full"
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-gray-500">
              Enter the patient's name for your reference.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Requested Record Types *
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {recordTypes.map((record) => {
                const Icon = record.icon;
                const isSelected = selectedRecords.includes(record.id);
                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => handleRecordToggle(record.id)}
                    disabled={isSubmitting}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-medical-blue bg-medical-blue/10"
                        : "border-gray-200 bg-white/50 hover:border-medical-blue/50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? "bg-medical-blue text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      {record.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium text-gray-700">
              Reason for Access (Optional)
            </Label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Follow-up consultation regarding recent cardiac evaluation..."
              className="flex min-h-[100px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting || selectedRecords.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Request...
              </>
            ) : (
              "Submit Access Request"
            )}
          </Button>
        </form>
      </Card>

      <SavePatientModal
        doctorWallet={requesterWallet}
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSaved={loadSavedPatients}
      />
    </>
  );
}
