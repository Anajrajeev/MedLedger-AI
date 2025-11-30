"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRoleStore } from "@/hooks/useRoleStore";

export function AIFloatingButton() {
  const role = useRoleStore((s) => s.role);
  
  // Hide AI floating button for doctors
  if (role === "doctor") {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <Link 
        href="/ai"
        className="block"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-medical-blue to-medical-teal text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
          type="button"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white/20 backdrop-blur-sm">
            <Image
              src="/logo.png"
              alt="MedLedger AI Logo"
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
          <span className="font-semibold text-sm">Analyze with AI</span>
        </motion.button>
      </Link>
    </motion.div>
  );
}

