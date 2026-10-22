import { describe, it, expect } from 'vitest';
import { createInMemoryRepositories } from '@relay/database';
import { SEEDED_SAMPLE_WORKFLOW, Workflow } from '@relay/shared';

describe('Repository & Revision Management', () => {
  it('loads the seeded sample workflow on initialization', async () => {
    const repos = createInMemoryRepositories();
    const wf = await repos.workflows.getById(SEEDED_SAMPLE_WORKFLOW.id);
    expect(wf).not.toBeNull();
    expect(wf?.name).toBe('Support Ticket Triage & Escalation');
    expect(wf?.revision).toBe(1);
  });

  it('allows saves with matching revision and increments monotonically', async () => {
    const repos = createInMemoryRepositories();
    const wf = (await repos.workflows.getById(SEEDED_SAMPLE_WORKFLOW.id))!;
    
    // Save with expectedRevision = 1
    const modified: Workflow = {
      ...wf,
      name: 'Updated Ticket Triage'
    };

    const saveResult = await repos.workflows.save(modified, 1);
    expect(saveResult.success).toBe(true);
    expect(saveResult.conflict).toBeFalsy();
    expect(saveResult.workflow.revision).toBe(2);
    expect(saveResult.workflow.name).toBe('Updated Ticket Triage');

    // Confirm stored workflow has revision 2
    const fetched = await repos.workflows.getById(wf.id);
    expect(fetched?.revision).toBe(2);

    // Confirm version history contains snapshot of v1 and v2
    const versions = await repos.workflows.listVersions(wf.id);
    expect(versions.length).toBe(2);
    expect(versions.some(v => v.revision === 1)).toBe(true);
    expect(versions.some(v => v.revision === 2)).toBe(true);
  });

  it('rejects stale write when expectedRevision does not match current revision', async () => {
    const repos = createInMemoryRepositories();
    const wf = (await repos.workflows.getById(SEEDED_SAMPLE_WORKFLOW.id))!;

    // Client A updates from rev 1 -> 2
    await repos.workflows.save({ ...wf, name: 'Client A update' }, 1);

    // Client B attempts to save with stale expectedRevision = 1
    const staleResult = await repos.workflows.save({ ...wf, name: 'Client B stale update' }, 1);

    expect(staleResult.success).toBe(false);
    expect(staleResult.conflict).toBe(true);
    // Returns canonical latest workflow (revision 2)
    expect(staleResult.workflow.revision).toBe(2);
    expect(staleResult.workflow.name).toBe('Client A update');
  });

  it('records executions and execution steps', async () => {
    const repos = createInMemoryRepositories();
    const exec = await repos.executions.create({
      workflowId: SEEDED_SAMPLE_WORKFLOW.id,
      input: { test: true }
    });

    expect(exec.id).toBeDefined();
    expect(exec.status).toBe('running');

    await repos.executions.recordStep({
      id: 'step-1',
      executionId: exec.id,
      nodeId: 'node-trigger-1',
      status: 'succeeded',
      durationMs: 4,
      output: { test: true }
    });

    await repos.executions.update(exec.id, {
      status: 'succeeded',
      finishedAt: new Date().toISOString()
    });

    const updated = await repos.executions.getById(exec.id);
    expect(updated?.status).toBe('succeeded');
    expect(updated?.finishedAt).toBeDefined();

    const steps = await repos.executions.getSteps(exec.id);
    expect(steps.length).toBe(1);
    expect(steps[0].nodeId).toBe('node-trigger-1');
  });
});
