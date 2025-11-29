"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api-config";

interface SavePatientModalProps {
  doctorWallet: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SavePatientModal({
  doctorWallet,
  isOpen,
  onClose,
  onSaved,
}: SavePatientModalProps) {
  const [patientWallet, setPatientWallet] = useState("");
  const [patientName, setPatientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

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

    try {
      // Save patient with alias using new API
      const response = await fetch(`${API_URL}/api/saved-patients/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorWallet,
          patientWallet: patientWallet.trim(),
          alias: patientName.trim(),
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const text = await response.text();
          throw new Error(`Server error (${response.status}): ${text.substring(0, 200)}`);
        }
        // Show the actual error message from backend
        const errorMessage = errorData.message || errorData.error || "Failed to save patient";
        throw new Error(errorMessage);
      }

      // Reset form and close modal
      setPatientWallet("");
      setPatientName("");
      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Save patient error:", err);
      setError(err?.message || "Failed to save patient. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <Card className="max-w-md w-full glass-card p-6 space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Save Patient</h2>
          <p className="text-sm text-gray-600">
            Save a patient's wallet address and name for quick access in future requests.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="John Doe"
              className="w-full"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Patient"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

