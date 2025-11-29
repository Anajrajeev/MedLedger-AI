/**
 * Application Constants
 * Central location for all constant values used across the application
 */

// ============================================================================
// BLOCKCHAIN CONSTANTS
// ============================================================================

export const CARDANO_NETWORKS = {
  MAINNET: "mainnet",
  TESTNET: "testnet",
  PREVIEW: "preview",
} as const;

export const WALLET_PROVIDERS = {
  ETERNL: "eternl",
  NAMI: "nami",
  FLINT: "flint",
  YOROI: "yoroi",
  GERO: "gerowallet",
} as const;

export const TRANSACTION_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  FAILED: "failed",
} as const;

// ============================================================================
// ACCESS CONTROL CONSTANTS
// ============================================================================

export const ACCESS_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  DENIED: "denied",
  EXPIRED: "expired",
  REVOKED: "revoked",
} as const;

export const ACCESS_ACTIONS = {
  GRANTED: "granted",
  REVOKED: "revoked",
  ACCESSED: "accessed",
  DENIED: "denied",
  EXPIRED: "expired",
} as const;

export const DEFAULT_ACCESS_DURATION_DAYS = 30;

// ============================================================================
// RECORD TYPE CONSTANTS
// ============================================================================

export const RECORD_TYPES = {
  LAB_RESULTS: "lab_results",
  CARDIAC_EVALUATION: "cardiac_evaluation",
  PRESCRIPTION_HISTORY: "prescription_history",
  CONSULTATION_NOTES: "consultation_notes",
  IMAGING: "imaging",
  VACCINATION: "vaccination",
  ALLERGY: "allergy",
  DIAGNOSIS: "diagnosis",
} as const;

export const RECORD_TYPE_LABELS: Record<string, string> = {
  lab_results: "Lab Results",
  cardiac_evaluation: "Cardiac Evaluation",
  prescription_history: "Prescription History",
  consultation_notes: "Consultation Notes",
  imaging: "Medical Imaging",
  vaccination: "Vaccination Records",
  allergy: "Allergy Information",
  diagnosis: "Diagnosis Reports",
};

export const RECORD_TYPE_ICONS = {
  lab_results: "lab",
  cardiac_evaluation: "cardiac",
  prescription_history: "prescription",
  consultation_notes: "consultation",
} as const;

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const THEME_COLORS = {
  MEDICAL_BLUE: "#2D8DFE",
  MEDICAL_TEAL: "#00B8A9",
  WHITE: "#FFFFFF",
  GRAY_50: "#F9FAFB",
  GRAY_100: "#F3F4F6",
  GRAY_200: "#E5E7EB",
  GRAY_300: "#D1D5DB",
  GRAY_400: "#9CA3AF",
  GRAY_500: "#6B7280",
  GRAY_600: "#4B5563",
  GRAY_700: "#374151",
  GRAY_800: "#1F2937",
  GRAY_900: "#111827",
} as const;

export const ANIMATION_DURATIONS = {
  FAST: 0.2,
  NORMAL: 0.3,
  SLOW: 0.5,
  VERY_SLOW: 0.8,
} as const;

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  "2XL": 1536,
} as const;

// ============================================================================
// API CONSTANTS
// ============================================================================

export const API_ENDPOINTS = {
  RECORDS: "/api/records",
  ACCESS_REQUESTS: "/api/access-requests",
  ACCESS_LOGS: "/api/logs",
  BLOCKCHAIN: "/api/blockchain",
  AI_ANALYSIS: "/api/ai/analyze",
  ENCRYPTION: "/api/encryption",
  IPFS: "/api/ipfs",
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// ============================================================================
// STORAGE CONSTANTS
// ============================================================================

export const STORAGE_KEYS = {
  WALLET_ADDRESS: "wallet_address",
  WALLET_PROVIDER: "wallet_provider",
  USER_PREFERENCES: "user_preferences",
  THEME: "theme",
  LANGUAGE: "language",
} as const;

export const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.ipfs.io/ipfs/",
] as const;

// ============================================================================
// ENCRYPTION CONSTANTS
// ============================================================================

export const LIT_NETWORKS = {
  MAINNET: "cayenne",
  TESTNET: "serrano",
} as const;

export const ENCRYPTION_ALGORITHMS = {
  AES_256_GCM: "aes-256-gcm",
  RSA_OAEP: "rsa-oaep",
} as const;

// ============================================================================
// AI CONSTANTS
// ============================================================================

export const AI_ANALYSIS_TYPES = {
  EXPLANATION: "explanation",
  PREDICTION: "prediction",
  INSURANCE: "insurance",
  SUMMARY: "summary",
} as const;

export const AI_MODELS = {
  GPT4: "gpt-4",
  GPT4_TURBO: "gpt-4-turbo-preview",
  GPT35_TURBO: "gpt-3.5-turbo",
  CLAUDE_3: "claude-3-opus",
} as const;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_FILE_SIZE_MB: 50,
  SUPPORTED_FILE_TYPES: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/dicom",
    "text/plain",
  ],
  MAX_RECORD_TITLE_LENGTH: 200,
  MIN_REASON_LENGTH: 10,
  MAX_REASON_LENGTH: 500,
} as const;

// ============================================================================
// DATE & TIME CONSTANTS
// ============================================================================

export const DATE_FORMATS = {
  SHORT: "MMM dd, yyyy",
  LONG: "MMMM dd, yyyy",
  WITH_TIME: "MMM dd, yyyy HH:mm",
  ISO: "yyyy-MM-dd",
} as const;

export const TIME_PERIODS = {
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
  ONE_YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: "Please connect your wallet first",
  TRANSACTION_FAILED: "Transaction failed. Please try again.",
  ENCRYPTION_FAILED: "Failed to encrypt data",
  DECRYPTION_FAILED: "Failed to decrypt data",
  UPLOAD_FAILED: "Failed to upload file",
  NETWORK_ERROR: "Network error. Please check your connection.",
  UNAUTHORIZED: "You are not authorized to perform this action",
  INVALID_INPUT: "Invalid input. Please check your data.",
  RECORD_NOT_FOUND: "Record not found",
  ACCESS_DENIED: "Access denied",
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
  ACCESS_GRANTED: "Access granted successfully",
  ACCESS_REVOKED: "Access revoked successfully",
  RECORD_UPLOADED: "Record uploaded successfully",
  WALLET_CONNECTED: "Wallet connected successfully",
  TRANSACTION_CONFIRMED: "Transaction confirmed",
  SETTINGS_SAVED: "Settings saved successfully",
} as const;

// ============================================================================
// NAVIGATION ROUTES
// ============================================================================

export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  RECORDS: "/records",
  ACCESS_REQUESTS: "/access-requests",
  LOGS: "/logs",
  AI: "/ai",
  SETTINGS: "/settings",
  PROFILE: "/profile",
} as const;

