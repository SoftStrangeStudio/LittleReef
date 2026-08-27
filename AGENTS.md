# Little Reef agent entrypoint

This repository is `SoftStrangeStudio/LittleReef`. The default and deployment branch is `main`.

Before changing anything:

1. Confirm the repository, branch, remote head, and worktree status.
2. Stop on unexpected local changes; they belong to the user until proven otherwise.
3. Read [.agent/start-here.md](.agent/start-here.md) and follow its read order.
4. Read the [LittleReef handoff](https://docs.google.com/document/d/1Kf3Qe6MFSYgtUvxSVywF0n095AQdM7tnPzf9bwwYSRI/edit) and the [Production Tracker](https://docs.google.com/spreadsheets/d/1JL1YuEZYvZc9XcoUrJZNIW6dK_iABD8MPgRw6tz1e-o/edit).
5. Use a stable `LR-GH-*` tracker ID for material work. `.agent/tasks.md` is only the active-session mirror; the Production Tracker is the full task authority.
6. Establish a baseline before editing and run the validation mapped to the affected system.

Project guardrails:

- Do not edit `.github/workflows/` unless the user explicitly authorizes that exact workflow change.
- Do not change fish generation, breeding, audio, saves, dependencies, coral GLBs, or rock-arch geometry as a side effect of unrelated work.
- Keep generated coral as static GLBs loaded by the game. Keep the rock arch deterministic and generated once during reef setup.
- Preserve outward-facing fish body winding. A successful render is not proof if normals or winding regress.
- Do not claim completion without relevant automated checks and, for visible gameplay changes, comparable visual evidence.
- After material work, update `.agent/memory.md`, `.agent/tasks.md`, `.agent/change-log.md`, and the canonical Drive handoff/tracker records.

Canonical validation is documented in [.agent/validation.md](.agent/validation.md).
