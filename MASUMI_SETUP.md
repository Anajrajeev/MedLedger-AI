# Masumi Network Integration Guide

This guide explains how to integrate MedLedger AI with the Masumi Network for AI agent payments and identity.

## What is Masumi?

[Masumi](https://docs.masumi.network/documentation) is a **decentralized protocol for AI agent payments and identity**. It enables AI agents to:
- Establish verifiable blockchain-backed identity
- Create immutable proof of agent outputs
- Enable direct agent-to-agent payments

## Important: Masumi is Self-Hosted

**Masumi is NOT a centralized cloud service.** You need to run your own Masumi Node locally. There is no `gateway.masumi.network` - this was a misconception in the initial implementation.

## Setup Instructions

### Step 1: Install Masumi Node

Follow the official [Masumi Installation Guide](https://docs.masumi.network/get-started/installation):

```bash
# Clone the Masumi repository
git clone https://github.com/masumi-network/masumi-node
cd masumi-node

# Install dependencies
npm install

# Configure your Masumi Node
cp .env.example .env
# Edit .env with your Cardano wallet details

# Start the Masumi services
docker-compose up -d
```

This will start two services:
- **Payment Service**: `http://localhost:3001/api/v1`
- **Registry Service**: `http://localhost:3000/api/v1`

### Step 2: Fund Your Wallets

1. Get Test-ADA from the [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnet/tools/faucet/)
2. Fund the wallet configured in your Masumi Node

### Step 3: Connect Your Agentic Service

Your agents must comply with [MIP-003: Agentic Service API Standard](https://docs.masumi.network/mips/mip-003).

Create agent endpoints that follow this standard:

```typescript
// Example: Explainer Agent
POST /api/agents/explainer
{
  "query": "What does hypertension mean?",
  "context": "medical terminology"
}
```

### Step 4: Register Your Agents

Register each agent on the Masumi Network:

```bash
# Use the Masumi CLI or API to register
curl -X POST http://localhost:3001/api/v1/agents/register \
  -H "Content-Type: application/json" \
  -H "token: YOUR_API_KEY" \
  -d '{
    "name": "Explainer Agent",
    "description": "Translates medical terminology",
    "endpoint": "http://your-server:4000/api/agents/explainer",
    "pricing": { "model": "pay-per-use", "price": 100 }
  }'
```

Save the returned `agentId` for each agent.

### Step 5: Configure MedLedger AI

Update your `.env.local`:

```env
# Enable Masumi integration
MASUMI_ENABLED=true

# Point to your local Masumi Node
MASUMI_PAYMENT_SERVICE_URL=http://localhost:3001/api/v1
MASUMI_REGISTRY_SERVICE_URL=http://localhost:3000/api/v1
MASUMI_API_KEY=your_masumi_api_key_from_setup

# Your registered agent IDs
EXPLAINER_AGENT_ID=agent_id_from_registration
APPOINTMENT_AGENT_ID=agent_id_from_registration
INSURANCE_AGENT_ID=agent_id_from_registration
```

### Step 6: Restart Backend

Restart the MedLedger AI backend to apply changes:

```bash
npm run server:start
```

### Step 7: Test

Click "Run Agent" buttons in the AI Analysis page (`http://localhost:3000/ai`). If configured correctly, agents will be invoked through the Masumi Network.

## Development Mode

By default, MedLedger AI runs in **development mode** with `MASUMI_ENABLED=false`. In this mode:
- Agent endpoints return simulated responses
- No Masumi Node is required
- Useful for testing UI/UX without full Masumi setup

To see the difference, compare responses before and after enabling Masumi.

## Architecture

```
┌─────────────────┐
│  MedLedger AI   │
│  (Frontend)     │
└────────┬────────┘
         │
         │ HTTP API calls
         ▼
┌─────────────────┐
│  MedLedger AI   │
│  (Backend)      │
└────────┬────────┘
         │
         │ Masumi API calls
         ▼
┌─────────────────┐      ┌──────────────┐
│  Masumi Node    │◄────►│   Cardano    │
│  (Local)        │      │  Blockchain  │
│  - Payment Svc  │      │  (Preprod)   │
│  - Registry Svc │      └──────────────┘
└─────────────────┘
```

## Troubleshooting

### "ENOTFOUND gateway.masumi.network"
This error occurs if you're using the old (incorrect) configuration. Masumi doesn't have a centralized gateway. Use local URLs instead.

### "ECONNREFUSED localhost:3001"
Your Masumi Node is not running. Start it with `docker-compose up`.

### "Agent ID not configured"
You haven't registered your agents yet. Follow Step 4 above.

### "Unauthorized" or "Invalid API key"
Check that `MASUMI_API_KEY` in `.env.local` matches the key from your Masumi Node setup.

## Resources

- [Masumi Documentation](https://docs.masumi.network/documentation)
- [Installation Guide](https://docs.masumi.network/get-started/installation)
- [API Reference](https://docs.masumi.network/api-reference)
- [MIP-003: Agentic Service API](https://docs.masumi.network/mips/mip-003)
- [Masumi GitHub](https://github.com/masumi-network)

## Current Status

✅ **Agent Routes**: Implemented with development mode fallback  
✅ **Configuration**: Updated to use correct local URLs  
⏳ **Masumi Node**: Not installed (development mode active)  
⏳ **Agent Registration**: Pending (requires Masumi Node)  

To enable full Masumi integration, follow the steps above to install and configure a Masumi Node.

