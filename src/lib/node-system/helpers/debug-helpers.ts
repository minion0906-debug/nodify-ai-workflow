/**
 * Debug and Monitoring Helpers
 * Provides utilities for performance tracking, metrics, and debugging
 */

export interface Timer {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface Breadcrumb {
  message: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  data?: any;
}

export class DebugHelpers {
  private static timers: Map<string, Timer> = new Map();
  private static metrics: Metric[] = [];
  private static breadcrumbs: Breadcrumb[] = [];
  private static context: Map<string, any> = new Map();
  private static maxBreadcrumbs = 100;

  /**
   * Start a performance timer
   */
  static startTimer(name: string): void {
    this.timers.set(name, {
      name,
      startTime: Date.now()
    });
    console.log(`[Timer] Started: ${name}`);
  }

  /**
   * End a performance timer and return duration
   */
  static endTimer(name: string): number {
    const timer = this.timers.get(name);

    if (!timer) {
      console.warn(`[Timer] No timer found with name: ${name}`);
      return 0;
    }

    const endTime = Date.now();
    const duration = endTime - timer.startTime;

    timer.endTime = endTime;
    timer.duration = duration;

    console.log(`[Timer] Ended: ${name} (${duration}ms)`);

    return duration;
  }

  /**
   * Get timer duration without ending it
   */
  static getTimerDuration(name: string): number {
    const timer = this.timers.get(name);

    if (!timer) {
      return 0;
    }

    if (timer.duration !== undefined) {
      return timer.duration;
    }

    return Date.now() - timer.startTime;
  }

  /**
   * Get all timers
   */
  static getAllTimers(): Timer[] {
    return Array.from(this.timers.values());
  }

  /**
   * Clear specific timer
   */
  static clearTimer(name: string): void {
    this.timers.delete(name);
  }

  /**
   * Clear all timers
   */
  static clearAllTimers(): void {
    this.timers.clear();
  }

  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(
    name: string,
    fn: () => Promise<T> | T
  ): Promise<{ result: T; duration: number }> {
    this.startTimer(name);
    const result = await fn();
    const duration = this.endTimer(name);

    return { result, duration };
  }

  /**
   * Record a metric
   */
  static recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);
    console.log(`[Metric] ${name}: ${value}`, tags || '');
  }

  /**
   * Increment a counter metric
   */
  static incrementMetric(name: string, tags?: Record<string, string>): void {
    this.recordMetric(name, 1, tags);
  }

  /**
   * Get all metrics
   */
  static getAllMetrics(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  static getMetricsByName(name: string): Metric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Calculate average for a metric
   */
  static getMetricAverage(name: string): number {
    const metrics = this.getMetricsByName(name);

    if (metrics.length === 0) {
      return 0;
    }

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Add a breadcrumb for debugging
   */
  static addBreadcrumb(
    message: string,
    level: 'debug' | 'info' | 'warn' | 'error' = 'info',
    data?: any
  ): void {
    const breadcrumb: Breadcrumb = {
      message,
      timestamp: Date.now(),
      level,
      data
    };

    this.breadcrumbs.push(breadcrumb);

    // Limit breadcrumbs to prevent memory issues
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    console.log(`[Breadcrumb] [${level.toUpperCase()}] ${message}`, data || '');
  }

  /**
   * Get all breadcrumbs
   */
  static getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Get breadcrumbs by level
   */
  static getBreadcrumbsByLevel(level: 'debug' | 'info' | 'warn' | 'error'): Breadcrumb[] {
    return this.breadcrumbs.filter(b => b.level === level);
  }

  /**
   * Clear all breadcrumbs
   */
  static clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * Set context value
   */
  static setContext(key: string, value: any): void {
    this.context.set(key, value);
    console.log(`[Context] Set: ${key} =`, value);
  }

  /**
   * Get context value
   */
  static getContext(key: string): any {
    return this.context.get(key);
  }

  /**
   * Get all context
   */
  static getAllContext(): Record<string, any> {
    return Object.fromEntries(this.context.entries());
  }

  /**
   * Clear context value
   */
  static clearContext(key: string): void {
    this.context.delete(key);
  }

  /**
   * Clear all context
   */
  static clearAllContext(): void {
    this.context.clear();
  }

  /**
   * Memory usage snapshot
   */
  static getMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  } | null {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      return {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024),
        arrayBuffers: Math.round(mem.arrayBuffers / 1024 / 1024)
      };
    }

    // Browser environment
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      return {
        heapUsed: Math.round(mem.usedJSHeapSize / 1024 / 1024),
        heapTotal: Math.round(mem.totalJSHeapSize / 1024 / 1024),
        external: 0,
        arrayBuffers: 0
      };
    }

    return null;
  }

  /**
   * Log memory usage
   */
  static logMemoryUsage(label: string = 'Memory'): void {
    const mem = this.getMemoryUsage();

    if (mem) {
      console.log(
        `[${label}] Heap: ${mem.heapUsed}MB / ${mem.heapTotal}MB | ` +
        `External: ${mem.external}MB | ArrayBuffers: ${mem.arrayBuffers}MB`
      );
    }
  }

  /**
   * Generate debug report
   */
  static generateDebugReport(): {
    timers: Timer[];
    metrics: Metric[];
    breadcrumbs: Breadcrumb[];
    context: Record<string, any>;
    memory: ReturnType<typeof DebugHelpers.getMemoryUsage>;
    timestamp: number;
  } {
    return {
      timers: this.getAllTimers(),
      metrics: this.getAllMetrics(),
      breadcrumbs: this.getBreadcrumbs(),
      context: this.getAllContext(),
      memory: this.getMemoryUsage(),
      timestamp: Date.now()
    };
  }

  /**
   * Clear all debug data
   */
  static clearAll(): void {
    this.clearAllTimers();
    this.clearMetrics();
    this.clearBreadcrumbs();
    this.clearAllContext();
  }

  /**
   * Performance mark (using Performance API if available)
   */
  static mark(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
    this.addBreadcrumb(`Performance mark: ${name}`, 'debug');
  }

  /**
   * Performance measure between marks
   */
  static measure(name: string, startMark: string, endMark: string): number {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        if (measure) {
          console.log(`[Measure] ${name}: ${measure.duration.toFixed(2)}ms`);
          return measure.duration;
        }
      } catch (error) {
        console.warn(`[Measure] Failed to measure ${name}:`, error);
      }
    }
    return 0;
  }

  /**
   * Assert condition for debugging
   */
  static assert(condition: boolean, message: string): void {
    if (!condition) {
      console.error(`[Assert] Assertion failed: ${message}`);
      this.addBreadcrumb(`Assertion failed: ${message}`, 'error');
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Inspect object (pretty print)
   */
  static inspect(obj: any, label?: string): void {
    const output = JSON.stringify(obj, null, 2);
    if (label) {
      console.log(`[Inspect] ${label}:`);
    }
    console.log(output);
  }

  /**
   * Table output (if console.table available)
   */
  static table(data: any[], label?: string): void {
    if (label) {
      console.log(`[Table] ${label}:`);
    }

    if (typeof console.table === 'function') {
      console.table(data);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}
