# Relay — Collaborative Workflow Studio

Relay is a real-time collaborative workflow editor and DAG execution platform. Users can load sample workflows, build graphs with custom nodes (Trigger, Transform, Condition, Output), inspect computed execution outputs per node, and collaborate with peers across multiple browser sessions with live presence and conflict-free revision tracking.

## Architecture & Monorepo Structure

```text
relay/
  apps/
    web/             # React + Vite + TypeScript + @xyflow/react + Tailwind CSS
    server/          # Node.js + Express + Socket.IO + TypeScript API server
  packages/
    shared/          # Common types, contracts, socket events, and schemas
    engine/          # Topological execution scheduler, DAG validator & safe evaluators
    database/        # Repository interfaces, in-memory store & Supabase PostgreSQL adapter
  database/
    migrations/      # Supabase PostgreSQL schema migrations
  TEAM_INTEGRATION_GUIDE.md
  .env.example
  README.md
```

## Quick Start

### 1. Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### 2. Setup
```bash
# Clone the repository and install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### 3. Run Locally
```bash
# Run both Frontend and Backend concurrently
npm run dev

# Or run services independently:
npm run dev:server   # API & WebSockets on http://localhost:4000
npm run dev:web      # Studio Frontend on http://localhost:5173
```

Open `http://localhost:5173` in your browser. Open a second tab to see live collaborative sync and presence in action!

### 4. Run Tests
```bash
# Runs the vitest engine test suite (24 unit tests)
npm test
```

### 5. Production Build
```bash
# Builds all workspace packages and produces production bundles
npm run build
```

## Core Features
- **Real DAG Execution**: Server executes nodes topologically and streams step events (`pending`, `running`, `succeeded`, `failed`, `skipped`).
- **Safe Operations**: Registry of safe built-in transforms (trim, lowercase, uppercase, JSON parse, template interpolation, field extraction). No arbitrary user JS execution.
- **Branch Routing**: Condition nodes route execution through `True` and `False` branches with skipped branch detection.
- **Optimistic Locking**: Every workflow modification verifies `expectedRevision` against the canonical server state to prevent lost updates.
- **Realtime Collaboration**: Socket.IO room synchronization with presence avatars and active node selection indicators.
- **Dual-Storage Architecture**: Runs zero-config with an in-memory repository or connects to Supabase PostgreSQL when credentials are provided.

## Team Collaboration
See [TEAM_INTEGRATION_GUIDE.md](./TEAM_INTEGRATION_GUIDE.md) for detailed role separation between Frontend (Member A), Backend (Member B), and Engine / Data (Member C).
