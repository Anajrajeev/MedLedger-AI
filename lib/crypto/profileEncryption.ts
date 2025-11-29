/**
 * Profile Encryption Utilities
 * 
 * All encryption/decryption happens on the frontend using wallet signatures.
 * Backend NEVER decrypts data - only stores/retrieves ciphertext.
 */

import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { gcm } from "@noble/ciphers/aes.js";
import type { CardanoWalletApi } from "@/types/window";

/**
 * Derive encryption key from wallet signature
 * 
 * @param walletAddress - The user's wallet address
 * @param api - The Cardano wallet API instance
 * @returns 32-byte encryption key
 */
export async function deriveEncryptionKey(
  walletAddress: string,
  api: CardanoWalletApi
): Promise<Uint8Array> {
  try {
    // Sign a fixed message with the wallet
    const message = "MedLedger AI Profile Encryption Key";
    
    // Use signMessage if available (preferred - accepts plain text)
    // Otherwise use signData (requires hex-encoded payload)
    let signedMessage: string;
    if (api.signMessage) {
      // signMessage accepts plain text strings
      signedMessage = await api.signMessage(message);
    } else if (api.signData) {
      // signData requires hex-encoded payload
      // Convert message to hex: encode as UTF-8 bytes, then convert to hex
      const messageBytes = new TextEncoder().encode(message);
      const messageHex = Array.from(messageBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const result = await api.signData(walletAddress, messageHex);
      signedMessage = result.signature;
    } else {
      throw new Error("Wallet API does not support signing. Please use a compatible wallet.");
    }

    // Derive key using HKDF-SHA256
    const key = hkdf(sha256, new TextEncoder().encode(signedMessage), undefined, undefined, 32);
    
    console.log("[Encryption] Key derived from wallet signature");
    return key;
  } catch (error: any) {
    console.error("[Encryption] Failed to derive key:", error);
    
    // Check if user declined signing
    if (error?.code === 1 || error?.message?.includes("declined") || error?.message?.includes("reject") || error?.message?.includes("cancel")) {
      throw new Error("Wallet signing was declined. Please approve the signing request to decrypt your profile.");
    }
    
    // Check if it's a hex format error
    if (error?.message?.includes("hex string") || error?.message?.includes("hex")) {
      throw new Error("Wallet signing format error. Please try reconnecting your wallet.");
    }
    
    throw new Error("Failed to derive encryption key from wallet signature. Please try again.");
  }
}

/**
 * Encrypt profile data using AES-256-GCM
 * 
 * @param profile - The profile object to encrypt
 * @param key - 32-byte encryption key (from deriveEncryptionKey)
 * @returns Base64-encoded ciphertext (IV | TAG | CIPHERTEXT)
 */
export async function encryptProfile(
  profile: Record<string, any>,
  key: Uint8Array
): Promise<string> {
  try {
    const plaintext = JSON.stringify(profile);
    const plaintextBytes = new TextEncoder().encode(plaintext);

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt using AES-256-GCM
    // gcm(key, nonce, AAD) - key must be 16, 24, or 32 bytes (128, 192, or 256 bits)
    const cipher = gcm(key, iv);
    // encrypt() returns ciphertext + tag concatenated (tag is last 16 bytes)
    const encrypted = cipher.encrypt(plaintextBytes);
    
    // Extract ciphertext and tag
    // encrypted = [ciphertext...][tag (16 bytes)]
    const tagLength = 16;
    const ciphertext = encrypted.slice(0, encrypted.length - tagLength);
    const tag = encrypted.slice(encrypted.length - tagLength);

    // Combine: IV (12 bytes) | TAG (16 bytes) | CIPHERTEXT
    const payload = new Uint8Array(12 + tagLength + ciphertext.length);
    payload.set(iv, 0);
    payload.set(tag, 12);
    payload.set(ciphertext, 12 + tagLength);

    // Convert to base64 for transmission
    const base64 = btoa(String.fromCharCode(...payload));
    
    console.log("[Encryption] Profile encrypted successfully");
    return base64;
  } catch (error) {
    console.error("[Encryption] Failed to encrypt profile:", error);
    throw new Error("Failed to encrypt profile data");
  }
}

/**
 * Decrypt profile data using AES-256-GCM
 * 
 * @param cipherBase64 - Base64-encoded ciphertext (IV | TAG | CIPHERTEXT)
 * @param key - 32-byte encryption key (from deriveEncryptionKey)
 * @returns Decrypted profile object
 */
export async function decryptProfile(
  cipherBase64: string,
  key: Uint8Array
): Promise<Record<string, any>> {
  try {
    // Decode base64
    const payload = Uint8Array.from(atob(cipherBase64), (c) => c.charCodeAt(0));

    // Extract components
    const iv = payload.slice(0, 12);
    const tag = payload.slice(12, 28); // 16 bytes
    const ciphertext = payload.slice(28);

    // Decrypt using AES-256-GCM
    // gcm(key, nonce, AAD) - key must be 16, 24, or 32 bytes (128, 192, or 256 bits)
    const cipher = gcm(key, iv);
    // For decrypt, we need to concatenate ciphertext + tag
    // The decrypt method expects: decrypt(ciphertext + tag)
    const ciphertextWithTag = new Uint8Array(ciphertext.length + tag.length);
    ciphertextWithTag.set(ciphertext, 0);
    ciphertextWithTag.set(tag, ciphertext.length);
    
    const plaintextBytes = cipher.decrypt(ciphertextWithTag);

    // Convert to JSON
    const plaintext = new TextDecoder().decode(plaintextBytes);
    const profile = JSON.parse(plaintext);
    
    console.log("[Encryption] Profile decrypted successfully");
    return profile;
  } catch (error) {
    console.error("[Encryption] Failed to decrypt profile:", error);
    throw new Error("Failed to decrypt profile data. The data may be corrupted or the key is incorrect.");
  }
}

