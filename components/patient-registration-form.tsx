"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api-config";
import { deriveEncryptionKey, encryptProfile } from "@/lib/crypto/profileEncryption";
import { useWalletStore } from "@/hooks/useWalletStore";

interface PatientRegistrationFormProps {
  walletAddress: string;
  role: "patient";
  onRegistrationComplete: () => void;
}

export function PatientRegistrationForm({
  walletAddress,
  onRegistrationComplete,
}: PatientRegistrationFormProps) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    gender: "",
    age: "",
    country: "",
    state: "",
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

    if (!formData.username.trim()) {
      setError("Username is required");
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
      console.log("[Patient Registration] Deriving encryption key...");
      const encryptionKey = await deriveEncryptionKey(walletAddress, walletApi);

      // Step 3: Encrypt ALL profile data (patients have no public profile - privacy by default)
      const privateProfile = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        age: formData.age,
        country: formData.country,
        state: formData.state,
        city: formData.city,
      };
      
      console.log("[Patient Registration] Encrypting profile...");
      const cipher = await encryptProfile(privateProfile, encryptionKey);

      // Step 4: Save encrypted profile (patients don't have public profiles)
      const profileResponse = await fetch(`${API_URL}/api/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          role: "patient",
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

      console.log("[Patient Registration] Profile created successfully");
      onRegistrationComplete();
    } catch (err: any) {
      console.error("[Patient Registration] Error:", err);
      setError(err?.message || "Failed to register. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl w-full glass-card py-8 px-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-medical-blue to-medical-teal flex items-center justify-center">
          <UserPlus className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
        <p className="text-sm text-gray-600">
          Please provide your information to get started
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
            <Label htmlFor="username" className="text-sm font-medium text-gray-700">
              Username *
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
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
            <Label htmlFor="gender" className="text-sm font-medium text-gray-700">
              Gender
            </Label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="age" className="text-sm font-medium text-gray-700">
              Age
            </Label>
            <Input
              id="age"
              name="age"
              type="number"
              value={formData.age}
              onChange={handleChange}
              placeholder="Enter your age"
              className="w-full"
              disabled={isSubmitting}
              min="1"
              max="120"
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

