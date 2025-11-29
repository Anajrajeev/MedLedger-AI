// src/aiken/validatorLoader.ts
// Loads and manages the compiled Aiken validator

import * as fs from "fs";
import * as path from "path";
// Dynamic imports for lucid-cardano (ESM module) will be used where needed

// Path to compiled validator
const VALIDATOR_PATH = path.join(
  process.cwd(),
  "contracts/aiken/access_request_validator/plutus.json"
);

// Cached validator data
let validatorData: ValidatorBlueprint | null = null;

/**
 * Blueprint structure from Aiken compilation
 */
interface ValidatorBlueprint {
  preamble: {
    title: string;
    version: string;
    plutusVersion: string;
  };
  validators: Array<{
    title: string;
    compiledCode: string;
    hash: string;
  }>;
}

/**
 * Loaded validator with script and hash
 */
export interface LoadedValidator {
  script: {
    type: "PlutusV1" | "PlutusV2";
    script: string;
  };
  scriptHash: string;
  address: string;
  isCompiled: boolean;
}

/**
 * ConsentDatum type for on-chain data
 * Matches the Aiken ConsentDatum structure
 */
export interface ConsentDatumPlutus {
  doctorPkh: string;      // Hex-encoded PubKeyHash
  patientPkh: string;     // Hex-encoded PubKeyHash
  approved: boolean;
  timestamp: bigint;
  zkProofHash: string;    // Hex-encoded bytes
  requestId: string;      // Hex-encoded bytes
}

/**
 * Define the Plutus data schema for ConsentDatum
 * Note: These will be created dynamically when Data is imported
 */
let ConsentDatumSchema: any;
let ConsentRedeemerSchema: any;

async function initDataSchemas() {
  if (ConsentDatumSchema && ConsentRedeemerSchema) return;
  
  const { Data } = await import("lucid-cardano");
  
  ConsentDatumSchema = Data.Object({
    doctorPkh: Data.Bytes(),
    patientPkh: Data.Bytes(),
    approved: Data.Boolean(),
    timestamp: Data.Integer(),
    zkProofHash: Data.Bytes(),
    requestId: Data.Bytes(),
  });

  ConsentRedeemerSchema = Data.Enum([
    Data.Literal("RecordConsent"),
    Data.Literal("RevokeConsent"),
    Data.Literal("VerifyConsent"),
  ]);
}

export type ConsentRedeemer = "RecordConsent" | "RevokeConsent" | "VerifyConsent";

/**
 * Load the validator blueprint from disk
 */
function loadValidatorBlueprint(): ValidatorBlueprint {
  if (validatorData) {
    return validatorData;
  }

  try {
    if (!fs.existsSync(VALIDATOR_PATH)) {
      console.warn("[Validator Loader] Compiled validator not found at:", VALIDATOR_PATH);
      console.warn("[Validator Loader] Run 'aiken build' in contracts/aiken/access_request_validator/");
      throw new Error(`Validator not found: ${VALIDATOR_PATH}`);
    }

    const rawData = fs.readFileSync(VALIDATOR_PATH, "utf-8");
    validatorData = JSON.parse(rawData) as ValidatorBlueprint;
    
    console.log("[Validator Loader] Loaded validator:", validatorData.preamble.title);
    console.log("[Validator Loader] Version:", validatorData.preamble.version);
    
    return validatorData;
  } catch (error) {
    console.error("[Validator Loader] Failed to load validator:", error);
    throw error;
  }
}

/**
 * Check if the validator has been compiled
 */
export function isValidatorCompiled(): boolean {
  try {
    const blueprint = loadValidatorBlueprint();
    const validator = blueprint.validators[0];
    
    // Check if compiledCode is a real value (not placeholder)
    return (
      validator &&
      validator.compiledCode &&
      !validator.compiledCode.includes("PLACEHOLDER")
    );
  } catch {
    return false;
  }
}

/**
 * Get the validator script and hash
 * Returns a stub if not compiled
 */
export function getValidator(): LoadedValidator {
  const isCompiled = isValidatorCompiled();
  
  if (!isCompiled) {
    // Return stub validator for development
    console.warn("[Validator Loader] Using stub validator - Aiken contract not compiled");
    console.warn("[Validator Loader] Run 'aiken build' for real blockchain integration");
    
    return {
      script: {
        type: "PlutusV2",
        script: "STUB_VALIDATOR_NOT_COMPILED",
      },
      scriptHash: "stub_script_hash_" + Date.now().toString(16),
      address: "addr_test1stub_validator_address_not_compiled",
      isCompiled: false,
    };
  }

  try {
    const blueprint = loadValidatorBlueprint();
    const validator = blueprint.validators[0];

    const script = {
      type: "PlutusV2",
      script: validator.compiledCode,
    };

    return {
      script,
      scriptHash: validator.hash,
      address: "", // Will be computed with network params in aikenAudit.ts
      isCompiled: true,
    };
  } catch (error) {
    console.error("[Validator Loader] Error loading validator:", error);
    throw error;
  }
}

/**
 * Serialize ConsentDatum to Plutus Data
 */
export async function serializeConsentDatum(datum: ConsentDatumPlutus): Promise<string> {
  try {
    await initDataSchemas();
    const { Data } = await import("lucid-cardano");
    
    const data = Data.to(
      {
        doctorPkh: datum.doctorPkh,
        patientPkh: datum.patientPkh,
        approved: datum.approved,
        timestamp: datum.timestamp,
        zkProofHash: datum.zkProofHash,
        requestId: datum.requestId,
      },
      ConsentDatumSchema
    );
    
    return data;
  } catch (error) {
    console.error("[Validator Loader] Error serializing datum:", error);
    // Return a placeholder if serialization fails (stub mode)
    return `stub_datum_${Date.now()}`;
  }
}

/**
 * Serialize ConsentRedeemer to Plutus Data
 */
export async function serializeConsentRedeemer(redeemer: ConsentRedeemer): Promise<string> {
  try {
    await initDataSchemas();
    const { Data } = await import("lucid-cardano");
    
    return Data.to(redeemer, ConsentRedeemerSchema);
  } catch (error) {
    console.error("[Validator Loader] Error serializing redeemer:", error);
    // Return a placeholder if serialization fails (stub mode)
    return `stub_redeemer_${redeemer}`;
  }
}

/**
 * Convert a string to hex-encoded bytes
 */
export function stringToHex(str: string): string {
  return Buffer.from(str, "utf-8").toString("hex");
}

/**
 * Convert a UUID string to hex bytes (removing dashes)
 */
export function uuidToHex(uuid: string): string {
  return uuid.replace(/-/g, "");
}

/**
 * Get validator status for debugging
 */
export function getValidatorStatus(): {
  path: string;
  exists: boolean;
  compiled: boolean;
  version: string | null;
} {
  const exists = fs.existsSync(VALIDATOR_PATH);
  let compiled = false;
  let version = null;
  
  if (exists) {
    try {
      const blueprint = loadValidatorBlueprint();
      version = blueprint.preamble.version;
      compiled = isValidatorCompiled();
    } catch {
      // Ignore errors
    }
  }
  
  return {
    path: VALIDATOR_PATH,
    exists,
    compiled,
    version,
  };
}

