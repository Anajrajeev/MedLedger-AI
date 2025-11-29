# DigitalOcean App Platform Deployment Instructions

This guide explains how to deploy the MedLedger-AI project on DigitalOcean App Platform, with each agent running as a separate service.

## Overview

The MedLedger-AI project uses a universal Dockerfile that can run any agent. Each agent is deployed as a separate **Worker** component on DigitalOcean App Platform, with the CMD overridden per service to run the specific agent.

## Prerequisites

- A DigitalOcean account
- Your repository connected to DigitalOcean (via GitHub/GitLab/Bitbucket)
- Access to DigitalOcean App Platform

## Deployment Steps

### 1. Initial Setup

1. Log in to your DigitalOcean account
2. Navigate to **App Platform**
3. Click **Create App**
4. Connect your repository (GitHub/GitLab/Bitbucket)
5. Select the **dev** branch
6. DigitalOcean will detect the Dockerfile automatically

### 2. Create Services for Each Agent

For each agent in your project, you need to create a separate **Worker** component:

#### Service 1: Appointment Agent

1. In the App Platform UI, add a new component
2. Select **Worker** as the component type (NOT Web Service)
3. Configure the component:
   - **Name**: `appointment-agent` (or your preferred name)
   - **Source Directory**: `/` (root of the repo)
   - **Dockerfile Path**: `Dockerfile`
   - **Branch**: `dev` (or your target branch)

4. **Override the CMD**:
   - In the component settings, find the **Run Command** or **CMD Override** field
   - Set it to: `python agents/run_appointment_agent.py`
   - This overrides the default CMD in the Dockerfile

#### Service 2: Explain Agent

1. Add another **Worker** component
2. Configure similarly:
   - **Name**: `explain-agent`
   - **Source Directory**: `/`
   - **Dockerfile Path**: `Dockerfile`
   - **Branch**: `dev`

3. **Override the CMD**:
   - Set **Run Command** to: `python agents/run_explain_agent.py`

#### Service 3: Future Agents

For any future agents (e.g., `run_future_agent.py`):

1. Add a new **Worker** component
2. Configure:
   - **Name**: `future-agent` (or descriptive name)
   - **Source Directory**: `/`
   - **Dockerfile Path**: `Dockerfile`
   - **Branch**: `dev`

3. **Override the CMD**:
   - Set **Run Command** to: `python agents/run_<future_agent>.py`
   - Replace `<future_agent>` with the actual agent script name

### 3. Important Configuration Notes

#### All Components Point to the Same Branch

- **All Worker components should point to the same `dev` branch**
- This ensures all agents run from the same codebase version
- Updates to the `dev` branch will trigger deployments for all services

#### Universal Dockerfile

- The `Dockerfile` is universal and works for all agents
- The default CMD in the Dockerfile (`python agents/run_appointment_agent.py`) is a placeholder
- **Each service overrides the CMD** to run its specific agent
- This approach allows you to add new agents without modifying the Dockerfile

#### Worker Components (Not Web Services)

- Each agent is deployed as a **Worker** component, not a Web Service
- Workers are designed for background processes, agents, and long-running tasks
- Workers do not expose HTTP endpoints by default (though your agents may use FastAPI internally)

### 4. Environment Variables

If your agents require environment variables:

1. Go to each Worker component's settings
2. Navigate to **Environment Variables**
3. Add required variables (e.g., API keys, database URLs, etc.)
4. Repeat for each agent service

**Note**: You can set environment variables at the App level (shared across all components) or at the component level (specific to one agent).

### 5. Resource Configuration

Configure resources for each Worker:

- **Instance Size**: Choose based on agent requirements
- **Instance Count**: Typically 1 per agent (scale as needed)
- **Health Checks**: Configure if your agents expose health endpoints

## Troubleshooting

### "No Default Process Type" Error

If you encounter a "no default process type" error:

**Cause**: DigitalOcean App Platform couldn't detect a process type from your Dockerfile.

**Solution**:
1. Ensure the Dockerfile has a `CMD` instruction (even if it will be overridden)
2. Verify the **Run Command** override is set correctly in the component settings
3. Check that the command path is correct:
   - Use: `python agents/run_appointment_agent.py`
   - Not: `python /app/agents/run_appointment_agent.py` (WORKDIR is already `/app`)
4. Ensure the Python script exists at the specified path
5. Verify the Dockerfile builds successfully:
   ```bash
   docker build -t medledger-test .
   ```

### Other Common Issues

#### Build Failures

- Check that `requirements.txt` is present and valid
- Verify all dependencies are installable
- Review build logs in DigitalOcean dashboard

#### Runtime Errors

- Check component logs in the DigitalOcean dashboard
- Verify environment variables are set correctly
- Ensure the agent script path in CMD override matches the actual file location

#### Agent Not Starting

- Verify the CMD override is set correctly
- Check that the Python script is executable and has correct permissions
- Review application logs for Python import errors or path issues

## Deployment Workflow

1. **Push to `dev` branch** → Triggers automatic deployment
2. **All Worker components** deploy simultaneously (from the same commit)
3. **Each component** runs its specific agent via CMD override
4. **Monitor logs** in DigitalOcean dashboard for each component

## Summary

- ✅ One Dockerfile for all agents (universal)
- ✅ One Worker component per agent
- ✅ CMD overridden per service in DigitalOcean UI
- ✅ All components use the same `dev` branch
- ✅ Easy to add new agents: just add a new Worker component with CMD override

## Example Component Configuration

```
App: medledger-ai
├── Worker: appointment-agent
│   ├── Branch: dev
│   ├── Dockerfile: Dockerfile
│   └── Run Command: python agents/run_appointment_agent.py
├── Worker: explain-agent
│   ├── Branch: dev
│   ├── Dockerfile: Dockerfile
│   └── Run Command: python agents/run_explain_agent.py
└── Worker: future-agent (when added)
    ├── Branch: dev
    ├── Dockerfile: Dockerfile
    └── Run Command: python agents/run_future_agent.py
```

