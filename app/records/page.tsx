"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FileText, FlaskConical, Stethoscope, Pill } from "lucide-react";

const categories = [
  {
    name: "Insurance Documents",
    href: "/records/insurance",
    icon: FileText,
    color: "from-blue-500 to-blue-600",
    description: "Manage your insurance cards and documents",
  },
  {
    name: "Lab Results",
    href: "/records/lab-results",
    icon: FlaskConical,
    color: "from-purple-500 to-purple-600",
    description: "View and store laboratory test results",
  },
  {
    name: "Consultation Documents",
    href: "/records/consultations",
    icon: Stethoscope,
    color: "from-green-500 to-green-600",
    description: "Doctor visit notes and consultation records",
  },
  {
    name: "Prescription History",
    href: "/records/prescriptions",
    icon: Pill,
    color: "from-orange-500 to-orange-600",
    description: "Track your medication prescriptions",
  },
];

export default function RecordsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            My Records
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Securely manage and access your medical documents. All files are encrypted and stored privately.
          </p>
        </motion.div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link href={category.href}>
                  <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:border-white/40 cursor-pointer">
                    {/* Glass morphism effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative z-10">
                      {/* Icon */}
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>

                      {/* Title */}
                      <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-medical-blue transition-colors">
                        {category.name}
                      </h2>

                      {/* Description */}
                      <p className="text-gray-600 text-sm">
                        {category.description}
                      </p>

                      {/* Arrow indicator */}
                      <div className="mt-6 flex items-center text-medical-blue opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-sm font-medium">View Records</span>
                        <svg
                          className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12 bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 max-w-2xl mx-auto"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-medical-blue/10 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-medical-blue"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">End-to-End Encryption</h3>
              <p className="text-sm text-gray-600">
                All your medical records are encrypted using your wallet signature before being stored. 
                Only you can decrypt and view your files.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

