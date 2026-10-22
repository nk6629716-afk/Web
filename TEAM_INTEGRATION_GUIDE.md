# Relay — Team Workflow & Integration Guide

Welcome to the **Relay** project! This guide clarifies how the 3 members integrate seamlessly according to `Relay_Antigravity_Execution_Plan (1).md`.

---

## 👥 Team Roles & Ownership

| Member | Focus Area | Directory | Primary Responsibilities |
|---|---|---|---|
| **Member A (Friend 1)** | **Frontend & UI Canvas** | `apps/web` | Visual design, React Flow nodes, palette, inspector forms, motion |
| **Member B (Friend 2)** | **Backend & Realtime** | `apps/server` | Express API, Socket.IO rooms, authentication, Supabase / Render deployment |
| **Member C (Antigravity)** | **Workflow Engine & Data** | `packages/shared`, `packages/engine`, `packages/database`, `database/` | Graph validation, topological execution scheduler, safe node evaluators, optimistic revision locking, test suite |

---

## 🚀 Quick Start Commands

```bash
# 1. Install all dependencies (already configured with npm workspaces)
npm install

# 2. Run both Frontend & Backend concurrently
npm run dev

# Or run services independently:
npm run dev:server   # Starts Express + Socket.IO server at http://localhost:4000
npm run dev:web      # Starts Vite React Flow frontend at http://localhost:5173

# 3. Run full Engine & Repository test suite (24 unit tests)
npm test

# 4. Build entire monorepo for production
npm run build
```

---

## 🎨 Member A: Frontend Guide (`apps/web`)

Your workspace is in `apps/web/src/`. A working studio shell is already built and wired with `@xyflow/react` and `@relay/shared`:

### Key Components:
- **`components/TopNav.tsx`**: Workflow header, revision indicator (`v1`, `v2`), connected presence avatars, Run button, save status indicator.
- **`components/NodePalette.tsx`**: Draggable / clickable node templates: `Trigger`, `Transform`, `Condition`, `Output`.
- **`components/Canvas.tsx`**: React Flow canvas with custom nodes, handles, controls, and minimap.
- **`components/nodes/`**: Custom node components:
  - `TriggerNode.tsx` (Amber, output port only)
  - `TransformNode.tsx` (Sky blue, input and output ports)
  - `ConditionNode.tsx` (Violet, input port + dual `True` (green) and `False` (rose) output handles)
  - `OutputNode.tsx` (Emerald, input port only, terminal destination badge)
- **`components/Inspector.tsx`**: Selected node inspector with Configuration and Run Output tabs.
- **`components/ExecutionConsole.tsx`**: Realtime step log with duration and status badges.
- **`components/ConflictModal.tsx`**: Warning dialog when a revision conflict occurs.
- **`hooks/useWorkflow.ts`**: Ready-to-use hook handling Socket.IO connection, optimistic local edits, and execution streaming.

---

## ⚙️ Member B: Backend Guide (`apps/server`)

Your workspace is in `apps/server/src/`. The server is configured with Express, Socket.IO, CORS, and full routing:

### Key Endpoints:
- `GET /api/health`: Health status and uptime.
- `GET /api/projects`: List workspace projects.
- `POST /api/projects`: Create project `{ name: string }`.
- `GET /api/workflows/:id`: Loads workflow (automatically seeds `demo-workflow-001` if requested).
- `PUT /api/workflows/:id`: Saves workflow with optimistic revision locking `{ expectedRevision, graph }`. Returns `409 STALE_REVISION` on conflict.
- `GET /api/workflows/:id/executions`: Lists execution history.
- `GET /api/executions/:id`: Retrieves execution details and recorded steps.
- `POST /api/workflows/:id/execute`: Executes graph and returns computed node outputs.

### WebSocket Events (`Socket.IO`):
- `room:join`: `{ workflowId, user }` -> joins room, emits `workflow:sync` and broadcasts `presence:update`.
- `workflow:update`: `{ workflowId, expectedRevision, graph }` -> validates, bumps revision, broadcasts `workflow:updated` or emits `error` with code `STALE_REVISION`.
- `presence:select`: broadcasts which node a collaborator is clicking.
- `execution:start`: runs engine and streams `execution:event` (with `stepDelayMs: 450` for visual playback across both browser tabs) and `execution:complete`.

### Database & Supabase:
- `packages/database` provides `getRepositories()`.
- If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided in `.env`, it automatically talks to Supabase PostgreSQL.
- If omitted, it automatically falls back to the in-memory repository (pre-seeded with `demo-workflow-001`), ensuring local dev and tests never block on external credentials.
- Schema migration is ready in `database/migrations/001_initial_schema.sql`.

---

## 🧠 Member C (Antigravity): Engine & Validation Delivered

### 1. Graph Structural & DAG Validator (`@relay/engine`):
- Cycle detection using Kahn's algorithm and DFS.
- Unsupported node rejection (strictly restricts to `trigger`, `transform`, `condition`, `output`).
- Edge integrity checks (no dangling edges, no self-loops).
- Enforces at least 1 Trigger node.

### 2. Safe Node Evaluators (`@relay/engine`):
- **Safe JavaScript Execution**: Strictly prohibits arbitrary `eval()` or `Function()`.
- **Built-in Operations**:
  - `trim`: trims whitespace.
  - `lowercase` & `uppercase`: string case conversions.
  - `json_parse` & `json_stringify`: safe JSON handling.
  - `extract_field`: safe dot-notation traversal (`user.profile.name`).
  - `template`: token interpolation (`{{cleanMessage}} (ID: {{ticketId}})`).
  - `math_add`: safe numeric addition.
  - `default_value`: fallback for null/empty values.
  - Condition operators: `equals`, `not_equals`, `contains`, `not_contains`, `greater_than`, `less_than`, `is_empty`, `is_not_empty`.
  - Condition branch routing: downstream edges from inactive condition handles are deactivated and downstream nodes are marked `skipped`.

### 3. Repository Layer (`@relay/database`):
- Monotonically increasing revision checks (optimistic locking).
- Automatic snapshot archiving to `workflow_versions`.
- Step duration tracking and per-step error capture.

### 4. Tests:
- 24 passing unit tests covering validation, safe evaluators, branch routing, step failure capture, and seeded workflow execution.
