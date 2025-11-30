/**
 * Backblaze B2 Storage Integration
 * 
 * Handles file uploads and retrieval from Backblaze B2
 */

import { API_URL } from "../api-config";

export interface FileMetadata {
  fileId: string; // B2 storage path (for fetching encrypted file)
  dbFileId?: string; // Database ID (for granting access) - optional for backward compatibility
  originalName: string;
  category: string;
  ownerWallet: string;
  created_at: string;
}

/**
 * Upload encrypted file to Backblaze B2 via backend
 * 
 * @param encryptedBlob - The encrypted file blob
 * @param originalFileName - Original filename
 * @param category - File category (insurance, lab-results, consultations, prescriptions)
 * @param walletAddress - User's wallet address
 * @returns File ID (path in B2)
 */
export async function uploadToStorage(
  encryptedBlob: Blob,
  originalFileName: string,
  category: string,
  walletAddress: string
): Promise<string> {
  try {
    // Convert blob to base64 for transmission
    const base64 = await blobToBase64(encryptedBlob);

    const response = await fetch(`${API_URL}/api/records/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileData: base64,
        originalName: originalFileName,
        category,
        ownerWallet: walletAddress,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload file");
    }

    const data = await response.json();
    return data.fileId;
  } catch (error) {
    console.error("[B2 Storage] Upload failed:", error);
    throw error;
  }
}

/**
 * List files for a user and category
 * 
 * @param walletAddress - User's wallet address
 * @param category - File category
 * @returns Array of file metadata
 */
export async function listFiles(
  walletAddress: string,
  category: string
): Promise<FileMetadata[]> {
  try {
    const response = await fetch(
      `${API_URL}/api/records/list?wallet=${encodeURIComponent(walletAddress)}&category=${encodeURIComponent(category)}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to list files");
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("[B2 Storage] List files failed:", error);
    throw error;
  }
}

/**
 * Get encrypted file from Backblaze B2
 * 
 * @param fileId - File ID (path in B2)
 * @returns Base64-encoded encrypted blob
 */
export async function getFile(fileId: string): Promise<string> {
  try {
    const response = await fetch(
      `${API_URL}/api/records/get?fileId=${encodeURIComponent(fileId)}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get file");
    }

    const data = await response.json();
    return data.encryptedBlob; // Base64 string
  } catch (error) {
    console.error("[B2 Storage] Get file failed:", error);
    throw error;
  }
}

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        // Remove data URL prefix if present
        const base64 = reader.result.includes(",")
          ? reader.result.split(",")[1]
          : reader.result;
        resolve(base64);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 string to Blob
 * Handles URL-safe base64 and cleans the input
 */
export function base64ToBlob(base64: string, mimeType: string = "application/octet-stream"): Blob {
  try {
    // Clean the base64 string: remove whitespace, newlines, and handle URL-safe encoding
    let cleanBase64 = base64.trim().replace(/\s+/g, '');
    
    // Replace URL-safe base64 characters if present
    cleanBase64 = cleanBase64.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (cleanBase64.length % 4) {
      cleanBase64 += '=';
    }
    
    // Decode base64
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  } catch (error) {
    console.error("[B2 Storage] Failed to convert base64 to blob:", error);
    throw new Error("Invalid base64 data. The file may be corrupted.");
  }
}

