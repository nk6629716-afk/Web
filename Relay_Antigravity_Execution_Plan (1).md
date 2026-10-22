# RELAY — EXECUTION PLAN FOR ANTIGRAVITY

_Agent-ready build specification • 2 × 12-hour work blocks • 15-minute execution schedule_


## How to use this plan

Give the Markdown file to Antigravity as the primary instruction document. It is designed to be read by an IDE agent that can inspect and modify the repository. The PDF is the human-readable companion.

**Timing convention:** each work block is 12 hours (720 minutes). The plan uses 15-minute checkpoints so the team can execute and verify work without creating 1,440 meaningless one-minute tasks. The first 60 minutes include finer 5-minute checkpoints. Take the overnight break between blocks; do not treat it as build time.

**Non-negotiable rule:** preserve a working end-to-end demo. Do not sacrifice a working product to add optional features. If a checkpoint slips by more than 30 minutes, cut the lowest-priority feature and continue.

## Product goal

Build Relay, a polished collaborative workflow editor. Users can load a sample workflow, add and connect nodes, configure them, execute the graph, inspect actual per-node outputs, and see accepted edits and execution events in a second browser session.

## Locked MVP scope

- Frontend: React + TypeScript + Vite, `@xyflow/react`, Tailwind CSS, Motion for React only where useful.
- Backend: Node.js + Express + Socket.IO + TypeScript.
- Database: Supabase PostgreSQL. Keep data access behind repository interfaces so Appwrite or another database can replace it later.
- Hosting: frontend on Netlify (or equivalent); API and Socket.IO on Render.
- Node types: Trigger, Transform, Condition, Output.
- Core features: sample/demo mode, graph editing, validation, real execution, run history, live workflow sync, collaborator presence, polished execution inspector.
- Defer: arbitrary user code execution, external email/API integrations, AI classification, advanced CRDT collaboration, billing, mobile-native layouts.
- Execution must be real: animations reflect server execution events and must never claim success before the engine returns it.

## Architecture rules

1. Keep a single canonical workflow state on the server for collaborative rooms.
2. Every saved graph has a monotonically increasing `revision`; reject stale writes and send the latest snapshot back.
3. Validate graph shape, node configs, edge references, cycles and supported node types before saving or executing.
4. Execute only a registry of safe, built-in operations. Never evaluate arbitrary JavaScript supplied by users.
5. Persist projects, workflows, workflow versions, executions and execution steps. Use JSONB for graph/input/output payloads and relational columns for ownership/status/time.
6. Keep privileged database credentials on the server only. Never place service-role secrets in `VITE_*` variables or commit `.env` files.
7. Protect every protected API/socket action with authentication and project permission checks. Demo mode may use a clearly isolated seeded demo room.
8. Use `process.env.PORT` and bind to `0.0.0.0` on Render. Configure frontend origin and CORS explicitly.
9. Use shared TypeScript types and schemas in `packages/shared` for frontend/backend contracts.
10. Prefer simple, testable code over clever abstractions. Add a test with every core engine behavior.

## Required data model

- `profiles`: `id`, `display_name`, `avatar_url`, `created_at`
- `projects`: `id`, `name`, `owner_id`, `created_at`
- `project_members`: `project_id`, `user_id`, `role`
- `workflows`: `id`, `project_id`, `name`, `graph_json`, `revision`, `updated_at`
- `workflow_versions`: `id`, `workflow_id`, `revision`, `graph_json`, `created_by`, `created_at`
- `executions`: `id`, `workflow_id`, `status`, `triggered_by`, `input_json`, `started_at`, `finished_at`
- `execution_steps`: `id`, `execution_id`, `node_id`, `status`, `input_json`, `output_json`, `error_message`, `duration_ms`

Use UUIDs, foreign keys, indexes, and appropriate Supabase RLS policies. Use migrations committed to the repository. A demo workflow can be seeded by code; do not rely on manually inserted production data.

## Required API contract

