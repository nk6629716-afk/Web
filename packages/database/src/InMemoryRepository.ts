import crypto from 'crypto';
import { 
  ApiKey,
  ApiKeyScope,
  Execution, 
  ExecutionStep, 
  Project, 
  Workflow, 
  WorkflowVersion, 
  SEEDED_SAMPLE_WORKFLOW 
} from '@relay/shared';
import { 
  IApiKeyRepository,
  IExecutionRepository, 
  IProjectRepository, 
  IRepositories, 
  IWorkflowRepository, 
  SaveWorkflowResult 
} from './interfaces';


export class InMemoryWorkflowRepository implements IWorkflowRepository {
  private workflows = new Map<string, Workflow>();
  private versions = new Map<string, WorkflowVersion[]>();

  constructor() {
    // Seed with sample workflow
    this.workflows.set(SEEDED_SAMPLE_WORKFLOW.id, JSON.parse(JSON.stringify(SEEDED_SAMPLE_WORKFLOW)));
    this.versions.set(SEEDED_SAMPLE_WORKFLOW.id, [
      {
        id: `v-1-${SEEDED_SAMPLE_WORKFLOW.id}`,
        workflowId: SEEDED_SAMPLE_WORKFLOW.id,
        revision: 1,
        graph: JSON.parse(JSON.stringify(SEEDED_SAMPLE_WORKFLOW.graph)),
        createdAt: new Date().toISOString()
      }
    ]);
  }

  async getById(id: string): Promise<Workflow | null> {
    const wf = this.workflows.get(id);
    if (!wf) return null;
    return JSON.parse(JSON.stringify(wf));
  }

  async create(data: Omit<Workflow, 'revision' | 'updatedAt'>): Promise<Workflow> {
    const newWorkflow: Workflow = {
      ...data,
      revision: 1,
      updatedAt: new Date().toISOString()
    };
    this.workflows.set(newWorkflow.id, JSON.parse(JSON.stringify(newWorkflow)));
    this.versions.set(newWorkflow.id, [
      {
        id: `v-1-${newWorkflow.id}`,
        workflowId: newWorkflow.id,
        revision: 1,
        graph: JSON.parse(JSON.stringify(newWorkflow.graph)),
        createdAt: newWorkflow.updatedAt
      }
    ]);
    return newWorkflow;
  }

  async save(incoming: Workflow, expectedRevision: number): Promise<SaveWorkflowResult> {
    const current = this.workflows.get(incoming.id);
    if (!current) {
      // First save / insert
      const created = await this.create(incoming);
      return { success: true, workflow: created };
    }

    // Monotonically increasing revision check (optimistic lock)
    if (current.revision !== expectedRevision) {
      return {
        success: false,
        conflict: true,
        workflow: JSON.parse(JSON.stringify(current))
      };
    }

    const nextRevision = current.revision + 1;
    const updated: Workflow = {
      ...incoming,
      revision: nextRevision,
      updatedAt: new Date().toISOString()
    };

    this.workflows.set(incoming.id, JSON.parse(JSON.stringify(updated)));

    // Record version snapshot
    const versionList = this.versions.get(incoming.id) || [];
    versionList.push({
      id: `v-${nextRevision}-${incoming.id}`,
      workflowId: incoming.id,
      revision: nextRevision,
      graph: JSON.parse(JSON.stringify(updated.graph)),
      createdAt: updated.updatedAt
    });
    this.versions.set(incoming.id, versionList);

    return {
      success: true,
      workflow: JSON.parse(JSON.stringify(updated))
    };
  }

  async listVersions(workflowId: string): Promise<WorkflowVersion[]> {
    const list = this.versions.get(workflowId) || [];
    return JSON.parse(JSON.stringify(list));
  }
}

export class InMemoryExecutionRepository implements IExecutionRepository {
  private executions = new Map<string, Execution>();
  private steps = new Map<string, ExecutionStep[]>();

  async create(data: { workflowId: string; input: any; triggeredBy?: string }): Promise<Execution> {
    const id = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const exec: Execution = {
      id,
      workflowId: data.workflowId,
      status: 'running',
      triggeredBy: data.triggeredBy,
      input: data.input,
      startedAt: new Date().toISOString()
    };
    this.executions.set(id, exec);
    this.steps.set(id, []);
    return { ...exec };
  }

