"use client";

import React from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DoctorCardProps {
  name: string;
  credentials: string;
  specialty: string;
  hospital: string;
  avatarUrl?: string;
}

export function DoctorCard({
  name,
  credentials,
  specialty,
  hospital,
  avatarUrl,
}: DoctorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="flex items-center gap-6"
    >
      <Avatar className="h-24 w-24 ring-4 ring-white shadow-xl">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback className="bg-gradient-to-br from-medical-blue to-medical-teal text-white text-2xl font-semibold">
          {name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <h2 className="text-3xl font-bold text-gray-900 mb-1">
          {name}
          {credentials && (
            <span className="text-gray-600 font-normal">, {credentials}</span>
          )}
        </h2>
        <p className="text-base text-gray-600 font-medium">{specialty}</p>
        <p className="text-sm text-gray-500 mt-0.5">{hospital}</p>
      </div>
    </motion.div>
  );
}

