// Static registry of node execution files for Turbopack/Next compatibility
// Keys must match the normalized form used in nodes.ts (e.g., './instagram.js')

// Import all .js/.ts execution files you want to support
import instagramJs from '@/nodes/instagram.js';
import twitterJs from '@/nodes/twitter.js';
// Prefer TypeScript implementation for table
import tableTs from '@/nodes/table.ts';
// If you also want to support a JS version of table, uncomment:
// import tableJs from '@/nodes/table.js';

export const executionFiles: Record<string, any> = {
  './instagram.js': instagramJs,
  './twitter.js': twitterJs,
  './table.ts': tableTs,
  // './table.js': tableJs,
};

