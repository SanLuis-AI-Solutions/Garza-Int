---
description: Zero-Fail Deployment Workflow for SJR Dashboard
---

# /deploy - Auto Sync & Build

## 🚀 One-Command Deployment
This workflow ensures your code is ALWAYS synced to both GitHub and Vercel.

**Routine:**
1.  **Sync to GitHub**: Pushes your code to the remote repository.
2.  **Trigger Vercel**: Manually triggers a production build via CLI to bypass potential webhook failures.
3.  **Verify**: Checks the status.

## Usage

Simply run:
```powershell
./scripts/deploy.ps1
```

## Setup (Run Once)
The script `scripts/deploy.ps1` has been created for you. It contains:

```powershell
write-host "Starting SJR Dashboard Deployment..."
git push origin main
npx vercel --prod
```

## Why this works
- **Redundancy**: If GitHub webhooks fail, the Vercel CLI command ensures the build happens anyway.
- **Speed**: You get immediate feedback in your terminal.
