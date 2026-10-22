export const SEEDED_SAMPLE_WORKFLOW = {
    id: 'demo-workflow-001',
    projectId: 'demo-project-001',
    name: 'Support Ticket Triage & Escalation',
    revision: 1,
    updatedAt: new Date().toISOString(),
    graph: {
        nodes: [
            {
                id: 'node-trigger-1',
                type: 'trigger',
                position: { x: 80, y: 240 },
                data: {
                    label: 'Incoming Ticket Trigger',
                    type: 'trigger',
                    config: {
                        triggerType: 'webhook',
                        initialPayload: {
                            ticketId: 'TICK-9021',
                            customer: 'Acme Cloud Corp',
                            message: '  CRITICAL: Production database replica lag is spiking!  ',
                            priority: 'critical',
                            severity: 9
                        }
                    },
                    status: 'idle'
                }
            },
            {
                id: 'node-transform-clean',
                type: 'transform',
                position: { x: 380, y: 240 },
                data: {
                    label: 'Trim & Sanitize Message',
                    type: 'transform',
                    config: {
                        operation: 'trim',
                        fieldPath: 'message',
                        targetField: 'cleanMessage'
                    },
                    status: 'idle'
                }
            },
            {
                id: 'node-condition-priority',
                type: 'condition',
                position: { x: 680, y: 240 },
                data: {
                    label: 'Is Priority Critical?',
                    type: 'condition',
                    config: {
                        fieldPath: 'priority',
                        operator: 'equals',
                        targetValue: 'critical'
                    },
                    status: 'idle'
                }
            },
            {
                id: 'node-transform-urgent',
                type: 'transform',
                position: { x: 980, y: 130 },
                data: {
                    label: 'Build PagerDuty Alert',
                    type: 'transform',
                    config: {
                        operation: 'template',
                        template: '🚨 CRITICAL ALERT: {{cleanMessage}} | Customer: {{customer}} (ID: {{ticketId}})',
                        targetField: 'urgentAlert'
                    },
                    status: 'idle'
                }
            },
            {
                id: 'node-output-pagerduty',
                type: 'output',
                position: { x: 1280, y: 130 },
                data: {
                    label: 'On-Call Escalation Hook',
                    type: 'output',
                    config: {
                        destination: 'webhook',
                        label: 'Ops PagerDuty Channel',
                        includeMetadata: true
                    },
                    status: 'idle'
                }
            },
            {
                id: 'node-transform-standard',
                type: 'transform',
                position: { x: 980, y: 350 },
                data: {
                    label: 'Format Standard Ticket',
                    type: 'transform',
                    config: {
                        operation: 'template',
                        template: 'Normal Ticket: {{cleanMessage}} (Assigned to General Queue)',
                        targetField: 'standardTicket'
                    },
                    status: 'idle'
                }
            },
            {
                id: 'node-output-standard',
                type: 'output',
                position: { x: 1280, y: 350 },
                data: {
                    label: 'Standard Queue Inbox',
                    type: 'output',
                    config: {
                        destination: 'response',
                        label: 'Zendesk General Inbox'
                    },
                    status: 'idle'
                }
            }
        ],
        edges: [
            {
                id: 'edge-1',
                source: 'node-trigger-1',
                target: 'node-transform-clean',
                label: 'Payload'
            },
            {
                id: 'edge-2',
                source: 'node-transform-clean',
                target: 'node-condition-priority',
                label: 'Sanitized'
            },
            {
                id: 'edge-3-true',
                source: 'node-condition-priority',
                target: 'node-transform-urgent',
                sourceHandle: 'true',
                label: 'True (Critical)'
            },
            {
                id: 'edge-4-urgent',
                source: 'node-transform-urgent',
                target: 'node-output-pagerduty'
            },
            {
                id: 'edge-5-false',
                source: 'node-condition-priority',
                target: 'node-transform-standard',
                sourceHandle: 'false',
                label: 'False (Normal)'
            },
            {
                id: 'edge-6-standard',
                source: 'node-transform-standard',
                target: 'node-output-standard'
            }
        ]
    }
};
//# sourceMappingURL=sampleWorkflow.js.map