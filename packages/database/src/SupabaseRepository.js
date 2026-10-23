import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { encryptCredential, decryptCredential } from './InMemoryRepository';
export function formatSupabaseError(error, operation) {
    const msg = error?.message || (typeof error === 'string' ? error : 'Unknown database error');
    if (msg.includes('Could not find the table') || msg.includes('schema cache') || msg.includes('does not exist')) {
        return new Error(`Database schema not initialized for ${operation}: ${msg}. ` +
            `Please execute database/migrations/001_initial_schema.sql in your Supabase SQL Editor and reload the schema cache (NOTIFY pgrst, 'reload schema';).`);
    }
    return new Error(`Failed to ${operation} in Supabase: ${msg}`);
}
export class SupabaseWorkflowRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async getById(id) {
        const { data, error } = await this.client
            .from('workflows')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null; // 0 rows returned
            if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
                throw formatSupabaseError(error, `retrieve workflow ${id}`);
            }
            return null;
        }
        if (!data)
            return null;
        return {
            id: data.id,
            projectId: data.project_id,
            name: data.name,
            graph: data.graph_json,
            revision: data.revision,
            updatedAt: data.updated_at
        };
    }
    async create(data) {
        const { data: inserted, error } = await this.client
            .from('workflows')
            .insert({
            id: data.id,
            project_id: data.projectId,
            name: data.name,
            graph_json: data.graph,
            revision: 1
        })
            .select('*')
            .single();
        if (error) {
            throw formatSupabaseError(error, 'create workflow');
        }
        // Insert version 1
        await this.client.from('workflow_versions').insert({
            workflow_id: inserted.id,
            revision: 1,
            graph_json: inserted.graph_json
        });
        return {
            id: inserted.id,
            projectId: inserted.project_id,
            name: inserted.name,
            graph: inserted.graph_json,
            revision: inserted.revision,
            updatedAt: inserted.updated_at
        };
    }
    async save(incoming, expectedRevision) {
        // Optimistic lock update using revision check
        const { data: updated, error } = await this.client
            .from('workflows')
            .update({
            name: incoming.name,
            graph_json: incoming.graph,
            revision: expectedRevision + 1,
            updated_at: new Date().toISOString()
        })
            .eq('id', incoming.id)
            .eq('revision', expectedRevision)
            .select('*')
            .single();
        if (error || !updated) {
            // Conflict or record not found
            const current = await this.getById(incoming.id);
            if (!current) {
                const created = await this.create(incoming);
                return { success: true, workflow: created };
            }
            return {
                success: false,
                conflict: true,
                workflow: current
            };
        }
        // Save version snapshot
        await this.client.from('workflow_versions').insert({
            workflow_id: updated.id,
            revision: updated.revision,
            graph_json: updated.graph_json
        });
        return {
            success: true,
            workflow: {
                id: updated.id,
                projectId: updated.project_id,
                name: updated.name,
                graph: updated.graph_json,
                revision: updated.revision,
                updatedAt: updated.updated_at
            }
        };
    }
    async listVersions(workflowId) {
        const { data, error } = await this.client
            .from('workflow_versions')
            .select('*')
            .eq('workflow_id', workflowId)
            .order('revision', { ascending: false });
        if (error || !data)
            return [];
        return data.map((d) => ({
            id: d.id,
            workflowId: d.workflow_id,
            revision: d.revision,
            graph: d.graph_json,
            createdBy: d.created_by,
            createdAt: d.created_at
        }));
    }
}
export class SupabaseExecutionRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async create(data) {
        const { data: inserted, error } = await this.client
            .from('executions')
            .insert({
            workflow_id: data.workflowId,
            status: 'running',
            triggered_by: data.triggeredBy,
            input_json: data.input
        })
            .select('*')
            .single();
        if (error) {
            throw new Error(`Failed to create execution in Supabase: ${error.message}`);
        }
        return {
            id: inserted.id,
            workflowId: inserted.workflow_id,
            status: inserted.status,
            triggeredBy: inserted.triggered_by,
            input: inserted.input_json,
            startedAt: inserted.started_at,
            finishedAt: inserted.finished_at
        };
    }
    async update(id, updates) {
        const payload = {};
        if (updates.status)
            payload.status = updates.status;
        if (updates.finishedAt)
            payload.finished_at = updates.finishedAt;
        const { data, error } = await this.client
            .from('executions')
            .update(payload)
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            throw new Error(`Failed to update execution ${id}: ${error.message}`);
        }
        return {
            id: data.id,
            workflowId: data.workflow_id,
            status: data.status,
            triggeredBy: data.triggered_by,
            input: data.input_json,
            startedAt: data.started_at,
            finishedAt: data.finished_at
        };
    }
    async getById(id) {
        const { data, error } = await this.client
            .from('executions')
            .select('*')
            .eq('id', id)
            .single();
        if (error || !data)
            return null;
        return {
            id: data.id,
            workflowId: data.workflow_id,
            status: data.status,
            triggeredBy: data.triggered_by,
            input: data.input_json,
            startedAt: data.started_at,
            finishedAt: data.finished_at
        };
    }
    async listByWorkflow(workflowId, limit = 20) {
        const { data, error } = await this.client
            .from('executions')
            .select('*')
            .eq('workflow_id', workflowId)
            .order('started_at', { ascending: false })
            .limit(limit);
        if (error || !data)
            return [];
        return data.map((d) => ({
            id: d.id,
            workflowId: d.workflow_id,
            status: d.status,
            triggeredBy: d.triggered_by,
            input: d.input_json,
            startedAt: d.started_at,
            finishedAt: d.finished_at
        }));
    }
    async recordStep(step) {
        const { data, error } = await this.client
            .from('execution_steps')
            .insert({
            execution_id: step.executionId,
            node_id: step.nodeId,
            status: step.status,
            input_json: step.input,
            output_json: step.output,
            error_message: step.errorMessage,
            duration_ms: step.durationMs,
            started_at: step.startedAt,
            finished_at: step.finishedAt
        })
            .select('*')
            .single();
        if (error) {
            console.error(`Failed to record step ${step.nodeId}:`, error);
            return step;
        }
        return {
            id: data.id,
            executionId: data.execution_id,
            nodeId: data.node_id,
            status: data.status,
            input: data.input_json,
            output: data.output_json,
            errorMessage: data.error_message,
            durationMs: data.duration_ms,
            startedAt: data.started_at,
            finishedAt: data.finished_at
        };
    }
    async getSteps(executionId) {
        const { data, error } = await this.client
            .from('execution_steps')
            .select('*')
            .eq('execution_id', executionId)
            .order('started_at', { ascending: true });
        if (error || !data)
            return [];
        return data.map((d) => ({
            id: d.id,
            executionId: d.execution_id,
            nodeId: d.node_id,
            status: d.status,
            input: d.input_json,
            output: d.output_json,
            errorMessage: d.error_message,
            durationMs: d.duration_ms,
            startedAt: d.started_at,
            finishedAt: d.finished_at
        }));
    }
}
export class SupabaseProjectRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async list() {
        const { data, error } = await this.client
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            throw formatSupabaseError(error, 'list projects');
        }
        if (!data)
            return [];
        return data.map((d) => ({
            id: d.id,
            name: d.name,
            ownerId: d.owner_id,
            createdAt: d.created_at
        }));
    }
    async getById(id) {
        const { data, error } = await this.client
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null;
            throw formatSupabaseError(error, `get project ${id}`);
        }
        if (!data)
            return null;
        return {
            id: data.id,
            name: data.name,
            ownerId: data.owner_id,
            createdAt: data.created_at
        };
    }
    async create(data) {
        const { data: inserted, error } = await this.client
            .from('projects')
            .insert({
            name: data.name,
            owner_id: data.ownerId
        })
            .select('*')
            .single();
        if (error) {
            throw formatSupabaseError(error, 'create project');
        }
        return {
            id: inserted.id,
            name: inserted.name,
            ownerId: inserted.owner_id,
            createdAt: inserted.created_at
        };
    }
}
export class SupabaseApiKeyRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async create(data) {
        const randomHex = crypto.randomBytes(24).toString('hex');
        const plaintextToken = `rl_live_${randomHex}`;
        const keyPrefix = plaintextToken.substring(0, 16);
        const secretHash = crypto.createHash('sha256').update(plaintextToken).digest('hex');
        const { data: inserted, error } = await this.client
            .from('integration_api_keys')
            .insert({
            name: data.name,
            project_id: data.projectId,
            key_prefix: keyPrefix,
            secret_hash: secretHash,
            scopes: data.scopes,
            expires_at: data.expiresAt || null
        })
            .select('*')
            .single();
        if (error) {
            throw formatSupabaseError(error, 'create API key');
        }
        const apiKey = {
            id: inserted.id,
            projectId: inserted.project_id,
            name: inserted.name,
            keyPrefix: inserted.key_prefix,
            secretHash: inserted.secret_hash,
            scopes: inserted.scopes,
            createdAt: inserted.created_at,
            lastUsedAt: inserted.last_used_at,
            expiresAt: inserted.expires_at,
            revokedAt: inserted.revoked_at
        };
        return { apiKey, plaintextToken };
    }
    async findByKeyPrefix(keyPrefix) {
        const { data, error } = await this.client
            .from('integration_api_keys')
            .select('*')
            .eq('key_prefix', keyPrefix)
            .is('revoked_at', null)
            .single();
        if (error || !data)
            return null;
        return {
            id: data.id,
            projectId: data.project_id,
            name: data.name,
            keyPrefix: data.key_prefix,
            secretHash: data.secret_hash,
            scopes: data.scopes,
            createdAt: data.created_at,
            lastUsedAt: data.last_used_at,
            expiresAt: data.expires_at,
            revokedAt: data.revoked_at
        };
    }
    async listByProject(projectId) {
        const { data, error } = await this.client
            .from('integration_api_keys')
            .select('*')
            .eq('project_id', projectId)
            .is('revoked_at', null)
            .order('created_at', { ascending: false });
        if (error || !data)
            return [];
        return data.map((d) => ({
            id: d.id,
            projectId: d.project_id,
            name: d.name,
            keyPrefix: d.key_prefix,
            secretHash: d.secret_hash,
            scopes: d.scopes,
            createdAt: d.created_at,
            lastUsedAt: d.last_used_at,
            expiresAt: d.expires_at,
            revokedAt: d.revoked_at
        }));
    }
    async revoke(id, projectId) {
        const { data, error } = await this.client
            .from('integration_api_keys')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', id)
            .eq('project_id', projectId)
            .select('id')
            .single();
        if (error || !data)
            return false;
        return true;
    }
    async updateLastUsed(id) {
        await this.client
            .from('integration_api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', id);
    }
}
export class SupabaseIntegrationRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    mapRow(row) {
        return {
            id: row.id,
            projectId: row.project_id,
            name: row.name,
            appType: row.app_type,
            baseUrl: row.base_url,
            httpMethod: row.http_method,
            authType: row.auth_type,
            encryptedAuth: row.encrypted_auth,
            authHeaderName: row.auth_header_name,
            headers: row.headers || {},
            timeoutMs: row.timeout_ms,
            testEndpoint: row.test_endpoint,
            testMethod: row.test_method,
            status: row.status,
            lastTestedAt: row.last_tested_at,
            lastTestStatus: row.last_test_status,
            lastTestMessage: row.last_test_message,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    async create(data) {
        const encryptedAuth = data.secret ? encryptCredential(data.secret) : data.encryptedAuth;
        const { data: inserted, error } = await this.client
            .from('app_integrations')
            .insert({
            project_id: data.projectId,
            name: data.name,
            app_type: data.appType || 'generic_http',
            base_url: data.baseUrl,
            http_method: data.httpMethod || 'POST',
            auth_type: data.authType || 'none',
            encrypted_auth: encryptedAuth,
            auth_header_name: data.authHeaderName,
            headers: data.headers || {},
            timeout_ms: data.timeoutMs || 5000,
            test_endpoint: data.testEndpoint,
            test_method: data.testMethod || 'GET',
            status: data.status || 'active'
        })
            .select('*')
            .single();
        if (error) {
            throw formatSupabaseError(error, 'create integration');
        }
        return this.mapRow(inserted);
    }
    async update(id, updates) {
        const payload = {
            updated_at: new Date().toISOString()
        };
        if (updates.name !== undefined)
            payload.name = updates.name;
        if (updates.baseUrl !== undefined)
            payload.base_url = updates.baseUrl;
        if (updates.httpMethod !== undefined)
            payload.http_method = updates.httpMethod;
        if (updates.authType !== undefined)
            payload.auth_type = updates.authType;
        if (updates.authHeaderName !== undefined)
            payload.auth_header_name = updates.authHeaderName;
        if (updates.headers !== undefined)
            payload.headers = updates.headers;
        if (updates.timeoutMs !== undefined)
            payload.timeout_ms = updates.timeoutMs;
        if (updates.testEndpoint !== undefined)
            payload.test_endpoint = updates.testEndpoint;
        if (updates.testMethod !== undefined)
            payload.test_method = updates.testMethod;
        if (updates.status !== undefined)
            payload.status = updates.status;
        if (updates.lastTestedAt !== undefined)
            payload.last_tested_at = updates.lastTestedAt;
        if (updates.lastTestStatus !== undefined)
            payload.last_test_status = updates.lastTestStatus;
        if (updates.lastTestMessage !== undefined)
            payload.last_test_message = updates.lastTestMessage;
        if (updates.secret !== undefined) {
            payload.encrypted_auth = encryptCredential(updates.secret);
        }
        else if (updates.encryptedAuth !== undefined) {
            payload.encrypted_auth = updates.encryptedAuth;
        }
        const { data: updated, error } = await this.client
            .from('app_integrations')
            .update(payload)
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            throw formatSupabaseError(error, `update integration ${id}`);
        }
        return this.mapRow(updated);
    }
    async getById(id) {
        const { data, error } = await this.client
            .from('app_integrations')
            .select('*')
            .eq('id', id)
            .single();
        if (error || !data)
            return null;
        return this.mapRow(data);
    }
    async listByProject(projectId) {
        const { data, error } = await this.client
            .from('app_integrations')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });
        if (error || !data)
            return [];
        return data.map((d) => this.mapRow(d));
    }
    async delete(id, projectId) {
        const { data, error } = await this.client
            .from('app_integrations')
            .delete()
            .eq('id', id)
            .eq('project_id', projectId)
            .select('id')
            .single();
        if (error || !data)
            return false;
        return true;
    }
    async getDecryptedSecret(id) {
        const { data, error } = await this.client
            .from('app_integrations')
            .select('encrypted_auth')
            .eq('id', id)
            .single();
        if (error || !data || !data.encrypted_auth)
            return null;
        try {
            return decryptCredential(data.encrypted_auth);
        }
        catch {
            return null;
        }
    }
}
export function createSupabaseRepositories(url, serviceRoleKey) {
    const client = createClient(url, serviceRoleKey);
    return {
        workflows: new SupabaseWorkflowRepository(client),
        executions: new SupabaseExecutionRepository(client),
        projects: new SupabaseProjectRepository(client),
        apiKeys: new SupabaseApiKeyRepository(client),
        integrations: new SupabaseIntegrationRepository(client)
    };
}
//# sourceMappingURL=SupabaseRepository.js.map