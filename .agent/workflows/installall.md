---
description: Install global skills, agents, workflows, and run MCP preflight.
---

# /installall - Install + MCP Preflight

$ARGUMENTS

---

## Task

Bring all global assets into the project and verify MCP servers are ready.

---

## Steps

1. **Install global assets**

Run this in the project root:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\scripts\installall.ps1"
```

2. **Catalog + docs sync (global)**

- Catalogs are synced to `%USERPROFILE%\.codex\catalogs` and copied into the project root when available.
- Starter docs are seeded if missing (Docs/RESTART.md, Docs/HANDOFF.md, Docs/OPERATING_MODEL.md, README.md, and OPERATING_MODEL.md in the project root).

3. **Project bootstrap (env + MCP hints + deps)**

```powershell
powershell -ExecutionPolicy Bypass -File "./scripts/project-bootstrap.ps1"
```

4. **MCP preflight**

```powershell
./scripts/mcp-healthcheck.ps1
```

5. **Docker MCP stabilization (if needed)**

```powershell
./scripts/mcp-disable-broken.ps1
./scripts/mcp-healthcheck.ps1
```

**Notes**
- If `.env.example` is missing, bootstrap will create it from the global env (keys only) or a global template.
- If MCP scripts are missing in `./scripts`, `/installall` seeds them from `%USERPROFILE%\.codex\scripts`.

6. **Global MCP readiness check**

- Confirm MCP config is global at `%USERPROFILE%\.codex\config.toml`
- If MCPs are missing or disabled, fix them in the global config (not in the repo)
- If using the aggregator, confirm `%USERPROFILE%\.mcp-master-config.json` exists and is referenced by `master-aggregator`
- Re-run preflight after any changes

---

## Output

- Install confirmation
- MCP health summary
- Any missing config/env keys

---

## Notes

- MCP config lives at `%USERPROFILE%\.codex\config.toml`.
- Secrets should remain in `.env.local` or the MCP config, not committed.
- Optional global env overlay path: `%USERPROFILE%\.codex\env\.env.local`

---

## Usage

```
/installall
```
