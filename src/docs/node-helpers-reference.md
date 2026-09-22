# Node Helpers Reference

Complete reference for all helper functions available in Nodify node execution.

## Table of Contents

1. [Data Helpers](#data-helpers)
2. [String Helpers](#string-helpers)
3. [Date Helpers](#date-helpers)
4. [HTTP Helpers](#http-helpers)
5. [Debug Helpers](#debug-helpers)
6. [Secrets Manager](#secrets-manager)
7. [Schema Validator](#schema-validator)
8. [Conditional Router](#conditional-router)
9. [Retry Handler](#retry-handler)
10. [Item Processor](#item-processor)

---

## Data Helpers

Transform and manipulate data structures.

### Array Operations

#### `helpers.map(array, fn)`
Transform array items.

```javascript
const users = [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }];
const names = helpers.map(users, user => user.name);
// => ['John', 'Jane']
```

#### `helpers.filter(array, fn)`
Filter array items.

```javascript
const numbers = [1, 2, 3, 4, 5];
const evens = helpers.filter(numbers, n => n % 2 === 0);
// => [2, 4]
```

#### `helpers.reduce(array, fn, initial)`
Reduce array to single value.

```javascript
const numbers = [1, 2, 3, 4];
const sum = helpers.reduce(numbers, (acc, n) => acc + n, 0);
// => 10
```

#### `helpers.groupBy(array, key)`
Group array items by property or function.

```javascript
const users = [
  { name: 'John', role: 'admin' },
  { name: 'Jane', role: 'user' },
  { name: 'Bob', role: 'admin' }
];
const byRole = helpers.groupBy(users, 'role');
// => { admin: [John, Bob], user: [Jane] }
```

#### `helpers.sortBy(array, key, order)`
Sort array by property.

```javascript
const users = [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }];
const sorted = helpers.sortBy(users, 'age', 'asc');
// => [{ name: 'Jane', age: 25 }, { name: 'John', age: 30 }]
```

#### `helpers.unique(array, key?)`
Get unique items.

```javascript
const numbers = [1, 2, 2, 3, 3, 3];
const uniq = helpers.unique(numbers);
// => [1, 2, 3]

const users = [{ id: 1, name: 'John' }, { id: 1, name: 'Jane' }];
const uniqById = helpers.unique(users, 'id');
// => [{ id: 1, name: 'John' }]
```

#### `helpers.chunk(array, size)`
Split array into chunks.

```javascript
const numbers = [1, 2, 3, 4, 5, 6];
const chunks = helpers.chunk(numbers, 2);
// => [[1, 2], [3, 4], [5, 6]]
```

#### `helpers.flatten(array, depth?)`
Flatten nested arrays.

```javascript
const nested = [1, [2, [3, [4]]]];
const flat = helpers.flatten(nested, 2);
// => [1, 2, 3, [4]]
```

### Object Operations

#### `helpers.pick(object, keys)`
Pick specific properties.

```javascript
const user = { id: 1, name: 'John', email: 'john@example.com', password: 'secret' };
const safe = helpers.pick(user, ['id', 'name', 'email']);
// => { id: 1, name: 'John', email: 'john@example.com' }
```

#### `helpers.omit(object, keys)`
Omit specific properties.

```javascript
const user = { id: 1, name: 'John', password: 'secret' };
const safe = helpers.omit(user, ['password']);
// => { id: 1, name: 'John' }
```

#### `helpers.merge(...objects)`
Deep merge objects.

```javascript
const defaults = { theme: 'light', fontSize: 14 };
const userPrefs = { theme: 'dark' };
const config = helpers.merge(defaults, userPrefs);
// => { theme: 'dark', fontSize: 14 }
```

#### `helpers.get(object, path, defaultValue?)`
Get nested property safely.

```javascript
const user = { profile: { address: { city: 'New York' } } };
const city = helpers.get(user, 'profile.address.city');
// => 'New York'

const zipCode = helpers.get(user, 'profile.address.zipCode', '00000');
// => '00000'
```

#### `helpers.set(object, path, value)`
Set nested property.

```javascript
const user = {};
helpers.set(user, 'profile.address.city', 'New York');
// => { profile: { address: { city: 'New York' } } }
```

---

## String Helpers

String transformation utilities.

#### `helpers.slugify(text)`
Convert to URL-friendly slug.

```javascript
const slug = helpers.slugify('Hello World! This is 2024');
// => 'hello-world-this-is-2024'
```

#### `helpers.capitalize(text)`
Capitalize first letter.

```javascript
const title = helpers.capitalize('hello world');
// => 'Hello world'
```

#### `helpers.camelCase(text)`
Convert to camelCase.

```javascript
const varName = helpers.camelCase('hello-world-example');
// => 'helloWorldExample'
```

#### `helpers.snakeCase(text)`
Convert to snake_case.

```javascript
const varName = helpers.snakeCase('HelloWorld');
// => 'hello_world'
```

#### `helpers.kebabCase(text)`
Convert to kebab-case.

```javascript
const className = helpers.kebabCase('HelloWorld');
// => 'hello-world'
```

#### `helpers.template(template, data)`
String template interpolation.

```javascript
const message = helpers.template('Hello {{name}}, you have {{count}} messages', {
  name: 'John',
  count: 5
});
// => 'Hello John, you have 5 messages'
```

#### More string helpers

```javascript
helpers.string.titleCase('hello world')              // => 'Hello World'
helpers.string.truncate('Long text...', 10, '...')   // => 'Long te...'
helpers.string.stripHtml('<p>Hello</p>')              // => 'Hello'
helpers.string.extractEmails(text)                    // => ['email@example.com']
helpers.string.extractUrls(text)                      // => ['https://example.com']
helpers.string.wordCount(text)                        // => 42
helpers.string.random(10)                             // => 'x7kP9mZqR2'
```

---

## Date Helpers

Date manipulation and formatting.

#### `helpers.formatDate(date, format)`
Format date with custom pattern.

```javascript
const formatted = helpers.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');
// => '2024-10-19 14:30:00'

// Supported tokens:
// YYYY - 4 digit year
// MM   - 2 digit month
// DD   - 2 digit day
// HH   - 2 digit hour (24h)
// mm   - 2 digit minute
// ss   - 2 digit second
// SSS  - 3 digit millisecond
```

#### `helpers.parseDate(dateString)`
Parse date from string.

```javascript
const date = helpers.parseDate('2024-10-19');
// => Date object
```

#### `helpers.addDays(date, days)`
Add/subtract days.

```javascript
const tomorrow = helpers.addDays(new Date(), 1);
const yesterday = helpers.addDays(new Date(), -1);
```

#### `helpers.timeAgo(date)`
Relative time formatting.

```javascript
const relative = helpers.timeAgo('2024-10-19T10:00:00Z');
// => '2 hours ago'
```

#### More date helpers

```javascript
helpers.date.addHours(date, 2)                        // Add hours
helpers.date.addMinutes(date, 30)                     // Add minutes
helpers.date.diffDays(date1, date2)                   // Difference in days
helpers.date.diffHours(date1, date2)                  // Difference in hours
helpers.date.isPast(date)                             // Check if past
helpers.date.isFuture(date)                           // Check if future
helpers.date.isToday(date)                            // Check if today
helpers.date.startOfDay(date)                         // Get start of day
helpers.date.endOfDay(date)                           // Get end of day
helpers.date.getDayName(date, short)                  // => 'Monday' or 'Mon'
helpers.date.getMonthName(date, short)                // => 'October' or 'Oct'
helpers.date.getTimestamp(date)                       // Unix timestamp (seconds)
helpers.date.fromTimestamp(timestamp)                 // Create from timestamp
```

---

## HTTP Helpers

Advanced HTTP requests with retry, pagination, and more.

#### `helpers.httpGet(url, options)`
Make GET request.

```javascript
const response = await helpers.httpGet('https://api.example.com/users');
helpers.log('Status:', response.status);
helpers.log('Data:', response.data);
```

#### `helpers.httpPost(url, body, options)`
Make POST request.

```javascript
const response = await helpers.httpPost('https://api.example.com/users', {
  name: 'John',
  email: 'john@example.com'
});
```

#### Advanced HTTP options

```javascript
const response = await helpers.http.request({
  method: 'GET',
  url: 'https://api.example.com/users',
  headers: {
    'Authorization': 'Bearer ${API_TOKEN}'
  },
  timeout: 30000,
  retry: {
    maxRetries: 3,
    delay: 1000,
    backoff: 'exponential',
    retryOn: [408, 429, 500, 502, 503, 504]
  },
  auth: {
    type: 'bearer',
    token: await helpers.getSecret('API_TOKEN')
  }
});
```

#### Pagination

```javascript
// Automatic pagination - fetches all pages
const allUsers = await helpers.http.paginate({
  url: 'https://api.example.com/users',
  type: 'offset',        // or 'cursor', 'page', 'link'
  maxPages: 10,
  pageSize: 100,
  responseDataPath: 'data.users'
});

helpers.log('Total users:', allUsers.length);
```

#### File operations

```javascript
// Download file
const blob = await helpers.http.downloadFile('https://example.com/file.pdf');

// Upload file
const result = await helpers.http.uploadFile(
  'https://api.example.com/upload',
  file,
  'document',
  { category: 'invoices' }
);
```

---

## Debug Helpers

Performance tracking and monitoring.

#### Performance timers

```javascript
helpers.debug.startTimer('api-call');

// ... your code ...

const duration = helpers.debug.endTimer('api-call');
helpers.log('API call took', duration, 'ms');
```

#### Measure execution time

```javascript
const { result, duration } = await helpers.debug.measureTime('database-query', async () => {
  return await fetchUsers();
});

helpers.log('Query result:', result);
helpers.log('Query duration:', duration, 'ms');
```

#### Metrics

```javascript
// Record metric
helpers.debug.recordMetric('api_requests', 1, { endpoint: '/users', method: 'GET' });

// Increment counter
helpers.debug.incrementMetric('user_signups', { source: 'web' });

// Get metrics
const metrics = helpers.debug.getMetricsByName('api_requests');
const average = helpers.debug.getMetricAverage('response_time');
```

#### Breadcrumbs

```javascript
helpers.debug.addBreadcrumb('User logged in', 'info', { userId: 123 });
helpers.debug.addBreadcrumb('API call failed', 'error', { endpoint: '/users' });

const breadcrumbs = helpers.debug.getBreadcrumbs();
```

#### Memory monitoring

```javascript
const memory = helpers.debug.getMemoryUsage();
helpers.log('Heap used:', memory.heapUsed, 'MB');

helpers.debug.logMemoryUsage('After processing');
```

#### Debug report

```javascript
const report = helpers.debug.generateDebugReport();
helpers.log('Debug report:', helpers.json(report));
```

---

## Secrets Manager

Secure credential storage and environment variables.

#### Get secrets

```javascript
const apiKey = helpers.getSecret('API_KEY');
const dbPassword = helpers.getSecret('DATABASE_PASSWORD');
```

#### Get environment variables

```javascript
const nodeEnv = helpers.getEnv('NODE_ENV', 'development');
const port = helpers.getEnv('PORT', '3000');
```

#### Resolve secrets in strings

```javascript
// Using ${SECRET_NAME} syntax
const config = {
  apiUrl: 'https://api.example.com',
  apiKey: '${API_KEY}',
  environment: '${env:NODE_ENV}'
};

const resolved = helpers.secrets.resolveObject(config);
// => { apiUrl: '...', apiKey: 'actual-key-value', environment: 'production' }
```

#### Set secrets (in custom nodes)

```javascript
helpers.secrets.setSecret('NEW_API_KEY', 'secret-value', true); // encrypted
helpers.secrets.setEnv('CUSTOM_VAR', 'value');
```

---

## Schema Validator

Validate data against schemas.

#### Basic validation

```javascript
const schema = helpers.validate.createSchema({
  name: helpers.validate.string({ required: true, minLength: 3 }),
  email: helpers.validate.email({ required: true }),
  age: helpers.validate.number({ minimum: 18, maximum: 120 }),
  role: helpers.validate.enum(['admin', 'user', 'guest'])
});

const result = helpers.validate.validate(data, schema);

if (!result.valid) {
  helpers.error('Validation failed:', result.errors);
  return { error: 'Invalid data' };
}

const validatedData = result.data;
```

#### Schema types

```javascript
// String schema
helpers.validate.string({
  required: true,
  minLength: 3,
  maxLength: 50,
  pattern: '^[a-zA-Z]+$'
})

// Number schema
helpers.validate.number({
  required: true,
  minimum: 0,
  maximum: 100
})

// Boolean schema
helpers.validate.boolean({ required: true })

// Array schema
helpers.validate.array(
  helpers.validate.string(), // item schema
  { required: true }
)

// Object schema
helpers.validate.object({
  name: helpers.validate.string({ required: true }),
  age: helpers.validate.number()
})

// Enum schema
helpers.validate.enum(['option1', 'option2', 'option3'])

// Email, URL, UUID
helpers.validate.email({ required: true })
helpers.validate.url({ required: true })
helpers.validate.uuid()
```

#### Custom validation

```javascript
const schema = helpers.validate.createSchema({
  password: helpers.validate.string({
    required: true,
    minLength: 8,
    custom: (value) => {
      if (!/[A-Z]/.test(value)) {
        return 'Password must contain at least one uppercase letter';
      }
      if (!/[0-9]/.test(value)) {
        return 'Password must contain at least one number';
      }
      return true;
    }
  })
});
```

#### Apply defaults and coercion

```javascript
// Apply default values
const withDefaults = helpers.validate.applyDefaults(data, schema);

// Coerce types
const coerced = helpers.validate.coerce(data, schema);
```

---

## Conditional Router

Route data to different outputs based on conditions.

#### Simple routing

```javascript
const result = helpers.router.route(data, {
  mode: 'first-match', // or 'all-matches'
  rules: [
    {
      id: 'premium',
      outputPort: 'premium',
      conditions: [
        { field: 'subscription', operator: 'equals', value: 'premium' }
      ]
    },
    {
      id: 'trial',
      outputPort: 'trial',
      conditions: [
        { field: 'subscription', operator: 'equals', value: 'trial' }
      ]
    }
  ],
  defaultOutput: 'free'
});

helpers.log('Route to:', result.outputPorts);
return { path: result.outputPorts[0], ...data };
```

#### Multiple conditions

```javascript
const result = helpers.router.route(data, {
  mode: 'first-match',
  rules: [
    {
      id: 'high-value',
      outputPort: 'high-value',
      logic: 'AND', // or 'OR'
      conditions: [
        { field: 'amount', operator: 'greaterThan', value: 1000 },
        { field: 'status', operator: 'equals', value: 'paid' }
      ]
    }
  ]
});
```

#### Operators

- `equals`, `notEquals`
- `contains`, `notContains`
- `startsWith`, `endsWith`
- `greaterThan`, `lessThan`, `greaterOrEqual`, `lessOrEqual`
- `isEmpty`, `isNotEmpty`
- `exists`, `notExists`
- `matches` (regex)
- `isTrue`, `isFalse`

#### Helper functions

```javascript
// Route by value
const result = helpers.router.routeByValue(data, 'status', {
  'active': 'active-output',
  'pending': 'pending-output',
  'closed': 'closed-output'
}, 'default-output');

// Route by boolean
const result = helpers.router.routeByBoolean(data, 'isActive', 'true-path', 'false-path');

// Route by range
const result = helpers.router.routeByRange(data, 'age', [
  { min: 0, max: 17, output: 'minor' },
  { min: 18, max: 64, output: 'adult' },
  { min: 65, output: 'senior' }
]);
```

---

## Retry Handler

Automatic retry logic with backoff strategies.

#### Simple retry

```javascript
const result = await helpers.retry.retry(
  async () => {
    return await helpers.httpGet('https://api.example.com/data');
  },
  {
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential',
    onRetry: (attempt, error) => {
      helpers.warn(`Attempt ${attempt} failed:`, error.message);
    }
  }
);
```

#### Full retry control

```javascript
const result = await helpers.retry.executeWithRetry(
  async () => {
    return await fetchData();
  },
  {
    enabled: true,
    maxRetries: 5,
    delay: 2000,
    strategy: 'fibonacci', // 'linear', 'exponential', 'fibonacci'
    retryOnErrors: ['ECONNRESET', 'ETIMEDOUT', '503']
  },
  (attempt, error) => {
    helpers.log(`Retry attempt ${attempt} after error:`, error.message);
  }
);

if (result.success) {
  helpers.log('Operation succeeded after', result.attempts, 'attempts');
  return result.result;
} else {
  helpers.error('Operation failed after', result.attempts, 'attempts');
  return { error: result.error.message };
}
```

---

## Item Processor

Process items in different modes.

#### Processing modes

```javascript
const result = await helpers.processor.processItems(
  items,
  async (item, index, context) => {
    // Process single item
    return await transformItem(item);
  },
  {
    mode: 'each',          // 'each', 'batch', 'first', 'all'
    batchSize: 50,         // For batch mode
    continueOnError: true  // Continue if item fails
  }
);

helpers.log('Processed:', result.processedCount);
helpers.log('Failed:', result.failedCount);

if (result.errors.length > 0) {
  helpers.warn('Errors:', result.errors);
}

return result.results;
```

#### Mode descriptions

- **`each`**: Process items one by one sequentially
- **`batch`**: Process items in parallel batches
- **`first`**: Process only the first item
- **`all`**: Process entire array as single unit

---

## Complete Usage Example

Here's a complete example using multiple helpers:

```javascript
// Fetch users from API with retry and pagination
helpers.debug.startTimer('fetch-users');

const users = await helpers.retry.retry(
  async () => {
    return await helpers.http.paginate({
      url: 'https://api.example.com/users',
      type: 'offset',
      maxPages: 5,
      pageSize: 100
    });
  },
  { maxAttempts: 3, backoff: 'exponential' }
);

helpers.debug.endTimer('fetch-users');
helpers.log('Fetched', users.length, 'users');

// Validate users
const schema = helpers.validate.createSchema({
  email: helpers.validate.email({ required: true }),
  age: helpers.validate.number({ minimum: 18 })
});

const validUsers = helpers.filter(users, user => {
  const result = helpers.validate.validate(user, schema);
  return result.valid;
});

helpers.log('Valid users:', validUsers.length);

// Group by role
const byRole = helpers.groupBy(validUsers, 'role');
helpers.log('By role:', Object.keys(byRole));

// Route based on subscription
const processed = await helpers.processor.processItems(
  validUsers,
  async (user, index) => {
    const route = helpers.router.routeByValue(
      user,
      'subscription',
      { premium: 'premium', trial: 'trial' },
      'free'
    );

    return {
      ...user,
      category: route.outputPorts[0],
      processedAt: helpers.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')
    };
  },
  { mode: 'batch', batchSize: 10 }
);

return {
  total: processed.processedCount,
  users: processed.results,
  debug: helpers.debug.generateDebugReport()
};
```

---

## Backward Compatibility

All existing helper functions are still available:

```javascript
helpers.log('Message');
helpers.error('Error message');
helpers.warn('Warning message');
helpers.info('Info message');
helpers.json(object);
helpers.parse(jsonString);

// File storage
await helpers.getFile(fileId);
await helpers.storeFile(buffer, metadata);
await helpers.deleteFile(fileId);
```
