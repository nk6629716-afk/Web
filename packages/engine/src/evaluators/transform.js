/**
 * Safely extracts a nested property using dot-notation path (e.g. 'user.profile.name')
 */
export function getNestedValue(obj, path) {
    if (!obj || typeof obj !== 'object' || !path)
        return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return undefined;
        }
        current = current[part];
    }
    return current;
}
/**
 * Safely sets a value at a target property name or shallow path
 */
export function setNestedValue(obj, path, value) {
    const result = { ...obj };
    if (!path)
        return result;
    const parts = path.split('.');
    if (parts.length === 1) {
        result[parts[0]] = value;
        return result;
    }
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') {
            current[part] = {};
        }
        else {
            current[part] = { ...current[part] };
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
    return result;
}
/**
 * Safely evaluates built-in transform operations.
 * Arbitrary JavaScript execution is strictly prevented.
 */
export function evaluateTransform(node, inputPayload) {
    const config = (node.data?.config || {});
    const operation = config.operation;
    const fieldPath = config.fieldPath || config.field;
    const targetField = config.targetField || config.outputField;
    const { template, operand, defaultValue } = config;
    const targetKey = targetField || (fieldPath ? `${fieldPath}_transformed` : 'result');
    const rawValue = fieldPath ? getNestedValue(inputPayload, fieldPath) : inputPayload;
    let transformedValue;
    switch (operation) {
        case 'trim': {
            transformedValue = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
            break;
        }
        case 'lowercase': {
            transformedValue = typeof rawValue === 'string' ? rawValue.toLowerCase() : rawValue;
            break;
        }
        case 'uppercase': {
            transformedValue = typeof rawValue === 'string' ? rawValue.toUpperCase() : rawValue;
            break;
        }
        case 'trim_and_lowercase': {
            // Trim whitespace then convert to lowercase — used by E-Commerce Refund Router
            transformedValue = typeof rawValue === 'string'
                ? rawValue.trim().toLowerCase()
                : rawValue;
            break;
        }
        case 'json_parse': {
            if (typeof rawValue === 'string') {
                try {
                    transformedValue = JSON.parse(rawValue);
                }
                catch {
                    throw new Error(`Invalid JSON string in field "${fieldPath || 'input'}"`);
                }
            }
            else {
                transformedValue = rawValue;
            }
            break;
        }
        case 'json_stringify': {
            try {
                transformedValue = JSON.stringify(rawValue, null, 2);
            }
            catch (err) {
                throw new Error(`Failed to stringify data: ${err.message}`);
            }
            break;
        }
        case 'extract_field': {
            transformedValue = rawValue;
            break;
        }
        case 'template': {
            if (typeof template === 'string') {
                transformedValue = template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
                    const val = getNestedValue(inputPayload, key);
                    return val !== undefined && val !== null ? String(val) : '';
                });
            }
            else {
                transformedValue = template || '';
            }
            break;
        }
        case 'math_add': {
            const num = Number(rawValue);
            const addend = Number(operand || 0);
            if (isNaN(num)) {
                throw new Error(`Field "${fieldPath}" value (${rawValue}) is not a valid number for math_add`);
            }
            transformedValue = num + addend;
            break;
        }
        case 'default_value': {
            transformedValue = (rawValue === undefined || rawValue === null || rawValue === '')
                ? defaultValue
                : rawValue;
            break;
        }
        default:
            throw new Error(`Unsupported transform operation: "${operation}"`);
    }
    // Produce output payload by extending input payload with the transformed field
    const output = setNestedValue(inputPayload, targetKey, transformedValue);
    return { output };
}
//# sourceMappingURL=transform.js.map