// src/routes/savedPatients.ts
// Saved Patients Management Routes
// Allows doctors to save patient wallet addresses with aliases for quick access

import { Router, Request, Response } from "express";
import { query } from "../db";

const router = Router();

/**
 * GET /api/saved-patients?doctorWallet=DOCTOR_WALLET
 * Fetch all saved patients for a doctor
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { doctorWallet } = req.query;

    if (!doctorWallet) {
      return res.status(400).json({
        error: "doctorWallet query parameter is required",
      });
    }

    // Verify doctor exists and has 'doctor' role
    const doctorCheck = await query(
      "SELECT role FROM public.users WHERE wallet_address = $1",
      [doctorWallet]
    );

    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Doctor not found",
      });
    }

    if (doctorCheck.rows[0].role !== "doctor") {
      return res.status(403).json({
        error: "Only doctors can access saved patients",
      });
    }

    // Fetch all saved patients for this doctor
    const result = await query(
      `SELECT id, patient_wallet, alias, created_at
       FROM public.saved_patients
       WHERE doctor_wallet = $1
       ORDER BY created_at DESC`,
      [doctorWallet]
    );

    const savedPatients = result.rows.map((row) => ({
      id: row.id,
      patientWallet: row.patient_wallet,
      alias: row.alias,
      createdAt: row.created_at,
    }));

    return res.json({
      success: true,
      savedPatients,
    });
  } catch (error) {
    console.error("Error in GET /api/saved-patients:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/saved-patients/add
 * Add a new saved patient
 */
router.post("/add", async (req: Request, res: Response) => {
  try {
    const { doctorWallet, patientWallet, alias } = req.body;

    if (!doctorWallet || !patientWallet || !alias) {
      return res.status(400).json({
        error: "doctorWallet, patientWallet, and alias are required",
      });
    }

    // Verify doctor exists and has 'doctor' role
    const doctorCheck = await query(
      "SELECT role FROM public.users WHERE wallet_address = $1",
      [doctorWallet]
    );

    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Doctor not found. Please complete your registration first.",
      });
    }

    if (doctorCheck.rows[0].role !== "doctor") {
      return res.status(403).json({
        error: "Only doctors can save patients",
      });
    }

    // Insert new saved patient (or update alias if already exists)
    const result = await query(
      `INSERT INTO public.saved_patients (doctor_wallet, patient_wallet, alias)
       VALUES ($1, $2, $3)
       ON CONFLICT (doctor_wallet, patient_wallet)
       DO UPDATE SET alias = EXCLUDED.alias
       RETURNING id, created_at`,
      [doctorWallet, patientWallet, alias]
    );

    const savedPatient = result.rows[0];

    console.log("[Saved Patients] Patient saved:", {
      id: savedPatient.id,
      doctor: doctorWallet,
      patient: patientWallet,
      alias,
    });

    return res.json({
      success: true,
      id: savedPatient.id,
      patientWallet,
      alias,
      createdAt: savedPatient.created_at,
      message: "Patient saved successfully",
    });
  } catch (error) {
    console.error("Error in POST /api/saved-patients/add:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/saved-patients/delete/:id
 * Delete a saved patient
 */
router.delete("/delete/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { doctorWallet } = req.query;

    if (!doctorWallet) {
      return res.status(400).json({
        error: "doctorWallet query parameter is required",
      });
    }

    // Verify the saved patient exists and belongs to this doctor
    const checkResult = await query(
      `SELECT id FROM public.saved_patients
       WHERE id = $1 AND doctor_wallet = $2`,
      [id, doctorWallet]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: "Saved patient not found or you don't have permission to delete it",
      });
    }

    // Delete the saved patient
    await query(
      "DELETE FROM public.saved_patients WHERE id = $1",
      [id]
    );

    console.log("[Saved Patients] Patient deleted:", {
      id,
      doctor: doctorWallet,
    });

    return res.json({
      success: true,
      message: "Saved patient deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/saved-patients/delete/:id:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

