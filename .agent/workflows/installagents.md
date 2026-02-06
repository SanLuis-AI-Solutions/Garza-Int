---
description: Install global agents into the current project's .agent/agents folder.
---

# /installagents - Install Global Agents

$ARGUMENTS

---

## Task

Copy all globally saved agents into this project's `.agent/agents` directory.

---

## Steps

Run this in the project root:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\scripts\installagents.ps1"
```

---

## Notes

- This is a one-way copy. Re-run to pull in any new global agents.
- Existing project agents are left untouched.
