import { ApiKey, ApiKeyScope, Execution, ExecutionStep, Project, Workflow, WorkflowVersion } from '@relay/shared';
export interface SaveWorkflowResult {
    success: boolean;
    workflow: Workflow;
    conflict?: boolean;
}
export interface IWorkflowRepository {
    getById(id: string): Promise<Workflow | null>;
    create(workflow: Omit<Workflow, 'revision' | 'updatedAt'>): Promise<Workflow>;
    save(workflow: Workflow, expectedRevision: number): Promise<SaveWorkflowResult>;
    listVersions(workflowId: string): Promise<WorkflowVersion[]>;
}
export interface IExecutionRepository {
    create(execution: {
        workflowId: string;
        input: any;
        triggeredBy?: string;
    }): Promise<Execution>;
    update(id: string, updates: Partial<Execution>): Promise<Execution>;
    getById(id: string): Promise<Execution | null>;
    listByWorkflow(workflowId: string, limit?: number): Promise<Execution[]>;
    recordStep(step: ExecutionStep): Promise<ExecutionStep>;
    getSteps(executionId: string): Promise<ExecutionStep[]>;
}
export interface IProjectRepository {
    list(): Promise<Project[]>;
    getById(id: string): Promise<Project | null>;
    create(project: {
        name: string;
        ownerId?: string;
    }): Promise<Project>;
}
export interface IApiKeyRepository {
    create(data: {
        name: string;
        projectId: string;
        scopes: ApiKeyScope[];
        expiresAt?: string;
    }): Promise<{
        apiKey: ApiKey;
        plaintextToken: string;
    }>;
    findByKeyPrefix(keyPrefix: string): Promise<ApiKey | null>;
    listByProject(projectId: string): Promise<ApiKey[]>;
    revoke(id: string, projectId: string): Promise<boolean>;
    updateLastUsed(id: string): Promise<void>;
}
export interface IRepositories {
    workflows: IWorkflowRepository;
    executions: IExecutionRepository;
    projects: IProjectRepository;
    apiKeys: IApiKeyRepository;
}
//# sourceMappingURL=interfaces.d.ts.map