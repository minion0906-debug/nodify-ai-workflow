/**
 * Item Processor for Node Execution
 * Handles different processing modes: each, batch, first
 */

export type ProcessingMode = 'each' | 'batch' | 'first' | 'all';

export interface ProcessingConfig {
  mode: ProcessingMode;
  batchSize?: number;
  continueOnError?: boolean;
}

export interface ProcessingResult<T> {
  success: boolean;
  results: T[];
  errors: Array<{ index: number; error: Error }>;
  processedCount: number;
  failedCount: number;
}

export class ItemProcessor {
  /**
   * Process items based on configured mode
   */
  static async processItems<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput, index: number, context: any) => Promise<TOutput>,
    config: ProcessingConfig,
    context: any = {}
  ): Promise<ProcessingResult<TOutput>> {
    const { mode, batchSize = 100, continueOnError = true } = config;

    switch (mode) {
      case 'first':
        return await ItemProcessor.processFirst(items, processor, continueOnError, context);

      case 'each':
        return await ItemProcessor.processEach(items, processor, continueOnError, context);

      case 'batch':
        return await ItemProcessor.processBatch(items, processor, batchSize, continueOnError, context);

      case 'all':
      default:
        return await ItemProcessor.processAll(items, processor, continueOnError, context);
    }
  }

  /**
   * Process only the first item
   */
  private static async processFirst<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput, index: number, context: any) => Promise<TOutput>,
    continueOnError: boolean,
    context: any
  ): Promise<ProcessingResult<TOutput>> {
    const results: TOutput[] = [];
    const errors: Array<{ index: number; error: Error }> = [];

    if (items.length === 0) {
      return {
        success: true,
        results: [],
        errors: [],
        processedCount: 0,
        failedCount: 0
      };
    }

    try {
      const result = await processor(items[0], 0, context);
      results.push(result);

      return {
        success: true,
        results,
        errors: [],
        processedCount: 1,
        failedCount: 0
      };
    } catch (error: any) {
      errors.push({ index: 0, error });

      if (!continueOnError) {
        throw error;
      }

      return {
        success: false,
        results: [],
        errors,
        processedCount: 0,
        failedCount: 1
      };
    }
  }

  /**
   * Process each item individually
   */
  private static async processEach<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput, index: number, context: any) => Promise<TOutput>,
    continueOnError: boolean,
    context: any
  ): Promise<ProcessingResult<TOutput>> {
    const results: TOutput[] = [];
    const errors: Array<{ index: number; error: Error }> = [];
    let processedCount = 0;

    for (let i = 0; i < items.length; i++) {
      try {
        const result = await processor(items[i], i, context);
        results.push(result);
        processedCount++;
      } catch (error: any) {
        errors.push({ index: i, error });

        if (!continueOnError) {
          throw new Error(
            `Processing failed at item ${i}: ${error.message}\n` +
            `Processed ${processedCount} of ${items.length} items successfully.`
          );
        }
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      processedCount,
      failedCount: errors.length
    };
  }

  /**
   * Process items in batches
   */
  private static async processBatch<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput, index: number, context: any) => Promise<TOutput>,
    batchSize: number,
    continueOnError: boolean,
    context: any
  ): Promise<ProcessingResult<TOutput>> {
    const results: TOutput[] = [];
    const errors: Array<{ index: number; error: Error }> = [];
    let processedCount = 0;

    // Split into batches
    const batches: TInput[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    console.log(`[ItemProcessor] Processing ${items.length} items in ${batches.length} batches of ${batchSize}`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchOffset = batchIndex * batchSize;

      try {
        // Process all items in batch concurrently
        const batchPromises = batch.map((item, i) =>
          processor(item, batchOffset + i, context)
            .then(result => ({ success: true, result, index: batchOffset + i }))
            .catch(error => ({ success: false, error, index: batchOffset + i }))
        );

        const batchResults = await Promise.all(batchPromises);

        // Collect results and errors
        for (const batchResult of batchResults) {
          if (batchResult.success) {
            results.push(batchResult.result);
            processedCount++;
          } else {
            errors.push({ index: batchResult.index, error: batchResult.error });

            if (!continueOnError) {
              throw new Error(
                `Processing failed at item ${batchResult.index}: ${batchResult.error.message}\n` +
                `Processed ${processedCount} of ${items.length} items successfully.`
              );
            }
          }
        }

        console.log(`[ItemProcessor] Batch ${batchIndex + 1}/${batches.length} completed. Success: ${processedCount}, Failed: ${errors.length}`);

      } catch (error: any) {
        if (!continueOnError) {
          throw error;
        }
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      processedCount,
      failedCount: errors.length
    };
  }

  /**
   * Process all items as a single unit
   */
  private static async processAll<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput, index: number, context: any) => Promise<TOutput>,
    continueOnError: boolean,
    context: any
  ): Promise<ProcessingResult<TOutput>> {
    // For 'all' mode, we pass the entire array to processor once
    // This is useful for operations that need to see all data at once
    try {
      const result = await processor(items as any, 0, context);

      return {
        success: true,
        results: Array.isArray(result) ? result : [result],
        errors: [],
        processedCount: items.length,
        failedCount: 0
      };
    } catch (error: any) {
      if (!continueOnError) {
        throw error;
      }

      return {
        success: false,
        results: [],
        errors: [{ index: 0, error }],
        processedCount: 0,
        failedCount: items.length
      };
    }
  }

  /**
   * Get input data based on processing mode
   */
  static getInputData<T>(items: T[], mode: ProcessingMode): T | T[] {
    switch (mode) {
      case 'first':
        return items.length > 0 ? items[0] : ([] as any);
      case 'all':
        return items;
      case 'each':
      case 'batch':
      default:
        return items.length > 0 ? items[0] : ([] as any);
    }
  }

  /**
   * Prepare output data
   */
  static prepareOutputData<T>(results: T[], mode: ProcessingMode): T | T[] {
    if (mode === 'first') {
      return results.length > 0 ? results[0] : (null as any);
    }
    return results;
  }

  /**
   * Parse processing config from node definition
   */
  static parseProcessingConfig(nodeDefinition: any): ProcessingConfig {
    return {
      mode: nodeDefinition.processingMode || 'all',
      batchSize: nodeDefinition.batchSize || 100,
      continueOnError: nodeDefinition.continueOnError ?? true
    };
  }
}
