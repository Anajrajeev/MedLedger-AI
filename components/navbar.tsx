"use client";

import React from "react";
import { motion } from "framer-motion";
import { Bell, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { WalletSwitcher } from "@/components/wallet-switcher";
import { shortenAddress } from "@/lib/address-utils";

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", active: true },
  { label: "My Records", href: "/records" },
  { label: "Access Requests", href: "/access-requests" },
  { label: "Record Logs", href: "/logs" },
  { label: "AI", href: "/ai" },
];

export function Navbar() {

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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-medical-blue to-medical-teal flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-semibold text-gray-800">
              MedLedger AI
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1 bg-white/40 rounded-full px-2 py-2 backdrop-blur-sm">
            {navItems.map((item) => (
              <motion.a
                key={item.label}
                href={item.href}
                className={cn(
                  "relative px-5 py-2 rounded-full text-sm font-medium transition-all",
                  item.active
                    ? "text-medical-blue"
                    : "text-gray-600 hover:text-gray-900"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {item.active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-full shadow-md"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </motion.a>
            ))}
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