  async update(id: string, updates: Partial<Execution>): Promise<Execution> {
    const current = this.executions.get(id);
    if (!current) {
      throw new Error(`Execution ${id} not found`);
    }
    const updated: Execution = {
      ...current,
      ...updates
    };
    this.executions.set(id, updated);
    return { ...updated };
  }

  async getById(id: string): Promise<Execution | null> {
    const exec = this.executions.get(id);
    if (!exec) return null;
    return { ...exec };
  }

  async listByWorkflow(workflowId: string, limit: number = 20): Promise<Execution[]> {
    const all = Array.from(this.executions.values())
      .filter(e => e.workflowId === workflowId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
    return JSON.parse(JSON.stringify(all));
  }

  async recordStep(step: ExecutionStep): Promise<ExecutionStep> {
    const list = this.steps.get(step.executionId) || [];
    list.push(step);
    this.steps.set(step.executionId, list);
    return { ...step };
  }

  async getSteps(executionId: string): Promise<ExecutionStep[]> {
    const list = this.steps.get(executionId) || [];
    return JSON.parse(JSON.stringify(list));
  }
}

export class InMemoryProjectRepository implements IProjectRepository {
  private projects = new Map<string, Project>();

  constructor() {
    this.projects.set('demo-project-001', {
      id: 'demo-project-001',
      name: 'Default Workspace',
      createdAt: new Date().toISOString()
    });
  }

  async list(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getById(id: string): Promise<Project | null> {
    return this.projects.get(id) || null;
  }

  async create(data: { name: string; ownerId?: string }): Promise<Project> {
    const id = `proj-${Date.now()}`;
    const project: Project = {
      id,
      name: data.name,
      ownerId: data.ownerId,
      createdAt: new Date().toISOString()
    };
    this.projects.set(id, project);
    return project;
  }
}

export class InMemoryApiKeyRepository implements IApiKeyRepository {
  private keys = new Map<string, ApiKey>();

  async create(data: { name: string; projectId: string; scopes: ApiKeyScope[]; expiresAt?: string }): Promise<{ apiKey: ApiKey; plaintextToken: string }> {
    const randomHex = crypto.randomBytes(24).toString('hex');
    const plaintextToken = `rl_live_${randomHex}`;
    const keyPrefix = plaintextToken.substring(0, 16);
    const secretHash = crypto.createHash('sha256').update(plaintextToken).digest('hex');

    const id = `key-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const apiKey: ApiKey = {
      id,
      projectId: data.projectId,
      name: data.name,
      keyPrefix,
      secretHash,
      scopes: data.scopes,
      createdAt: new Date().toISOString(),
      expiresAt: data.expiresAt
    };

    this.keys.set(id, apiKey);
    return {
      apiKey: JSON.parse(JSON.stringify(apiKey)),
      plaintextToken
    };
  }

  async findByKeyPrefix(keyPrefix: string): Promise<ApiKey | null> {
    for (const key of this.keys.values()) {
      if (key.keyPrefix === keyPrefix && !key.revokedAt) {
        return JSON.parse(JSON.stringify(key));
      }
    }
    return null;
  }

  async listByProject(projectId: string): Promise<ApiKey[]> {
    const list = Array.from(this.keys.values()).filter(k => k.projectId === projectId && !k.revokedAt);
    return JSON.parse(JSON.stringify(list));
  }

  async revoke(id: string, projectId: string): Promise<boolean> {
    const key = this.keys.get(id);
    if (!key || key.projectId !== projectId) return false;
    key.revokedAt = new Date().toISOString();
    return true;
  }

  async updateLastUsed(id: string): Promise<void> {
    const key = this.keys.get(id);
    if (key) {
      key.lastUsedAt = new Date().toISOString();
    }
  }
}

export function createInMemoryRepositories(): IRepositories {
  return {
    workflows: new InMemoryWorkflowRepository(),
    executions: new InMemoryExecutionRepository(),
    projects: new InMemoryProjectRepository(),
    apiKeys: new InMemoryApiKeyRepository()
  };
}

