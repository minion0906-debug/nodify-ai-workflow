/**
 * Retry Handler for Node Execution
 * Provides automatic retry logic with configurable strategies
 */

export interface RetryConfig {
  enabled: boolean;
  maxRetries: number;
  delay: number;
  strategy: 'linear' | 'exponential' | 'fibonacci';
  retryOnErrors?: string[]; // Error messages to retry on
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export class RetryHandler {
  /**
   * Execute function with retry logic
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= config.maxRetries) {
      try {
        const result = await fn();

        return {
          success: true,
          result,
          attempts: attempt + 1,
          totalTime: Date.now() - startTime
        };
      } catch (error: any) {
        lastError = error;
        attempt++;

        // Check if we should retry this error
        if (config.retryOnErrors && config.retryOnErrors.length > 0) {
          const shouldRetry = config.retryOnErrors.some(pattern =>
            error.message?.includes(pattern)
          );

          if (!shouldRetry) {
            // Don't retry this error
            break;
          }
        }

        // If we've exhausted retries, break
        if (attempt > config.maxRetries) {
          break;
        }

        // Calculate delay and wait
        const delay = RetryHandler.calculateDelay(attempt, config.delay, config.strategy);

        if (onRetry) {
          onRetry(attempt, error);
        }

        console.log(`[RetryHandler] Attempt ${attempt}/${config.maxRetries} failed. Retrying in ${delay}ms...`);
        await RetryHandler.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: attempt,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Calculate retry delay based on strategy
   */
  private static calculateDelay(
    attempt: number,
    baseDelay: number,
    strategy: 'linear' | 'exponential' | 'fibonacci'
  ): number {
    switch (strategy) {
      case 'linear':
        return baseDelay * attempt;

      case 'exponential':
        return baseDelay * Math.pow(2, attempt - 1);

      case 'fibonacci': {
        let a = 1, b = 1;
        for (let i = 2; i < attempt; i++) {
          [a, b] = [b, a + b];
        }
        return baseDelay * b;
      }

      default:
        return baseDelay;
    }
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse retry config from node definition
   */
  static parseRetryConfig(nodeDefinition: any): RetryConfig {
    return {
      enabled: nodeDefinition.retryOnFail ?? false,
      maxRetries: nodeDefinition.maxRetries ?? 3,
      delay: nodeDefinition.retryDelay ?? 1000,
      strategy: nodeDefinition.retryStrategy ?? 'exponential',
      retryOnErrors: nodeDefinition.retryOnErrors
    };
  }

  /**
   * Helper for common retry pattern
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delay?: number;
      backoff?: 'linear' | 'exponential' | 'fibonacci';
      onRetry?: (attempt: number, error: Error) => void;
    } = {}
  ): Promise<T> {
    const config: RetryConfig = {
      enabled: true,
      maxRetries: (options.maxAttempts ?? 3) - 1, // maxAttempts includes first attempt
      delay: options.delay ?? 1000,
      strategy: options.backoff ?? 'exponential'
    };

    const result = await RetryHandler.executeWithRetry(fn, config, options.onRetry);

    if (result.success && result.result !== undefined) {
      return result.result;
    }

    throw result.error || new Error('Retry failed with unknown error');
  }
}
