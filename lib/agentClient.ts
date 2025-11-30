/**
 * Agent Client
 * 
 * Frontend client for invoking Masumi agents via backend
 */

import { API_URL } from "./api-config";

export interface AgentResponse {
  success?: boolean;
  result?: any;
  error?: string;
  [key: string]: any;
}

/**
 * Run Explainer Agent
 * 
 * @param input - Input data for the explainer agent (e.g., { text: "medical term" })
 * @returns Agent response
 */
export async function runExplainer(input: any): Promise<AgentResponse> {
  try {
    const res = await fetch(`${API_URL}/api/agents/explainer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to run explainer agent");
    }

    return await res.json();
  } catch (error: any) {
    console.error("[Agent Client] Explainer agent error:", error);
    throw error;
  }
}

/**
 * Run Appointment Agent
 * 
 * @param input - Input data for the appointment agent (e.g., { date: "2025-12-01", reason: "checkup" })
 * @returns Agent response
 */
export async function runAppointment(input: any): Promise<AgentResponse> {
  try {
    const res = await fetch(`${API_URL}/api/agents/appointment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to run appointment agent");
    }

    return await res.json();
  } catch (error: any) {
    console.error("[Agent Client] Appointment agent error:", error);
    throw error;
  }
}

/**
 * Run Insurance Agent
 * 
 * @param input - Input data for the insurance agent (e.g., { query: "coverage details", claimId: "123" })
 * @returns Agent response
 */
export async function runInsurance(input: any): Promise<AgentResponse> {
  try {
    const res = await fetch(`${API_URL}/api/agents/insurance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to run insurance agent");
    }

    return await res.json();
  } catch (error: any) {
    console.error("[Agent Client] Insurance agent error:", error);
    throw error;
  }
}

