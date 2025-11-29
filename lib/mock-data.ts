/**
 * Mock Data for Development and Testing
 * Use this data for UI development before blockchain integration
 */

import type {
  MedicalRecord,
  AccessRequest,
  AccessLog,
  DoctorInfo,
  Patient,
} from "@/types";

// ============================================================================
// MOCK DOCTORS
// ============================================================================

export const mockDoctors: DoctorInfo[] = [
  {
    id: "doc-001",
    name: "Dr. Evelyn Reed",
    credentials: "MD",
    specialty: "Cardiology Specialist",
    hospital: "St. Jude's Medical Center",
    licenseNumber: "MD-12345-CA",
    avatarUrl: "/doctor-avatar.jpg",
    walletAddress: "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgs68faae",
  },
  {
    id: "doc-002",
    name: "Dr. Marcus Chen",
    credentials: "MD, PhD",
    specialty: "Neurology",
    hospital: "University Medical Center",
    licenseNumber: "MD-67890-NY",
    walletAddress: "addr1qy5k2mq8m9d5h9k2l7r8t3v9w4x6y7z8a9b0c1d2e3f4g5h6j7k8l9m0n1p2q3r4s5t6u7v8w9x0y1z2",
  },
  {
    id: "doc-003",
    name: "Dr. Sarah Williams",
    credentials: "DO",
    specialty: "Internal Medicine",
    hospital: "City General Hospital",
    licenseNumber: "DO-54321-TX",
  },
];

// ============================================================================
// MOCK PATIENTS
// ============================================================================

export const mockPatient: Patient = {
  id: "patient-001",
  walletAddress: "addr1qx9k3l4m5n6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h5j6k7l8m9n0p1q2r3s4t5u6v7w8x9y0z1",
  email: "patient@example.com",
  name: "John Doe",
  dateOfBirth: new Date("1985-06-15"),
  records: ["rec-001", "rec-002", "rec-003"],
  accessRequests: ["req-001", "req-002"],
  createdAt: new Date("2023-01-15"),
};

// ============================================================================
// MOCK MEDICAL RECORDS
// ============================================================================

export const mockMedicalRecords: MedicalRecord[] = [
  {
    id: "rec-001",
    patientId: "patient-001",
    recordType: "lab_results",
    title: "Blood Chemistry Panel",
    data: {
      date: "2024-11-15",
      results: {
        glucose: { value: 95, unit: "mg/dL", normal: "70-100" },
        cholesterol: { value: 180, unit: "mg/dL", normal: "<200" },
        hdl: { value: 55, unit: "mg/dL", normal: ">40" },
        ldl: { value: 110, unit: "mg/dL", normal: "<100" },
      },
    },
    encryptedCID: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
    createdAt: new Date("2024-11-15"),
    updatedAt: new Date("2024-11-15"),
    metadata: {
      provider: "LabCorp",
      location: "San Francisco, CA",
      tags: ["routine", "blood-work"],
    },
  },
  {
    id: "rec-002",
    patientId: "patient-001",
    recordType: "cardiac_evaluation",
    title: "Cardiac Stress Test",
    data: {
      date: "2024-11-10",
      findings: "Normal cardiac function under stress",
      ejectionFraction: 65,
      heartRate: { rest: 72, peak: 165 },
    },
    encryptedCID: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    createdAt: new Date("2024-11-10"),
    updatedAt: new Date("2024-11-10"),
    metadata: {
      provider: "St. Jude's Medical Center",
      location: "Los Angeles, CA",
      tags: ["cardiology", "stress-test"],
    },
  },
  {
    id: "rec-003",
    patientId: "patient-001",
    recordType: "prescription_history",
    title: "Current Medications",
    data: {
      medications: [
        {
          name: "Lisinopril",
          dosage: "10mg",
          frequency: "Once daily",
          startDate: "2024-01-15",
        },
        {
          name: "Metformin",
          dosage: "500mg",
          frequency: "Twice daily",
          startDate: "2024-03-20",
        },
      ],
    },
    createdAt: new Date("2024-03-20"),
    updatedAt: new Date("2024-11-01"),
    metadata: {
      provider: "Family Care Pharmacy",
      tags: ["active", "chronic-care"],
    },
  },
];

