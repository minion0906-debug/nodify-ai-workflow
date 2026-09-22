/**
 * Schema Validation System
 * Validates node inputs/outputs using JSON Schema-like definitions
 */

export type SchemaType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null'
  | 'any';

export interface SchemaProperty {
  type: SchemaType | SchemaType[];
  required?: boolean;
  default?: any;
  enum?: any[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  custom?: (value: any) => boolean | string;
  description?: string;
}

export interface ValidationSchema {
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ValidationError {
  path: string;
  message: string;
  value?: any;
  expected?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: any;
}

export class SchemaValidator {
  /**
   * Validate data against schema
   */
  static validate(data: any, schema: ValidationSchema): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate type
    if (schema.type === 'object' && typeof data !== 'object') {
      errors.push({
        path: '',
        message: 'Expected object',
        value: data,
        expected: 'object'
      });
      return { valid: false, errors };
    }

    if (data === null || data === undefined) {
      errors.push({
        path: '',
        message: 'Data is null or undefined',
        value: data
      });
      return { valid: false, errors };
    }

    // Validate properties
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const value = data[key];
      const propErrors = SchemaValidator.validateProperty(value, propSchema, key);
      errors.push(...propErrors);
    }

    // Check required fields
    if (schema.required) {
      for (const requiredKey of schema.required) {
        if (!(requiredKey in data) || data[requiredKey] === undefined) {
          errors.push({
            path: requiredKey,
            message: `Required field "${requiredKey}" is missing`,
            expected: 'defined value'
          });
        }
      }
    }

    // Check additional properties
    if (schema.additionalProperties === false) {
      const allowedKeys = Object.keys(schema.properties);
      const dataKeys = Object.keys(data);

      for (const key of dataKeys) {
        if (!allowedKeys.includes(key)) {
          errors.push({
            path: key,
            message: `Additional property "${key}" is not allowed`,
            value: data[key]
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      data: errors.length === 0 ? data : undefined
    };
  }

  /**
   * Validate a single property
   */
  private static validateProperty(
    value: any,
    schema: SchemaProperty,
    path: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check if value is undefined
    if (value === undefined) {
      if (schema.required) {
        errors.push({
          path,
          message: `Field "${path}" is required`,
          expected: 'defined value'
        });
      }
      return errors;
    }

    // Type validation
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const valueType = SchemaValidator.getType(value);

    if (!types.includes('any') && !types.includes(valueType)) {
      errors.push({
        path,
        message: `Field "${path}" has invalid type`,
        value,
        expected: types.join(' | ')
      });
      return errors; // Don't continue validation if type is wrong
    }

    // String validations
    if (valueType === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({
          path,
          message: `Field "${path}" is too short (minimum ${schema.minLength} characters)`,
          value
        });
      }

      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({
          path,
          message: `Field "${path}" is too long (maximum ${schema.maxLength} characters)`,
          value
        });
      }

      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push({
            path,
            message: `Field "${path}" does not match pattern ${schema.pattern}`,
            value
          });
        }
      }

      if (schema.enum && !schema.enum.includes(value)) {
        errors.push({
          path,
          message: `Field "${path}" must be one of: ${schema.enum.join(', ')}`,
          value,
          expected: schema.enum.join(' | ')
        });
      }
    }

    // Number validations
    if (valueType === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({
          path,
          message: `Field "${path}" is too small (minimum ${schema.minimum})`,
          value
        });
      }

      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({
          path,
          message: `Field "${path}" is too large (maximum ${schema.maximum})`,
          value
        });
      }

