/**
 * GET /api/profile/[walletAddress]
 * 
 * Purpose: Check if wallet address exists and return decrypted profile
 * Enables auto-login when wallet connects
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { decryptProfile } from "@/lib/crypto/profileEncryption";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ walletAddress: string }> | { walletAddress: string } }
) {
  try {
    // Handle both sync and async params (Next.js 14+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const walletAddress = resolvedParams.walletAddress;

    // Validate wallet address
    if (!walletAddress || walletAddress.trim() === "") {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Clean the wallet address (remove whitespace)
    const cleanAddress = walletAddress.trim();

    // Query database for user
    const result = await query(
      "SELECT profile_cipher FROM public.users WHERE wallet_address = $1",
      [cleanAddress]
    );

    // User not found
    if (result.rows.length === 0) {
      return NextResponse.json({ exists: false });
    }

    // User found - decrypt profile
    const profileCipher = result.rows[0].profile_cipher;

    if (!profileCipher) {
      return NextResponse.json(
        { error: "Profile data not found" },
        { status: 500 }
      );
    }

    // Decrypt profile
    let profile: Record<string, any>;
    try {
      profile = decryptProfile(profileCipher);
    } catch (decryptError) {
      console.error("Failed to decrypt profile:", decryptError);
      return NextResponse.json(
        { error: "Failed to decrypt profile data" },
        { status: 500 }
      );
    }

    // Update last_login timestamp
    await query(
      "UPDATE public.users SET last_login = NOW() WHERE wallet_address = $1",
      [cleanAddress]
    );

    // Return profile
    return NextResponse.json({
      exists: true,
      profile,
    });
  } catch (error) {
    console.error("Error in GET /api/profile/[walletAddress]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

