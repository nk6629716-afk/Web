import { Workflow } from './types';
/**
 * RELAY — E-Commerce Order & Refund Router
 *
 * Pre-seeded demo workflow:
 *   Trigger → Transform (trim_and_lowercase) → Condition (amount > 10000)
 *             → [true]  Output: VIP Fast-Track Approval
 *             → [false] Output: Standard Review Queue
 *
 * Default payload: ORD-9912, amount: 12500, customer: "  RAHUL SHARMA  "
 */
export declare const SEEDED_SAMPLE_WORKFLOW: Workflow;
//# sourceMappingURL=sampleWorkflow.d.ts.map