"use client";

import React from "react";
import { motion } from "framer-motion";

interface DashboardHeaderProps {
  patientName: string;
}

export function DashboardHeader({ patientName }: DashboardHeaderProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full rounded-3xl bg-gradient-to-r from-medical-50/90 via-white/90 to-medical-100/80 backdrop-blur-xl border border-white/70 shadow-xl shadow-medical-blue/5 px-8 py-8 md:px-12 md:py-10"
      aria-labelledby="dashboard-welcome-heading"
    >
      <div className="flex flex-col gap-6 md:gap-8">
        <div>
          <h1
            id="dashboard-welcome-heading"
            className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight"
          >
            Welcome, {patientName}
          </h1>
          <p className="mt-2 text-sm md:text-base text-gray-600 max-w-xl">
            Here is a summary of your recent encrypted medical activity.
          </p>
        </div>
      </div>
    </motion.section>
  );
}


