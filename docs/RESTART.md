# Restart / System Recovery Checklist

If recovery is needed, use `/preflight` and `/audit-and-fix` (see `workflows-catalog.txt`) and follow `OPERATING_MODEL.md`.

## Commands (PowerShell)
```powershell
/installall
npm install
npm run dev
```

## Notes
- MCP config (example): `%USERPROFILE%\.codex\config.toml`
- MCP master config (aggregator, example): `%USERPROFILE%\.mcp-master-config.json`
- Global env overlay (optional, example): `%USERPROFILE%\.codex\env\.env.local`
