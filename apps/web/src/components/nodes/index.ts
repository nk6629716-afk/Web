import { TriggerNode } from './TriggerNode';
import { TransformNode } from './TransformNode';
import { ConditionNode } from './ConditionNode';
import { OutputNode } from './OutputNode';

export const nodeTypes = {
  trigger: TriggerNode,
  transform: TransformNode,
  condition: ConditionNode,
  output: OutputNode,
};

export { TriggerNode, TransformNode, ConditionNode, OutputNode };