- `GET /api/health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/workflows/:id`
- `PUT /api/workflows/:id` (revision-checked save)
- `GET /api/workflows/:id/executions`
- `GET /api/executions/:id`
- `POST /api/workflows/:id/execute`

Return consistent JSON errors with a machine-readable `code` and user-readable `message`. Validate every body and path parameter.

## Required Socket.IO events

- `room:join` — client joins a workflow room after authorization.
- `workflow:update` — client submits graph changes with `expectedRevision` and an operation/snapshot.
- `workflow:sync` — server sends the canonical graph and revision.
- `presence:update` — server broadcasts connected collaborator summaries.
- `execution:start` — authorized client requests a run.
- `execution:event` — server streams node start/success/failure and actual outputs/statuses.
- `execution:complete` — server reports terminal status and execution ID.
- Include `error` responses for rejected stale revisions, unauthorized actions and invalid graphs.

## Suggested repository structure

```text
relay/
  apps/web/src/{components, pages, hooks, stores, lib}
  apps/server/src/{routes, sockets, services, engine, repositories, middleware}
  packages/shared/src/{types.ts, events.ts, schemas.ts}
  database/migrations/
  .env.example
  README.md
```

## Team roles

- Member A — frontend/UI: visual system, canvas, nodes, inspector, motion.
- Member B — backend/realtime: Express, Socket.IO, API, authentication and authorization.
- Member C — engine/data/QA: graph validator, execution scheduler, node registry, migrations and tests.
- Member D, if present — integration/deployment: environment setup, seeded demo, cross-browser testing, deployment and pitch.
- For three people, Member C owns core tests and Member B owns deployment wiring; all members integrate at checkpoints.

## Execution protocol for Antigravity

At the start: inspect the existing repository, package manager, scripts, and current working tree. Do not overwrite existing working code blindly. Make a short implementation plan, then implement in small phases. After each phase, run relevant tests/build and report: files changed, commands run, result, blockers, and next checkpoint. If the repository already contains a viable app, adapt it instead of rebuilding from scratch. Do not stop after writing a plan; proceed with implementation unless a blocker requires a human decision.

## Minute-level operating protocol

At every 15-minute checkpoint:
- Record what works, what changed, and any blocker.
- Run the smallest relevant verification command.
- Commit or checkpoint when a stable milestone is reached.
- If blocked for 10 minutes, investigate the root cause; if still blocked at 15 minutes, switch to the fallback and document the issue.
- Keep one integration branch/build runnable throughout.
- No feature work during the final freeze except P0 bug fixes.


## First 60 minutes — 5-minute checkpoints

| Time | Exact action |
|---|---|
| 00–05 | Open the repo; inspect files, package manager, scripts, Git status and current branch. Do not edit yet. |
| 05–10 | Run the existing app/build if possible. Record baseline failures and identify the actual entry points. |
| 10–15 | Write a concise repo-aware plan. Confirm frontend/backend layout and whether any existing code should be reused. |
| 15–20 | Create/verify a clean working branch and checkpoint. Add or update README with run commands. |
| 20–25 | Agree shared graph schema: node, edge, workflow, revision, execution event and result. |
| 25–30 | Create `packages/shared` types and runtime schemas; ensure frontend and backend import the same contract. |
| 30–35 | Install only necessary dependencies: React Flow, Socket.IO client/server, Express, validation library, styling/motion. |
| 35–40 | Create the app shell and server health endpoint; confirm both start locally. |
| 40–45 | Add the dark studio layout: top bar, node palette, canvas region, inspector and execution console placeholders. |
| 45–50 | Render one static sample graph; verify layout at laptop dimensions and that controls do not overlap. |
| 50–55 | Create a seeded sample workflow object and a simple local loading path for demo mode. |
| 55–60 | Run frontend build and backend typecheck/build; checkpoint and list blockers before parallel work expands. |

## Work Block 1 — first 12-hour session

