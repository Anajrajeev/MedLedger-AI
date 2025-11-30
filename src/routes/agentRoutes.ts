/**
 * Agent Routes
 * 
 * Backend routes for AI agents following Masumi Network architecture
 * 
 * CORRECTED ARCHITECTURE (based on Masumi docs):
 * 1. Masumi Payment Service = Handles payments & identity (NOT agent invocation)
 * 2. Your Agent Services = Separate services that do the actual AI work
 * 3. Integration = Optional Masumi for payments, agents work independently
 * 
 * See: https://docs.masumi.network/documentation
 * See: https://docs.masumi.network/core-concepts
 * See: https://docs.masumi.network/technical-documentation/agentic-service-api
 */

import { Router } from "express";

const router = Router();

// Your actual agent service endpoints (where your AI agents are deployed)
const AGENT_ENDPOINTS = {
  explainer: process.env.EXPLAINER_AGENT_ENDPOINT || null,
  appointment: process.env.APPOINTMENT_AGENT_ENDPOINT || null,
  insurance: process.env.INSURANCE_AGENT_ENDPOINT || null,
};

/**
 * Development stub responses
 * Used when agent services are not deployed yet
 */
function getStubResponse(agentType: string, input: any) {
  const timestamp = new Date().toISOString();
  
  const responses = {
    explainer: {
      success: true,
      agent: "Explainer Agent",
      message: "Medical terminology translation service",
      explanation: `Based on your query: "${input.query || 'No query provided'}"
      
I can help translate complex medical terms into simple language. For example:
- "Hypertension" = High blood pressure
- "Myocardial infarction" = Heart attack
- "Cerebrovascular accident" = Stroke

💡 This is a simulated response. To enable real AI:
1. Deploy your agent service (using CrewAI, AutoGen, LangGraph, etc.)
2. Set EXPLAINER_AGENT_ENDPOINT in .env.local
3. Optionally integrate Masumi for payments`,
      timestamp,
      developmentMode: true,
    },
    appointment: {
      success: true,
      agent: "Appointment Agent",
      message: "Appointment scheduling and management service",
      suggestion: `Based on your request: "${input.query || 'No query provided'}"

I can help you:
- Schedule appointments with healthcare providers
- Find optimal appointment times
- Send appointment reminders
- Coordinate with multiple providers

💡 This is a simulated response. To enable real AI:
1. Deploy your agent service
2. Set APPOINTMENT_AGENT_ENDPOINT in .env.local
3. Optionally integrate Masumi for payments`,
      timestamp,
      developmentMode: true,
    },
    insurance: {
      success: true,
      agent: "Insurance Agent",
      message: "Insurance assistance service",
      assistance: `Based on your inquiry: "${input.query || 'No query provided'}"

I can help you with:
- Understanding your insurance coverage
- Estimating treatment costs
- Filing and tracking claims
- Verifying benefits

💡 This is a simulated response. To enable real AI:
1. Deploy your agent service
2. Set INSURANCE_AGENT_ENDPOINT in .env.local
3. Optionally integrate Masumi for payments`,
      timestamp,
      developmentMode: true,
    },
  };
  
  return responses[agentType as keyof typeof responses];
}

/**
 * Transform input to match agent service format
 * Your agents expect: { identifierFromPurchaser, input_data: { user_request, pincode, patient_info } }
 * 
 * Required fields for Appointment Agent:
 * - user_request: string
 * - pincode: string (5-6 digits)
 * - patient_info: { name: string, age: number, location: string }
 */
