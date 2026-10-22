import { describe, it, expect } from 'vitest';
import { validateGraphForExecution, validateGraphStructure } from '../src/validator';
describe('Graph Validator', () => {
    it('validates a correct linear graph', () => {
        const graph = {
            nodes: [
                { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'T', type: 'trigger', config: {} } },
                { id: 'n2', type: 'transform', position: { x: 100, y: 0 }, data: { label: 'Tr', type: 'transform', config: { operation: 'trim' } } },
                { id: 'n3', type: 'output', position: { x: 200, y: 0 }, data: { label: 'O', type: 'output', config: { destination: 'response' } } }
            ],
            edges: [
                { id: 'e1', source: 'n1', target: 'n2' },
                { id: 'e2', source: 'n2', target: 'n3' }
            ]
        };
        const result = validateGraphForExecution(graph);
        expect(result.valid).toBe(true);
        expect(result.errors.length).toBe(0);
    });
    it('rejects graph with cycle (A -> B -> C -> A)', () => {
        const graph = {
            nodes: [
                { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'T', type: 'trigger', config: {} } },
                { id: 'n2', type: 'transform', position: { x: 100, y: 0 }, data: { label: 'Tr', type: 'transform', config: { operation: 'trim' } } },
                { id: 'n3', type: 'transform', position: { x: 200, y: 0 }, data: { label: 'Tr2', type: 'transform', config: { operation: 'lowercase' } } }
            ],
            edges: [
                { id: 'e1', source: 'n1', target: 'n2' },
                { id: 'e2', source: 'n2', target: 'n3' },
                { id: 'e3', source: 'n3', target: 'n1' } // cycle!
            ]
        };
        const result = validateGraphStructure(graph);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Cycle detected'))).toBe(true);
    });
    it('rejects unsupported node types', () => {
        const graph = {
            nodes: [
                { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'T', type: 'trigger', config: {} } },
                { id: 'n2', type: 'unsupported_eval', position: { x: 100, y: 0 }, data: { label: 'Hack', type: 'unsupported_eval', config: {} } }
            ],
            edges: [
                { id: 'e1', source: 'n1', target: 'n2' }
            ]
        };
        const result = validateGraphStructure(graph);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Unsupported node type'))).toBe(true);
    });
    it('rejects dangling edges referencing non-existent nodes', () => {
        const graph = {
            nodes: [
                { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'T', type: 'trigger', config: {} } }
            ],
            edges: [
                { id: 'e1', source: 'n1', target: 'ghost_node' }
            ]
        };
        const result = validateGraphStructure(graph);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('ghost_node'))).toBe(true);
    });
    it('rejects self-loops (A -> A)', () => {
        const graph = {
            nodes: [
                { id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'T', type: 'trigger', config: {} } }
            ],
            edges: [
                { id: 'e1', source: 'n1', target: 'n1' }
            ]
        };
        const result = validateGraphStructure(graph);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('self-loop'))).toBe(true);
    });
    it('requires at least one Trigger node', () => {
        const graph = {
            nodes: [
                { id: 'n1', type: 'transform', position: { x: 0, y: 0 }, data: { label: 'Tr', type: 'transform', config: { operation: 'trim' } } }
            ],
            edges: []
        };
        const result = validateGraphForExecution(graph);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Trigger node'))).toBe(true);
    });
});
//# sourceMappingURL=validator.test.js.map