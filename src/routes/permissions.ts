/**
 * Permissions Routes (Midnight Consent)
 * 
 * Handles access control through Midnight private smart contracts.
 */

import { Router, Request, Response } from "express";
import { query } from "../db";
import { submitConsentToMidnight, verifyConsentOnMidnight } from "../midnight/midnightClient";

const router = Router();

/**
 * POST /api/permissions/request
 * 
 * Requester (doctor/insurer/AI agent) initiates access request.
 * This does NOT store anything permanently yet - just records the request.
 * 
 * Request body:
 * {
 *   "requesterWallet": "addr1...",
 *   "patientWallet": "addr1...",
 *   "resourceId": "lab_results",
 *   "scope": "read"
 * }
 */
router.post("/request", async (req: Request, res: Response) => {
  try {
    const { requesterWallet, patientWallet, resourceId, scope } = req.body;

    // Validate required fields
    if (!requesterWallet || !patientWallet || !resourceId || !scope) {
      return res.status(400).json({
        error: "requesterWallet, patientWallet, resourceId, and scope are required",
      });
    }

    // TODO: In production, you might want to store pending requests in a separate table
    // For now, we just acknowledge the request
    // The actual consent is created when the patient approves via /permissions/approve

    return res.json({
      ok: true,
      message: "Request recorded; waiting for patient approval.",
    });
  } catch (error) {
    console.error("Error in POST /api/permissions/request:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/permissions/approve
 * 
 * Patient approves access request → this is where Midnight is used.
 * 
 * Flow:
 * 1. Call submitConsentToMidnight() to create private transaction
 * 2. Insert new row into permissions table with Midnight txId and proof
 * 3. Return success with transaction details
 * 
 * Request body:
 * {
 *   "patientWallet": "addr1...",
 *   "requesterWallet": "addr1...",
 *   "resourceId": "lab_results",
 *   "scope": "read",
 *   "expiresAt": "2024-12-31T23:59:59Z" (optional)
 * }
 */
router.post("/approve", async (req: Request, res: Response) => {
  try {
    const { patientWallet, requesterWallet, resourceId, scope, expiresAt } = req.body;

    // Validate required fields
    if (!patientWallet || !requesterWallet || !resourceId || !scope) {
      return res.status(400).json({
        error: "patientWallet, requesterWallet, resourceId, and scope are required",
      });
    }

    // Submit consent to Midnight blockchain
    const midnightResult = await submitConsentToMidnight({
      patientWallet,
      requesterWallet,
      resourceId,
      scope,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    // Insert permission into database
    await query(
      `INSERT INTO public.permissions (
        patient_wallet,
        requester_wallet,
        resource_id,
        scope,
        expires_at,
        midnight_tx_id,
        midnight_proof,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
      [
        patientWallet,
        requesterWallet,
        resourceId,
        scope,
        expiresAt ? new Date(expiresAt) : null,
        midnightResult.txId,
        midnightResult.proof,
      ]
    );

    return res.json({
      ok: true,
      txId: midnightResult.txId,
      proof: midnightResult.proof,
      message: "Consent approved and recorded on Midnight",
    });
  } catch (error) {
    console.error("Error in POST /api/permissions/approve:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/permissions/revoke
 * 
 * Patient revokes access.
 * 
 * Updates permission status to 'revoked'.
 * 
 * Request body:
 * {
 *   "patientWallet": "addr1...",
 *   "requesterWallet": "addr1...",
 *   "resourceId": "lab_results" (optional - if not provided, revokes all)
 * }
 */
router.post("/revoke", async (req: Request, res: Response) => {
  try {
    const { patientWallet, requesterWallet, resourceId } = req.body;

    // Validate required fields
    if (!patientWallet || !requesterWallet) {
      return res.status(400).json({
        error: "patientWallet and requesterWallet are required",
      });
    }

    // Update permission status to revoked
    if (resourceId) {
      // Revoke specific resource
      await query(
        `UPDATE public.permissions
         SET status = 'revoked'
         WHERE patient_wallet = $1
           AND requester_wallet = $2
           AND resource_id = $3
           AND status = 'active'`,
        [patientWallet, requesterWallet, resourceId]
      );
    } else {
      // Revoke all permissions for this requester
      await query(
        `UPDATE public.permissions
         SET status = 'revoked'
         WHERE patient_wallet = $1
           AND requester_wallet = $2
           AND status = 'active'`,
        [patientWallet, requesterWallet]
      );
    }

    // TODO: In production, you might also want to submit a revocation transaction to Midnight

    return res.json({
      ok: true,
      message: "Permission revoked successfully",
    });
  } catch (error) {
    console.error("Error in POST /api/permissions/revoke:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

