/**
 * API Configuration
 * 
 * Centralized configuration for backend API endpoints
 */

// Backend server URL (Express server)
// Use explicit fallback to ensure it's never undefined
const envApiUrl = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL;
export const API_URL = envApiUrl && envApiUrl !== "undefined" 
  ? envApiUrl 
  : "http://localhost:4000";

// Alias for backward compatibility
export const API_BASE_URL = API_URL;

/**
 * Get full API URL for an endpoint
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  return `${API_URL}/${cleanEndpoint}`;
}