Use the elapsed time shown below. Each row is a 15-minute execution window; finish the listed task or record the blocker and use the fallback rule.

| Elapsed time | Task and acceptance checkpoint |
|---|---|
| 01:00–01:15 | Foundation: establish app shell, shared types, scripts and a runnable baseline. |
| 01:15–01:30 | Frontend: implement top navigation, project/workflow title, Run button and connection status. |
| 01:30–01:45 | Frontend: implement left node palette with Trigger, Transform, Condition and Output. |
| 01:45–02:00 | Frontend: add React Flow canvas, background grid, controls and minimap. |
| 02:00–02:15 | Frontend: create reusable custom node shell, selected/running/success/error visual states. |
| 02:15–02:30 | Frontend: define node data/config contracts and default configuration per node type. |
| 02:30–02:45 | Frontend: implement drag/drop or click-to-add node creation; verify stable unique IDs. |
| 02:45–03:00 | Frontend: connect nodes, delete nodes/edges, select node and update node positions. |
| 03:00–03:15 | Frontend: build inspector panel driven by selected node; show editable label/config fields. |
| 03:15–03:30 | Frontend: implement node config forms with validation and clear empty states. |
| 03:30–03:45 | Frontend: add graph dirty state, save indicator and keyboard-safe controls. |
| 03:45–04:00 | Checkpoint: build the frontend; demo adding, moving, connecting and configuring nodes. |
| 04:00–04:15 | Backend: implement Express server, JSON parsing, error middleware and `/api/health`. |
| 04:15–04:30 | Backend: implement shared request/response types and schema validation. |
| 04:30–04:45 | Engine: implement graph structural validation and unsupported-node rejection. |
| 04:45–05:00 | Engine: implement missing-edge-reference checks, required trigger/output rules and cycle detection. |
| 05:00–05:15 | Engine: implement topological execution order; add unit tests for linear graphs. |
| 05:15–05:30 | Engine: implement Trigger node and execution context/input propagation. |
| 05:30–05:45 | Engine: implement safe Transform operations such as trim, lowercase and field extraction. |
| 05:45–06:00 | Engine: implement Condition rules and explicit true/false branch routing. |
| 06:00–06:15 | Engine: implement Output node and normalized step result structure. |
| 06:15–06:30 | Engine: add per-node pending/running/succeeded/failed/skipped states and error capture. |
| 06:30–06:45 | Engine: run a seeded end-to-end graph; confirm outputs are computed, not hard-coded UI text. |
| 06:45–07:00 | Checkpoint: tests for graph validation, branch routing, real outputs and failures; fix P0 issues. |
| 07:00–07:15 | Database: add migration for projects, project_members and workflows. |
| 07:15–07:30 | Database: add workflow_versions, executions and execution_steps with foreign keys/indexes. |
| 07:30–07:45 | Database: configure repository interface and Supabase server-side adapter. |
| 07:45–08:00 | Database: add seed script/sample workflow and environment variable validation. |
| 08:00–08:15 | API: implement create/list projects and load workflow routes. |
| 08:15–08:30 | API: implement revision-checked save and version snapshot behavior. |
| 08:30–08:45 | API: implement start execution route and persist execution metadata. |
| 08:45–09:00 | API: persist execution steps and expose execution detail/history routes. |
| 09:00–09:15 | Frontend: connect load/save to API; show loading, saved, conflict and failure states. |
| 09:15–09:30 | Frontend: connect Run button to execute endpoint and display returned execution ID/status. |
| 09:30–09:45 | Inspector: display node input/output, status, duration and error details from real results. |
| 09:45–10:00 | Checkpoint: create → save → reload → execute → inspect works against the backend. |
| 10:00–10:15 | Realtime: initialize Socket.IO server/client and workflow room authorization hook. |
| 10:15–10:30 | Realtime: implement room join and canonical `workflow:sync` snapshot. |
| 10:30–10:45 | Realtime: implement revision-checked workflow update; reject stale writes safely. |
| 10:45–11:00 | Realtime: broadcast accepted graph changes and update the second client without reload. |
| 11:00–11:15 | Realtime: broadcast collaborator presence and disconnect cleanup. |
| 11:15–11:30 | Realtime: stream execution node events from the engine to the workflow room. |
| 11:30–11:45 | Frontend: animate actual node states and active edges only when corresponding events arrive. |
| 11:45–12:00 | Integration checkpoint: test two browser sessions, save conflicts, run events and recovery. |

