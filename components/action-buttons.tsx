"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionButtonsProps {
  onApprove?: () => void;
  onDeny?: () => void;
  isLoading?: boolean;
}

export function ActionButtons({
  onApprove,
  onDeny,
  isLoading = false,
}: ActionButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="flex items-center gap-4"
    >
      <motion.div
        className="flex-1"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          variant="secondary"
          size="lg"
          className="w-full bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 shadow-md border border-gray-200/50"
          onClick={onDeny}
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
          Deny Request
        </Button>
      </motion.div>

      <motion.div
        className="flex-[2]"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          size="lg"
          className="w-full text-base font-semibold"
          onClick={onApprove}
          disabled={isLoading}
        >
          <Check className="w-5 h-5" />
          {isLoading ? "Processing..." : "Approve Access"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

