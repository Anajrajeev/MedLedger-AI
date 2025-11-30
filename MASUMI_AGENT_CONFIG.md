# Masumi Agent Configuration

Based on your Masumi admin panel screenshot, here's how to configure MedLedger AI to use your hosted agents.

## Your Registered Agents

From the screenshot at `https://masumi-payment-service-production-7a37.up.railway.app/admin`:

### 1. **Appointment Agent**
- **Agent ID**: `7e8b...8da6` (full ID visible in screenshot)
- **Description**: "It shows all the nearby hospitals"
- **Status**: ✅ Registered
- **Added**: 11/30/2025
- **Price**: 1.00 ADA
- **Linked Wallet**: addr...vy6n

### 2. **Explainer Agent**
- **Agent ID**: `7e8b...3355` (full ID visible in screenshot)
- **Description**: "Summarizes medical content"
- **Status**: ✅ Registered
- **Added**: 11/30/2025
- **Price**: 1.00 ADA
- **Linked Wallet**: addr...vy6n

## Configuration Steps

### Step 1: Get Your API Key

1. Go to your Masumi admin panel: https://masumi-payment-service-production-7a37.up.railway.app/admin
2. Click on "API keys" in the left sidebar
3. Copy your API key

### Step 2: Update .env.local

Add these values to your `.env.local` file:

```env
# Enable Masumi
MASUMI_ENABLED=true

# Your hosted Masumi Payment Service
MASUMI_PAYMENT_SERVICE_URL=https://masumi-payment-service-production-7a37.up.railway.app/api/v1

# Your API key (from Step 1)
MASUMI_API_KEY=your_actual_api_key_here

# Your registered agent IDs (copy full IDs from the admin panel)
# Click on the Agent ID in the table to copy the full ID
EXPLAINER_AGENT_ID=7e8bdaf2b2b919a3a4b94002cafb50086c0c845fe535d07a77ab7f77ae2550407149b807d45c5407db8890314e78748d59d9f7f06091a1dc9b428da63355
APPOINTMENT_AGENT_ID=7e8bdaf2b2b919a3a4b94002cafb50086c0c845fe535d07a77ab7f77ae2550407149b807d45c5407db8890314e78748d59d9f7f06091a1dc9b428da68da6

# Insurance agent - register this if needed, or leave as placeholder
INSURANCE_AGENT_ID=<register_insurance_agent_first>
```

### Step 3: Get Full Agent IDs

The screenshot shows truncated agent IDs. To get the full IDs:

1. In the Masumi admin panel, click on the copy icon (📋) next to each Agent ID
2. Or click on the agent name to view full details
3. Copy the complete agent ID (should be ~120 characters long)

### Step 4: Restart Backend

```bash
# Stop current server (Ctrl+C)
npm run server:start
```

### Step 5: Test

1. Go to http://localhost:3000/ai
2. Click "Run Agent" on any agent card
3. You should see real responses from your Masumi agents!

## Expected Behavior

✅ **Before**: "Development Mode" simulated responses  
✅ **After**: Real AI responses from your registered agents via Masumi Network

## Troubleshooting

### "Unauthorized" Error
- Check that `MASUMI_API_KEY` is correct
- Generate a new API key in the admin panel if needed

### "Agent not found" Error  
- Verify the full agent IDs are copied correctly
- Make sure no extra spaces or characters

### "Payment failed" Error
- Check that your linked wallet (addr...vy6n) has sufficient ADA
- Each invocation costs 1.00 ADA per your agent pricing

## Notes

- Your agents are priced at **1.00 ADA** per invocation
- Make sure your selling wallet has sufficient funds
- The Masumi service handles all payment processing automatically
- Both agents are linked to the same wallet (addr...vy6n)

## Next Steps

Once configured, you can:
1. Register the Insurance Agent (third agent)
2. Adjust agent pricing in the Masumi admin panel
3. Monitor agent usage in the Masumi dashboard
4. View transaction history in the Transactions tab

