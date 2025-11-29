"use client";

import React from "react";
import { motion } from "framer-motion";
import { FlaskConical, Heart, Pill, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecordType {
  id: string;
  label: string;
  icon: "lab" | "cardiac" | "prescription" | "consultation";
}

interface RecordItemProps {
  record: RecordType;
  index: number;
}

const iconMap = {
  lab: FlaskConical,
  cardiac: Heart,
  prescription: Pill,
  consultation: FileText,
};

const iconColorMap = {
  lab: "from-cyan-400 to-cyan-600",
  cardiac: "from-teal-400 to-teal-600",
  prescription: "from-cyan-400 to-cyan-600",
  consultation: "from-teal-400 to-teal-600",
};

function RecordItem({ record, index }: RecordItemProps) {
  const Icon = iconMap[record.icon];
  const colorClass = iconColorMap[record.icon];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
      whileHover={{ scale: 1.02, x: 4 }}
      className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-white/50 to-white/30 backdrop-blur-sm border border-white/60 shadow-sm hover:shadow-md transition-all cursor-default"
    >
      <div
        className={cn(
          "w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md",
          colorClass
        )}
      >
        <Icon className="w-6 h-6 text-white" strokeWidth={2} />
      </div>
      <span className="text-base font-medium text-gray-800">{record.label}</span>
    </motion.div>
  );
}

interface AccessRequestListProps {
  records: RecordType[];
  reason?: string;
}

export function AccessRequestList({
  records,
  reason,
}: AccessRequestListProps) {
  const defaultReason =
    "The healthcare professional has requested temporary, read-only access to the following sections of your medical record for consultation purposes.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          Request Details
        </h3>
        <p className="text-gray-600 leading-relaxed">
          {reason || defaultReason}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {records.map((record, index) => (
          <RecordItem key={record.id} record={record} index={index} />
        ))}
      </div>
    </motion.div>
  );
}

