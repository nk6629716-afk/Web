-- RELAY: Initial Schema Migration
-- Compatible with Supabase PostgreSQL

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Project Members table
CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor', -- 'owner', 'editor', 'viewer'
  PRIMARY KEY (project_id, user_id)
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  graph_json JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Workflow Versions table (immutable snapshots)
CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  graph_json JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (workflow_id, revision)
);

-- Executions table
CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'succeeded', 'failed'
  triggered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  finished_at TIMESTAMPTZ
);

-- Execution Steps table
CREATE TABLE IF NOT EXISTS execution_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'succeeded', 'failed', 'skipped'
  input_json JSONB,
  output_json JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  finished_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_project_id ON workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_wf ON workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_execution_steps_exec_id ON execution_steps(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_steps_node_id ON execution_steps(node_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_steps ENABLE ROW LEVEL SECURITY;

-- Sample open policies for development (can be restricted in production)
DO $$
BEGIN
  -- Read policies
  CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
  CREATE POLICY "Public read projects" ON projects FOR SELECT USING (true);
  CREATE POLICY "Public read workflows" ON workflows FOR SELECT USING (true);
  CREATE POLICY "Public read executions" ON executions FOR SELECT USING (true);
  CREATE POLICY "Public read execution_steps" ON execution_steps FOR SELECT USING (true);
  
  -- Write policies for development
  CREATE POLICY "Public insert projects" ON projects FOR INSERT WITH CHECK (true);
  CREATE POLICY "Public update projects" ON projects FOR UPDATE USING (true);
  CREATE POLICY "Public insert workflows" ON workflows FOR INSERT WITH CHECK (true);
  CREATE POLICY "Public update workflows" ON workflows FOR UPDATE USING (true);
  CREATE POLICY "Public insert executions" ON executions FOR INSERT WITH CHECK (true);
  CREATE POLICY "Public update executions" ON executions FOR UPDATE USING (true);
  CREATE POLICY "Public insert execution_steps" ON execution_steps FOR INSERT WITH CHECK (true);
  CREATE POLICY "Public update execution_steps" ON execution_steps FOR UPDATE USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
