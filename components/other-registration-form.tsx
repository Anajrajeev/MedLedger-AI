"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api-config";
import { deriveEncryptionKey, encryptProfile } from "@/lib/crypto/profileEncryption";
import { useWalletStore } from "@/hooks/useWalletStore";

interface OtherRegistrationFormProps {
  walletAddress: string;
  role: "other";
  onRegistrationComplete: () => void;
}

export function OtherRegistrationForm({
  walletAddress,
  onRegistrationComplete,
}: OtherRegistrationFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get wallet API from store (we'll need it for encryption)
  const walletApi = useWalletStore((s) => s.api);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!formData.name.trim()) {
      setError("Name is required");
      setIsSubmitting(false);
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      setIsSubmitting(false);
      return;
    }

    try {
      // Step 1: Get wallet API for encryption
      if (!walletApi) {
        throw new Error("Wallet not connected. Please reconnect your wallet.");
      }

      // Step 2: Derive encryption key from wallet signature
      console.log("[Other Registration] Deriving encryption key...");
      const encryptionKey = await deriveEncryptionKey(walletAddress, walletApi);

      // Step 3: Encrypt private profile data
      const privateProfile = {
        email: formData.email,
        phone: formData.phone,
      };
      
      console.log("[Other Registration] Encrypting profile...");
      const cipher = await encryptProfile(privateProfile, encryptionKey);

      // Step 4: Save encrypted profile
      const profileResponse = await fetch(`${API_URL}/api/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          role: "other",
          cipher, // Send encrypted data only
        }),
      });

      if (!profileResponse.ok) {
        let errorData;
        try {
          errorData = await profileResponse.json();
        } catch {
          errorData = { error: "Server responded with non-JSON error" };
        }
        throw new Error(errorData.error || "Failed to create profile");
      }

      // Step 5: Save public profile (for display to patients)
      const publicProfileResponse = await fetch(`${API_URL}/api/public-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          displayName: formData.name,
          credentials: undefined,
          specialty: undefined,
          organization: formData.organization,
          role: "other",
        }),
      });

      if (!publicProfileResponse.ok) {
        console.warn("[Other Registration] Failed to save public profile, but private profile was saved");
        // Don't fail the whole registration if public profile fails
      }

      console.log("[Other Registration] Profile created successfully");
      onRegistrationComplete();
    } catch (err: any) {
      console.error("[Other Registration] Error:", err);
      setError(err?.message || "Failed to register. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl w-full glass-card py-8 px-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-gray-500 to-slate-500 flex items-center justify-center">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
        <p className="text-sm text-gray-600">
          Please provide your information
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Name *
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              className="w-full"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email *
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="w-full"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Phone
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              className="w-full"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization" className="text-sm font-medium text-gray-700">
              Organization
            </Label>
            <Input
              id="organization"
              name="organization"
              type="text"
              value={formData.organization}
              onChange={handleChange}
              placeholder="Insurance, Research, etc."
              className="w-full"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Profile...
            </>
          ) : (
            "Create Profile"
          )}
        </Button>
      </form>
    </Card>
  );
}