      if (schema.enum && !schema.enum.includes(value)) {
        errors.push({
          path,
          message: `Field "${path}" must be one of: ${schema.enum.join(', ')}`,
          value
        });
      }
    }

    // Array validations
    if (valueType === 'array' && schema.items) {
      (value as any[]).forEach((item, index) => {
        const itemErrors = SchemaValidator.validateProperty(
          item,
          schema.items!,
          `${path}[${index}]`
        );
        errors.push(...itemErrors);
      });
    }

    // Object validations
    if (valueType === 'object' && schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propValue = value[key];
        const propErrors = SchemaValidator.validateProperty(
          propValue,
          propSchema,
          `${path}.${key}`
        );
        errors.push(...propErrors);
      }
    }

    // Custom validation
    if (schema.custom) {
      const customResult = schema.custom(value);
      if (customResult !== true) {
        errors.push({
          path,
          message: typeof customResult === 'string' ? customResult : `Field "${path}" failed custom validation`,
          value
        });
      }
    }

    return errors;
  }

  /**
   * Get type of value
   */
  private static getType(value: any): SchemaType {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value as SchemaType;
  }

  /**
   * Apply default values to data based on schema
   */
  static applyDefaults(data: any, schema: ValidationSchema): any {
    const result = { ...data };

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (!(key in result) && propSchema.default !== undefined) {
        result[key] = propSchema.default;
      }
    }

    return result;
  }

  /**
   * Coerce data types based on schema
   */
  static coerce(data: any, schema: ValidationSchema): any {
    const result = { ...data };

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in result) {
        result[key] = SchemaValidator.coerceValue(result[key], propSchema);
      }
    }

    return result;
  }

  /**
   * Coerce a single value
   */
  private static coerceValue(value: any, schema: SchemaProperty): any {
    if (value === undefined || value === null) return value;

    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const primaryType = types[0];

    try {
      switch (primaryType) {
        case 'string':
          return String(value);

        case 'number':
          const num = Number(value);
          return isNaN(num) ? value : num;

        case 'boolean':
          if (typeof value === 'string') {
            return value.toLowerCase() === 'true' || value === '1';
          }
          return Boolean(value);

        case 'array':
          return Array.isArray(value) ? value : [value];

        case 'object':
          return typeof value === 'object' ? value : {};

        default:
          return value;
      }
    } catch (error) {
      return value;
    }
  }

  /**
   * Create a simple schema builder
   */
  static createSchema(properties: Record<string, SchemaProperty>): ValidationSchema {
    return {
      type: 'object',
      properties,
      additionalProperties: true
    };
  }

  /**
   * Shorthand schema property builders
   */
  static string(options?: Partial<SchemaProperty>): SchemaProperty {
    return { type: 'string', ...options };
  }

  static number(options?: Partial<SchemaProperty>): SchemaProperty {
    return { type: 'number', ...options };
  }

  static boolean(options?: Partial<SchemaProperty>): SchemaProperty {
    return { type: 'boolean', ...options };
  }

  static array(items?: SchemaProperty, options?: Partial<SchemaProperty>): SchemaProperty {
    return { type: 'array', items, ...options };
  }

  static object(properties?: Record<string, SchemaProperty>, options?: Partial<SchemaProperty>): SchemaProperty {
    return { type: 'object', properties, ...options };
  }

  static enum(values: any[], options?: Partial<SchemaProperty>): SchemaProperty {
    return { type: 'string', enum: values, ...options };
  }

  static email(options?: Partial<SchemaProperty>): SchemaProperty {
    return {
      type: 'string',
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      ...options
    };
  }

  static url(options?: Partial<SchemaProperty>): SchemaProperty {
    return {
      type: 'string',
      pattern: '^https?:\\/\\/.+',
      ...options
    };
  }

  static uuid(options?: Partial<SchemaProperty>): SchemaProperty {
    return {
      type: 'string',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      ...options
    };
  }

  /**
   * Validate and format errors for display
   */
  static validateAndFormat(data: any, schema: ValidationSchema): {
    valid: boolean;
    data?: any;
    errorMessage?: string;
    errors?: ValidationError[];
  } {
    const result = SchemaValidator.validate(data, schema);

    if (result.valid) {
      return {
        valid: true,
        data: result.data
      };
    }

    const errorMessage = result.errors
      .map(err => `• ${err.path}: ${err.message}`)
      .join('\n');

    return {
      valid: false,
      errorMessage,
      errors: result.errors
    };
  }
}
