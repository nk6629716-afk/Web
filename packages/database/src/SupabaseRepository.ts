import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Execution, 
  ExecutionStep, 
  Project, 
  Workflow, 
  WorkflowVersion,
  SEEDED_SAMPLE_WORKFLOW
} from '@relay/shared';
import { 
  IExecutionRepository, 
  IProjectRepository, 
  IRepositories, 
  IWorkflowRepository, 
  SaveWorkflowResult 
} from './interfaces';

export class SupabaseWorkflowRepository implements IWorkflowRepository {
  constructor(private client: SupabaseClient) {}

  async getById(id: string): Promise<Workflow | null> {
    const { data, error } = await this.client
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      projectId: data.project_id,
      name: data.name,
      graph: data.graph_json,
      revision: data.revision,
      updatedAt: data.updated_at
    };
  }

  async create(data: Omit<Workflow, 'revision' | 'updatedAt'>): Promise<Workflow> {
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
      throw new Error(`Failed to create workflow in Supabase: ${error.message}`);
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

    if (error || !data) return [];
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

    if (error || !data) return null;
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
      throw new Error(`Failed to create project in Supabase: ${error.message}`);
    }

    return {
      id: inserted.id,
      name: inserted.name,
      ownerId: inserted.owner_id,
      createdAt: inserted.created_at
    };
  }
}

export function createSupabaseRepositories(url: string, serviceRoleKey: string): IRepositories {
  const client = createClient(url, serviceRoleKey);
  return {
    workflows: new SupabaseWorkflowRepository(client),
    executions: new SupabaseExecutionRepository(client),
    projects: new SupabaseProjectRepository(client)
  };
}
