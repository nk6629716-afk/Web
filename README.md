# Relay — Collaborative Workflow Editor

Relay is a collaborative workflow editor featuring real-time multi-user synchronization, a deterministic workflow execution engine, live execution streaming, and a dark studio canvas.

## Features
- **Canvas Editor**: Drag, connect, configure, and inspect nodes powered by `@xyflow/react`.
- **4 Node Types**: Trigger, Transform, Condition, Output.
- **Execution Engine**: Real topological execution order, branch routing, and runtime error isolation.
- **Real-Time Collaboration**: Socket.IO room sync with revision-based conflict rejection and collaborator presence.
- **Demo Mode**: Seeded workflow available instantly without mandatory signup.

## Repository Layout
```text
relay/
  apps/
    web/          # Vite + React + TypeScript + Tailwind CSS + @xyflow/react
    server/       # Node.js + Express + Socket.IO + TypeScript
  packages/
    shared/       # Shared TypeScript types, schemas, and Socket.IO events
  database/
    migrations/   # SQL migrations for Supabase / PostgreSQL
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` in the root or respective app directories:
- `apps/server/.env`
- `apps/web/.env`

### 3. Run Development Servers
```bash
# Run both frontend and backend concurrently
npm run dev

# Or run separately:
npm run dev:server
npm run dev:web
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api/health`
