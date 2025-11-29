"use client";

import React from "react";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { WalletSwitcher } from "@/components/wallet-switcher";
import { shortenAddress } from "@/lib/address-utils";
import { useRoleStore } from "@/hooks/useRoleStore";

interface NavItem {
  label: string;
  href: string;
}

export function Navbar() {
  const pathname = usePathname();
  const role = useRoleStore((s) => s.role);

  // Role-specific navigation items
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      { label: "Dashboard", href: "/" },
      { label: "Access Requests", href: "/access-requests" },
      { label: "Record Logs", href: "/logs" },
      { label: "AI", href: "/ai" },
    ];

    // For doctors and hospitals, show "Create Records" and "Request Logs"
    if (role === "doctor" || role === "hospital") {
      return [
        baseItems[0],
        { label: "Create Records", href: "/records" },
        baseItems[1], // Access Requests
        { label: "Request Logs", href: "/logs" }, // Request Logs instead of Record Logs
        baseItems[3], // AI
      ];
    }

    // For patients and others, show "My Records" and "Record Logs"
    return [
      baseItems[0],
      { label: "My Records", href: "/records" },
      ...baseItems.slice(1),
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

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative p-2 rounded-full hover:bg-white/50 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-700" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-medical-blue rounded-full" />
            </motion.button>

            <Avatar className="h-10 w-10 cursor-pointer hover:ring-medical-blue transition-all">
              <AvatarImage src="/user-avatar.jpg" alt="User" />
              <AvatarFallback className="bg-gradient-to-br from-medical-blue to-medical-teal text-white text-sm">
                JD
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

