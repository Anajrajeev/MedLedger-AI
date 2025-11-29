/**
 * Address formatting utilities for Cardano addresses
 */

// Note: bech32 conversion removed due to length limits
// Cardano addresses from CIP-30 need proper decoding with @emurgo/cardano-serialization-lib

/**
 * Format hex address for better readability
 * Note: Cardano addresses from CIP-30 are returned as hex-encoded bytes.
 * Converting to bech32 requires proper Cardano address decoding which needs
 * @emurgo/cardano-serialization-lib. For now, we format the hex nicely.
 */
export function formatHexAddress(hexAddress: string): string {
  if (!hexAddress) return "";
  
  // Remove any whitespace
  const cleanHex = hexAddress.replace(/\s+/g, "");
  
  // If it's already in bech32 format, return as is
  if (cleanHex.startsWith("addr1") || cleanHex.startsWith("addr_test1")) {
    return cleanHex;
  }
  
  // Format hex with spaces every 4 characters for better readability
  // Group in lines of 8 groups (32 chars) for multi-line display
  const grouped = cleanHex.match(/.{1,4}/g)?.join(" ") || cleanHex;
  
  // Split into chunks of 32 characters (8 groups of 4) for better readability
  const chunks: string[] = [];
  const parts = grouped.split(" ");
  for (let i = 0; i < parts.length; i += 8) {
    chunks.push(parts.slice(i, i + 8).join(" "));
  }
  
  return chunks.join("\n");
}


/**
 * Shorten address for display (shows first 8 and last 6 characters)
 */
export function shortenAddress(address: string | null, length: number = 8): string {
  if (!address) return "";
  
  // Remove whitespace first
  const cleanAddress = address.replace(/\s+/g, "").trim();
  
  // If it's a bech32 address, use that format
  if (cleanAddress.startsWith("addr1") || cleanAddress.startsWith("addr_test1")) {
    if (cleanAddress.length <= length * 2 + 3) return cleanAddress;
    // For bech32, show first and last parts
    return `${cleanAddress.slice(0, length)}…${cleanAddress.slice(-length)}`;
  }
  
  // For hex addresses
  if (cleanAddress.length <= length * 2) return cleanAddress;
  return `${cleanAddress.slice(0, length)}…${cleanAddress.slice(-length)}`;
}

/**
 * Check if address is in bech32 format
 */
export function isBech32Address(address: string): boolean {
  return address.startsWith("addr1") || address.startsWith("addr_test1");
}

/**
 * Format address for display
 * Eternl returns addresses in bech32 format (addr1... or addr_test1...)
 * If it's hex, we format it nicely. If it's already bech32, we display it as-is.
 */
export function formatAddressForDisplay(
  address: string | null,
  isTestnet: boolean = false
): string {
  if (!address) return "";
  
  // Remove any whitespace/newlines first
  const cleanAddress = address.replace(/\s+/g, "").trim();
  
  // If already bech32, return as is (this is what Eternl returns)
  if (isBech32Address(cleanAddress)) {
    return cleanAddress;
  }
  
  // Format hex address nicely (grouped and multi-line for readability)
  // This is a fallback if somehow we get hex instead of bech32
  return formatHexAddress(cleanAddress);
}

