/**
 * Conditional Router for Node Execution
 * Routes data to different output ports based on conditions
 */

export type ComparisonOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterOrEqual'
  | 'lessOrEqual'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'exists'
  | 'notExists'
  | 'matches'
  | 'isTrue'
  | 'isFalse';

export type LogicalOperator = 'AND' | 'OR';

export interface RouterCondition {
  field: string;
  operator: ComparisonOperator;
  value?: any;
  type?: 'string' | 'number' | 'boolean';
}

export interface RouterRule {
  id: string;
  name?: string;
  conditions: RouterCondition[];
  logic?: LogicalOperator;
  outputPort: string;
}

export interface RouterConfig {
  rules: RouterRule[];
  defaultOutput?: string;
  mode: 'first-match' | 'all-matches';
}

export interface RouterResult {
  matched: boolean;
  outputPorts: string[];
  matchedRules: string[];
  data: any;
}

export class ConditionalRouter {
  /**
   * Route data based on conditions
   */
  static route(data: any, config: RouterConfig): RouterResult {
    const matchedPorts: string[] = [];
    const matchedRules: string[] = [];

    for (const rule of config.rules) {
      const matches = ConditionalRouter.evaluateRule(data, rule);

      if (matches) {
        matchedPorts.push(rule.outputPort);
        matchedRules.push(rule.id);

        // If first-match mode, stop after first match
        if (config.mode === 'first-match') {
          break;
        }
      }
    }

    // If no matches and default output exists
    if (matchedPorts.length === 0 && config.defaultOutput) {
      matchedPorts.push(config.defaultOutput);
    }

    return {
      matched: matchedPorts.length > 0,
      outputPorts: matchedPorts,
      matchedRules,
      data
    };
  }

  /**
   * Evaluate a single rule
   */
  static evaluateRule(data: any, rule: RouterRule): boolean {
    const logic = rule.logic || 'AND';
    const results = rule.conditions.map(condition =>
      ConditionalRouter.evaluateCondition(data, condition)
    );

    if (logic === 'AND') {
      return results.every(r => r === true);
    } else {
      return results.some(r => r === true);
    }
  }

  /**
   * Evaluate a single condition
   */
  static evaluateCondition(data: any, condition: RouterCondition): boolean {
    const fieldValue = ConditionalRouter.getFieldValue(data, condition.field);
    const { operator, value, type } = condition;

    // Type coercion
    let leftValue = fieldValue;
    let rightValue = value;

    if (type === 'number') {
      leftValue = Number(leftValue);
      rightValue = Number(rightValue);
    } else if (type === 'boolean') {
      leftValue = Boolean(leftValue);
      rightValue = Boolean(rightValue);
    } else if (type === 'string') {
      leftValue = String(leftValue);
      rightValue = String(rightValue);
    }

    switch (operator) {
      case 'equals':
        return leftValue === rightValue;

      case 'notEquals':
        return leftValue !== rightValue;

      case 'contains':
        if (typeof leftValue === 'string') {
          return leftValue.includes(String(rightValue));
        }
        if (Array.isArray(leftValue)) {
          return leftValue.includes(rightValue);
        }
        return false;

      case 'notContains':
        if (typeof leftValue === 'string') {
          return !leftValue.includes(String(rightValue));
        }
        if (Array.isArray(leftValue)) {
          return !leftValue.includes(rightValue);
        }
        return true;

      case 'startsWith':
        return typeof leftValue === 'string' && leftValue.startsWith(String(rightValue));

      case 'endsWith':
        return typeof leftValue === 'string' && leftValue.endsWith(String(rightValue));

      case 'greaterThan':
        return leftValue > rightValue;

      case 'lessThan':
        return leftValue < rightValue;

      case 'greaterOrEqual':
        return leftValue >= rightValue;

      case 'lessOrEqual':
        return leftValue <= rightValue;

      case 'isEmpty':
        if (leftValue === null || leftValue === undefined) return true;
        if (typeof leftValue === 'string') return leftValue.trim().length === 0;
        if (Array.isArray(leftValue)) return leftValue.length === 0;
        if (typeof leftValue === 'object') return Object.keys(leftValue).length === 0;
        return false;

      case 'isNotEmpty':
        return !ConditionalRouter.evaluateCondition(data, { ...condition, operator: 'isEmpty' });

      case 'exists':
        return leftValue !== undefined && leftValue !== null;

      case 'notExists':
        return leftValue === undefined || leftValue === null;

      case 'matches':
        if (typeof leftValue === 'string' && typeof rightValue === 'string') {
          try {
            const regex = new RegExp(rightValue);
            return regex.test(leftValue);
          } catch (error) {
            console.error('[ConditionalRouter] Invalid regex:', rightValue);
            return false;
          }
        }
        return false;

      case 'isTrue':
        return leftValue === true || leftValue === 'true' || leftValue === 1;

      case 'isFalse':
        return leftValue === false || leftValue === 'false' || leftValue === 0;

      default:
        console.warn('[ConditionalRouter] Unknown operator:', operator);
        return false;
    }
  }

