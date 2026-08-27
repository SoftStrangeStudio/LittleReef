# Active task mirror

Full authority: [LittleReef Production Tracker](https://docs.google.com/spreadsheets/d/1JL1YuEZYvZc9XcoUrJZNIW6dK_iABD8MPgRw6tz1e-o/edit), especially the `GitHub Build` tab.

| ID | Task | Status | Priority | Scope | Definition of done | Validation | Drive row |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LR-GH-019 | Add fish/genetics/breeding regression tests | Ready | Critical | `src/fish/`, `src/breeding/`, `src/nexus/fish/`, `scripts/`, `package.json` | Seeded founders and offspring reproduce; lineage/generation and mutation records are asserted; generated body winding is outward. | Add and pass a `test:fish` package script; retain a front/three-quarter fish review. | GitHub Build row 23 |
| LR-GH-003 | Reconcile state authority and serialization | Blocked | Critical | `src/game/`, `src/fish/`, Drive architecture records | One approved authority model replaces the current matrix-vs-services conflict and has a serialized schema with tests. | Architecture decision, schema round-trip, deterministic snapshot tests. | GitHub Build row 7 |
| LR-GH-015 | Add eligibility and reef/nursery capacity rules | Ready | Critical | `src/breeding/`, `src/ui/`, `src/game/` | Missing, duplicate, ineligible, and full-capacity cases return explicit results without partial mutation. | Unit tests plus browser interaction evidence. | GitHub Build row 19 |
| LR-GH-024 | Add one-command validation and HTTP checks | Ready | Critical | `package.json`, `scripts/` | A clean clone runs all deterministic tests, the production build, and local HTTP/asset probes through one command. | Add and pass a `validate` package script from a clean install. | GitHub Build row 28 |
| LR-GH-026 | Repository README and passive handoff | Done | High | `README.md`, `AGENTS.md`, `.agent/`, `CHANGELOG.md` | A new session can find authority, current state, paths, tasks, constraints, and exact validation without chat history. | Markdown/link audit, clean-clone readback, existing test suite and build. | GitHub Build row 30 |
| LR-GH-027 | Repository/Drive tracker synchronization | Done | High | `.agent/` and canonical Little Reef Drive records | Current State, Build Reference, tracker, decisions, handoff, links, and next action agree with repository evidence. | Connector readback of every changed record. | GitHub Build row 31 |

Statuses used here: `Ready`, `Active`, `Blocked`, `Done`, and `Deferred`. Keep only active, ready, blocked, and recently completed items. Never mark `Done` without evidence.

## Recommended next action

Start **LR-GH-019**: add a deterministic fish/genetics/breeding test command that explicitly catches inward body winding before any new gameplay feature work.
