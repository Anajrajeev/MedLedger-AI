// Medical Record Types
export interface MedicalRecord {
  id: string;
  patientId: string;
  recordType: RecordTypeEnum;
  title: string;
  data: Record<string, any>;
  encryptedCID?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: RecordMetadata;
}

export type RecordTypeEnum =
  | "lab_results"
  | "cardiac_evaluation"
  | "prescription_history"
  | "consultation_notes"
  | "imaging"
  | "vaccination"
  | "allergy"
  | "diagnosis";

export interface RecordMetadata {
  fileSize?: number;
  mimeType?: string;
  provider?: string;
  location?: string;
  tags?: string[];
}

// Access Request Types
export interface AccessRequest {
  id: string;
  patientId: string;
  doctorId: string;
  doctorInfo: DoctorInfo;
  requestedRecords: RequestedRecord[];
  reason: string;
  status: AccessStatus;
  createdAt: Date;
  expiresAt?: Date;
  transactionHash?: string;
  approvedAt?: Date;
}

export interface DoctorInfo {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  hospital: string;
  licenseNumber: string;
  avatarUrl?: string;
  walletAddress?: string;
}

export interface RequestedRecord {
  recordType: RecordTypeEnum;
  label: string;
  icon: "lab" | "cardiac" | "prescription" | "consultation";
}

export type AccessStatus = "pending" | "approved" | "denied" | "expired" | "revoked";

// Blockchain Types
export interface BlockchainTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: Date;
  blockNumber: number;
  status: "pending" | "confirmed" | "failed";
  gasUsed?: string;
}

export interface AccessControlCondition {
  contractAddress: string;
  standardContractType: string;
  chain: "cardano" | "ethereum" | "polygon";
  method: string;
  parameters: any[];
  returnValueTest: {
    comparator: "=" | "!=" | ">" | "<" | ">=" | "<=";
    value: string;
  };
}

// Wallet Types
export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: string | null;
  network: "mainnet" | "testnet" | "preview";
}

// Access Log Types
export interface AccessLog {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  recordId: string;
  recordType: RecordTypeEnum;
  action: AccessAction;
  transactionHash: string;
  timestamp: Date;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export type AccessAction = "granted" | "revoked" | "accessed" | "denied" | "expired";

// Encryption Types
export interface EncryptedData {
  encryptedFile: Blob;
  encryptedSymmetricKey: string;
  accessControlConditions: AccessControlCondition[];
  cid: string;
}

export interface DecryptionRequest {
  cid: string;
  encryptedSymmetricKey: string;
  accessControlConditions: AccessControlCondition[];
  authSig: AuthSignature;
}

export interface AuthSignature {
  sig: string;
  derivedVia: string;
  signedMessage: string;
  address: string;
}

// User Types
export interface Patient {
  id: string;
  walletAddress: string;
  email?: string;
  name?: string;
  dateOfBirth?: Date;
  records: string[];
  accessRequests: string[];
  createdAt: Date;
}

export interface Doctor {
  id: string;
  walletAddress: string;
  email: string;
  name: string;
  credentials: string;
  specialty: string;
  hospital: string;
  licenseNumber: string;
  verified: boolean;
  createdAt: Date;
}

// AI Analysis Types
export interface AIAnalysis {
  id: string;
  recordId: string;
  analysisType: "explanation" | "prediction" | "insurance" | "summary";
  result: any;
  confidence: number;
  timestamp: Date;
  model: string;
}

export interface HealthPrediction {
  condition: string;
  probability: number;
  timeframe: string;
  recommendations: string[];
  riskFactors: string[];
}

export interface InsuranceAutomation {
  claimId: string;
  status: "processing" | "approved" | "denied" | "pending_review";
  amount: number;
  reasoning: string;
  supportingDocuments: string[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Component Prop Types
export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
  icon?: React.ComponentType<any>;
}

export interface CardProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  loading?: boolean;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

