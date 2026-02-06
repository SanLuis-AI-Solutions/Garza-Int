# /syncworkflows
# Sync local project workflows with global workflows.
# Usage: run `syncworkflows` from the project root.

- Ensure you are in the project root (contains `.agent/workflows`).
- Run `syncworkflows` to merge local and global workflows.
- Conflicts resolve by most recent file timestamp.

This keeps `%USERPROFILE%\.codex\workflows` and `.agent/workflows` in lockstep.