## Overnight break — mandatory rest and handoff

| Period | Instructions |
|---|---|
| REST + HANDOFF — overnight break | Take the scheduled overnight break. Before stopping: commit stable work, note blockers, save logs, list exact next actions, and ensure the team can resume without relying on anyone's memory. Do not schedule coding during this block. |

## Work Block 2 — second 12-hour session

| Elapsed time | Task and acceptance checkpoint |
|---|---|
| 00:00–00:15 | Resume: review checkpoint notes, run clean build/tests, confirm deployed/local baseline. |
| 00:15–00:30 | Fix integration blockers first; do not add new features until end-to-end path is green. |
| 00:30–00:45 | Authentication: verify Supabase session/token validation on protected API routes. |
| 00:45–01:00 | Authorization: enforce project membership on workflow reads, saves, sockets and execution. |
| 01:00–01:15 | Security: verify RLS policies and keep privileged credentials server-only. |
| 01:15–01:30 | Demo mode: ensure sample workflow loads without signup and cannot access private projects. |
| 01:30–01:45 | UX: add useful loading, empty, disconnected, conflict and execution-error states. |
| 01:45–02:00 | UX: improve node labels, port labels, connection clarity, selected state and keyboard focus. |
| 02:00–02:15 | Motion: add restrained transitions for panel open/close and node selection. |
| 02:15–02:30 | Motion: add run progress and edge animation driven by real execution events. |
| 02:30–02:45 | Inspector: add tabs/sections for configuration, input, output and errors. |
| 02:45–03:00 | Execution history: show recent runs, status, start time and click-through details. |
| 03:00–03:15 | Collaboration: add collaborator avatars/initials and connected/disconnected status. |
| 03:15–03:30 | Collaboration: handle reconnect by rejoining room and requesting canonical sync. |
| 03:30–03:45 | Reliability: test stale revision conflict and confirm latest graph is restored. |
| 03:45–04:00 | Checkpoint: two sessions edit the same workflow; verify no silent lost update. |
| 04:00–04:15 | Test: valid linear workflow and each supported node type. |
| 04:15–04:30 | Test: conditional true/false branches and skipped branch status. |
| 04:30–04:45 | Test: cycle, missing edge target, missing config and unsupported node rejection. |
| 04:45–05:00 | Test: simulated node failure; confirm error reaches UI and run becomes failed. |
| 05:00–05:15 | Test: refresh/reload; workflow and execution history remain available. |
| 05:15–05:30 | Test: disconnect/reconnect one client during editing; ensure room resync works. |
| 05:30–05:45 | Test: guest demo mode and permission boundaries. |
| 05:45–06:00 | Checkpoint: fix P0/P1 failures; document known non-blocking limitations. |
| 06:00–06:15 | Deployment: create/verify Supabase project and apply committed migrations. |
| 06:15–06:30 | Deployment: configure Render build/start commands, port binding and backend env vars. |
| 06:30–06:45 | Deployment: deploy backend and verify `/api/health` plus Socket.IO handshake. |
| 06:45–07:00 | Deployment: configure frontend environment URLs and deploy frontend. |
| 07:00–07:15 | Deployment: configure CORS/allowed origin and verify browser requests use deployed API. |
| 07:15–07:30 | Deployment: verify WebSocket connection from hosted frontend; inspect logs for errors. |
| 07:30–07:45 | Deployment: verify database connection, permissions and persisted sample workflow. |
| 07:45–08:00 | Checkpoint: deployed end-to-end workflow can load, save, execute and stream results. |
| 08:00–08:15 | Visual polish: align spacing, typography, panel widths and responsive behavior. |
| 08:15–08:30 | Visual polish: remove placeholder text, broken icons, console warnings and dead controls. |
| 08:30–08:45 | Visual polish: add empty states and clear success/failure feedback. |
| 08:45–09:00 | Performance: inspect render churn, avoid unnecessary full-graph updates and test canvas responsiveness. |
| 09:00–09:15 | README: document local setup, env vars, architecture, database migrations and deployment. |
| 09:15–09:30 | Demo: prepare a 60–90 second workflow with a visible branch and inspectable output. |
| 09:30–09:45 | Demo: rehearse two-browser collaboration and live execution; record timing and failures. |
| 09:45–10:00 | Checkpoint: freeze features; only critical fixes allowed from this point. |
| 10:00–10:15 | Final regression: fresh load, edit, save, reload, run, inspect, history. |
| 10:15–10:30 | Final regression: second session, stale write, reconnect and failure path. |
| 10:30–10:45 | Final regression: verify deployed URLs, secrets, auth and database permissions. |
| 10:45–11:00 | Create a stable Git commit/tag and verify the repository has no accidental secrets. |
| 11:00–11:15 | Record a backup demo video or screenshots; prepare a local seeded fallback. |
| 11:15–11:30 | Prepare pitch: problem, solution, live collaboration, real execution, architecture and next steps. |
| 11:30–11:45 | Full timed rehearsal; assign speaking roles and decide who controls the demo. |
| 11:45–12:00 | Final go/no-go: stop coding, launch the demo, confirm fallback is ready and submit. |

