import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  ApiKey,
  ApiKeyScope,
  AppIntegration,
  Execution, 
  ExecutionStep, 
  Project, 
  Workflow, 
  WorkflowVersion,
  SEEDED_SAMPLE_WORKFLOW,
  sanitizeWorkflowGraph
} from '@relay/shared';
import { 
  IApiKeyRepository,
  IExecutionRepository, 
  IIntegrationRepository,
  IProjectRepository, 
  IRepositories, 
  IWorkflowRepository, 
  SaveWorkflowResult 
} from './interfaces';
import { encryptCredential, decryptCredential } from './InMemoryRepository';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(id: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

export function formatSupabaseError(error: any, operation: string): Error {
  const msg = error?.message || (typeof error === 'string' ? error : 'Unknown database error');
  if (msg.includes('Could not find the table') || msg.includes('schema cache') || msg.includes('does not exist')) {
    return new Error(
      `Database schema not initialized for ${operation}: ${msg}. ` +
      `Please execute database/migrations/001_initial_schema.sql in your Supabase SQL Editor and reload the schema cache (NOTIFY pgrst, 'reload schema';).`
    );
  }
  return new Error(`Failed to ${operation} in Supabase: ${msg}`);
}

export class SupabaseWorkflowRepository implements IWorkflowRepository {
  constructor(private client: SupabaseClient) {}

  async getById(id: string): Promise<Workflow | null> {
    if (!id || !isUuid(id)) return null;

    const { data, error } = await this.client
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // 0 rows returned
      if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
        throw formatSupabaseError(error, `retrieve workflow ${id}`);
      }
      return null;
    }
    if (!data) return null;

    return {
      id: data.id,
      projectId: data.project_id,
      name: data.name,
      graph: data.graph_json,
      revision: data.revision,
      updatedAt: data.updated_at
    };
  }

  private async resolveProjectId(projectId?: string): Promise<string> {
    if (projectId && isUuid(projectId)) {
      return projectId;
    }
    const { data: projs } = await this.client.from('projects').select('id').limit(1);
    if (projs && projs.length > 0) {
      return projs[0].id;
    }
    const { data: newProj } = await this.client
      .from('projects')
      .insert({ name: 'Default Workspace' })
      .select('id')
      .single();
    return newProj ? newProj.id : '00000000-0000-0000-0000-000000000001';
  }

  async create(data: Omit<Workflow, 'id' | 'revision' | 'updatedAt'> & { id?: string }): Promise<Workflow> {
    const targetProjectId = await this.resolveProjectId(data.projectId);
    const cleanGraph = sanitizeWorkflowGraph(data.graph);

    const insertPayload: any = {
      project_id: targetProjectId,
      name: data.name,
      graph_json: cleanGraph,
      revision: 1
    };

    if (data.id && isUuid(data.id)) {
      insertPayload.id = data.id;
    }

    const { data: inserted, error } = await this.client
      .from('workflows')
      .insert(insertPayload)
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

  async save(incoming: Workflow, expectedRevision: number): Promise<SaveWorkflowResult> {
    const cleanGraph = sanitizeWorkflowGraph(incoming.graph);

    // If incoming ID is not a valid UUID (e.g. demo template 'wf_demo_onboarding'),
    // create a new workflow record with a real generated UUID in Supabase
    if (!isUuid(incoming.id)) {
      const created = await this.create({
        ...incoming,
        id: undefined,
        graph: cleanGraph
      });
      return { success: true, workflow: created };
    }

    // Optimistic lock update using revision check
    const { data: updated, error } = await this.client
      .from('workflows')
      .update({
        name: incoming.name,
        graph_json: cleanGraph,
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
        const created = await this.create({ ...incoming, id: incoming.id, graph: cleanGraph });
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

  async listVersions(workflowId: string): Promise<WorkflowVersion[]> {
    const { data, error } = await this.client
      .from('workflow_versions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('revision', { ascending: false });

    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      workflowId: d.workflow_id,
      revision: d.revision,
      graph: d.graph_json,
      createdBy: d.created_by,
      createdAt: d.created_at
    }));
  }

  async listByProject(projectId: string): Promise<Workflow[]> {
    const targetProjectId = await this.resolveProjectId(projectId);
    const { data, error } = await this.client
      .from('workflows')
      .select('*')
      .eq('project_id', targetProjectId)
      .order('updated_at', { ascending: false });

    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      projectId: d.project_id,
      name: d.name,
      graph: d.graph_json,
      revision: d.revision,
      updatedAt: d.updated_at
    }));
  }
}

export class SupabaseExecutionRepository implements IExecutionRepository {
  constructor(private client: SupabaseClient) {}

