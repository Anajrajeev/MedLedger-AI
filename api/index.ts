/**
 * Vercel Serverless Function Entry Point
 * 
 * This file is used by Vercel to handle all /api/* routes as serverless functions.
 * It imports and exports the Express app from src/index.ts.
 */

import app from '../src/index';

export default app;

