/**
 * Register Role Route
 * 
 * Handles initial role registration when a new user connects their wallet.
 */

import { Router, Request, Response } from "express";
import { query } from "../db";

const router = Router();

/**
 * POST /api/register-role
 * 
 * Purpose: Register a user's role when they first connect
 * 
 * Request body:
 * {
 *   "walletAddress": "addr1...",
 *   "role": "patient" | "doctor" | "hospital" | "other"
 * }
 * 
 * Returns:
 * { ok: true }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { walletAddress, role } = req.body;

    console.log("[Register Role] Received request:", {
      walletAddress: walletAddress?.substring(0, 30) + "...",
      role,
      hasWalletAddress: !!walletAddress,
      hasRole: !!role,
    });

    // Validate required fields
    if (!walletAddress || walletAddress.trim() === "") {
      console.log("[Register Role] Validation failed: walletAddress missing");
      return res.status(400).json({ error: "walletAddress is required" });
    }

    if (!role || !["patient", "doctor", "hospital", "other"].includes(role)) {
      console.log("[Register Role] Validation failed: invalid role", role);
      return res.status(400).json({
        error: "role is required and must be one of: patient, doctor, hospital, other",
      });
    }

    const cleanAddress = walletAddress.trim();
    console.log("[Register Role] Processing registration:", {
      address: cleanAddress.substring(0, 30) + "...",
      role,
    });

    // Check if user already exists
    const existingUser = await query(
      "SELECT role FROM public.users WHERE wallet_address = $1",
      [cleanAddress]
    );

    if (existingUser.rows.length > 0) {
      // User already exists - return their existing role
      console.log("[Register Role] User already exists:", {
        address: cleanAddress.substring(0, 30) + "...",
        existingRole: existingUser.rows[0].role,
      });
      return res.json({
        ok: true,
        role: existingUser.rows[0].role,
        message: "User already registered with this role",
      });
    }

    // Insert new user with role
    console.log("[Register Role] Creating new user:", {
      address: cleanAddress.substring(0, 30) + "...",
      role,
    });
    
    await query(
      `INSERT INTO public.users (wallet_address, role)
       VALUES ($1, $2)
       ON CONFLICT (wallet_address) DO NOTHING`,
      [cleanAddress, role]
    );

    console.log("[Register Role] User created successfully");
    return res.json({ ok: true, role });
  } catch (error) {
    console.error("Error in POST /api/register-role:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

