/**
 * Cardano Address Utilities
 * Handles conversion between hex and bech32 formats
 */

// Import will be loaded dynamically in browser
let CardanoWasm: any = null;

/**
 * Initialize the Cardano WASM library
 */
async function initCardanoWasm() {
  if (CardanoWasm) return CardanoWasm;
  
  try {
    CardanoWasm = await import('@emurgo/cardano-serialization-lib-browser');
    return CardanoWasm;
  } catch (err) {
    console.error('Failed to load Cardano WASM library:', err);
    throw new Error('Cardano library not available');
  }
}

/**
 * Convert hex address to bech32 format (addr1...)
 */
export async function hexToBech32(hexAddress: string): Promise<string> {
  try {
    const CSL = await initCardanoWasm();
    
    // Remove any whitespace
    const cleanHex = hexAddress.replace(/\s+/g, '').trim();
    
    // Convert hex string to bytes
    const addressBytes = Buffer.from(cleanHex, 'hex');
    
    // Parse as Cardano address
    const address = CSL.Address.from_bytes(addressBytes);
    
    // Convert to bech32
    const bech32 = address.to_bech32();
    
    console.log('[Address Conversion] Hex to Bech32:', {
      hex: cleanHex.substring(0, 20) + '...',
      bech32: bech32.substring(0, 30) + '...',
      hexLength: cleanHex.length,
      bech32Length: bech32.length,
    });
    
    return bech32;
  } catch (err) {
    console.error('[Address Conversion] Failed to convert hex to bech32:', err);
    throw new Error('Failed to convert address format');
  }
}

/**
 * Convert bech32 address to hex format
 */
export async function bech32ToHex(bech32Address: string): Promise<string> {
  try {
    const CSL = await initCardanoWasm();
    
    // Parse bech32 address
    const address = CSL.Address.from_bech32(bech32Address);
    
    // Convert to hex
    const addressBytes = address.to_bytes();
    const hex = Buffer.from(addressBytes).toString('hex');
    
    console.log('[Address Conversion] Bech32 to Hex:', {
      bech32: bech32Address.substring(0, 30) + '...',
      hex: hex.substring(0, 20) + '...',
      bech32Length: bech32Address.length,
      hexLength: hex.length,
    });
    
    return hex;
  } catch (err) {
    console.error('[Address Conversion] Failed to convert bech32 to hex:', err);
    throw new Error('Failed to convert address format');
  }
}

/**
 * Normalize address to bech32 format
 * If hex, convert to bech32. If already bech32, return as-is.
 */
export async function normalizeAddressToBech32(address: string): Promise<string> {
  const clean = address.replace(/\s+/g, '').trim();
  
  // Already bech32
  if (clean.startsWith('addr1') || clean.startsWith('addr_test1')) {
    return clean;
  }
  
  // Assume hex, convert to bech32
  return await hexToBech32(clean);
}

/**
 * Check if address is in bech32 format
 */
export function isBech32(address: string): boolean {
  return address.startsWith('addr1') || address.startsWith('addr_test1');
}

/**
 * Check if address is in hex format
 */
export function isHex(address: string): boolean {
  const clean = address.toLowerCase().replace(/^0x/, '');
  return /^[0-9a-f]+$/.test(clean) && clean.length > 50;
}

