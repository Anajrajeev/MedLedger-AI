"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { WalletSwitcher } from "@/components/wallet-switcher";
import { shortenAddress } from "@/lib/address-utils";
import { useRoleStore } from "@/hooks/useRoleStore";
import { useWalletStore } from "@/hooks/useWalletStore";
import { API_URL } from "@/lib/api-config";
import { deriveEncryptionKey, decryptProfile } from "@/lib/crypto/profileEncryption";
import type { CardanoWalletApi } from "@/types/window";

interface NavItem {
  label: string;
  href: string;
}

export function Navbar() {
  const pathname = usePathname();
  const role = useRoleStore((s) => s.role);
  const address = useWalletStore((s) => s.address);
  const connected = useWalletStore((s) => s.connected);
  const walletApi = useWalletStore((s) => s.api);
  const [userInitials, setUserInitials] = useState<string>("U");

  // Function to get initials from a name
  const getInitials = (name: string): string => {
    if (!name || name.trim() === "") return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      // First letter of first name and first letter of last name
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    // Single name - use first two letters or just first letter
    return name.substring(0, 2).toUpperCase() || name[0].toUpperCase();
  };

  // Fetch user's name and set initials
  useEffect(() => {
    const fetchUserName = async () => {
      if (!address || !connected || !role) {
        setUserInitials("U");
        return;
      }

      try {
        // For doctors, hospitals, and others, use public profile (no decryption needed)
        if (role === "doctor" || role === "hospital" || role === "other") {
          const publicProfileResponse = await fetch(
            `${API_URL}/api/public-profile/${encodeURIComponent(address)}`
          );
          if (publicProfileResponse.ok) {
            const publicProfile = await publicProfileResponse.json();
            if (publicProfile.exists && publicProfile.displayName) {
              setUserInitials(getInitials(publicProfile.displayName));
              return;
            }
          }
        }

        // For patients, try to decrypt profile (requires wallet signing)
        if (role === "patient" && walletApi) {
          try {
            const profileResponse = await fetch(
              `${API_URL}/api/profile/${encodeURIComponent(address)}`
            );
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData.exists && profileData.cipher) {
                const encryptionKey = await deriveEncryptionKey(address, walletApi as CardanoWalletApi);
                const profile = await decryptProfile(profileData.cipher, encryptionKey);
                const name = profile.username || profile.name;
                if (name) {
                  setUserInitials(getInitials(name));
                  return;
                }
              }
            }
          } catch (error) {
            console.warn("[Navbar] Failed to decrypt patient profile:", error);
            // Fall through to fallback
          }
        }

        // Fallback: use first letter of wallet address
        if (address && address.length > 0) {
          setUserInitials(address.substring(0, 1).toUpperCase());
        } else {
          setUserInitials("U");
        }
      } catch (error) {
        console.error("[Navbar] Failed to fetch user name:", error);
        setUserInitials("U");
      }
    };

    fetchUserName();
  }, [address, connected, role, walletApi]);

  // Role-specific navigation items
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      { label: "Access Requests", href: "/access-requests" },
      { label: "Record Logs", href: "/logs" },
      { label: "AI Analysis", href: "/ai" },
    ];

    // For doctors and hospitals, show "Request Access" and "Request Logs"
    if (role === "doctor" || role === "hospital") {
      return [
        { label: "Request Access", href: "/access-requests" }, // Request Access instead of Access Requests
        { label: "Request Logs", href: "/logs" }, // Request Logs instead of Record Logs
        // Create Records and AI Analysis removed for doctors
      ];
    }

    // For patients and others, show "My Records" and "Record Logs"
    return [
      { label: "My Records", href: "/records" },
      ...baseItems,
    ];
  };

  const navItems = getNavItems();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 glass-nav"
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shadow-lg">
              <Image
                src="/logo.png"
                alt="MedLedger AI Logo"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl font-semibold text-gray-800">
              MedLedger AI
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1 bg-white/40 rounded-full px-2 py-2 backdrop-blur-sm">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <motion.div
                  key={item.label}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "relative px-5 py-2 rounded-full text-sm font-medium transition-all block",
                      isActive
                        ? "text-medical-blue"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-white rounded-full shadow-md"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            <WalletSwitcher />

            <Avatar className="h-10 w-10 cursor-pointer hover:ring-medical-blue transition-all">
              <AvatarImage src="/user-avatar.jpg" alt="User" />
              <AvatarFallback className="bg-gradient-to-br from-medical-blue to-medical-teal text-white text-sm">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

