/**
 * Built-in Tool Templates for AI Agent
 * Pre-configured tools that can be used in the AI Agent node
 */

export interface ToolTemplate {
  name: string;
  description: string;
  schema: Record<string, any>;
  code: string;
  category: 'http' | 'data' | 'search' | 'database' | 'ai' | 'utility';
  enabled: boolean;
}

/**
 * HTTP Request Tools
 */
export const httpGetTool: ToolTemplate = {
  name: 'http_get',
  description: 'Fetch data from a URL using HTTP GET request. Returns the response as text or JSON.',
  category: 'http',
  enabled: true,
  schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch'
      },
      headers: {
        type: 'object',
        description: 'Optional HTTP headers',
        additionalProperties: {
          type: 'string'
        }
      }
    },
    required: ['url']
  },
  code: `const fetch = (await import('node-fetch')).default;
const response = await fetch(args.url, {
  method: 'GET',
  headers: args.headers || {}
});
const contentType = response.headers.get('content-type');
if (contentType && contentType.includes('application/json')) {
  return await response.json();
}
return await response.text();`
};

export const httpPostTool: ToolTemplate = {
  name: 'http_post',
  description: 'Send data to a URL using HTTP POST request. Can send JSON or form data.',
  category: 'http',
  enabled: true,
  schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to post to'
      },
      body: {
        type: 'object',
        description: 'The data to send in the request body'
      },
      headers: {
        type: 'object',
        description: 'Optional HTTP headers',
        additionalProperties: {
          type: 'string'
        }
      }
    },
    required: ['url', 'body']
  },
  code: `const fetch = (await import('node-fetch')).default;
const headers = {
  'Content-Type': 'application/json',
  ...(args.headers || {})
};
const response = await fetch(args.url, {
  method: 'POST',
  headers,
  body: JSON.stringify(args.body)
});
const contentType = response.headers.get('content-type');
if (contentType && contentType.includes('application/json')) {
  return await response.json();
}
return await response.text();`
};

/**
 * Web Search Tool (using DuckDuckGo)
 */
export const webSearchTool: ToolTemplate = {
  name: 'web_search',
  description: 'Search the web using DuckDuckGo and return relevant results. Returns title, snippet, and URL for each result.',
  category: 'search',
  enabled: true,
  schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query'
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5)',
        default: 5
      }
    },
    required: ['query']
  },
  code: `const fetch = (await import('node-fetch')).default;
const maxResults = args.maxResults || 5;
const url = \`https://html.duckduckgo.com/html/?q=\${encodeURIComponent(args.query)}\`;
const response = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});
const html = await response.text();
const cheerio = require('cheerio');
const $ = cheerio.load(html);
const results = [];
$('.result__body').slice(0, maxResults).each((i, el) => {
  const title = $(el).find('.result__title').text().trim();
  const snippet = $(el).find('.result__snippet').text().trim();
  const link = $(el).find('.result__url').attr('href');
  if (title && link) {
    results.push({ title, snippet, url: link });
  }
});
return { query: args.query, results, count: results.length };`
};

/**
 * Data Manipulation Tools
 */
export const jsonQueryTool: ToolTemplate = {
  name: 'json_query',
  description: 'Query and extract data from JSON using JSONPath syntax. Returns the matched values.',
  category: 'data',
  enabled: true,
  schema: {
    type: 'object',
    properties: {
      jsonData: {
        type: 'object',
        description: 'The JSON object to query'
      },
      path: {
        type: 'string',
        description: 'JSONPath expression (e.g., "$.users[*].name")'
      }
    },
    required: ['jsonData', 'path']
  },
  code: `const jp = require('jsonpath');
const result = jp.query(args.jsonData, args.path);
return { path: args.path, matches: result, count: result.length };`
};

export const dataTransformTool: ToolTemplate = {
  name: 'data_transform',
  description: 'Transform data using JavaScript code. Useful for mapping, filtering, or reshaping data structures.',
  category: 'data',
  enabled: true,
  schema: {
    type: 'object',
    properties: {
      inputData: {
        type: 'any',
        description: 'The data to transform'
      },
      transformCode: {
        type: 'string',
        description: 'JavaScript code that transforms the data. Use "input" variable to access data and return the result.'
      }
    },
    required: ['inputData', 'transformCode']
  },
  code: `const AsyncFn = Object.getPrototypeOf(async function(){}).constructor;
const transform = new AsyncFn('input', 'helpers', args.transformCode);
const result = await transform(args.inputData, helpers);
return result;`
};

/**
 * Database Tools
 */
