/**
 * Node System - Main Entry Point
 * Exports all helpers, utilities, and execution modules
 */

// Data Transformation Helpers
export { DataHelpers } from './helpers/data-helpers';
export type {
  GroupByResult,
  SortOrder,
  TransformFunction
} from './helpers/data-helpers';

// String Manipulation Helpers
export { StringHelpers } from './helpers/string-helpers';

// Date Manipulation Helpers
export { DateHelpers } from './helpers/date-helpers';

// HTTP Request Helpers
export { HttpHelpers } from './helpers/http-helpers';
export type {
  HttpRequestOptions,
  RetryOptions,
  PaginationOptions
} from './helpers/http-helpers';

// Debug and Monitoring Helpers
export { DebugHelpers } from './helpers/debug-helpers';
export type {
  Timer,
  Metric,
  Breadcrumb
} from './helpers/debug-helpers';

// Secrets Manager
export { SecretsManager } from './helpers/secrets-manager';
export type {
  SecretValue,
  EnvironmentConfig
} from './helpers/secrets-manager';

// Retry Handler
export { RetryHandler } from './execution/retry-handler';
export type {
  RetryConfig,
  RetryResult
} from './execution/retry-handler';

// Item Processor
export { ItemProcessor } from './execution/item-processor';
export type {
  ProcessingMode,
  ProcessingConfig,
  ProcessingResult
} from './execution/item-processor';

// Conditional Router
export { ConditionalRouter } from './execution/conditional-router';
export type {
  ComparisonOperator,
  LogicalOperator,
  RouterCondition,
  RouterRule,
  RouterConfig,
  RouterResult
} from './execution/conditional-router';

// Schema Validator
export { SchemaValidator } from './validation/schema-validator';
export type {
  SchemaType,
  SchemaProperty,
  ValidationSchema,
  ValidationError,
  ValidationResult
} from './validation/schema-validator';

/**
 * Create a unified helpers object for use in node execution context
 */
export const createNodeHelpers = (context?: any) => {
  return {
    // Data operations
    data: DataHelpers,

    // String operations
    string: StringHelpers,

    // Date operations
    date: DateHelpers,

    // HTTP operations
    http: HttpHelpers,

    // Debug operations
    debug: DebugHelpers,

    // Secrets operations
    secrets: SecretsManager,

    // Validation
    validate: SchemaValidator,

    // Router
    router: ConditionalRouter,

    // Legacy logging (for backward compatibility)
    log: (...args: any[]) => {
      console.log('[Node]', ...args);
      DebugHelpers.addBreadcrumb(args.join(' '), 'info');
    },

    warn: (...args: any[]) => {
      console.warn('[Node]', ...args);
      DebugHelpers.addBreadcrumb(args.join(' '), 'warn');
    },

    error: (...args: any[]) => {
      console.error('[Node]', ...args);
      DebugHelpers.addBreadcrumb(args.join(' '), 'error');
    },

    // Context access
    context
  };
};

/**
 * Simplified helper functions for common use cases
 * Note: These are created as functions to avoid initialization issues
 */
export const helpers = {
  // Quick data operations
  get map() { return DataHelpers.map; },
  get filter() { return DataHelpers.filter; },
  get reduce() { return DataHelpers.reduce; },
  get groupBy() { return DataHelpers.groupBy; },
  get sortBy() { return DataHelpers.sortBy; },
  get unique() { return DataHelpers.unique; },
  get chunk() { return DataHelpers.chunk; },
  get flatten() { return DataHelpers.flatten; },

  // Quick string operations
  get slugify() { return StringHelpers.slugify; },
  get capitalize() { return StringHelpers.capitalize; },
  get camelCase() { return StringHelpers.camelCase; },
  get snakeCase() { return StringHelpers.snakeCase; },
  get kebabCase() { return StringHelpers.kebabCase; },
  get template() { return StringHelpers.template; },

  // Quick date operations
  get formatDate() { return DateHelpers.formatDate; },
  get parseDate() { return DateHelpers.parseDate; },
  get addDays() { return DateHelpers.addDays; },
  get timeAgo() { return DateHelpers.timeAgo; },

  // Quick HTTP operations
  get get() { return HttpHelpers.get; },
  get post() { return HttpHelpers.post; },
  get put() { return HttpHelpers.put; },
  get delete() { return HttpHelpers.delete; },

  // Quick logging
  log: (...args: any[]) => {
    console.log('[Node]', ...args);
    DebugHelpers.addBreadcrumb(args.join(' '), 'info');
  },

  warn: (...args: any[]) => {
    console.warn('[Node]', ...args);
    DebugHelpers.addBreadcrumb(args.join(' '), 'warn');
  },

  error: (...args: any[]) => {
    console.error('[Node]', ...args);
    DebugHelpers.addBreadcrumb(args.join(' '), 'error');
  },

  // Quick validation
  get validate() { return SchemaValidator.validate; },

  // Quick routing
  get route() { return ConditionalRouter.route; },

  // Quick secrets
  get getSecret() { return SecretsManager.getSecret; },
  get getEnv() { return SecretsManager.getEnv; },
  get resolve() { return SecretsManager.resolve; }
};
