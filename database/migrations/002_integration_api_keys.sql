-- 002_integration_api_keys.sql
-- Integration API Keys for external programmatic consumption of Relay workflows

CREATE TABLE IF NOT EXISTS integration_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    secret_hash TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY['workflows:read'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

-- Index for rapid token verification lookup by prefix
CREATE INDEX IF NOT EXISTS idx_api_keys_lookup ON integration_api_keys (key_prefix) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_project ON integration_api_keys (project_id);

-- Enable RLS
ALTER TABLE integration_api_keys ENABLE ROW LEVEL SECURITY;

-- Project isolation policy
CREATE POLICY "Project members can manage integration API keys"
    ON integration_api_keys
    FOR ALL
    USING (
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );
