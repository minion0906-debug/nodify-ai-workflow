/**
 * Data Transformation Helpers
 * Provides utility functions for array and object manipulation
 */

export class DataHelpers {
  /**
   * Map over array items
   */
  static map<T, U>(items: T[], fn: (item: T, index: number) => U): U[] {
    if (!Array.isArray(items)) {
      throw new Error('map() requires an array as first argument');
    }
    return items.map(fn);
  }

  /**
   * Filter array items
   */
  static filter<T>(items: T[], fn: (item: T, index: number) => boolean): T[] {
    if (!Array.isArray(items)) {
      throw new Error('filter() requires an array as first argument');
    }
    return items.filter(fn);
  }

  /**
   * Reduce array to single value
   */
  static reduce<T, U>(
    items: T[],
    fn: (accumulator: U, item: T, index: number) => U,
    initialValue: U
  ): U {
    if (!Array.isArray(items)) {
      throw new Error('reduce() requires an array as first argument');
    }
    return items.reduce(fn, initialValue);
  }

  /**
   * Group array items by key
   */
  static groupBy<T>(items: T[], key: string | ((item: T) => string)): Record<string, T[]> {
    if (!Array.isArray(items)) {
      throw new Error('groupBy() requires an array as first argument');
    }

    const keyFn = typeof key === 'function' ? key : (item: any) => item[key];

    return items.reduce((groups, item) => {
      const groupKey = String(keyFn(item));
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Sort array by key or comparator
   */
  static sortBy<T>(
    items: T[],
    key: string | ((item: T) => any),
    order: 'asc' | 'desc' = 'asc'
  ): T[] {
    if (!Array.isArray(items)) {
      throw new Error('sortBy() requires an array as first argument');
    }

    const keyFn = typeof key === 'function' ? key : (item: any) => item[key];
    const sorted = [...items].sort((a, b) => {
      const aVal = keyFn(a);
      const bVal = keyFn(b);

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  /**
   * Get unique items by key
   */
  static unique<T>(items: T[], key?: string | ((item: T) => any)): T[] {
    if (!Array.isArray(items)) {
      throw new Error('unique() requires an array as first argument');
    }

    if (!key) {
      return [...new Set(items)];
    }

    const keyFn = typeof key === 'function' ? key : (item: any) => item[key];
    const seen = new Set();
    return items.filter(item => {
      const k = keyFn(item);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  /**
   * Flatten nested array
   */
  static flatten<T>(items: any[], depth: number = 1): T[] {
    if (!Array.isArray(items)) {
      throw new Error('flatten() requires an array as first argument');
    }

    if (depth === 0) return items;

    return items.reduce((flat, item) => {
      if (Array.isArray(item)) {
        return flat.concat(DataHelpers.flatten(item, depth - 1));
      }
      return flat.concat(item);
    }, []);
  }

  /**
   * Chunk array into smaller arrays
   */
  static chunk<T>(items: T[], size: number): T[][] {
    if (!Array.isArray(items)) {
      throw new Error('chunk() requires an array as first argument');
    }
    if (size <= 0) {
      throw new Error('chunk() size must be greater than 0');
    }

    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Pick specific keys from object
   */
  static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('pick() requires an object as first argument');
    }

    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  /**
   * Omit specific keys from object
   */
  static omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('omit() requires an object as first argument');
    }

    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result as Omit<T, K>;
  }

  /**
   * Deep merge objects
   */
  static merge<T extends object>(...objects: Partial<T>[]): T {
    return objects.reduce((result, obj) => {
      Object.keys(obj).forEach(key => {
        const resultValue = (result as any)[key];
        const objValue = (obj as any)[key];

        if (
          typeof resultValue === 'object' &&
          resultValue !== null &&
          !Array.isArray(resultValue) &&
          typeof objValue === 'object' &&
          objValue !== null &&
          !Array.isArray(objValue)
        ) {
          (result as any)[key] = DataHelpers.merge(resultValue, objValue);
        } else {
          (result as any)[key] = objValue;
        }
      });
      return result;
    }, {} as T);
  }

  /**
   * Flatten nested object to dot notation
   */
  static flattenObject(obj: any, prefix: string = ''): Record<string, any> {
    if (typeof obj !== 'object' || obj === null) {
      return { [prefix]: obj };
    }

    return Object.keys(obj).reduce((acc, key) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(acc, DataHelpers.flattenObject(value, newKey));
      } else {
        acc[newKey] = value;
      }

      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Get value from nested object using dot notation
   */
  static get(obj: any, path: string, defaultValue?: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return defaultValue;
    }

    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }
      result = result[key];
    }

    return result !== undefined ? result : defaultValue;
  }

  /**
   * Set value in nested object using dot notation
   */
  static set(obj: any, path: string, value: any): any {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('set() requires an object as first argument');
    }

    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
    return obj;
  }

  /**
   * Deep clone object
   */
  static clone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    if (obj instanceof Array) {
      return obj.map(item => DataHelpers.clone(item)) as any;
    }

    if (obj instanceof Object) {
      const cloned = {} as T;
      Object.keys(obj).forEach(key => {
        (cloned as any)[key] = DataHelpers.clone((obj as any)[key]);
      });
      return cloned;
    }

    return obj;
  }
}
