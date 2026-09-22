// Suppress Turbopack HMR warnings in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.error = (...args: any[]) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('Turbopack HMR') ||
       message.includes('Expected module to match pattern'))
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('Turbopack HMR') ||
       message.includes('Expected module to match pattern'))
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
}

export {};
