/**
 * Records API Routes
 * 
 * Handles file uploads, listing, and retrieval from Backblaze B2
 * All files are encrypted client-side before upload
 */

import express from "express";
import { query } from "../db";
import B2 from "backblaze-b2";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

const router = express.Router();

// Initialize Backblaze B2
let b2Instance: B2 | null = null;
let b2Authorized = false;

async function getB2Instance(): Promise<B2> {
  if (b2Instance && b2Authorized) {
    return b2Instance;
  }

  const accountId = process.env.B2_ACCOUNT_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;

  if (!accountId || !applicationKey) {
    throw new Error("Backblaze B2 not configured. Set B2_ACCOUNT_ID and B2_APPLICATION_KEY");
  }

  b2Instance = new B2({
    accountId,
    applicationKey,
  });

  try {
    await b2Instance.authorize();
    b2Authorized = true;
    console.log("[B2] Authorized successfully");
  } catch (error) {
    console.error("[B2] Authorization failed:", error);
    throw new Error("Failed to authorize with Backblaze B2");
  }

  return b2Instance;
}

/**
 * POST /api/records/upload
 * Upload encrypted file to Backblaze B2 and store metadata
 */
router.post("/upload", async (req, res) => {
  try {
    const { fileData, originalName, category, ownerWallet } = req.body;

    if (!fileData || !originalName || !category || !ownerWallet) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate category
    const validCategories = ["insurance", "lab-results", "consultations", "prescriptions"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    // Initialize B2
    const b2 = await getB2Instance();
    const bucketName = process.env.B2_BUCKET_NAME || "medledger-patient-records";
    const bucketId = process.env.B2_BUCKET_ID;

    if (!bucketId) {
      throw new Error("B2_BUCKET_ID not configured");
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileData, "base64");

    // Create file path: walletAddress/category/filename.enc
    const fileName = `${ownerWallet}/${category}/${Date.now()}_${originalName}.enc`;

    // Get upload URL
    const { data: uploadUrlData } = await b2.getUploadUrl({
      bucketId: bucketId,
    });

    // Upload file
    const { data: uploadData } = await b2.uploadFile({
      uploadUrl: uploadUrlData.uploadUrl,
      uploadAuthToken: uploadUrlData.authorizationToken,
      fileName: fileName,
      data: fileBuffer,
      mime: "application/octet-stream",
      info: {
        category: category,
        owner: ownerWallet,
        originalName: originalName,
      },
    });

    // Store metadata in database
    const result = await query(
      `INSERT INTO public.user_files (owner_wallet, drive_file_id, category, original_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [ownerWallet, fileName, category, originalName] // Use fileName as drive_file_id
    );

    res.json({
      success: true,
      fileId: fileName,
      dbId: result.rows[0].id,
      createdAt: result.rows[0].created_at,
    });
  } catch (error: any) {
    console.error("[Records] Upload error:", error);
    res.status(500).json({ error: error.message || "Failed to upload file" });
  }
});

/**
 * GET /api/records/get-for-doctor
 * Get encrypted file for a doctor based on approved access request
 * This allows doctors to access ALL files in approved categories
 */
router.get("/get-for-doctor", async (req, res) => {
  try {
    const requestId = req.query.requestId as string;
    const doctorWallet = req.query.doctorWallet as string;
    const storageFileId = req.query.storageFileId as string; // This is the B2 file path

    if (!requestId || !doctorWallet || !storageFileId) {
      return res.status(400).json({ error: "Missing required parameters: requestId, doctorWallet, storageFileId" });
    }

    // Verify the request is approved and belongs to this doctor
    const accessCheck = await query(
      `SELECT id, patient_wallet, record_types, status
       FROM public.access_requests
       WHERE id = $1 AND doctor_wallet = $2 AND status = 'approved'`,
      [requestId, doctorWallet]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied. Request not found, not approved, or unauthorized." });
    }

    const patientWallet = accessCheck.rows[0].patient_wallet;
    const recordTypes = accessCheck.rows[0].record_types || [];

    // Verify the file belongs to the patient and is in an approved category
    const fileCheck = await query(
      `SELECT id, category, owner_wallet
       FROM public.user_files
       WHERE drive_file_id = $1 AND owner_wallet = $2`,
      [storageFileId, patientWallet]
    );

    if (fileCheck.rows.length === 0) {
      return res.status(404).json({ error: "File not found or does not belong to the patient" });
    }

    const fileCategory = fileCheck.rows[0].category;
    if (!recordTypes.includes(fileCategory)) {
      return res.status(403).json({ error: "Access denied. This file category was not approved in the access request." });
    }

    // Get the encrypted file from B2
    const b2 = await getB2Instance();
    const bucketName = process.env.B2_BUCKET_NAME || "medledger-patient-records";

    try {
      const response = await b2.downloadFileByName({
        bucketName: bucketName,
        fileName: storageFileId,
        responseType: 'arraybuffer',
      });

      let buffer: Buffer;
      if (Buffer.isBuffer(response.data)) {
        buffer = response.data;
      } else if (response.data instanceof ArrayBuffer) {
        buffer = Buffer.from(response.data);
      } else if (response.data instanceof Uint8Array) {
        buffer = Buffer.from(response.data);
      } else {
        buffer = Buffer.from(response.data as any);
      }

      const base64 = buffer.toString("base64");

      res.json({
        success: true,
        encryptedBlob: base64,
      });
    } catch (b2Error: any) {
      console.error("[Records] B2 download error:", b2Error);
      if (b2Error.response?.status === 404) {
        return res.status(404).json({ error: "File not found in storage" });
      }
      throw b2Error;
    }
  } catch (error: any) {
    console.error("[Records] Get for doctor error:", error);
    res.status(500).json({ error: error.message || "Failed to get file" });
  }
});

/**
 * GET /api/records/list-for-doctor
 * List files for a doctor based on approved access request
 */
router.get("/list-for-doctor", async (req, res) => {
  try {
    const requestId = req.query.requestId as string;
    const doctorWallet = req.query.doctorWallet as string;

    if (!requestId || !doctorWallet) {
      return res.status(400).json({ error: "Missing requestId or doctorWallet" });
    }

    // Verify access request is approved
    const accessCheck = await query(
      `SELECT id, patient_wallet, record_types, status 
       FROM public.access_requests
       WHERE id = $1 AND doctor_wallet = $2 AND status = 'approved'`,
      [requestId, doctorWallet]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access request not found or not approved" });
    }

    const patientWallet = accessCheck.rows[0].patient_wallet;
    const recordTypes = accessCheck.rows[0].record_types || [];

    // Get files for each requested category
    const files = [];
    for (const category of recordTypes) {
      const categoryFiles = await query(
        `SELECT id, original_name, category, created_at, drive_file_id
         FROM public.user_files
         WHERE owner_wallet = $1 AND category = $2
         ORDER BY created_at DESC`,
        [patientWallet, category]
      );

      files.push(...categoryFiles.rows.map(row => ({
        fileId: row.id,
        storageFileId: row.drive_file_id,
        originalName: row.original_name,
        category: row.category,
        createdAt: row.created_at,
      })));
    }

    res.json({
      success: true,
      files,
    });
  } catch (error: any) {
    console.error("[Records] List for doctor error:", error);
    res.status(500).json({ error: error.message || "Failed to list files" });
  }
});

/**
 * GET /api/records/list
 * List all files for a user and category
 */
router.get("/list", async (req, res) => {
  try {
    const wallet = req.query.wallet as string;
    const category = req.query.category as string;

    if (!wallet || !category) {
      return res.status(400).json({ error: "Missing wallet or category parameter" });
    }

    const result = await query(
      `SELECT id, drive_file_id, category, original_name, created_at
       FROM public.user_files
       WHERE owner_wallet = $1 AND category = $2
       ORDER BY created_at DESC`,
      [wallet, category]
    );

    res.json({
      success: true,
      files: result.rows.map((row) => ({
        fileId: row.drive_file_id, // B2 storage path (for fetching encrypted file)
        dbFileId: row.id, // Database ID (for granting access)
        originalName: row.original_name,
        category: row.category,
        ownerWallet: wallet,
        created_at: row.created_at,
      })),
    });
  } catch (error: any) {
    console.error("[Records] List error:", error);
    res.status(500).json({ error: error.message || "Failed to list files" });
  }
});

/**
 * GET /api/records/get
 * Get encrypted file from Backblaze B2
 */
router.get("/get", async (req, res) => {
  try {
    const fileId = req.query.fileId as string;
    const wallet = req.query.wallet as string; // Optional: verify ownership

    if (!fileId) {
      return res.status(400).json({ error: "Missing fileId parameter" });
    }

    // Verify ownership if wallet provided
    if (wallet) {
      const ownershipCheck = await query(
        `SELECT id FROM public.user_files
         WHERE drive_file_id = $1 AND owner_wallet = $2`,
        [fileId, wallet]
      );

      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({ error: "File not found or access denied" });
      }
    }

    // Initialize B2
    const b2 = await getB2Instance();
    const bucketName = process.env.B2_BUCKET_NAME || "medledger-patient-records";
    const bucketId = process.env.B2_BUCKET_ID;

    if (!bucketId) {
      throw new Error("B2_BUCKET_ID not configured");
    }

    // Download file - explicitly request arraybuffer format
    const response = await b2.downloadFileByName({
      bucketName: bucketName,
      fileName: fileId,
      responseType: 'arraybuffer', // Request ArrayBuffer format
    });

    // B2 returns data in response.data as ArrayBuffer when responseType is 'arraybuffer'
    let buffer: Buffer;
    
    if (Buffer.isBuffer(response.data)) {
      buffer = response.data;
    } else if (response.data instanceof ArrayBuffer) {
      buffer = Buffer.from(response.data);
    } else if (response.data instanceof Uint8Array) {
      buffer = Buffer.from(response.data);
    } else {
      // Fallback: try to convert whatever we got
      try {
        buffer = Buffer.from(response.data as any);
      } catch (conversionError) {
        console.error("[Records] Failed to convert B2 data to Buffer:", conversionError);
        console.error("[Records] Response data type:", typeof response.data);
        console.error("[Records] Response data constructor:", response.data?.constructor?.name);
        throw new Error("Failed to process file data from B2");
      }
    }

    // Convert Buffer to base64
    const base64 = buffer.toString("base64");

    res.json({
      success: true,
      encryptedBlob: base64,
    });
  } catch (error: any) {
    console.error("[Records] Get file error:", error);
    if (error.response?.status === 404) {
      return res.status(404).json({ error: "File not found" });
    }
    res.status(500).json({ error: error.message || "Failed to get file" });
  }
});

/**
 * POST /api/records/share-with-doctor
 * Share encrypted file with a doctor (for approved access requests)
 */
router.post("/share-with-doctor", async (req, res) => {
  try {
    const { requestId, doctorWallet, doctorPublicKey, expiry, fileIds } = req.body;

    if (!requestId || !doctorWallet || !fileIds || !Array.isArray(fileIds)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify access request is approved
    const accessCheck = await query(
      `SELECT id, patient_wallet, status FROM public.access_requests
       WHERE id = $1 AND status = 'approved'`,
      [requestId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access request not found or not approved" });
    }

    const patientWallet = accessCheck.rows[0].patient_wallet;

    // Store sharing metadata
    const shareResults = [];
    for (const fileId of fileIds) {
      // Verify file belongs to patient
      const fileCheck = await query(
        `SELECT id FROM public.user_files
         WHERE id = $1 AND owner_wallet = $2`,
        [fileId, patientWallet]
      );

      if (fileCheck.rows.length === 0) {
        continue; // Skip files that don't belong to patient
      }

      // Insert sharing record
      const shareResult = await query(
        `INSERT INTO public.shared_files (file_id, doctor_wallet, encrypted_blob, expiry)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [fileId, doctorWallet, "", expiry || null] // encrypted_blob will be set by client
      );

      shareResults.push({
        fileId,
        shareId: shareResult.rows[0].id,
      });
    }

    res.json({
      success: true,
      shared: shareResults,
    });
  } catch (error: any) {
    console.error("[Records] Share error:", error);
    res.status(500).json({ error: error.message || "Failed to share files" });
  }
});

/**
 * POST /api/records/revoke-access
 * Revoke doctor access to shared files
 */
router.post("/revoke-access", async (req, res) => {
  try {
    const { shareId, fileId, doctorWallet } = req.body;

    if (!shareId && !fileId) {
      return res.status(400).json({ error: "Missing shareId or fileId" });
    }

    let result;
    if (shareId) {
      result = await query(
        `DELETE FROM public.shared_files WHERE id = $1`,
        [shareId]
      );
    } else if (fileId && doctorWallet) {
      result = await query(
        `DELETE FROM public.shared_files WHERE file_id = $1 AND doctor_wallet = $2`,
        [fileId, doctorWallet]
      );
    } else {
      return res.status(400).json({ error: "Must provide shareId or both fileId and doctorWallet" });
    }

    res.json({
      success: true,
      revoked: result.rowCount || 0,
    });
  } catch (error: any) {
    console.error("[Records] Revoke error:", error);
    res.status(500).json({ error: error.message || "Failed to revoke access" });
  }
});

export default router;
