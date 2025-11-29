/**
 * Public Profile Routes
 * 
 * Handles public display information for doctors/hospitals.
 * This allows patients to see doctor names without decrypting private profiles.
 * 
 * IMPORTANT: Only stores PUBLIC information. Private data remains encrypted.
 */

import { Router, Request, Response } from "express";
import { query } from "../db";

const router = Router();

type UserRole = "patient" | "doctor" | "hospital" | "other";

/**
 * GET /api/public-profile/:walletAddress
 * 
 * Get public profile information for a doctor/hospital.
 * This is unencrypted and can be read by anyone.
 */
router.get("/:walletAddress", async (req: Request, res: Response) => {
  try {
    const walletAddress = decodeURIComponent(req.params.walletAddress).trim();

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    // Fetch public profile
    const result = await query(
      `SELECT 
        wallet_address,
        display_name,
        credentials,
        specialty,
        organization,
        role,
        created_at,
        updated_at
       FROM public.public_profiles
       WHERE wallet_address = $1`,
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return res.json({
        exists: false,
      });
    }

    const profile = result.rows[0];

    return res.json({
      exists: true,
      walletAddress: profile.wallet_address,
      displayName: profile.display_name,
      credentials: profile.credentials,
      specialty: profile.specialty,
      organization: profile.organization,
      role: profile.role,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    });
  } catch (error) {
    console.error("Error in GET /api/public-profile/:walletAddress:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/public-profile
 * 
 * Create or update public profile.
 * Only doctors, hospitals, and other healthcare providers can have public profiles.
 * 
 * Request body:
 * {
 *   "walletAddress": "addr1...",
 *   "displayName": "Dr. John Smith",
 *   "credentials": "MD",
 *   "specialty": "Cardiology",
 *   "organization": "City General Hospital",
 *   "role": "doctor"
 * }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { walletAddress, displayName, credentials, specialty, organization, role } = req.body;

    // Validate required fields
    if (!walletAddress || walletAddress.trim() === "") {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    if (!displayName || displayName.trim() === "") {
      return res.status(400).json({ error: "displayName is required" });
    }

    if (!role || !["doctor", "hospital", "other"].includes(role)) {
      return res.status(400).json({
        error: "role is required and must be one of: doctor, hospital, other",
      });
    }

    // Verify user exists and has the correct role
    const userResult = await query(
      "SELECT role FROM public.users WHERE wallet_address = $1",
      [walletAddress.trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: "User not found. Please register your account first.",
      });
    }

    if (userResult.rows[0].role !== role) {
      return res.status(400).json({
        error: `User role mismatch. Expected ${role}, but user is registered as ${userResult.rows[0].role}`,
      });
    }

    // Upsert public profile
    await query(
      `INSERT INTO public.public_profiles (
        wallet_address,
        display_name,
        credentials,
        specialty,
        organization,
        role
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (wallet_address)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        credentials = EXCLUDED.credentials,
        specialty = EXCLUDED.specialty,
        organization = EXCLUDED.organization,
        updated_at = NOW()`,
      [
        walletAddress.trim(),
        displayName.trim(),
        credentials?.trim() || null,
        specialty?.trim() || null,
        organization?.trim() || null,
        role,
      ]
    );

    console.log("[Public Profile] Profile saved:", {
      walletAddress: walletAddress.substring(0, 30) + "...",
      displayName,
      role,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("Error in POST /api/public-profile:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/public-profile/batch
 * 
 * Get multiple public profiles at once (for access requests list).
 * 
 * Query params: wallets=addr1,addr2,addr3
 */
router.get("/batch", async (req: Request, res: Response) => {
  try {
    const { wallets } = req.query;

    if (!wallets || typeof wallets !== "string") {
      return res.status(400).json({ error: "wallets query parameter is required" });
    }

    const walletList = wallets
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (walletList.length === 0) {
      return res.json({ profiles: [] });
    }

    // Fetch all public profiles
    const result = await query(
      `SELECT 
        wallet_address,
        display_name,
        credentials,
        specialty,
        organization,
        role
       FROM public.public_profiles
       WHERE wallet_address = ANY($1)`,
      [walletList]
    );

    const profiles = result.rows.map((row) => ({
      walletAddress: row.wallet_address,
      displayName: row.display_name,
      credentials: row.credentials,
      specialty: row.specialty,
      organization: row.organization,
      role: row.role,
    }));

    return res.json({ profiles });
  } catch (error) {
    console.error("Error in GET /api/public-profile/batch:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