## Final acceptance checklist

- [ ] Guest can open a seeded sample without signing up.
- [ ] User can add, move, connect, configure and delete nodes.
- [ ] Save/reload preserves graph and positions.
- [ ] Invalid graph and cycle are rejected with useful messages.
- [ ] A valid workflow computes real outputs through the node engine.
- [ ] Per-node inputs, outputs, status, duration and errors are inspectable.
- [ ] A second session receives accepted graph changes and execution events.
- [ ] Revision conflicts do not silently overwrite newer state.
- [ ] Execution history persists across refreshes.
- [ ] Hosted frontend communicates with hosted API and Socket.IO.
- [ ] Secrets are not committed or exposed in browser code.
- [ ] README, stable commit and backup demo are ready.

## Required agent reporting format

At each checkpoint, report:
1. **Completed:** concrete behavior implemented.
2. **Files changed:** list paths.
3. **Verification:** exact commands run and pass/fail result.
4. **Blockers:** specific error and attempted fix.
5. **Next 15 minutes:** next action.
6. **Scope decision:** if behind, state what feature is being deferred.

## Cut order if behind schedule

1. Keep: graph editing, execution engine, output inspector, persistence, demo workflow.
2. Keep if possible: two-session sync, execution history, deployed demo.
3. Simplify: presence to avatar initials; styling to a consistent static theme; auth to a protected minimal flow plus isolated guest demo.
4. Defer first: advanced cursor tracking, undo/redo, elaborate animations, custom node marketplace, AI features, external integrations.
5. Never fake: successful execution, collaboration, persistence or deployment. Clearly label any simulated service behavior.

## Copy-paste instruction for Antigravity

Read this entire execution plan before changing code. Inspect the current repository and reuse viable code rather than rebuilding blindly. Treat the MVP scope, architecture rules, API/events, data model, schedule, acceptance criteria and cut order as requirements. Begin with the first 60-minute checkpoints, then continue in order. Work in small phases, run the relevant tests/build after each phase, preserve a runnable app, and report the exact files changed and verification results at every 15-minute checkpoint. Do not claim that a feature works unless you verified it. If blocked, spend at most 15 minutes before documenting the issue and switching to the simplest safe fallback. Prioritize the end-to-end demo over optional polish.