  /**
   * Get field value from data using dot notation
   */
  private static getFieldValue(data: any, field: string): any {
    if (!field) return data;

    const parts = field.split('.');
    let value = data;

    for (const part of parts) {
      // Handle array indexing (e.g., items[0])
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        value = value?.[arrayName]?.[parseInt(index, 10)];
      } else {
        value = value?.[part];
      }

      if (value === undefined) {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Create a simple condition
   */
  static condition(
    field: string,
    operator: ComparisonOperator,
    value?: any
  ): RouterCondition {
    return { field, operator, value };
  }

  /**
   * Create a rule
   */
  static rule(
    id: string,
    outputPort: string,
    conditions: RouterCondition[],
    logic: LogicalOperator = 'AND'
  ): RouterRule {
    return { id, outputPort, conditions, logic };
  }

  /**
   * Helper: Route by field value (simple equality routing)
   */
  static routeByValue(
    data: any,
    field: string,
    mapping: Record<string, string>,
    defaultOutput?: string
  ): RouterResult {
    const value = ConditionalRouter.getFieldValue(data, field);
    const outputPort = mapping[String(value)] || defaultOutput;

    return {
      matched: outputPort !== undefined,
      outputPorts: outputPort ? [outputPort] : [],
      matchedRules: outputPort ? [String(value)] : [],
      data
    };
  }

  /**
   * Helper: Route by type
   */
  static routeByType(data: any, field: string): RouterResult {
    const value = ConditionalRouter.getFieldValue(data, field);
    const type = Array.isArray(value) ? 'array' : typeof value;

    return {
      matched: true,
      outputPorts: [type],
      matchedRules: [type],
      data
    };
  }

  /**
   * Helper: Route by boolean
   */
  static routeByBoolean(
    data: any,
    field: string,
    truePort: string = 'true',
    falsePort: string = 'false'
  ): RouterResult {
    const value = ConditionalRouter.getFieldValue(data, field);
    const isTrue = Boolean(value);

    return {
      matched: true,
      outputPorts: [isTrue ? truePort : falsePort],
      matchedRules: [isTrue ? 'true' : 'false'],
      data
    };
  }

  /**
   * Helper: Route by range
   */
  static routeByRange(
    data: any,
    field: string,
    ranges: Array<{ min?: number; max?: number; output: string }>
  ): RouterResult {
    const value = Number(ConditionalRouter.getFieldValue(data, field));

    for (const range of ranges) {
      const meetsMin = range.min === undefined || value >= range.min;
      const meetsMax = range.max === undefined || value <= range.max;

      if (meetsMin && meetsMax) {
        return {
          matched: true,
          outputPorts: [range.output],
          matchedRules: [`${range.min}-${range.max}`],
          data
        };
      }
    }

    return {
      matched: false,
      outputPorts: [],
      matchedRules: [],
      data
    };
  }

  /**
   * Helper: Split array items to different outputs
   */
  static splitArray(
    data: any,
    field: string,
    chunkSize: number,
    outputPrefix: string = 'output'
  ): RouterResult {
    const array = ConditionalRouter.getFieldValue(data, field);

    if (!Array.isArray(array)) {
      return {
        matched: false,
        outputPorts: [],
        matchedRules: [],
        data
      };
    }

    const chunks: any[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }

    const outputPorts = chunks.map((_, index) => `${outputPrefix}${index + 1}`);

    return {
      matched: true,
      outputPorts,
      matchedRules: outputPorts,
      data: chunks
    };
  }

  /**
   * Validate router config
   */
  static validateConfig(config: RouterConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.rules || config.rules.length === 0) {
      errors.push('Router must have at least one rule');
    }

    for (const rule of config.rules) {
      if (!rule.id) {
        errors.push('Each rule must have an id');
      }

      if (!rule.outputPort) {
        errors.push(`Rule "${rule.id}" must have an outputPort`);
      }

      if (!rule.conditions || rule.conditions.length === 0) {
        errors.push(`Rule "${rule.id}" must have at least one condition`);
      }

      for (const condition of rule.conditions || []) {
        if (!condition.field) {
          errors.push(`Condition in rule "${rule.id}" must have a field`);
        }

        if (!condition.operator) {
          errors.push(`Condition in rule "${rule.id}" must have an operator`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
