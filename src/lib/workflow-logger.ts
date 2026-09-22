/**
 * Custom logger for workflow execution
 * Prevents errors from triggering Next.js error overlay
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class WorkflowLogger {
  private prefix = '[WorkflowEngine]';

  private formatMessage(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    return [`${this.prefix} [${level.toUpperCase()}] ${timestamp}:`, message, ...args];
  }

  info(message: string, ...args: any[]) {
    console.log(...this.formatMessage('info', message, ...args));
  }

  warn(message: string, ...args: any[]) {
    console.warn(...this.formatMessage('warn', message, ...args));
  }

  /**
   * Logs errors without triggering Next.js error overlay
   * Uses console.log with error styling instead of console.error
   */
  error(message: string, ...args: any[]) {
    // Use console.log instead of console.error to avoid Next.js overlay
    // Add visual styling to make it stand out
    const formattedMessage = this.formatMessage('error', message, ...args);
    console.log(
      '%c' + formattedMessage[0],
      'color: #ef4444; font-weight: bold;',
      ...formattedMessage.slice(1)
    );
  }

  debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.log(...this.formatMessage('debug', message, ...args));
    }
  }

  /**
   * Creates a child logger with a custom prefix
   */
  child(prefix: string) {
    const childLogger = new WorkflowLogger();
    childLogger.prefix = `${this.prefix} [${prefix}]`;
    return childLogger;
  }
}

export const workflowLogger = new WorkflowLogger();
