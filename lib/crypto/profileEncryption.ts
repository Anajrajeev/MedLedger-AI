/**
 * AES-256-GCM Encryption Module for User Profiles
 * 
 * Encryption format: IV (12 bytes) | TAG (16 bytes) | CIPHERTEXT (variable)
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits for GCM tag
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment variable
 * Must be 64 hex characters (32 bytes)
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.PROFILE_ENC_KEY;
  
  if (!keyHex) {
    throw new Error("PROFILE_ENC_KEY environment variable is not set");
  }
  
  if (keyHex.length !== 64) {
    throw new Error(
      `PROFILE_ENC_KEY must be 64 hex characters (32 bytes), got ${keyHex.length}`
    );
  }
  
  if (!/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error("PROFILE_ENC_KEY must be a valid hex string");
  }
  
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt a profile object using AES-256-GCM
 * 
 * @param profile - Plain object containing user profile data
 * @returns Buffer containing IV | TAG | CIPHERTEXT
 */
export function encryptProfile(profile: Record<string, any>): Buffer {
  try {
    const key = getEncryptionKey();
    
    // Convert profile to JSON string
    const plaintext = JSON.stringify(profile);
    
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    let ciphertext = cipher.update(plaintext, "utf8");
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine: IV (12 bytes) | TAG (16 bytes) | CIPHERTEXT (variable)
    return Buffer.concat([iv, tag, ciphertext]);
  } catch (error) {
    console.error("Error encrypting profile:", error);
    throw new Error(`Failed to encrypt profile: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Decrypt a profile cipher buffer using AES-256-GCM
 * 
 * @param payload - Buffer containing IV | TAG | CIPHERTEXT
 * @returns Decrypted profile object
 */
export function decryptProfile(payload: Buffer): Record<string, any> {
  try {
    const key = getEncryptionKey();
    
    // Validate payload length
    if (payload.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error("Invalid payload: too short");
    }
    
    // Extract components
    const iv = payload.subarray(0, IV_LENGTH);
    const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = payload.subarray(IV_LENGTH + TAG_LENGTH);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt
    let plaintext = decipher.update(ciphertext, undefined, "utf8");
    plaintext += decipher.final("utf8");
    
    // Parse JSON
    return JSON.parse(plaintext);
  } catch (error) {
    console.error("Error decrypting profile:", error);
    throw new Error(`Failed to decrypt profile: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate a new encryption key (64 hex characters)
 * Use this to generate PROFILE_ENC_KEY for .env
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("hex");
}

