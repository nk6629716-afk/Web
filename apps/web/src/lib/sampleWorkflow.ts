import { Workflow } from '@relay/shared';

export const SAMPLE_WORKFLOW: Workflow = {
  id: 'wf_demo_onboarding',
  projectId: 'proj_demo',
  name: 'User Onboarding & Permission Routing',
  revision: 1,
  updatedAt: new Date().toISOString(),
  graph: {
    nodes: [
      {
        id: 'node-trigger-1',
        type: 'trigger',
        position: { x: 80, y: 180 },
        data: {
          label: 'User Signup Webhook',
          nodeType: 'trigger',
          config: {
            payload: JSON.stringify(
              {
                userId: 'usr_9421',
                fullName: '  Sarah Connor  ',
                email: 'SARAH.CONNOR@SKYNET.DEF',
                role: 'admin',
                creditScore: 780,
                country: 'US',
              },
              null,
              2
            ),
          },
        },
      },
      {
        id: 'node-transform-1',
        type: 'transform',
        position: { x: 380, y: 180 },
        data: {
          label: 'Normalize Email & Trim Name',
          nodeType: 'transform',
          config: {
            operation: 'lowercase',
            field: 'email',
            outputField: 'normalizedEmail',
          },
        },
      },
      {
        id: 'node-condition-1',
        type: 'condition',
        position: { x: 680, y: 180 },
        data: {
          label: 'Check If Admin Role',
          nodeType: 'condition',
          config: {
            field: 'role',
            operator: 'equals',
            value: 'admin',
          },
        },
      },
      {
        id: 'node-transform-admin',
        type: 'transform',
        position: { x: 1000, y: 80 },
        data: {
          label: 'Grant Admin Privileges',
          nodeType: 'transform',
          config: {
            operation: 'template',
            template: 'Account {{normalizedEmail}} approved with SuperAdmin clearance level.',
            outputField: 'provisionMessage',
          },
        },
      },
      {
        id: 'node-output-admin',
        type: 'output',
        position: { x: 1320, y: 80 },
        data: {
          label: 'Admin Alert Dispatch',
          nodeType: 'output',
          config: {
            title: 'Security Alert: Admin Access Provisioned',
            messageTemplate: 'Successfully generated high-tier tokens for user {{userId}}.',
          },
        },
      },
      {
        id: 'node-output-standard',
        type: 'output',
        position: { x: 1000, y: 300 },
        data: {
          label: 'Standard User Welcome',
          nodeType: 'output',
          config: {
            title: 'Welcome Standard Member',
            messageTemplate: 'Standard access granted for {{email}}.',
          },
        },
      },
    ],
    edges: [
      {
        id: 'e-trig-trans',
        source: 'node-trigger-1',
        target: 'node-transform-1',
      },
      {
        id: 'e-trans-cond',
        source: 'node-transform-1',
        target: 'node-condition-1',
      },
      {
        id: 'e-cond-true',
        source: 'node-condition-1',
        sourceHandle: 'true',
        target: 'node-transform-admin',
        label: 'True (Admin)',
      },
      {
        id: 'e-admin-out',
        source: 'node-transform-admin',
        target: 'node-output-admin',
      },
      {
        id: 'e-cond-false',
        source: 'node-condition-1',
        sourceHandle: 'false',
        target: 'node-output-standard',
        label: 'False (Member)',
      },
    ],
  },
};