  async create(data: { workflowId: string; input: any; triggeredBy?: string }): Promise<Execution> {
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

  async update(id: string, updates: Partial<Execution>): Promise<Execution> {
    const payload: any = {};
    if (updates.status) payload.status = updates.status;
    if (updates.finishedAt) payload.finished_at = updates.finishedAt;

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

  async getById(id: string): Promise<Execution | null> {
    const { data, error } = await this.client
      .from('executions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

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

  async listByWorkflow(workflowId: string, limit: number = 20): Promise<Execution[]> {
    const { data, error } = await this.client
      .from('executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      workflowId: d.workflow_id,
      status: d.status,
      triggeredBy: d.triggered_by,
      input: d.input_json,
      startedAt: d.started_at,
      finishedAt: d.finished_at
    }));
  }

  async recordStep(step: ExecutionStep): Promise<ExecutionStep> {
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

  async getSteps(executionId: string): Promise<ExecutionStep[]> {
    const { data, error } = await this.client
      .from('execution_steps')
      .select('*')
      .eq('execution_id', executionId)
      .order('started_at', { ascending: true });

    if (error || !data) return [];

    return data.map((d: any) => ({
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

export class SupabaseProjectRepository implements IProjectRepository {
  constructor(private client: SupabaseClient) {}

  async list(): Promise<Project[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw formatSupabaseError(error, 'list projects');
    }
    if (!data) return [];
    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      ownerId: d.owner_id,
      createdAt: d.created_at
    }));
  }

  async getById(id: string): Promise<Project | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw formatSupabaseError(error, `get project ${id}`);
    }
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      ownerId: data.owner_id,
      createdAt: data.created_at
    };
  }

  async create(data: { name: string; ownerId?: string }): Promise<Project> {
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

export class SupabaseApiKeyRepository implements IApiKeyRepository {
  constructor(private client: SupabaseClient) {}

  async create(data: { name: string; projectId: string; scopes: ApiKeyScope[]; expiresAt?: string }): Promise<{ apiKey: ApiKey; plaintextToken: string }> {
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

    const apiKey: ApiKey = {
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

  async findByKeyPrefix(keyPrefix: string): Promise<ApiKey | null> {
    const { data, error } = await this.client
      .from('integration_api_keys')
      .select('*')
      .eq('key_prefix', keyPrefix)
      .is('revoked_at', null)
      .single();

    if (error || !data) return null;

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

  async listByProject(projectId: string): Promise<ApiKey[]> {
    const { data, error } = await this.client
      .from('integration_api_keys')
      .select('*')
      .eq('project_id', projectId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((d: any) => ({
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

  async revoke(id: string, projectId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('integration_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('project_id', projectId)
      .select('id')
      .single();

    if (error || !data) return false;
    return true;
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.client
      .from('integration_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', id);
  }
}

export class SupabaseIntegrationRepository implements IIntegrationRepository {
  constructor(private client: SupabaseClient) {}

  private mapRow(row: any): AppIntegration {
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

  private async resolveProjectId(projectId?: string): Promise<string> {
    if (projectId && isUuid(projectId)) {
      return projectId;
    }
    const { data: projs } = await this.client.from('projects').select('id').limit(1);
    if (projs && projs.length > 0) {
      return projs[0].id;
    }
    const { data: newProj } = await this.client
      .from('projects')
      .insert({ name: 'Default Workspace' })
      .select('id')
      .single();
    return newProj ? newProj.id : '00000000-0000-0000-0000-000000000001';
  }

  async create(data: Omit<AppIntegration, 'id' | 'createdAt' | 'updatedAt'> & { secret?: string }): Promise<AppIntegration> {
    const encryptedAuth = data.secret ? encryptCredential(data.secret) : data.encryptedAuth;
    const targetProjectId = await this.resolveProjectId(data.projectId);

    const { data: inserted, error } = await this.client
      .from('app_integrations')
      .insert({
        project_id: targetProjectId,
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

  async update(id: string, updates: Partial<AppIntegration> & { secret?: string }): Promise<AppIntegration> {
    const payload: any = {
      updated_at: new Date().toISOString()
    };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.baseUrl !== undefined) payload.base_url = updates.baseUrl;
    if (updates.httpMethod !== undefined) payload.http_method = updates.httpMethod;
    if (updates.authType !== undefined) payload.auth_type = updates.authType;
    if (updates.authHeaderName !== undefined) payload.auth_header_name = updates.authHeaderName;
    if (updates.headers !== undefined) payload.headers = updates.headers;
    if (updates.timeoutMs !== undefined) payload.timeout_ms = updates.timeoutMs;
    if (updates.testEndpoint !== undefined) payload.test_endpoint = updates.testEndpoint;
    if (updates.testMethod !== undefined) payload.test_method = updates.testMethod;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.lastTestedAt !== undefined) payload.last_tested_at = updates.lastTestedAt;
    if (updates.lastTestStatus !== undefined) payload.last_test_status = updates.lastTestStatus;
    if (updates.lastTestMessage !== undefined) payload.last_test_message = updates.lastTestMessage;

    if (updates.secret !== undefined) {
      payload.encrypted_auth = encryptCredential(updates.secret);
    } else if (updates.encryptedAuth !== undefined) {
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

  async getById(id: string): Promise<AppIntegration | null> {
    const { data, error } = await this.client
      .from('app_integrations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapRow(data);
  }

  async listByProject(projectId: string): Promise<AppIntegration[]> {
    const targetProjectId = await this.resolveProjectId(projectId);
    const { data, error } = await this.client
      .from('app_integrations')
      .select('*')
      .eq('project_id', targetProjectId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((d: any) => this.mapRow(d));
  }

  async delete(id: string, projectId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('app_integrations')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId)
      .select('id')
      .single();

    if (error || !data) return false;
    return true;
  }

  async getDecryptedSecret(id: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('app_integrations')
      .select('encrypted_auth')
      .eq('id', id)
      .single();

    if (error || !data || !data.encrypted_auth) return null;
    try {
      return decryptCredential(data.encrypted_auth);
    } catch {
      return null;
    }
  }
}

export function createSupabaseRepositories(url: string, serviceRoleKey: string): IRepositories {
  const client = createClient(url, serviceRoleKey);
  return {
    workflows: new SupabaseWorkflowRepository(client),
    executions: new SupabaseExecutionRepository(client),
    projects: new SupabaseProjectRepository(client),
    apiKeys: new SupabaseApiKeyRepository(client),
    integrations: new SupabaseIntegrationRepository(client)
  };
}


