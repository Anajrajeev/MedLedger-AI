/**
 * Express Server
 * 
 * Privacy-preserving healthcare platform backend.
 * Backend NEVER decrypts data - only stores/retrieves ciphertext.
 */

import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { resolve } from "path";
import profileRouter from "./routes/profile";
import permissionsRouter from "./routes/permissions";
import registerRoleRouter from "./routes/register-role";
import doctorContactsRouter from "./routes/doctor-contacts";
import accessRouter from "./routes/access";
import savedPatientsRouter from "./routes/savedPatients";
import publicProfileRouter from "./routes/public-profile";
import recordsRouter from "./routes/records";
import agentRoutes from "./routes/agentRoutes";
import accessGrantRouter from "./routes/access-grant";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "MedLedger AI Backend" });
});

// Routes
app.use("/api/profile", profileRouter);
app.use("/api/permissions", permissionsRouter);
app.use("/api/register-role", registerRoleRouter);
app.use("/api/doctor-contacts", doctorContactsRouter);
app.use("/api/access", accessRouter);
app.use("/api/saved-patients", savedPatientsRouter);
app.use("/api/public-profile", publicProfileRouter);
app.use("/api/records", recordsRouter);
app.use("/api/agents", agentRoutes);
app.use("/api/access", accessGrantRouter); // Mounts /grant-file and /view-granted-file under /api/access

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MedLedger AI Backend running on http://localhost:${PORT}`);
  console.log(`📡 Profile API: http://localhost:${PORT}/api/profile`);
  console.log(`🔐 Permissions API: http://localhost:${PORT}/api/permissions`);
  console.log(`👤 Register Role API: http://localhost:${PORT}/api/register-role`);
  console.log(`👨‍⚕️ Doctor Contacts API: http://localhost:${PORT}/api/doctor-contacts`);
  console.log(`🔓 Access Requests API: http://localhost:${PORT}/api/access`);
  console.log(`💾 Saved Patients API: http://localhost:${PORT}/api/saved-patients`);
  console.log(`👁️ Public Profile API: http://localhost:${PORT}/api/public-profile`);
  console.log(`📁 Records API: http://localhost:${PORT}/api/records`);
  console.log(`🤖 Agents API: http://localhost:${PORT}/api/agents`);
});

