"use client";

import React from "react";
import { motion } from "framer-motion";
import { FlaskConical, ScanLine, FilePenLine, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RecordVariant = "lab" | "imaging" | "prescription";

export interface MedicalRecordCardProps {
  title: string;
  date: string;
  description: string;
  variant?: RecordVariant;
}

const variantStyles: Record<
  RecordVariant,
  { iconBg: string; icon: React.ReactNode }
> = {
  lab: {
    iconBg: "bg-teal-100 text-teal-600",
    icon: <FlaskConical className="w-5 h-5" aria-hidden="true" />,
  },
  imaging: {
    iconBg: "bg-blue-100 text-blue-600",
    icon: <ScanLine className="w-5 h-5" aria-hidden="true" />,
  },
  prescription: {
    iconBg: "bg-purple-100 text-purple-600",
    icon: <FilePenLine className="w-5 h-5" aria-hidden="true" />,
  },
};

export function MedicalRecordCard({
  title,
  date,
  description,
  variant = "lab",
}: MedicalRecordCardProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="h-full"
    >
      <Card className="h-full border-none shadow-md bg-white/90 hover:shadow-xl hover:bg-white transition-all">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                  styles.iconBg
                )}
              >
                {styles.icon}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{date}</p>
              </div>
            </div>
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-50 text-medical-blue border border-cyan-100">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">Encrypted and protected</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
            {description}
          </p>

          <div className="flex items-center justify-between pt-1 gap-3">
            <button
              type="button"
              className="text-sm font-medium text-gray-700 hover:text-medical-blue transition-colors"
            >
              View Details
            </button>
            <Button
              variant="default"
              size="sm"
              className="px-4 py-2 h-9 rounded-xl text-xs font-semibold shadow-md shadow-medical-blue/20"
            >
              Share
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}