// ============================================================================
// MOCK ACCESS REQUESTS
// ============================================================================

export const mockAccessRequests: AccessRequest[] = [
  {
    id: "req-001",
    patientId: "patient-001",
    doctorId: "doc-001",
    doctorInfo: mockDoctors[0],
    requestedRecords: [
      { recordType: "lab_results", label: "Lab Results", icon: "lab" },
      {
        recordType: "cardiac_evaluation",
        label: "Cardiac Evaluation",
        icon: "cardiac",
      },
      {
        recordType: "prescription_history",
        label: "Prescription History",
        icon: "prescription",
      },
      {
        recordType: "consultation_notes",
        label: "Consultation Notes",
        icon: "consultation",
      },
    ],
    reason:
      "Follow-up consultation regarding recent cardiac evaluation and lab results. Need to review trends and adjust treatment plan if necessary.",
    status: "pending",
    createdAt: new Date("2024-11-25"),
  },
  {
    id: "req-002",
    patientId: "patient-001",
    doctorId: "doc-002",
    doctorInfo: mockDoctors[1],
    requestedRecords: [
      { recordType: "lab_results", label: "Lab Results", icon: "lab" },
    ],
    reason: "Pre-surgical evaluation and risk assessment.",
    status: "approved",
    createdAt: new Date("2024-11-20"),
    approvedAt: new Date("2024-11-21"),
    expiresAt: new Date("2024-12-21"),
    transactionHash:
      "a3f2b8c9d1e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  },
];

// ============================================================================
// MOCK ACCESS LOGS
// ============================================================================

export const mockAccessLogs: AccessLog[] = [
  {
    id: "log-001",
    patientId: "patient-001",
    doctorId: "doc-002",
    doctorName: "Dr. Marcus Chen",
    recordId: "rec-001",
    recordType: "lab_results",
    action: "accessed",
    transactionHash:
      "a3f2b8c9d1e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
    timestamp: new Date("2024-11-22T10:30:00"),
    ipAddress: "192.168.1.100",
  },
  {
    id: "log-002",
    patientId: "patient-001",
    doctorId: "doc-002",
    doctorName: "Dr. Marcus Chen",
    recordId: "rec-001",
    recordType: "lab_results",
    action: "granted",
    transactionHash:
      "b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5",
    timestamp: new Date("2024-11-21T14:15:00"),
  },
  {
    id: "log-003",
    patientId: "patient-001",
    doctorId: "doc-001",
    doctorName: "Dr. Evelyn Reed",
    recordId: "rec-002",
    recordType: "cardiac_evaluation",
    action: "granted",
    transactionHash:
      "c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    timestamp: new Date("2024-11-20T09:00:00"),
  },
];

// ============================================================================
// MOCK UTILITY FUNCTIONS
// ============================================================================

export function getMockDoctor(id: string): DoctorInfo | undefined {
  return mockDoctors.find((doc) => doc.id === id);
}

export function getMockRecord(id: string): MedicalRecord | undefined {
  return mockMedicalRecords.find((rec) => rec.id === id);
}

export function getMockAccessRequest(id: string): AccessRequest | undefined {
  return mockAccessRequests.find((req) => req.id === id);
}

export function getMockAccessLogs(patientId: string): AccessLog[] {
  return mockAccessLogs.filter((log) => log.patientId === patientId);
}

// ============================================================================
// MOCK API DELAYS (for realistic simulation)
// ============================================================================

export const MOCK_DELAYS = {
  FAST: 300,
  NORMAL: 800,
  SLOW: 1500,
  BLOCKCHAIN: 2000,
} as const;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

