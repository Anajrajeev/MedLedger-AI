/**
 * File Encryption Utilities
 * 
 * Encrypts files using AES-256-GCM (same algorithm as profile encryption)
 * Format: IV (12 bytes) | TAG (16 bytes) | CIPHERTEXT
 */

import { gcm } from "@noble/ciphers/aes.js";

/**
 * Encrypt a file using AES-256-GCM
 * 
 * @param file - The file to encrypt
 * @param key - 32-byte encryption key (from deriveEncryptionKey)
 * @returns Encrypted Blob containing IV | TAG | CIPHERTEXT
 */
export async function encryptFile(
  file: File,
  key: Uint8Array
): Promise<Blob> {
  try {
    // Read file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    const plaintextBytes = new Uint8Array(fileBuffer);

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt using AES-256-GCM
    const cipher = gcm(key, iv);
    // encrypt() returns ciphertext + tag concatenated (tag is last 16 bytes)
    const encrypted = cipher.encrypt(plaintextBytes);

    // Extract ciphertext and tag
    const tagLength = 16;
    const ciphertext = encrypted.slice(0, encrypted.length - tagLength);
    const tag = encrypted.slice(encrypted.length - tagLength);

    // Combine: IV (12 bytes) | TAG (16 bytes) | CIPHERTEXT
    const payload = new Uint8Array(12 + tagLength + ciphertext.length);
    payload.set(iv, 0);
    payload.set(tag, 12);
    payload.set(ciphertext, 12 + tagLength);

    // Convert to Blob
    const encryptedBlob = new Blob([payload], { type: "application/octet-stream" });

    console.log("[File Encryption] File encrypted successfully:", {
      originalSize: file.size,
      encryptedSize: encryptedBlob.size,
      filename: file.name,
    });

    return encryptedBlob;
  } catch (error) {
    console.error("[File Encryption] Failed to encrypt file:", error);
    throw new Error("Failed to encrypt file");
  }
}

/**
 * Decrypt a file using AES-256-GCM
 * 
 * @param encryptedBlob - The encrypted Blob (IV | TAG | CIPHERTEXT)
 * @param key - 32-byte encryption key (from deriveEncryptionKey)
 * @returns Decrypted file as ArrayBuffer
 */
export async function decryptFile(
  encryptedBlob: Blob,
  key: Uint8Array
): Promise<ArrayBuffer> {
  try {
    // Read blob as ArrayBuffer
    const payload = new Uint8Array(await encryptedBlob.arrayBuffer());

    // Extract components
    const iv = payload.slice(0, 12);
    const tag = payload.slice(12, 28); // 16 bytes
    const ciphertext = payload.slice(28);

    // Decrypt using AES-256-GCM
    const cipher = gcm(key, iv);
    // For decrypt, we need to concatenate ciphertext + tag
    const ciphertextWithTag = new Uint8Array(ciphertext.length + tag.length);
    ciphertextWithTag.set(ciphertext, 0);
    ciphertextWithTag.set(tag, ciphertext.length);

    const plaintextBytes = cipher.decrypt(ciphertextWithTag);

    console.log("[File Encryption] File decrypted successfully");

    return plaintextBytes.buffer;
  } catch (error) {
    console.error("[File Encryption] Failed to decrypt file:", error);
    throw new Error("Failed to decrypt file. The file may be corrupted or the key is incorrect.");
  }
}

