# Agent Endpoint Configuration

## ✅ Your Deployed Agent Services

Based on your question, these are your deployed agent endpoints:

### Appointment Agent
```
https://medledger-ai.onrender.com/api/v1
```

### Explainer Agent
```
https://explain-ai-zjrj.onrender.com/api/v1
```

## 🔧 Configuration Steps

### Step 1: Update `.env.local`

Add these lines to your `.env.local` file:

```env
# Your deployed agent services
EXPLAINER_AGENT_ENDPOINT=https://explain-ai-zjrj.onrender.com/api/v1
APPOINTMENT_AGENT_ENDPOINT=https://medledger-ai.onrender.com/api/v1
INSURANCE_AGENT_ENDPOINT=
```

### Step 2: Verify Endpoint Paths

Your agents might need a specific path. Common patterns:
- `/api/v1` (what you have)
- `/api/v1/invoke`
- `/api/v1/execute`
- `/invoke`
- `/`

**To check the correct path:**
1. Look at your agent service code
2. Check the route definitions
3. Or test with a simple request

### Step 3: Test the Endpoints

You can test if the endpoints work by checking:
- Do they accept POST requests?
- What's the expected request format?
- What's the response format?

### Step 4: Restart Backend

After updating `.env.local`:
```bash
npm run server:start
```

## 📝 Notes

- These are your **actual deployed agent services** on Render
- The code will now call these endpoints directly
- If an endpoint is not set, it falls back to simulated responses
- Masumi Payment Service is optional (only for payments/identity)

## 🎯 Next Steps

1. **Update `.env.local`** with the endpoints above
2. **Check if paths need adjustment** (e.g., add `/invoke` if needed)
3. **Restart backend**
4. **Test** by clicking "Run Agent" buttons

If the endpoints need a different path (like `/invoke`), just append it:
```env
APPOINTMENT_AGENT_ENDPOINT=https://medledger-ai.onrender.com/api/v1/invoke
```

