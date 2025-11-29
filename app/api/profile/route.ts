/**
 * POST /api/profile
 * 
 * Purpose: Create or update encrypted user profile during registration
 * 
 * Expected JSON body:
 * {
 *   "walletAddress": "addr1...",
 *   "username": "John",
 *   "email": "john@example.com",
 *   "phone": "9999999999",
 *   "gender": "Male",
 *   "age": "21"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { encryptProfile } from "@/lib/crypto/profileEncryption";

interface ProfileRequest {
  walletAddress: string;
  username?: string;
  email?: string;
  phone?: string;
  gender?: string;
  age?: string;
  [key: string]: any; // Allow additional profile fields
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ProfileRequest = await request.json();

    // Validate required fields
    if (!body.walletAddress || body.walletAddress.trim() === "") {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    const walletAddress = body.walletAddress.trim();

    // Build profile object (exclude walletAddress from profile data)
    const { walletAddress: _, ...profileData } = body;

    // Validate profile has at least one field
    if (Object.keys(profileData).length === 0) {
      return NextResponse.json(
        { error: "Profile must contain at least one field" },
        { status: 400 }
      );
    }

    // Encrypt profile
    let profileCipher: Buffer;
    try {
      profileCipher = encryptProfile(profileData);
    } catch (encryptError) {
      console.error("Failed to encrypt profile:", encryptError);
      return NextResponse.json(
        { error: "Failed to encrypt profile data" },
        { status: 500 }
      );
    }

    // Upsert into database
    // ON CONFLICT updates existing record, otherwise inserts new one
    await query(
      `INSERT INTO public.users (wallet_address, profile_cipher)
       VALUES ($1, $2)
       ON CONFLICT (wallet_address)
       DO UPDATE SET 
         profile_cipher = EXCLUDED.profile_cipher,
         last_login = NOW()`,
      [walletAddress, profileCipher]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in POST /api/profile:", error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

