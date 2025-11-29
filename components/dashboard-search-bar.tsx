"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardSearchBarProps {
  onSearchChange?: (value: string) => void;
  onUploadClick?: () => void;
}

export function DashboardSearchBar({
  onSearchChange,
  onUploadClick,
}: DashboardSearchBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
      className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      aria-label="Search and upload medical records"
    >
      <div className="flex-1">
        <div className="relative flex items-center rounded-2xl bg-white/90 border border-gray-200/70 shadow-sm px-4 py-3 focus-within:ring-2 focus-within:ring-medical-blue/70 focus-within:ring-offset-0">
          <Search className="w-5 h-5 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search records..."
            className="ml-3 flex-1 bg-transparent text-sm md:text-base text-gray-800 placeholder:text-gray-400 focus:outline-none"
            aria-label="Search medical records"
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
          <button
            type="button"
            className="ml-3 inline-flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 px-3 py-2 text-xs font-medium hover:bg-gray-200 transition-colors"
            aria-label="Filter records"
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full md:w-auto"
      >
        <Button
          size="lg"
          className="w-full md:w-auto bg-medical-blue text-white shadow-lg shadow-medical-blue/30 hover:bg-medical-600"
          onClick={onUploadClick}
        >
          <UploadCloud className="w-5 h-5 mr-2" aria-hidden="true" />
          Upload New Record
        </Button>
      </motion.div>
    </motion.div>
  );
}


