import { ApiKey, ApiKeyScope, Execution, ExecutionStep, Project, Workflow, WorkflowVersion } from '@relay/shared';
import { IApiKeyRepository, IExecutionRepository, IProjectRepository, IRepositories, IWorkflowRepository, SaveWorkflowResult } from './interfaces';
export declare class InMemoryWorkflowRepository implements IWorkflowRepository {
    private workflows;
    private versions;
    constructor();
    getById(id: string): Promise<Workflow | null>;
    create(data: Omit<Workflow, 'revision' | 'updatedAt'>): Promise<Workflow>;
    save(incoming: Workflow, expectedRevision: number): Promise<SaveWorkflowResult>;
    listVersions(workflowId: string): Promise<WorkflowVersion[]>;
}
export declare class InMemoryExecutionRepository implements IExecutionRepository {
    private executions;
    private steps;
    create(data: {
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
export declare class InMemoryProjectRepository implements IProjectRepository {
    private projects;
    constructor();
    list(): Promise<Project[]>;
    getById(id: string): Promise<Project | null>;
    create(data: {
        name: string;
        ownerId?: string;
    }): Promise<Project>;
}
export declare class InMemoryApiKeyRepository implements IApiKeyRepository {
    private keys;
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
export declare function createInMemoryRepositories(): IRepositories;
//# sourceMappingURL=InMemoryRepository.d.ts.map