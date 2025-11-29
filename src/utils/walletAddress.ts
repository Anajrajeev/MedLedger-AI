// src/utils/walletAddress.ts

/**
 * Normalizes a Cardano wallet address by trimming whitespace.
 * 
 * IMPORTANT: Cardano addresses can be returned in two formats:
 * 1. Bech32 format: addr1... or addr_test1... (human-readable, 63-103 chars)
 * 2. Hex format: 0x... or raw hex (114+ characters)
 * 
 * The CIP-30 wallet API can return either format depending on the method:
 * - getUsedAddresses(): usually returns hex-encoded CBOR
 * - getUnusedAddresses(): usually returns hex-encoded CBOR  
 * - getChangeAddress(): usually returns bech32
 * 
 * Eternl seems to return raw hex (without 0x prefix) for getUsedAddresses(),
 * which is the CBOR-encoded address bytes.
 * 
 * For consistency, we need to:
 * - Always store the SAME format in the database
 * - Always query with the SAME format
 * 
 * Current decision: Store whatever format the wallet returns on first connection.
 * The issue is when the wallet returns DIFFERENT formats on reconnection.
 * 
 * @param address The wallet address string.
 * @returns The normalized wallet address (trimmed, no extra whitespace).
 */
export function normalizeWalletAddress(address: string): string {
  if (!address) return address;
  
  // Remove all whitespace and trim
  return address.replace(/\s+/g, '').trim();
}

/**
 * Checks if an address is in Bech32 format
 */
export function isBech32(address: string): boolean {
  return address.startsWith('addr1') || address.startsWith('addr_test1');
}

/**
 * Checks if an address is in hex format
 */
export function isHex(address: string): boolean {
  const clean = address.toLowerCase().replace(/^0x/, '');
  return /^[0-9a-f]+$/.test(clean) && clean.length > 50; // Cardano addresses are long
}

/**
 * Get address format type
 */
export function getAddressFormat(address: string): 'bech32' | 'hex' | 'unknown' {
  const normalized = normalizeWalletAddress(address);
  if (isBech32(normalized)) return 'bech32';
  if (isHex(normalized)) return 'hex';
  return 'unknown';
}
