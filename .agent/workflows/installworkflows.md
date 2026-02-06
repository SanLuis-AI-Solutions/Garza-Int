---
description: Install global workflows into the current project's .agent/workflows folder.
---

# /installworkflows - Install Global Workflows

$ARGUMENTS

---

## Task

Copy all globally saved workflows into this project's `.agent/workflows` directory.

---

## Steps

Run this in the project root:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\scripts\installworkflows.ps1"
```

---

## Notes

- This is a one-way copy. Re-run to pull in any new global workflows.
- Existing project workflows are left untouched.
