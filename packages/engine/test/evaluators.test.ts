import { describe, it, expect } from 'vitest';
import { RelayNode } from '@relay/shared';
import { evaluateTransform, getNestedValue, setNestedValue } from '../src/evaluators/transform';
import { evaluateCondition } from '../src/evaluators/condition';
import { evaluateTrigger } from '../src/evaluators/trigger';
import { evaluateOutput } from '../src/evaluators/output';

describe('Safe Evaluators', () => {
  describe('Helper functions', () => {
    it('safely extracts nested value using dot notation', () => {
      const obj = { user: { profile: { email: 'test@example.com' } } };
      expect(getNestedValue(obj, 'user.profile.email')).toBe('test@example.com');
      expect(getNestedValue(obj, 'user.unknown.prop')).toBeUndefined();
      expect(getNestedValue(null, 'foo')).toBeUndefined();
    });

    it('safely sets nested value without mutating original object', () => {
      const obj = { user: { name: 'Alice' } };
      const updated = setNestedValue(obj, 'user.email', 'alice@test.com');
      expect(updated.user.email).toBe('alice@test.com');
      expect((obj as any).user.email).toBeUndefined();
    });
  });

  describe('Transform Evaluator', () => {
    it('safely trims whitespace', () => {
      const node: RelayNode = {
        id: 't1',
        type: 'transform',
        position: { x: 0, y: 0 },
        data: {
          label: 'Trim',
          type: 'transform',
          config: { operation: 'trim', fieldPath: 'msg', targetField: 'trimmed' }
        }
      };
      const res = evaluateTransform(node, { msg: '   hello world   ' });
      expect(res.output.trimmed).toBe('hello world');
    });

    it('safely parses JSON', () => {
      const node: RelayNode = {
        id: 't2',
        type: 'transform',
        position: { x: 0, y: 0 },
        data: {
          label: 'JSON Parse',
          type: 'transform',
          config: { operation: 'json_parse', fieldPath: 'rawJson', targetField: 'parsed' }
        }
      };
      const res = evaluateTransform(node, { rawJson: '{"status":"ok","code":200}' });
      expect(res.output.parsed).toEqual({ status: 'ok', code: 200 });
    });

    it('safely interpolates templates', () => {
      const node: RelayNode = {
        id: 't3',
        type: 'transform',
        position: { x: 0, y: 0 },
        data: {
          label: 'Template',
          type: 'transform',
          config: {
            operation: 'template',
            template: 'Hello {{user.name}}, your order {{orderId}} is ready!',
            targetField: 'greeting'
          }
        }
      };
      const res = evaluateTransform(node, { user: { name: 'Sarah' }, orderId: 'ORD-99' });
      expect(res.output.greeting).toBe('Hello Sarah, your order ORD-99 is ready!');
    });

    it('safely adds numbers with math_add', () => {
      const node: RelayNode = {
        id: 't4',
        type: 'transform',
        position: { x: 0, y: 0 },
        data: {
          label: 'Math Add',
          type: 'transform',
          config: { operation: 'math_add', fieldPath: 'count', operand: 5, targetField: 'newCount' }
        }
      };
      const res = evaluateTransform(node, { count: 10 });
      expect(res.output.newCount).toBe(15);
    });
  });

  describe('Condition Evaluator', () => {
    it('evaluates string equality', () => {
      const node: RelayNode = {
        id: 'c1',
        type: 'condition',
        position: { x: 0, y: 0 },
        data: {
          label: 'Check Priority',
          type: 'condition',
          config: { fieldPath: 'priority', operator: 'equals', targetValue: 'high' }
        }
      };

      const trueRes = evaluateCondition(node, { priority: 'high' });
      expect(trueRes.conditionMet).toBe(true);

      const falseRes = evaluateCondition(node, { priority: 'low' });
      expect(falseRes.conditionMet).toBe(false);
    });

    it('evaluates numeric greater_than', () => {
      const node: RelayNode = {
        id: 'c2',
        type: 'condition',
        position: { x: 0, y: 0 },
        data: {
          label: 'Check Amount',
          type: 'condition',
          config: { fieldPath: 'amount', operator: 'greater_than', targetValue: 100 }
        }
      };

      expect(evaluateCondition(node, { amount: 150 }).conditionMet).toBe(true);
      expect(evaluateCondition(node, { amount: 50 }).conditionMet).toBe(false);
    });

    it('evaluates substring contains', () => {
      const node: RelayNode = {
        id: 'c3',
        type: 'condition',
        position: { x: 0, y: 0 },
        data: {
          label: 'Check Error',
          type: 'condition',
          config: { fieldPath: 'message', operator: 'contains', targetValue: 'FAIL' }
        }
      };

      expect(evaluateCondition(node, { message: 'Network failed to respond' }).conditionMet).toBe(true);
      expect(evaluateCondition(node, { message: 'All systems normal' }).conditionMet).toBe(false);
    });
  });

  describe('Output Evaluator', () => {
    it('normalizes output step result and attaches metadata', () => {
      const node: RelayNode = {
        id: 'o1',
        type: 'output',
        position: { x: 0, y: 0 },
        data: {
          label: 'Alert Webhook',
          type: 'output',
          config: { destination: 'webhook', label: 'PagerDuty' }
        }
      };

      const res = evaluateOutput(node, { status: 'urgent', count: 42 });
      expect(res.output.status).toBe('urgent');
      expect(res.output._relayMetadata.deliveredTo).toBe('webhook');
      expect(res.summary.keys).toContain('status');
      expect(res.summary.keys).toContain('count');
    });
  });
});
