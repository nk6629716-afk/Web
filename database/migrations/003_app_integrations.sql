-- 003_app_integrations.sql
-- Persistent external application HTTP integrations (CityPulse, CivicConnect, generic REST APIs)

CREATE TABLE IF NOT EXISTS app_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    app_type TEXT NOT NULL DEFAULT 'generic_http',
    base_url TEXT NOT NULL,
    http_method TEXT NOT NULL DEFAULT 'POST',
    auth_type TEXT NOT NULL DEFAULT 'none',
    encrypted_auth TEXT,
    auth_header_name TEXT,
    headers JSONB DEFAULT '{}'::jsonb,
    timeout_ms INTEGER NOT NULL DEFAULT 5000,
    test_endpoint TEXT,
    test_method TEXT DEFAULT 'GET',
    status TEXT NOT NULL DEFAULT 'active',
    last_tested_at TIMESTAMPTZ,
    last_test_status TEXT,
    last_test_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rapid lookup by project
CREATE INDEX IF NOT EXISTS idx_integrations_project ON app_integrations (project_id);

-- Enable RLS
ALTER TABLE app_integrations ENABLE ROW LEVEL SECURITY;

-- Project isolation policy
CREATE POLICY "Project members can manage app integrations"
    ON app_integrations
    FOR ALL
    USING (
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );
