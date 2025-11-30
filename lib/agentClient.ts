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
 * Run Explainer Agent (text input)
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
 * Run Explainer Agent with PDF upload
 * 
 * @param file - PDF file to upload
 * @param input - Additional input data (e.g., { patient_id: "P-001" })
 * @returns Agent response
 */
export async function runExplainerWithPDF(file: File, input: any): Promise<AgentResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    
    // Add patient_id if provided
    if (input.patient_id) {
      formData.append("patient_id", input.patient_id);
    } else {
      // Generate a default patient ID
      formData.append("patient_id", `P-${Date.now().toString().slice(-8)}`);
    }

    const res = await fetch(`${API_URL}/api/agents/explainer/upload-pdf`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to upload PDF to explainer agent");
    }

    return await res.json();
  } catch (error: any) {
    console.error("[Agent Client] Explainer agent PDF upload error:", error);
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
 * Run Insurance Agent (query)
 * 
 * @param input - Input data for the insurance agent (e.g., { query: "coverage details", conversation_id: "session-001" })
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

/**
 * Run Insurance Agent with PDF upload (add to knowledge base)
 * 
 * @param file - PDF file to upload
 * @param input - Additional input data (e.g., { document_name: "Insurance_Policy_2024" })
 * @returns Agent response
 */
export async function runInsuranceWithPDF(file: File, input: any): Promise<AgentResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    
    // Add optional document_name if provided
    if (input.document_name) {
      formData.append("document_name", input.document_name);
    }

    const res = await fetch(`${API_URL}/api/agents/insurance/upload-document`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to upload document to insurance agent");
    }

    return await res.json();
  } catch (error: any) {
    console.error("[Agent Client] Insurance agent PDF upload error:", error);
    throw error;
  }
}

