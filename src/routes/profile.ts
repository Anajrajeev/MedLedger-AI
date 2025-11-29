/**
 * Profile Routes
 * 
 * Backend NEVER decrypts profile data.
 * Only stores/retrieves ciphertext (base64 encoded).
 * All encryption/decryption happens on the frontend.
 */

import { Router, Request, Response } from "express";
import { query } from "../db";

const router = Router();

type UserRole = "patient" | "doctor" | "hospital" | "other";

/**
 * Get the profile table name based on role
 */
function getProfileTableName(role: UserRole): string {
  switch (role) {
    case "patient":
      return "public.patient_profiles";
    case "doctor":
      return "public.doctor_profiles";
    case "hospital":
      return "public.hospital_profiles";
    case "other":
      return "public.other_profiles";
    default:
      throw new Error(`Invalid role: ${role}`);
  }
}

/**
 * GET /api/profile/:walletAddress
 * 
 * Purpose: Determine if this user exists and return their role
 * 
 * Returns:
 * - { exists: false } if user not found
 * - { exists: true, role: "patient|doctor|hospital|other" } if user found but no profile
 * - { exists: true, role: "...", cipher: "<base64>" } if user found with profile
 * 
 * Backend NEVER decrypts the cipher.
 */
router.get("/:walletAddress", async (req: Request, res: Response) => {
  try {
    const walletAddress = decodeURIComponent(req.params.walletAddress).trim();

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    console.log("[Profile GET] Checking profile for wallet:", {
      address: walletAddress.substring(0, 30) + "...",
      length: walletAddress.length,
      startsWithAddr: walletAddress.startsWith("addr"),
      fullAddress: walletAddress,
    });

    // First, check if user exists in users table (exact match)
    const userResult = await query(
      "SELECT wallet_address, role FROM public.users WHERE wallet_address = $1",
      [walletAddress]
    );

    console.log("[Profile GET] User lookup result:", {
      found: userResult.rows.length > 0,
      role: userResult.rows[0]?.role,
      storedAddress: userResult.rows[0]?.wallet_address?.substring(0, 30) + "...",
    });

    // User not found
    if (userResult.rows.length === 0) {
      console.log("[Profile GET] User not found, returning exists: false");
      return res.json({ exists: false });
    }

    const role = userResult.rows[0].role as UserRole;
    const storedWalletAddress = userResult.rows[0].wallet_address;

    console.log("[Profile GET] User found:", {
      role,
      storedAddress: storedWalletAddress.substring(0, 30) + "...",
      matchesInput: storedWalletAddress === walletAddress,
    });

    // Update last_login timestamp (use the stored address to ensure exact match)
    await query(
      "UPDATE public.users SET last_login = NOW() WHERE wallet_address = $1",
      [storedWalletAddress]
    );

    // Try to get profile from role-specific table (use stored address)
    const profileTable = getProfileTableName(role);
    const profileResult = await query(
      `SELECT profile_cipher FROM ${profileTable} WHERE wallet_address = $1`,
      [storedWalletAddress]
    );

    console.log("[Profile GET] Profile lookup:", {
      table: profileTable,
      found: profileResult.rows.length > 0,
      hasCipher: !!profileResult.rows[0]?.profile_cipher,
    });

    // User exists but no profile yet
    if (profileResult.rows.length === 0) {
      return res.json({
        exists: true,
        role,
      });
    }

    // User found with profile - return ciphertext as base64
    const profileCipher = profileResult.rows[0].profile_cipher;

    if (!profileCipher) {
      return res.json({
        exists: true,
        role,
      });
    }

    // Convert BYTEA to base64 (backend never decrypts)
    const cipherBase64 = profileCipher.toString("base64");

    // Return ciphertext (frontend will decrypt)
    return res.json({
      exists: true,
      role,
      cipher: cipherBase64,
    });
  } catch (error) {
    console.error("Error in GET /api/profile/:walletAddress:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/profile
 * 
 * Purpose: Create/update encrypted profile
 * 
 * Request body:
 * {
 *   "walletAddress": "addr1...",
 *   "role": "patient" | "doctor" | "hospital" | "other",
 *   "cipher": "<base64-encoded-ciphertext>"
 * }
 * 
 * Backend stores ciphertext as-is, never decrypts.
 * Frontend MUST encrypt data before sending.
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { walletAddress, role, cipher } = req.body;

    // Validate required fields
    if (!walletAddress || walletAddress.trim() === "") {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    if (!role || !["patient", "doctor", "hospital", "other"].includes(role)) {
      return res.status(400).json({
        error: "role is required and must be one of: patient, doctor, hospital, other",
      });
    }

    if (!cipher || typeof cipher !== "string") {
      return res.status(400).json({
        error: "cipher (base64-encoded encrypted data) is required. Frontend must encrypt profile data before sending.",
      });
    }

    const cleanAddress = walletAddress.trim();
    const userRole = role as UserRole;

    // Verify user exists in users table
    const userResult = await query(
      "SELECT role FROM public.users WHERE wallet_address = $1",
      [cleanAddress]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: "User not found. Please register role first via POST /api/register-role",
      });
    }

    // Verify role matches
    if (userResult.rows[0].role !== userRole) {
      return res.status(400).json({
        error: `Role mismatch. User is registered as ${userResult.rows[0].role}, but profile is for ${userRole}`,
      });
    }

    // Convert base64 cipher to Buffer
    // Backend NEVER decrypts - only stores ciphertext
    let profileCipher: Buffer;
    try {
      profileCipher = Buffer.from(cipher, "base64");
    } catch (error) {
      return res.status(400).json({ 
        error: "Invalid base64 cipher. Please ensure the cipher is properly base64-encoded." 
      });
    }

    // Get the correct profile table based on role
    const profileTable = getProfileTableName(userRole);

    // Upsert into role-specific profile table
    // Backend stores ciphertext as-is, never decrypts
    await query(
      `INSERT INTO ${profileTable} (wallet_address, profile_cipher)
       VALUES ($1, $2)
       ON CONFLICT (wallet_address)
       DO UPDATE SET profile_cipher = EXCLUDED.profile_cipher`,
      [cleanAddress, profileCipher]
    );

    // Update last_login in users table
    await query(
      "UPDATE public.users SET last_login = NOW() WHERE wallet_address = $1",
      [cleanAddress]
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error("Error in POST /api/profile:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/profile/shared?patientWallet=...&requesterWallet=...
 * 
 * Purpose: Get patient's encrypted profile if requester has permission
 * 
 * Flow:
 * 1. Verify consent on Midnight
 * 2. If denied → return 403
 * 3. If allowed → return patient's encrypted profile_cipher (base64)
 * 
 * Backend still NEVER decrypts.
 */
router.get("/shared", async (req: Request, res: Response) => {
  try {
    const { patientWallet, requesterWallet, resourceId = "profile", scope = "read" } = req.query;

    if (!patientWallet || !requesterWallet) {
      return res.status(400).json({
        error: "patientWallet and requesterWallet are required",
      });
    }

    // Verify consent on Midnight
    const { verifyConsentOnMidnight } = await import("../midnight/midnightClient");
    
    const hasConsent = await verifyConsentOnMidnight({
      patientWallet: patientWallet as string,
      requesterWallet: requesterWallet as string,
      resourceId: resourceId as string,
      scope: scope as string,
    });

    if (!hasConsent) {
      return res.status(403).json({
        error: "Access denied",
        message: "No valid consent found for this request",
      });
    }

    // Consent verified - get patient's role and return encrypted profile
    const userResult = await query(
      "SELECT role FROM public.users WHERE wallet_address = $1",
      [patientWallet]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const role = userResult.rows[0].role as UserRole;
    const profileTable = getProfileTableName(role);

    const result = await query(
      `SELECT profile_cipher FROM ${profileTable} WHERE wallet_address = $1`,
      [patientWallet]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Patient profile not found" });
    }

    const profileCipher = result.rows[0].profile_cipher;
    const cipherBase64 = profileCipher.toString("base64");

    // Return ciphertext (requester's frontend will decrypt)
    return res.json({
      ok: true,
      cipher: cipherBase64,
    });
  } catch (error) {
    console.error("Error in GET /api/profile/shared:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/profile/debug/users
 * Debug endpoint to list all users (for troubleshooting)
 * TODO: Remove or secure this in production
 */
router.get("/debug/users", async (req: Request, res: Response) => {
  try {
    const result = await query(
      "SELECT wallet_address, role, created_at, last_login FROM public.users ORDER BY created_at DESC LIMIT 50"
    );

    const users = result.rows.map((row) => ({
      walletAddress: row.wallet_address,
      role: row.role,
      createdAt: row.created_at,
      lastLogin: row.last_login,
    }));

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error in GET /api/profile/debug/users:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
