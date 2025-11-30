import { Router } from "express";
import { pool } from "../db";

const router = Router();

// Store granted files in memory for now (or a simple table if persistence is needed)
// In a real production app, this should be in a secure storage bucket with strict ACLs
// For this implementation, we'll use a new table 'granted_files'

// Initialize table
pool.query(`
  CREATE TABLE IF NOT EXISTS public.granted_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.access_requests(id) ON DELETE CASCADE,
    original_file_id TEXT NOT NULL,
    file_data TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`).catch(err => console.error("Failed to create granted_files table:", err));

// POST /api/access/grant-file
// Patient uploads a decrypted (or re-encrypted) file for the doctor
router.post("/grant-file", async (req, res) => {
    const { requestId, fileId, fileData, patientWallet } = req.body;

    console.log(`[Grant File] Request received for RequestID: ${requestId}, FileID: ${fileId}`);

    if (!requestId || !fileId || !fileData || !patientWallet) {
        console.error("[Grant File] Missing required fields");
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // Verify request exists and belongs to patient
        const requestResult = await pool.query(
            "SELECT * FROM access_requests WHERE id = $1 AND patient_wallet = $2",
            [requestId, patientWallet]
        );

        if (requestResult.rows.length === 0) {
            console.error("[Grant File] Request not found or unauthorized");
            return res.status(404).json({ error: "Access request not found or unauthorized" });
        }

        // Store the file
        // Check if already exists to avoid duplicates
        const existing = await pool.query(
            "SELECT id FROM granted_files WHERE request_id = $1 AND original_file_id = $2",
            [requestId, fileId]
        );

        if (existing.rows.length > 0) {
            // Update existing
            console.log("[Grant File] Updating existing granted file");
            await pool.query(
                "UPDATE granted_files SET file_data = $1, created_at = NOW() WHERE id = $2",
                [fileData, existing.rows[0].id]
            );
        } else {
            // Insert new
            console.log("[Grant File] Inserting new granted file");
            await pool.query(
                "INSERT INTO granted_files (request_id, original_file_id, file_data) VALUES ($1, $2, $3)",
                [requestId, fileId, fileData]
            );
        }

        console.log("[Grant File] Success");
        res.json({ success: true, message: "File access granted successfully" });
    } catch (error: any) {
        console.error("[Grant File] Error:", error);
        res.status(500).json({ error: "Failed to grant file access", details: error.message });
    }
});

// GET /api/access/view-granted-file
// Doctor retrieves the granted file
// fileId can be either the database ID (from user_files.id) or the storage file ID (from user_files.drive_file_id)
router.get("/view-granted-file", async (req, res) => {
    const { requestId, fileId, doctorWallet } = req.query;

    console.log(`[View Granted File] Request for RequestID: ${requestId}, FileID: ${fileId}, Doctor: ${doctorWallet}`);

    if (!requestId || !fileId || !doctorWallet) {
        console.error("[View Granted File] Missing parameters");
        return res.status(400).json({ error: "Missing required parameters: requestId, fileId, doctorWallet" });
    }

    try {
        // Verify request is approved and belongs to doctor
        const requestResult = await pool.query(
            "SELECT * FROM access_requests WHERE id = $1 AND doctor_wallet = $2 AND status = 'approved'",
            [requestId, doctorWallet]
        );

        if (requestResult.rows.length === 0) {
            console.error("[View Granted File] Access denied or request not found");
            return res.status(403).json({ error: "Access denied. Request not approved or unauthorized." });
        }

        // Try to find the file by database ID first, then by storage file ID
        let fileResult = await pool.query(
            "SELECT file_data FROM granted_files WHERE request_id = $1 AND original_file_id = $2",
            [requestId, fileId]
        );

        // If not found by database ID, try to find by storage file ID
        if (fileResult.rows.length === 0) {
            // Look up the database ID from the storage file ID
            const userFileResult = await pool.query(
                "SELECT id FROM user_files WHERE drive_file_id = $1",
                [fileId]
            );
            
            if (userFileResult.rows.length > 0) {
                const dbFileId = userFileResult.rows[0].id;
                fileResult = await pool.query(
                    "SELECT file_data FROM granted_files WHERE request_id = $1 AND original_file_id = $2",
                    [requestId, dbFileId]
                );
            }
        }

        if (fileResult.rows.length === 0) {
            console.error("[View Granted File] File not found in granted_files table");
            return res.status(404).json({ 
                error: "File not found. The patient may not have granted access to this file yet. All files in approved categories should be automatically granted when the request is approved." 
            });
        }

        console.log("[View Granted File] Success, returning file data");
        res.json({
            success: true,
            fileData: fileResult.rows[0].file_data
        });
    } catch (error: any) {
        console.error("[View Granted File] Error:", error);
        res.status(500).json({ error: "Failed to retrieve file", details: error.message });
    }
});

export default router;
