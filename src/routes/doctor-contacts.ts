/**
 * Doctor-Patient Contacts Routes
 * 
 * Handles saving and retrieving patient wallet addresses for doctors.
 * Backend NEVER decrypts patient names - only stores/retrieves ciphertext.
 */

import { Router, Request, Response } from "express";
import { query } from "../db";

const router = Router();

/**
 * GET /api/doctor-contacts/:doctorWallet
 * 
 * Purpose: Get all saved patient contacts for a doctor
 * 
 * Returns:
 * [
 *   {
 *     id: "...",
 *     patientWallet: "addr1...",
 *     patientNameCipher: "<base64>",
 *     createdAt: "..."
 *   },
 *   ...
 * ]
 * 
 * Backend NEVER decrypts the cipher.
 */
router.get("/:doctorWallet", async (req: Request, res: Response) => {
  try {
    const doctorWallet = req.params.doctorWallet.trim();

    if (!doctorWallet) {
      return res.status(400).json({ error: "Doctor wallet address is required" });
    }

    // Verify doctor exists and has doctor role
    const userResult = await query(
      "SELECT role FROM public.users WHERE wallet_address = $1",
      [doctorWallet]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    if (userResult.rows[0].role !== "doctor") {
      return res.status(403).json({ error: "Only doctors can access patient contacts" });
    }

    // Get all saved contacts
    const result = await query(
      `SELECT id, patient_wallet, patient_name_cipher, created_at
       FROM public.doctor_patient_contacts
       WHERE doctor_wallet = $1
       ORDER BY created_at DESC`,
      [doctorWallet]
    );

    // Convert BYTEA to base64 for each contact
    const contacts = result.rows.map((row) => ({
      id: row.id,
      patientWallet: row.patient_wallet,
      patientNameCipher: row.patient_name_cipher.toString("base64"),
      createdAt: row.created_at,
    }));

    return res.json(contacts);
  } catch (error) {
    console.error("Error in GET /api/doctor-contacts/:doctorWallet:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/doctor-contacts
 * 
 * Purpose: Save a new patient contact for a doctor
 * 
 * Request body (production):
 * {
 *   "doctorWallet": "addr1...",
 *   "patientWallet": "addr1...",
 *   "patientNameCipher": "<base64-encoded-ciphertext>"
 * }
 * 
 * Request body (development - temporary):
 * {
 *   "doctorWallet": "addr1...",
 *   "patientWallet": "addr1...",
 *   "patientName": "John Doe"
 * }
 * 
 * Backend stores ciphertext as-is, never decrypts.
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { doctorWallet, patientWallet, patientNameCipher, patientName } = req.body;

    // Validate required fields
    if (!doctorWallet || doctorWallet.trim() === "") {
      return res.status(400).json({ error: "doctorWallet is required" });
    }

    if (!patientWallet || patientWallet.trim() === "") {
      return res.status(400).json({ error: "patientWallet is required" });
    }

    const cleanDoctorWallet = doctorWallet.trim();
    const cleanPatientWallet = patientWallet.trim();

    // Verify doctor exists and has doctor role
    const userResult = await query(
      "SELECT role FROM public.users WHERE wallet_address = $1",
      [cleanDoctorWallet]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        error: "Doctor not found",
        message: "Your wallet address is not registered. Please complete your doctor registration first by selecting 'Doctor' role and filling out your profile."
      });
    }

    if (userResult.rows[0].role !== "doctor") {
      return res.status(403).json({ 
        error: "Only doctors can save patient contacts",
        message: `Your account is registered as '${userResult.rows[0].role}', not 'doctor'. Please register with the doctor role to use this feature.`
      });
    }

    // Validate that cipher is provided (frontend must encrypt)
    if (!patientNameCipher || typeof patientNameCipher !== "string") {
      return res.status(400).json({
        error: "patientNameCipher (base64-encoded encrypted data) is required. Frontend must encrypt patient name before sending.",
      });
    }

    // Convert base64 cipher to Buffer
    // Backend NEVER decrypts - only stores ciphertext
    let nameCipher: Buffer;
    try {
      nameCipher = Buffer.from(patientNameCipher, "base64");
    } catch (error) {
      return res.status(400).json({ 
        error: "Invalid base64 cipher. Please ensure the cipher is properly base64-encoded." 
      });
    }

    // Insert or update contact
    await query(
      `INSERT INTO public.doctor_patient_contacts (doctor_wallet, patient_wallet, patient_name_cipher)
       VALUES ($1, $2, $3)
       ON CONFLICT (doctor_wallet, patient_wallet)
       DO UPDATE SET patient_name_cipher = EXCLUDED.patient_name_cipher`,
      [cleanDoctorWallet, cleanPatientWallet, nameCipher]
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error("Error in POST /api/doctor-contacts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check if it's a database table missing error
    if (errorMessage.includes("does not exist") || errorMessage.includes("relation") || errorMessage.includes("table")) {
      return res.status(500).json({
        error: "Database table not found",
        message: "The doctor_patient_contacts table does not exist. Please run 'npm run db:setup' to create it.",
      });
    }
    
    return res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
    });
  }
});

/**
 * DELETE /api/doctor-contacts/:id
 * 
 * Purpose: Delete a saved patient contact
 * 
 * Query params:
 * - doctorWallet: Doctor's wallet address (for authorization)
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { doctorWallet } = req.query;

    if (!doctorWallet) {
      return res.status(400).json({ error: "doctorWallet query parameter is required" });
    }

    const cleanDoctorWallet = (doctorWallet as string).trim();

    // Verify doctor owns this contact
    const contactResult = await query(
      "SELECT doctor_wallet FROM public.doctor_patient_contacts WHERE id = $1",
      [id]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    if (contactResult.rows[0].doctor_wallet !== cleanDoctorWallet) {
      return res.status(403).json({ error: "Unauthorized to delete this contact" });
    }

    // Delete contact
    await query(
      "DELETE FROM public.doctor_patient_contacts WHERE id = $1",
      [id]
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error("Error in DELETE /api/doctor-contacts/:id:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

