"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Upload, FileText, Calendar, Eye, Loader2 } from "lucide-react";
import { useWalletStore } from "@/hooks/useWalletStore";
import { deriveEncryptionKey } from "@/lib/crypto/profileEncryption";
import { encryptFile } from "@/lib/crypto/fileEncryption";
import { uploadToStorage, listFiles, getFile, base64ToBlob } from "@/lib/storage/b2";
import { decryptFile } from "@/lib/crypto/fileEncryption";
import { SecureDocumentViewer } from "@/components/secure-doc-viewer";
import type { CardanoWalletApi } from "@/types/window";

const categoryNames: Record<string, string> = {
  insurance: "Insurance Documents",
  "lab-results": "Lab Results",
  consultations: "Consultation Documents",
  prescriptions: "Prescription History",
};

interface FileMetadata {
  fileId: string;
  originalName: string;
  category: string;
  ownerWallet: string;
  created_at: string;
}

export default function CategoryPage() {
  const params = useParams();
  const category = params.category as string;
  const categoryName = categoryNames[category] || category;

  const address = useWalletStore((s) => s.address);
  const connected = useWalletStore((s) => s.connected);

  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingFile, setViewingFile] = useState<{
    name: string;
    data: ArrayBuffer;
  } | null>(null);

  useEffect(() => {
    if (connected && address) {
      loadFiles();
    } else {
      setLoading(false);
    }
  }, [connected, address, category]);

  const loadFiles = async () => {
    if (!address) return;

    try {
      setLoading(true);
      const fileList = await listFiles(address, category);
      setFiles(fileList);
    } catch (error: any) {
      console.error("[Category Page] Failed to load files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !address || !connected) return;

    try {
      setUploading(true);

      // Get wallet API
      if (typeof window === "undefined" || !(window as any).cardano?.eternl) {
        throw new Error("Wallet not connected");
      }

      const walletApi = await (window as any).cardano.eternl.enable();
      if (!walletApi) {
        throw new Error("Failed to enable wallet");
      }

      // Derive encryption key
      const key = await deriveEncryptionKey(address, walletApi as CardanoWalletApi);

      // Encrypt file
      const encryptedBlob = await encryptFile(file, key);

      // Upload to Backblaze B2
      const fileId = await uploadToStorage(encryptedBlob, file.name, category, address);

      console.log("[Category Page] File uploaded successfully:", fileId);

      // Reload file list
      await loadFiles();

      // Reset file input
      event.target.value = "";
    } catch (error: any) {
      console.error("[Category Page] Upload failed:", error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleViewFile = async (file: FileMetadata) => {
    if (!address || !connected) return;

    try {
      // Get wallet API
      if (typeof window === "undefined" || !(window as any).cardano?.eternl) {
        throw new Error("Wallet not connected");
      }

      const walletApi = await (window as any).cardano.eternl.enable();
      if (!walletApi) {
        throw new Error("Failed to enable wallet");
      }

      // Derive encryption key
      const key = await deriveEncryptionKey(address, walletApi as CardanoWalletApi);

      // Get encrypted file from Backblaze B2
      const encryptedBase64 = await getFile(file.fileId);
      const encryptedBlob = base64ToBlob(encryptedBase64);

      // Decrypt file
      const decryptedBuffer = await decryptFile(encryptedBlob, key);

      // Validate decrypted data
      if (!decryptedBuffer || decryptedBuffer.byteLength === 0) {
        throw new Error("Decrypted file is empty or invalid");
      }

      console.log("[Category Page] File decrypted successfully, size:", decryptedBuffer.byteLength, "bytes");

      // Set viewing file
      setViewingFile({
        name: file.originalName,
        data: decryptedBuffer,
      });
    } catch (error: any) {
      console.error("[Category Page] View file failed:", error);
      alert(`Failed to view file: ${error.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!connected || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 text-center">
            <p className="text-gray-600">Please connect your wallet to view records.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {categoryName}
          </h1>
          <p className="text-gray-600">
            Securely store and manage your {categoryName.toLowerCase()}
          </p>
        </motion.div>

        {/* Upload Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <label className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl px-6 py-4 shadow-lg hover:shadow-xl transition-all cursor-pointer border border-white/20 hover:border-medical-blue/30">
            <Upload className="w-5 h-5 text-medical-blue" />
            <span className="font-medium text-gray-900">
              {uploading ? "Uploading..." : "Upload File"}
            </span>
            {uploading && <Loader2 className="w-4 h-4 animate-spin text-medical-blue" />}
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
          </label>
        </motion.div>

        {/* File List */}
        {loading ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-medical-blue mx-auto mb-4" />
            <p className="text-gray-600">Loading files...</p>
          </div>
        ) : files.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-12 text-center"
          >
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No files uploaded yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Click "Upload File" to add your first document.
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {files.map((file, index) => (
              <motion.div
                key={file.fileId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-medical-blue to-medical-teal flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {file.originalName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(file.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewFile(file)}
                    className="flex items-center gap-2 px-4 py-2 bg-medical-blue text-white rounded-lg hover:bg-medical-blue/90 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Secure Document Viewer Modal */}
      {viewingFile && (
        <SecureDocumentViewer
          fileData={viewingFile.data}
          fileName={viewingFile.name}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  );
}

