/**
 * Relay Client API
 * Provides unified, typed access to Relay REST endpoints with automatic
 * environment resolution (Netlify proxy, Render production URL, localhost).
 */

import { Project, Workflow, Execution, ExecutionStep } from '@relay/shared';

export interface DatabaseStatus {
  status: 'ready' | 'migration_required' | 'error';
  databaseConfigured: boolean;
  supabaseUrl: string | null;
  checks: {
    projectsTable: boolean;
    workflowsTable: boolean;
  };
  migrationFile: string;
  reloadCommand: string;
  message: string;
}

export interface ExecutionResponse {
  execution: Execution;
  summary: {
    status: 'succeeded' | 'failed';
    totalDurationMs: number;
    steps: Array<{
      nodeId: string;
      status: string;
      durationMs: number;
      input: any;
      output: any;
      errorMessage?: string;
    }>;
  };
}

export function getApiBaseUrl(): string {
  // If Vite env variable is explicitly set
  if (import.meta.env.VITE_API_URL) {
    return (import.meta.env.VITE_API_URL as string).replace(/\/$/, '');
  }
  // If defined at build time
  // @ts-ignore
  if (typeof __API_URL__ !== 'undefined' && __API_URL__) {
    // @ts-ignore
    return (__API_URL__ as string).replace(/\/$/, '');
  }
  // If running in browser on netlify or custom domain without local backend, fallback to Render URL
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('netlify.app')) {
      // Netlify proxy is configured, or can use direct URL if needed
      return 'https://relay-api-bo0p.onrender.com';
    }
  }
  // Default to relative (for dev proxy or same-domain deployment)
  return '';
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = data?.message || (typeof data === 'string' ? data : `Request failed with status ${response.status}`);
    const err = new Error(errorMsg);
    // @ts-ignore
    err.code = data?.code || 'API_ERROR';
    // @ts-ignore
    err.status = response.status;
    // @ts-ignore
    err.data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  getBaseUrl: getApiBaseUrl,

  // Health
  async getHealth() {
    return request<{ status: string; service: string; uptimeSeconds: number }>('/api/health');
  },

  // Database Schema Status
  async getDatabaseStatus(): Promise<DatabaseStatus> {
    return request<DatabaseStatus>('/api/database/status');
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await request<{ projects: Project[] }>('/api/projects');
    return res.projects || [];
  },

  async createProject(name: string): Promise<Project> {
    const res = await request<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return res.project;
  },

  // Workflows
  async getWorkflow(id: string): Promise<{ workflow: Workflow; _databaseNotice?: string }> {
    return request<{ workflow: Workflow; _databaseNotice?: string }>(`/api/workflows/${id}`);
  },

  async saveWorkflow(id: string, graph: any, name: string, expectedRevision: number): Promise<{ workflow: Workflow }> {
    return request<{ workflow: Workflow }>(`/api/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ graph, name, expectedRevision }),
    });
  },

  // Executions
  async executeWorkflow(id: string, input: any = {}, graphOverride?: any): Promise<ExecutionResponse> {
    return request<ExecutionResponse>(`/api/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ input, graphOverride }),
    });
  },

  async getExecutions(workflowId: string): Promise<Execution[]> {
    const res = await request<{ executions: Execution[] }>(`/api/workflows/${workflowId}/executions`);
    return res.executions || [];
  },

  async getExecution(id: string): Promise<{ execution: Execution; steps: ExecutionStep[] }> {
    return request<{ execution: Execution; steps: ExecutionStep[] }>(`/api/executions/${id}`);
  },
};
