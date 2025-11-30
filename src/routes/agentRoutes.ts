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
import multer from "multer";
import FormDataLib from "form-data";
import axios from "axios";

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

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
 * 
 * Explainer Agent expects: { identifierFromPurchaser, input_data: { patient_id, record_text, metadata } }
 * Appointment Agent expects: { identifierFromPurchaser, input_data: { user_request, pincode, patient_info } }
 * 
 * Required fields for Explainer Agent:
 * - patient_id: string (optional)
 * - record_text: string (the medical record or text to analyze)
 * - metadata: { timestamp, source } (optional)
 * 
 * Required fields for Appointment Agent:
 * - user_request: string
 * - pincode: string (5-6 digits)
 * - patient_info: { name: string, age: number, location: string }
 */
function transformInputForAgent(input: any, agentType: string): any {
  // Generate a unique identifier for this request
  const identifier = `medledger-${agentType}-${Date.now()}`;
  
  // Explainer agent has a different format
  if (agentType === "explainer") {
    // Explainer agent expects: { identifierFromPurchaser, input_data: { patient_id, record_text, metadata } }
    // NOTE: patient_id is REQUIRED by the API schema
    const inputData: any = {};
    
    // Extract record_text from various input formats (REQUIRED)
    if (input.record_text) {
      inputData.record_text = input.record_text;
    } else if (input.text) {
      inputData.record_text = input.text;
    } else if (input.query) {
      inputData.record_text = input.query;
    } else if (input.user_request) {
      inputData.record_text = input.user_request;
    } else {
      inputData.record_text = "Please provide medical information to analyze.";
    }
    
    // patient_id is REQUIRED by the API - always include it
    // Use provided value, or extract from patient_info, or generate a default
    inputData.patient_id = input.patient_id 
      || input.patient_info?.patient_id 
      || `P-${Date.now().toString().slice(-8)}`; // Generate unique patient ID
    
    // Optional metadata
    if (input.metadata) {
      inputData.metadata = input.metadata;
    } else {
      inputData.metadata = {
        timestamp: Math.floor(Date.now() / 1000),
        source: "medledger"
      };
    }
    
    return {
      identifierFromPurchaser: identifier,
      input_data: inputData,
    };
  }
  
  // Base input_data structure for other agents
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
    // Explainer agent uses /start_job endpoint (confirmed from example)
    const cleanBase = baseUrl.replace(/\/api\/v1$/, "");
    endpointPatterns.push(
      `${cleanBase}/start_job`,  // Primary endpoint (confirmed working)
      `${cleanBase}/api/v1/start_job`,  // Alternative pattern
      `${cleanBase}/api/v1`,  // Fallback
      `${cleanBase}/api/v1/explain`,  // Fallback
      `${cleanBase}/explain`,  // Fallback
    );
  } else {
    // Default: try /start_job at root
    const cleanBase = baseUrl.replace(/\/api\/v1$/, "");
    endpointPatterns.push(`${cleanBase}/start_job`);
  }
  
  // Determine request formats based on agent type and endpoint
  // /start_job endpoints always need full format with identifierFromPurchaser and input_data
  const getRequestFormats = (endpoint: string, agentType: string) => {
    // If endpoint contains /start_job, use full format only (required by the API)
    if (endpoint.includes("/start_job")) {
      return [transformedInput];
    }
    
    // For explainer agent on non-/start_job endpoints, try full format first (it's the standard)
    if (agentType === "explainer") {
      return [transformedInput]; // Always use full format for explainer
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
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        try {
          // Try without query parameter first (standard approach)
          const response = await fetch(jobEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

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
        
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          // Handle timeout
          if (fetchError.name === "AbortError") {
            console.log(`[Agent Service] Endpoint ${jobEndpoint} timed out after 30 seconds`);
            lastError = new Error(`Timeout: Endpoint ${jobEndpoint} did not respond within 30 seconds. The service may be down or slow.`);
            continue; // Try next endpoint
          }
          
          // Re-throw the fetch error to be handled by outer catch
          throw fetchError;
        }
      } catch (error: any) {
        // Network errors or other fetch errors
        if (error.name === "AbortError") {
          // Already handled above, but just in case
          lastError = new Error(`Timeout connecting to ${jobEndpoint}`);
          continue;
        } else if (error.code === "ENOTFOUND" || error.message?.includes("getaddrinfo")) {
          console.log(`[Agent Service] DNS error for ${jobEndpoint}: ${error.message}`);
          lastError = new Error(`Cannot resolve hostname for ${jobEndpoint}. Check if the URL is correct.`);
          continue; // Try next endpoint
        } else if (error.message && error.message.includes("Agent service returned")) {
          // HTTP error from above - already logged, try next endpoint
          lastError = error;
          continue;
        } else {
          // Other network errors - log and try next endpoint
          console.error(`[Agent Service] ${agentType} network error at ${jobEndpoint}:`, error.message);
          lastError = new Error(`Network error: ${error.message}`);
          continue; // Try next endpoint/format
        }
      }
    }
  }
  
  // All endpoints failed
  console.error(`[Agent Service] All endpoint patterns failed for ${agentType}`);
  const errorDetails = lastError ? ` Last error: ${lastError.message}` : "";
  throw new Error(
    `Agent endpoint not found or unreachable. Tried: ${endpointPatterns.join(", ")}.${errorDetails} ` +
    `Make sure ${agentType.toUpperCase()}_AGENT_ENDPOINT in .env.local is set correctly ` +
    `and the agent service is running and accessible.`
  );
}