function transformInputForAgent(input: any, agentType: string): any {
  // Generate a unique identifier for this request
  const identifier = `medledger-${agentType}-${Date.now()}`;
  
  // Base input_data structure
  const inputData: any = {
    user_request: input.query || input.user_request || input.text || "Please help me with healthcare information.",
  };
  
  // Appointment agent requires specific fields
  if (agentType === "appointment") {
    // Required: pincode (5-6 digits)
    // Use provided pincode, or extract from patient_info, or use default
    inputData.pincode = input.pincode || input.patient_info?.pincode || "10001";
    
    // Required: patient_info with name, age, location
    // Merge provided patient_info with any additional fields from input
    inputData.patient_info = {
      name: input.patient_info?.name || input.name || "Patient",
      age: input.patient_info?.age || input.age || 35,
      location: input.patient_info?.location || input.location || "New York, NY",
      // Include additional fields if provided
      ...(input.patient_info?.city && { city: input.patient_info.city }),
      ...(input.patient_info?.state && { state: input.patient_info.state }),
      ...(input.patient_info?.country && { country: input.patient_info.country }),
      ...(input.city && { city: input.city }),
      ...(input.state && { state: input.state }),
      ...(input.country && { country: input.country }),
      // Optional fields
      ...(input.patient_info?.dob || input.dob ? { dob: input.patient_info?.dob || input.dob } : {}),
      ...(input.patient_info?.symptoms || input.symptoms ? { symptoms: input.patient_info?.symptoms || input.symptoms } : {}),
      ...(input.patient_info?.preferred_date || input.preferred_date ? { preferred_date: input.patient_info?.preferred_date || input.preferred_date } : {}),
      ...(input.patient_info?.preferred_time || input.preferred_time ? { preferred_time: input.patient_info?.preferred_time || input.preferred_time } : {}),
      ...(input.patient_info?.phone || input.phone ? { phone: input.patient_info?.phone || input.phone } : {}),
      ...(input.patient_info?.email || input.email ? { email: input.patient_info?.email || input.email } : {}),
    };
    
    // Optional: hospital_id
    if (input.hospital_id || input.patient_info?.hospital_id) {
      inputData.hospital_id = input.hospital_id || input.patient_info?.hospital_id;
    }
  } else {
    // For other agents, include fields if provided
    if (input.pincode) inputData.pincode = input.pincode;
    if (input.patient_info) inputData.patient_info = input.patient_info;
    if (input.location) inputData.location = input.location;
  }
  
  // Always return full format (required for /start_job endpoints)
  return {
    identifierFromPurchaser: identifier,
    input_data: inputData,
  };
}

/**
 * Call your actual agent service
 * Different agents may have different endpoint structures
 */