export const sqlQueryTool: ToolTemplate = {
  name: 'sql_query',
  description: 'Execute SQL queries on the SQLite database. Can read from custom tables. Use SELECT queries only.',
  category: 'database',
  enabled: true,
  schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'SQL SELECT query to execute'
      },
      params: {
        type: 'array',
        description: 'Query parameters for prepared statements',
        items: {
          type: 'any'
        }
      }
    },
    required: ['query']
  },
  code: `if (typeof modules?.db === 'undefined') {
  throw new Error('Database module not available');
}
const db = modules.db;
const params = args.params || [];
if (!args.query.trim().toUpperCase().startsWith('SELECT')) {
  throw new Error('Only SELECT queries are allowed');
}
const stmt = db.prepare(args.query);
const results = stmt.all(...params);
return { query: args.query, results, count: results.length };`
};

/**
 * Utility Tools
 */
export const dateTimeTool: ToolTemplate = {
  name: 'get_datetime',
  description: 'Get current date and time in various formats. Returns ISO string, Unix timestamp, and formatted date.',
  category: 'utility',
  enabled: true,
  schema: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'Timezone (e.g., "America/New_York", "Europe/London")',
        default: 'UTC'
      },
      format: {
        type: 'string',
        description: 'Date format string (e.g., "YYYY-MM-DD HH:mm:ss")',
        default: 'ISO'
      }
    }
  },
  code: `const now = new Date();
const timezone = args.timezone || 'UTC';
const format = args.format || 'ISO';
const result = {
  iso: now.toISOString(),
  unix: Math.floor(now.getTime() / 1000),
  timestamp: now.getTime(),
  timezone
};
if (format !== 'ISO') {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  result.formatted = formatter.format(now);
} else {
  result.formatted = now.toISOString();
}
return result;`
};

export const stringOperationsTool: ToolTemplate = {
  name: 'string_operations',
  description: 'Perform various string operations like split, join, replace, regex match, etc.',
  category: 'utility',
  enabled: true,
  schema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'Operation to perform',
        enum: ['split', 'join', 'replace', 'regex_match', 'regex_replace', 'uppercase', 'lowercase', 'trim']
      },
      text: {
        type: 'string',
        description: 'The text to operate on'
      },
      params: {
        type: 'object',
        description: 'Operation-specific parameters',
        additionalProperties: true
      }
    },
    required: ['operation', 'text']
  },
  code: `const { operation, text, params = {} } = args;
switch (operation) {
  case 'split':
    return text.split(params.delimiter || ',');
  case 'join':
    if (!Array.isArray(text)) throw new Error('Text must be an array for join operation');
    return text.join(params.delimiter || ',');
  case 'replace':
    return text.replace(params.search || '', params.replace || '');
  case 'regex_match':
    const matchRegex = new RegExp(params.pattern, params.flags || 'g');
    return text.match(matchRegex) || [];
  case 'regex_replace':
    const replaceRegex = new RegExp(params.pattern, params.flags || 'g');
    return text.replace(replaceRegex, params.replace || '');
  case 'uppercase':
    return text.toUpperCase();
  case 'lowercase':
    return text.toLowerCase();
  case 'trim':
    return text.trim();
  default:
    throw new Error(\`Unknown operation: \${operation}\`);
}`
};

/**
 * Math Tool
 */
export const mathCalculatorTool: ToolTemplate = {
  name: 'calculate',
  description: 'Perform mathematical calculations safely. Supports basic arithmetic, trigonometry, and more.',
  category: 'utility',
  enabled: true,
  schema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate (e.g., "2 + 2", "Math.sqrt(16)", "Math.sin(Math.PI / 2)")'
      }
    },
    required: ['expression']
  },
  code: `const mathjs = require('mathjs');
try {
  const result = mathjs.evaluate(args.expression);
  return { expression: args.expression, result };
} catch (error) {
  throw new Error(\`Calculation error: \${error.message}\`);
}`
};

/**
 * All tool templates grouped by category
 */
export const toolTemplates: Record<string, ToolTemplate[]> = {
  http: [httpGetTool, httpPostTool],
  search: [webSearchTool],
  data: [jsonQueryTool, dataTransformTool],
  database: [sqlQueryTool],
  utility: [dateTimeTool, stringOperationsTool, mathCalculatorTool],
};

/**
 * Get all tool templates as a flat array
 */
export function getAllToolTemplates(): ToolTemplate[] {
  return Object.values(toolTemplates).flat();
}

/**
 * Get tool templates by category
 */
export function getToolTemplatesByCategory(category: string): ToolTemplate[] {
  return toolTemplates[category] || [];
}

/**
 * Get a specific tool template by name
 */
export function getToolTemplate(name: string): ToolTemplate | undefined {
  return getAllToolTemplates().find(tool => tool.name === name);
}