/**
 * Format agent response consistently
 */
function formatAgentResponse(result: any, agentType: string) {
  // Extract the actual result from the job response
  // Explainer agent returns: { job_id, status, result: { summary, key_findings, confidence_estimate, risk_prediction, validation_result } }
  // Other agents may return similar structure
  
  if (result.result) {
    // For explainer agent, preserve the full structure including risk_prediction
    if (agentType === "explainer") {
      return {
        success: true,
        job_id: result.job_id || result.id,
        status: result.status,
        blockchainIdentifier: result.blockchainIdentifier || "",
        agentIdentifier: result.agentIdentifier || "",
        identifierFromPurchaser: result.identifierFromPurchaser || "",
        // Spread the actual agent result (summary, key_findings, confidence_estimate, risk_prediction, validation_result)
        ...result.result,
      };
    }
    
    // For other agents, return the actual agent result wrapped in a success response
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
 * Text-based explainer agent
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
 * POST /api/agents/explainer/upload-pdf
 * PDF upload for explainer agent
 */
router.post("/explainer/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    const endpoint = AGENT_ENDPOINTS.explainer;
    
    if (!endpoint) {
      console.log("[Agents] Explainer PDF - No endpoint configured");
      return res.status(400).json({
        success: false,
        error: "Explainer agent endpoint not configured",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No PDF file provided",
      });
    }

    // Get patient_id from form data or generate default
    const patientId = req.body.patient_id || `P-${Date.now().toString().slice(-8)}`;

    console.log(`[Agents] Explainer PDF - Uploading to: ${endpoint}/upload_pdf`);
    console.log(`[Agents] Explainer PDF - File: ${req.file.originalname}, Size: ${req.file.size} bytes`);
    console.log(`[Agents] Explainer PDF - Patient ID: ${patientId}`);

    // Forward the request to the agent service
    const uploadUrl = `${endpoint.replace(/\/+$/, "")}/upload_pdf`;
    console.log(`[Agents] Explainer PDF - Sending to: ${uploadUrl}`);
    console.log(`[Agents] Explainer PDF - File: ${req.file.originalname}, Size: ${req.file.size} bytes, Patient ID: ${patientId}`);
    
    // Create form data using form-data package
    const formData = new FormDataLib();
    
    // Append file - form-data package expects Buffer and options
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname || "document.pdf",
      contentType: req.file.mimetype || "application/pdf",
    });
    
    // Append patient_id as text
    formData.append("patient_id", patientId);

    // Get headers from form-data (includes Content-Type with boundary)
    const headers = formData.getHeaders();
    console.log(`[Agents] Explainer PDF - Content-Type: ${headers['content-type']}`);
    console.log(`[Agents] Explainer PDF - Boundary: ${headers['content-type']?.split('boundary=')[1]}`);
    
    // Use axios for better form-data support
    // Axios automatically handles form-data streams - don't transform it
    try {
      const response = await axios.post(uploadUrl, formData, {
        headers: headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000, // 60 second timeout
      });

      const result = response.data;
    console.log(`[Agents] Explainer PDF - Success`);
    
    // Format the response consistently
    const formattedResult = formatAgentResponse(result, "explainer");
    res.json(formattedResult);
    } catch (axiosError: any) {
      // Handle axios errors
      if (axiosError.response) {
        // Server responded with error
        const errorText = axiosError.response.data?.detail || JSON.stringify(axiosError.response.data);
        console.error(`[Agents] Explainer PDF - Axios error response (${axiosError.response.status}):`, errorText);
        throw new Error(`Agent service returned ${axiosError.response.status}: ${errorText.substring(0, 200)}`);
      } else if (axiosError.request) {
        // Request made but no response
        console.error(`[Agents] Explainer PDF - Axios no response:`, axiosError.message);
        throw new Error(`No response from agent service: ${axiosError.message}`);
      } else {
        // Error setting up request
        console.error(`[Agents] Explainer PDF - Axios setup error:`, axiosError.message);
        throw axiosError;
      }
    }
  } catch (err: any) {
    console.error("[Agents] Explainer PDF error:", err.message);
    console.error("[Agents] Explainer PDF error stack:", err.stack);
    
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to upload PDF to explainer agent",
      message: `Explainer agent PDF upload error: ${err.message}. Check backend logs for details.`,
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
 * Insurance agent query endpoint
 */
router.post("/insurance", async (req, res) => {
  try {
    const endpoint = AGENT_ENDPOINTS.insurance;
    
    if (!endpoint) {
      console.log("[Agents] Insurance - No endpoint configured, using stub");
      return res.json(getStubResponse("insurance", req.body));
    }

    // Insurance agent uses /ask endpoint with query and conversation_id
    const query = req.body.query || req.body.user_request || req.body.text || "";
    const conversationId = req.body.conversation_id || `session-${Date.now()}`;

    const queryUrl = `${endpoint.replace(/\/+$/, "")}/ask?Content-Type=application/json`;
    console.log(`[Agents] Insurance - Query URL: ${queryUrl}`);
    console.log(`[Agents] Insurance - Query: ${query}, Conversation ID: ${conversationId}`);

    const response = await fetch(queryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query,
        conversation_id: conversationId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Insurance agent returned ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();
    console.log(`[Agents] Insurance - Success`);
    
    // Return the result as-is (it has answer, sources, status, conversation_id)
    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("[Agents] Insurance error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to call insurance agent",
      message: `Insurance agent service error: ${err.message}. Check backend logs for details.`,
      fallback: getStubResponse("insurance", req.body),
    });
  }
});

/**
 * POST /api/agents/insurance/upload-document
 * Upload document to insurance agent knowledge base
 */
router.post("/insurance/upload-document", upload.single("file"), async (req, res) => {
  try {
    const endpoint = AGENT_ENDPOINTS.insurance;
    
    if (!endpoint) {
      console.log("[Agents] Insurance PDF - No endpoint configured");
      return res.status(400).json({
        success: false,
        error: "Insurance agent endpoint not configured",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No PDF file provided",
      });
    }

    // Get optional document_name from form data
    const documentName = req.body.document_name || req.file.originalname.replace(/\.pdf$/i, "");

    console.log(`[Agents] Insurance PDF - Uploading to: ${endpoint}/upload_document`);
    console.log(`[Agents] Insurance PDF - File: ${req.file.originalname}, Size: ${req.file.size} bytes`);
    console.log(`[Agents] Insurance PDF - Document Name: ${documentName}`);

    // Create form data to forward to the agent service
    const formData = new FormDataLib();
    
    // Append file
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname || "document.pdf",
      contentType: req.file.mimetype || "application/pdf",
    });
    
    // Append optional document_name
    if (documentName) {
      formData.append("document_name", documentName);
    }

    // Get headers from form-data
    const headers = formData.getHeaders();
    console.log(`[Agents] Insurance PDF - Content-Type: ${headers['content-type']}`);
    
    // Use axios for form-data support
    try {
      const uploadUrl = `${endpoint.replace(/\/+$/, "")}/upload_document`;
      const response = await axios.post(uploadUrl, formData, {
        headers: headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000, // 60 second timeout
      });

      const result = response.data;
      console.log(`[Agents] Insurance PDF - Success`);
      
      res.json({
        success: true,
        message: "Document uploaded successfully and added to knowledge base",
        ...result,
      });
    } catch (axiosError: any) {
      // Handle axios errors
      if (axiosError.response) {
        const errorText = axiosError.response.data?.detail || JSON.stringify(axiosError.response.data);
        console.error(`[Agents] Insurance PDF - Axios error response (${axiosError.response.status}):`, errorText);
        throw new Error(`Agent service returned ${axiosError.response.status}: ${errorText.substring(0, 200)}`);
      } else if (axiosError.request) {
        console.error(`[Agents] Insurance PDF - Axios no response:`, axiosError.message);
        throw new Error(`No response from agent service: ${axiosError.message}`);
      } else {
        console.error(`[Agents] Insurance PDF - Axios setup error:`, axiosError.message);
        throw axiosError;
      }
    }
  } catch (err: any) {
    console.error("[Agents] Insurance PDF error:", err.message);
    console.error("[Agents] Insurance PDF error stack:", err.stack);
    
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to upload document to insurance agent",
      message: `Insurance agent document upload error: ${err.message}. Check backend logs for details.`,
    });
  }
});

export default router;
