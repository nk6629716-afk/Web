import crypto from 'crypto';
import { SEEDED_SAMPLE_WORKFLOW } from '@relay/shared';
export class InMemoryWorkflowRepository {
    workflows = new Map();
    versions = new Map();
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
    async getById(id) {
        const wf = this.workflows.get(id);
        if (!wf)
            return null;
        return JSON.parse(JSON.stringify(wf));
    }
    async create(data) {
        const newWorkflow = {
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
    async save(incoming, expectedRevision) {
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
        const updated = {
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
    async listVersions(workflowId) {
        const list = this.versions.get(workflowId) || [];
        return JSON.parse(JSON.stringify(list));
    }
}
export class InMemoryExecutionRepository {
    executions = new Map();
    steps = new Map();
    async create(data) {
        const id = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const exec = {
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
    async update(id, updates) {
        const current = this.executions.get(id);
        if (!current) {
            throw new Error(`Execution ${id} not found`);
        }
        const updated = {
            ...current,
            ...updates
        };
        this.executions.set(id, updated);
        return { ...updated };
    }
    async getById(id) {
        const exec = this.executions.get(id);
        if (!exec)
            return null;
        return { ...exec };
    }
    async listByWorkflow(workflowId, limit = 20) {
        const all = Array.from(this.executions.values())
            .filter(e => e.workflowId === workflowId)
            .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
            .slice(0, limit);
        return JSON.parse(JSON.stringify(all));
    }
    async recordStep(step) {
        const list = this.steps.get(step.executionId) || [];
        list.push(step);
        this.steps.set(step.executionId, list);
        return { ...step };
    }
    async getSteps(executionId) {
        const list = this.steps.get(executionId) || [];
        return JSON.parse(JSON.stringify(list));
    }
}
export class InMemoryProjectRepository {
    projects = new Map();
    constructor() {
        this.projects.set('demo-project-001', {
            id: 'demo-project-001',
            name: 'Default Workspace',
            createdAt: new Date().toISOString()
        });
    }
    async list() {
        return Array.from(this.projects.values());
    }
    async getById(id) {
        return this.projects.get(id) || null;
    }
    async create(data) {
        const id = `proj-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const project = {
            id,
            name: data.name,
            ownerId: data.ownerId,
            createdAt: new Date().toISOString()
        };
        this.projects.set(id, project);
        return project;
    }
}
export class InMemoryApiKeyRepository {
    keys = new Map();
    async create(data) {
        const randomHex = crypto.randomBytes(24).toString('hex');
        const plaintextToken = `rl_live_${randomHex}`;
        const keyPrefix = plaintextToken.substring(0, 16);
        const secretHash = crypto.createHash('sha256').update(plaintextToken).digest('hex');
        const id = `key-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const apiKey = {
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
    async findByKeyPrefix(keyPrefix) {
        for (const key of this.keys.values()) {
            if (key.keyPrefix === keyPrefix && !key.revokedAt) {
                return JSON.parse(JSON.stringify(key));
            }
        }
        return null;
    }
    async listByProject(projectId) {
        const list = Array.from(this.keys.values()).filter(k => k.projectId === projectId && !k.revokedAt);
        return JSON.parse(JSON.stringify(list));
    }
    async revoke(id, projectId) {
        const key = this.keys.get(id);
        if (!key || key.projectId !== projectId)
            return false;
        key.revokedAt = new Date().toISOString();
        return true;
    }
    async updateLastUsed(id) {
        const key = this.keys.get(id);
        if (key) {
            key.lastUsedAt = new Date().toISOString();
        }
    }
}
export function encryptCredential(plainText) {
    const secretKey = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'relay_secret_encryption_salt_key_default').digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}
export function decryptCredential(cipherText) {
    const parts = cipherText.split(':');
    if (parts.length !== 3)
        return '';
    const [ivHex, tagHex, encryptedHex] = parts;
    const secretKey = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'relay_secret_encryption_salt_key_default').digest();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
export class InMemoryIntegrationRepository {
    integrations = new Map();
    async create(data) {
        const id = `integ-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const encryptedAuth = data.secret ? encryptCredential(data.secret) : data.encryptedAuth;
        const integration = {
            id,
            projectId: data.projectId,
            name: data.name,
            appType: data.appType || 'generic_http',
            baseUrl: data.baseUrl,
            httpMethod: data.httpMethod || 'POST',
            authType: data.authType || 'none',
            encryptedAuth,
            authHeaderName: data.authHeaderName,
            headers: data.headers || {},
            timeoutMs: data.timeoutMs || 5000,
            testEndpoint: data.testEndpoint,
            testMethod: data.testMethod || 'GET',
            status: data.status || 'active',
            lastTestedAt: data.lastTestedAt,
            lastTestStatus: data.lastTestStatus,
            lastTestMessage: data.lastTestMessage,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.integrations.set(id, integration);
        return JSON.parse(JSON.stringify(integration));
    }
    async update(id, updates) {
        const current = this.integrations.get(id);
        if (!current)
            throw new Error(`Integration ${id} not found`);
        const encryptedAuth = updates.secret ? encryptCredential(updates.secret) : (updates.encryptedAuth !== undefined ? updates.encryptedAuth : current.encryptedAuth);
        const updated = {
            ...current,
            ...updates,
            encryptedAuth,
            updatedAt: new Date().toISOString()
        };
        this.integrations.set(id, updated);
        return JSON.parse(JSON.stringify(updated));
    }
    async getById(id) {
        const integ = this.integrations.get(id);
        if (!integ)
            return null;
        return JSON.parse(JSON.stringify(integ));
    }
    async listByProject(projectId) {
        const list = Array.from(this.integrations.values())
            .filter(i => i.projectId === projectId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return JSON.parse(JSON.stringify(list));
    }
    async delete(id, projectId) {
        const integ = this.integrations.get(id);
        if (!integ || integ.projectId !== projectId)
            return false;
        return this.integrations.delete(id);
    }
    async getDecryptedSecret(id) {
        const integ = this.integrations.get(id);
        if (!integ || !integ.encryptedAuth)
            return null;
        try {
            return decryptCredential(integ.encryptedAuth);
        }
        catch {
            return null;
        }
    }
}
export function createInMemoryRepositories() {
    return {
        workflows: new InMemoryWorkflowRepository(),
        executions: new InMemoryExecutionRepository(),
        projects: new InMemoryProjectRepository(),
        apiKeys: new InMemoryApiKeyRepository(),
        integrations: new InMemoryIntegrationRepository()
    };
}
//# sourceMappingURL=InMemoryRepository.js.map