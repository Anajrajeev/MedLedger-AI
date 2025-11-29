"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api-config";
import { deriveEncryptionKey, encryptProfile } from "@/lib/crypto/profileEncryption";
import { useWalletStore } from "@/hooks/useWalletStore";

interface DoctorRegistrationFormProps {
  walletAddress: string;
  role: "doctor";
  onRegistrationComplete: () => void;
}

export function DoctorRegistrationForm({
  walletAddress,
  onRegistrationComplete,
}: DoctorRegistrationFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    licenseNumber: "",
    hospital: "",
    state: "",
    country: "",
    city: "",
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

    if (!formData.specialty.trim()) {
      setError("Specialty is required");
      setIsSubmitting(false);
      return;
    }

    if (!formData.licenseNumber.trim()) {
      setError("License number is required");
      setIsSubmitting(false);
      return;
    }

    try {
      // Step 1: Get wallet API for encryption
      if (!walletApi) {
        throw new Error("Wallet not connected. Please reconnect your wallet.");
      }

      // Step 2: Derive encryption key from wallet signature
      console.log("[Doctor Registration] Deriving encryption key...");
      const encryptionKey = await deriveEncryptionKey(walletAddress, walletApi);

      // Step 3: Encrypt private profile data
      const privateProfile = {
        email: formData.email,
        phone: formData.phone,
        state: formData.state,
        country: formData.country,
        city: formData.city,
      };
      
      console.log("[Doctor Registration] Encrypting profile...");
      const cipher = await encryptProfile(privateProfile, encryptionKey);

      // Step 4: Save encrypted profile
      const profileResponse = await fetch(`${API_URL}/api/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          role: "doctor",
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
          credentials: formData.licenseNumber,
          specialty: formData.specialty,
          organization: formData.hospital,
          role: "doctor",
        }),
      });

      if (!publicProfileResponse.ok) {
        console.warn("[Doctor Registration] Failed to save public profile, but private profile was saved");
        // Don't fail the whole registration if public profile fails
      }

      console.log("[Doctor Registration] Profile created successfully");
      onRegistrationComplete();
    } catch (err: any) {
      console.error("[Doctor Registration] Error:", err);
      setError(err?.message || "Failed to register. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl w-full glass-card py-8 px-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
          <Stethoscope className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Complete Your Doctor Profile</h2>
        <p className="text-sm text-gray-600">
          Please provide your professional information
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
              Full Name *
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Dr. John Doe"
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
              placeholder="doctor@example.com"
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
            <Label htmlFor="specialty" className="text-sm font-medium text-gray-700">
              Specialty *
            </Label>
            <Input
              id="specialty"
              name="specialty"
              type="text"
              value={formData.specialty}
              onChange={handleChange}
              placeholder="Cardiology, Neurology, etc."
              className="w-full"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseNumber" className="text-sm font-medium text-gray-700">
              License Number *
            </Label>
            <Input
              id="licenseNumber"
              name="licenseNumber"
              type="text"
              value={formData.licenseNumber}
              onChange={handleChange}
              placeholder="MD-12345-CA"
              className="w-full"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hospital" className="text-sm font-medium text-gray-700">
              Hospital
            </Label>
            <Input
              id="hospital"
              name="hospital"
              type="text"
              value={formData.hospital}
              onChange={handleChange}
              placeholder="Hospital name"
              className="w-full"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country" className="text-sm font-medium text-gray-700">
              Country
            </Label>
            <Input
              id="country"
              name="country"
              type="text"
              value={formData.country}
              onChange={handleChange}
              placeholder="Enter your country"
              className="w-full"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state" className="text-sm font-medium text-gray-700">
              State/Province
            </Label>
            <Input
              id="state"
              name="state"
              type="text"
              value={formData.state}
              onChange={handleChange}
              placeholder="Enter your state or province"
              className="w-full"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city" className="text-sm font-medium text-gray-700">
              City
            </Label>
            <Input
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter your city"
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

