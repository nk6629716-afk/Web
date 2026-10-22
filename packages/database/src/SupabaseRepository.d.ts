import { SupabaseClient } from '@supabase/supabase-js';
import { Execution, ExecutionStep, Project, Workflow, WorkflowVersion } from '@relay/shared';
import { IExecutionRepository, IProjectRepository, IRepositories, IWorkflowRepository, SaveWorkflowResult } from './interfaces';
export declare class SupabaseWorkflowRepository implements IWorkflowRepository {
    private client;
    constructor(client: SupabaseClient);
    getById(id: string): Promise<Workflow | null>;
    create(data: Omit<Workflow, 'revision' | 'updatedAt'>): Promise<Workflow>;
    save(incoming: Workflow, expectedRevision: number): Promise<SaveWorkflowResult>;
    listVersions(workflowId: string): Promise<WorkflowVersion[]>;
}
export declare class SupabaseExecutionRepository implements IExecutionRepository {
    private client;
    constructor(client: SupabaseClient);
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
export declare class SupabaseProjectRepository implements IProjectRepository {
    private client;
    constructor(client: SupabaseClient);
    list(): Promise<Project[]>;
    getById(id: string): Promise<Project | null>;
    create(data: {
        name: string;
        ownerId?: string;
    }): Promise<Project>;
}
export declare function createSupabaseRepositories(url: string, serviceRoleKey: string): IRepositories;
//# sourceMappingURL=SupabaseRepository.d.ts.map