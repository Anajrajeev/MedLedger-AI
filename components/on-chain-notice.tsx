"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export function OnChainNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-medical-100 to-teal-50 border border-medical-200 shadow-sm"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-medical-blue to-medical-teal flex items-center justify-center shadow-md">
        <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
      </div>

      <div className="flex-1 pt-1">
        <p className="text-gray-700 leading-relaxed">
          Your approval will be recorded as a secure,{" "}
          <span className="font-semibold text-medical-blue">
            on-chain transaction
          </span>
          , granting temporary, read-only access. This action is irreversible and
          transparently logged.
        </p>
      </div>
    </motion.div>
  );
}

