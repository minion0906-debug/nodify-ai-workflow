'use client';

import { useEffect } from 'react';

/**
 * Component to disable Next.js error overlay in development
 * Only affects the error overlay, not the actual error logging
 *
 * Usage: Add <DisableErrorOverlay /> to your root layout or specific pages
 *
 * Note: This is useful when working with workflow execution errors
 * that shouldn't trigger the development error overlay
 */
export function DisableErrorOverlay() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Store original console.error
      const originalError = console.error;

      // Filter out specific errors from triggering the overlay
      console.error = (...args: any[]) => {
        // Check all arguments for error patterns
        const fullMessage = args.map(arg => {
          if (arg instanceof Error) {
            return arg.message + ' ' + (arg.stack || '');
          }
          return String(arg);
        }).join(' ');

        // List of patterns to ignore for the overlay
        const ignoredPatterns = [
          '[WorkflowEngine]',
          'EXPRESSION_ERROR',
          'Node with ID',
          'Critical error executing node',
          'Canceled',
          'AbortError',
          '[Turbopack HMR] Expected module to match pattern',
          '[Turbopack HMR]',
          'src/nodes/',
          '[Polling] Failed to fetch events',
        ];

        const shouldIgnore = ignoredPatterns.some(pattern =>
          fullMessage.includes(pattern)
        );

        if (shouldIgnore) {
          // Silently ignore - don't log at all for these errors
          if (fullMessage.includes('Canceled') ||
              fullMessage.includes('AbortError') ||
              fullMessage.includes('[Turbopack HMR]') ||
              fullMessage.includes('src/nodes/') ||
              fullMessage.includes('[Polling] Failed to fetch events')) {
            return;
          }
          // Log to console without triggering overlay for other suppressed errors
          originalError.apply(console, ['[Suppressed Error]', ...args]);
        } else {
          // Normal error handling
          originalError.apply(console, args);
        }
      };

      // Handle unhandled promise rejections
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        const message = reason?.message || String(reason);

        if (message.includes('Canceled') ||
            message.includes('AbortError') ||
            message.includes('[Turbopack HMR]') ||
            message.includes('src/nodes/') ||
            message.includes('Expected module to match pattern') ||
            message.includes('[Polling] Failed to fetch events')) {
          event.preventDefault(); // Prevent default error handling
          return;
        }
      };

      // Handle global errors
      const handleError = (event: ErrorEvent) => {
        const message = event.message || '';

        if (message.includes('Canceled') ||
            message.includes('AbortError') ||
            message.includes('[Turbopack HMR]') ||
            message.includes('src/nodes/') ||
            message.includes('Expected module to match pattern') ||
            message.includes('[Polling] Failed to fetch events')) {
          event.preventDefault(); // Prevent default error handling
          return;
        }
      };

      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', handleError);

      // Monitor for Next.js error overlay and hide it if it contains "Canceled"
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // Check if this is the Next.js error overlay
              if (node.tagName === 'NEXTJS-PORTAL' ||
                  node.querySelector('[data-nextjs-dialog-overlay]') ||
                  node.hasAttribute('data-nextjs-dialog-overlay')) {

                const textContent = node.textContent || '';

                // Hide overlay if it contains specific ignored error patterns
                if (textContent.includes('Canceled') ||
                    textContent.includes('AbortError') ||
                    textContent.includes('[Turbopack HMR]') ||
                    textContent.includes('src/nodes/') ||
                    textContent.includes('Expected module to match pattern')) {
                  (node as HTMLElement).style.display = 'none';
                }
              }
            }
          });
        });
      });

      // Start observing document for added nodes
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return () => {
        // Restore original console.error on cleanup
        console.error = originalError;
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('error', handleError);
        observer.disconnect();
      };
    }
  }, []);

  return null;
}

/**
 * Component to completely disable Next.js error overlay
 * Use with caution - this will hide ALL development errors
 *
 * Only recommended for specific pages where you handle errors manually
 */
export function DisableAllErrorOverlays() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Disable the Next.js error overlay completely
      const style = document.createElement('style');
      style.innerHTML = `
        nextjs-portal {
          display: none !important;
        }
        [data-nextjs-dialog-overlay] {
          display: none !important;
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  return null;
}
