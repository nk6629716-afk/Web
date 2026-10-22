import { getNestedValue } from './transform';
export function evaluateCondition(node, inputPayload) {
    const config = (node.data?.config || {});
    const { fieldPath, operator, targetValue } = config;
    const actualValue = fieldPath ? getNestedValue(inputPayload, fieldPath) : undefined;
    let conditionMet = false;
    switch (operator) {
        case 'equals': {
            conditionMet = String(actualValue).toLowerCase() === String(targetValue).toLowerCase();
            break;
        }
        case 'not_equals': {
            conditionMet = String(actualValue).toLowerCase() !== String(targetValue).toLowerCase();
            break;
        }
        case 'contains': {
            if (typeof actualValue === 'string') {
                conditionMet = actualValue.toLowerCase().includes(String(targetValue).toLowerCase());
            }
            else if (Array.isArray(actualValue)) {
                conditionMet = actualValue.includes(targetValue);
            }
            else {
                conditionMet = false;
            }
            break;
        }
        case 'not_contains': {
            if (typeof actualValue === 'string') {
                conditionMet = !actualValue.toLowerCase().includes(String(targetValue).toLowerCase());
            }
            else if (Array.isArray(actualValue)) {
                conditionMet = !actualValue.includes(targetValue);
            }
            else {
                conditionMet = true;
            }
            break;
        }
        case 'greater_than': {
            const a = Number(actualValue);
            const b = Number(targetValue);
            conditionMet = !isNaN(a) && !isNaN(b) && a > b;
            break;
        }
        case 'less_than': {
            const a = Number(actualValue);
            const b = Number(targetValue);
            conditionMet = !isNaN(a) && !isNaN(b) && a < b;
            break;
        }
        case 'is_empty': {
            conditionMet =
                actualValue === undefined ||
                    actualValue === null ||
                    actualValue === '' ||
                    (Array.isArray(actualValue) && actualValue.length === 0) ||
                    (typeof actualValue === 'object' && Object.keys(actualValue).length === 0);
            break;
        }
        case 'is_not_empty': {
            const empty = actualValue === undefined ||
                actualValue === null ||
                actualValue === '' ||
                (Array.isArray(actualValue) && actualValue.length === 0) ||
                (typeof actualValue === 'object' && Object.keys(actualValue).length === 0);
            conditionMet = !empty;
            break;
        }
        default:
            throw new Error(`Unsupported condition operator: "${operator}"`);
    }
    // Pass-through input payload and record evaluation metadata
    return {
        conditionMet,
        output: {
            ...inputPayload,
            _conditionResult: {
                nodeId: node.id,
                conditionMet,
                actualValue,
                targetValue,
                operator
            }
        },
        evaluatedField: fieldPath,
        actualValue,
        targetValue,
        operator
    };
}
//# sourceMappingURL=condition.js.map