async function callAgentService(endpoint: string, input: any, agentType: string) {
  // Clean up the endpoint URL
  let baseUrl = endpoint.replace(/\/+$/, ""); // Remove trailing slashes
  
  // Transform input to match agent's expected format
  const transformedInput = transformInputForAgent(input, agentType);
  
  // Try multiple endpoint patterns for different agent types
  const endpointPatterns: string[] = [];
  
  if (agentType === "appointment") {
    // Appointment agent uses /start_job at root
    const cleanBase = baseUrl.replace(/\/api\/v1$/, "");
    endpointPatterns.push(`${cleanBase}/start_job`);
  } else if (agentType === "explainer") {
    // Explainer agent - try multiple patterns
    const cleanBase = baseUrl.replace(/\/api\/v1$/, "");
    endpointPatterns.push(
      `${cleanBase}/api/v1`,  // Try /api/v1 directly
      `${cleanBase}/api/v1/explain`,  // Try /api/v1/explain
      `${cleanBase}/explain`,  // Try /explain at root
      `${cleanBase}/api/v1/start_job`,  // Try /api/v1/start_job
      `${cleanBase}/start_job`,  // Try /start_job at root
    );
  } else {
    // Default: try /start_job at root
    const cleanBase = baseUrl.replace(/\/api\/v1$/, "");
    endpointPatterns.push(`${cleanBase}/start_job`);
  }
  
  // Determine request formats based on agent type and endpoint
  // /start_job endpoints always need full format, others might accept simple format
  const getRequestFormats = (endpoint: string, agentType: string) => {
    // If endpoint contains /start_job, use full format only (required by the API)
    if (endpoint.includes("/start_job")) {
      return [transformedInput];
    }
    
    // For explainer agent on non-/start_job endpoints, try simple format first, then full
    if (agentType === "explainer") {
      const userRequest = input.query || input.user_request || input.text || "Please help me with healthcare information.";
      return [
        { query: userRequest }, // Simple format
        transformedInput, // Full format
      ];
    }
    
    // For other agents, use the transformed input as-is
    return [transformedInput];
  };
  
  // Try each endpoint pattern and request format until one works
  let lastError: Error | null = null;
  
  for (const jobEndpoint of endpointPatterns) {
    const requestFormats = getRequestFormats(jobEndpoint, agentType);
    
    for (const requestBody of requestFormats) {
      try {
        console.log(`[Agent Service] Trying ${agentType} agent at: ${jobEndpoint}`);
        console.log(`[Agent Service] Request body:`, JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(`${jobEndpoint}?Content-Type=application/json`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[Agent Service] ${agentType} responded successfully at: ${jobEndpoint}`);
          return formatAgentResponse(result, agentType);
        }
        
        const errorText = await response.text();
        
        // 422 = Validation error (wrong format) - try next request format if available
        if (response.status === 422) {
          console.log(`[Agent Service] Endpoint ${jobEndpoint} returned 422 (validation error - wrong format): ${errorText.substring(0, 300)}`);
          lastError = new Error(`Bad request format for ${jobEndpoint}`);
          continue; // Try next request format
        }
        
        // 400 = Bad request - try next request format if available
        if (response.status === 400) {
          console.log(`[Agent Service] Endpoint ${jobEndpoint} returned 400 (bad request): ${errorText.substring(0, 300)}`);
          lastError = new Error(`Bad request format for ${jobEndpoint}`);
          continue; // Try next request format
        }
        
        // 404 - try next endpoint
        if (response.status === 404) {
          console.log(`[Agent Service] Endpoint ${jobEndpoint} returned 404: ${errorText.substring(0, 200)}`);
          lastError = new Error(`Endpoint not found: ${jobEndpoint}`);
          break; // Try next endpoint (don't try other formats for this endpoint)
        }
        
        // Other errors (500, etc.) - throw immediately
        throw new Error(`Agent service returned ${response.status}: ${errorText.substring(0, 200)}`);
        
      } catch (error: any) {
        // Network errors or non-retryable HTTP errors - throw immediately
        if (error.message && 
            !error.message.includes("404") && 
            !error.message.includes("Not Found") && 
            !error.message.includes("400") &&
            !error.message.includes("422")) {
          console.error(`[Agent Service] ${agentType} error at ${jobEndpoint}:`, error.message);
          throw error;
        }
        lastError = error;
        continue; // Try next endpoint/format
      }
    }
  }
  
  // All endpoints failed
  console.error(`[Agent Service] All endpoint patterns failed for ${agentType}`);
  throw new Error(
    `Agent endpoint not found. Tried: ${endpointPatterns.join(", ")}. ` +
    `Make sure ${agentType.toUpperCase()}_AGENT_ENDPOINT in .env.local is set correctly ` +
    `and the agent service is running.`
  );
}

/**
 * Format agent response consistently
 */
function formatAgentResponse(result: any, agentType: string) {
  // Extract the actual result from the job response
  // Your agent returns: { job_id, status, result: { ...actual_agent_response... } }
  if (result.result) {
    // Return the actual agent result wrapped in a success response
    return {
      success: true,
      job_id: result.job_id || result.id,
      status: result.status,
      ...result.result, // Spread the actual agent response
    };
  }
  
  // If result is directly in the response, return it
  return {
    success: true,
    ...result,
  };
}

/**
 * POST /api/agents/explainer
 */
router.post("/explainer", async (req, res) => {
  try {
    const endpoint = AGENT_ENDPOINTS.explainer;
    
    if (!endpoint) {
      console.log("[Agents] Explainer - No endpoint configured, using stub");
      return res.json(getStubResponse("explainer", req.body));
    }

    console.log(`[Agents] Explainer - Endpoint configured: ${endpoint}`);
    const result = await callAgentService(endpoint, req.body, "explainer");
    res.json(result);
  } catch (err: any) {
    console.error("[Agents] Explainer error:", err.message);
    console.error("[Agents] Explainer error stack:", err.stack);
    
    // Return error response instead of stub so user knows what went wrong
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to call explainer agent",
      message: `Explainer agent service error: ${err.message}. Check backend logs for details.`,
      fallback: getStubResponse("explainer", req.body),
    });
  }
});

/**
 * POST /api/agents/appointment
 */
router.post("/appointment", async (req, res) => {
  try {
    const endpoint = AGENT_ENDPOINTS.appointment;
    
    if (!endpoint) {
      console.log("[Agents] Appointment - No endpoint configured, using stub");
      return res.json(getStubResponse("appointment", req.body));
    }

    const result = await callAgentService(endpoint, req.body, "appointment");
    res.json(result);
  } catch (err: any) {
    console.error("[Agents] Appointment error:", err.message);
    return res.json(getStubResponse("appointment", req.body));
  }
});

/**
 * POST /api/agents/insurance
 */
router.post("/insurance", async (req, res) => {
  try {
    const endpoint = AGENT_ENDPOINTS.insurance;
    
    if (!endpoint) {
      console.log("[Agents] Insurance - No endpoint configured, using stub");
      return res.json(getStubResponse("insurance", req.body));
    }

    const result = await callAgentService(endpoint, req.body, "insurance");
    res.json(result);
  } catch (err: any) {
    console.error("[Agents] Insurance error:", err.message);
    return res.json(getStubResponse("insurance", req.body));
  }
});

export default router;
