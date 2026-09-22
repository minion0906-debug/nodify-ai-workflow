/**
 * Advanced HTTP Request Helpers
 * Provides powerful HTTP utilities with retry, pagination, and more
 */

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  json?: boolean;
  timeout?: number;
  retry?: number | RetryOptions;
  followRedirects?: boolean;
  auth?: {
    type: 'basic' | 'bearer';
    username?: string;
    password?: string;
    token?: string;
  };
  proxy?: string;
}

export interface RetryOptions {
  maxRetries: number;
  delay?: number;
  backoff?: 'linear' | 'exponential' | 'fibonacci';
  retryOn?: number[]; // HTTP status codes to retry
}

export interface PaginationOptions {
  url: string;
  type: 'cursor' | 'offset' | 'page' | 'link';
  maxPages?: number;
  pageSize?: number;
  cursorKey?: string;
  offsetKey?: string;
  pageKey?: string;
  limitKey?: string;
  responseDataPath?: string;
  headers?: Record<string, string>;
}

export class HttpHelpers {
  /**
   * Make HTTP request with advanced options
   */
  static async request(options: HttpRequestOptions): Promise<any> {
    const {
      method = 'GET',
      url,
      headers = {},
      body,
      json = true,
      timeout = 30000,
      retry,
      followRedirects = true,
      auth
    } = options;

    // Build headers
    const finalHeaders: Record<string, string> = { ...headers };

    if (json && !finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    if (auth) {
      if (auth.type === 'basic' && auth.username && auth.password) {
        const credentials = btoa(`${auth.username}:${auth.password}`);
        finalHeaders['Authorization'] = `Basic ${credentials}`;
      } else if (auth.type === 'bearer' && auth.token) {
        finalHeaders['Authorization'] = `Bearer ${auth.token}`;
      }
    }

    // Build request
    const requestOptions: RequestInit = {
      method,
      headers: finalHeaders,
      redirect: followRedirects ? 'follow' : 'manual'
    };

    if (body) {
      requestOptions.body = json ? JSON.stringify(body) : body;
    }

    // Execute with retry logic
    const retryOptions = typeof retry === 'number' ? { maxRetries: retry } : retry;

    if (retryOptions) {
      return await HttpHelpers.retryRequest(url, requestOptions, timeout, retryOptions);
    }

    return await HttpHelpers.executeRequest(url, requestOptions, timeout);
  }

  /**
   * Execute single HTTP request
   */
  private static async executeRequest(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('text/')) {
        data = await response.text();
      } else {
        data = await response.blob();
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        ok: response.ok
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Retry request with backoff strategy
   */
  private static async retryRequest(
    url: string,
    options: RequestInit,
    timeout: number,
    retryOptions: RetryOptions
  ): Promise<any> {
    const {
      maxRetries,
      delay = 1000,
      backoff = 'exponential',
      retryOn = [408, 429, 500, 502, 503, 504]
    } = retryOptions;

    let lastError: any;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const response = await HttpHelpers.executeRequest(url, options, timeout);

        // Check if we should retry based on status code
        if (!response.ok && retryOn.includes(response.status) && attempt < maxRetries) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error: any) {
        lastError = error;
        attempt++;

        if (attempt <= maxRetries) {
          const waitTime = HttpHelpers.calculateBackoff(attempt, delay, backoff);
          console.log(`[HttpHelpers] Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms`);
          await HttpHelpers.sleep(waitTime);
        }
      }
    }

    throw new Error(`Request failed after ${maxRetries} retries: ${lastError.message}`);
  }

  /**
   * Calculate backoff delay
   */
  private static calculateBackoff(
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
   * HTTP GET helper
   */
  static async get(url: string, options: Partial<HttpRequestOptions> = {}): Promise<any> {
    return await HttpHelpers.request({ ...options, method: 'GET', url });
  }

  /**
   * HTTP POST helper
   */
  static async post(url: string, body: any, options: Partial<HttpRequestOptions> = {}): Promise<any> {
    return await HttpHelpers.request({ ...options, method: 'POST', url, body });
  }

  /**
   * HTTP PUT helper
   */
  static async put(url: string, body: any, options: Partial<HttpRequestOptions> = {}): Promise<any> {
    return await HttpHelpers.request({ ...options, method: 'PUT', url, body });
  }

  /**
   * HTTP DELETE helper
   */
  static async delete(url: string, options: Partial<HttpRequestOptions> = {}): Promise<any> {
    return await HttpHelpers.request({ ...options, method: 'DELETE', url });
  }

  /**
   * HTTP PATCH helper
   */
  static async patch(url: string, body: any, options: Partial<HttpRequestOptions> = {}): Promise<any> {
    return await HttpHelpers.request({ ...options, method: 'PATCH', url, body });
  }

  /**
   * Automatic pagination
   */
  static async paginate(options: PaginationOptions): Promise<any[]> {
    const {
      url,
      type,
      maxPages = 10,
      pageSize = 100,
      cursorKey = 'cursor',
      offsetKey = 'offset',
      pageKey = 'page',
      limitKey = 'limit',
      responseDataPath = 'data',
      headers = {}
    } = options;

    const allResults: any[] = [];
    let currentPage = 1;
    let currentOffset = 0;
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore && currentPage <= maxPages) {
      let pageUrl = url;
      const params = new URLSearchParams();

      // Build URL based on pagination type
      switch (type) {
        case 'offset':
          params.append(offsetKey, currentOffset.toString());
          params.append(limitKey, pageSize.toString());
          break;
        case 'page':
          params.append(pageKey, currentPage.toString());
          params.append(limitKey, pageSize.toString());
          break;
        case 'cursor':
          if (cursor) {
            params.append(cursorKey, cursor);
          }
          params.append(limitKey, pageSize.toString());
          break;
      }

      // Append params to URL
      if (params.toString()) {
        pageUrl += (url.includes('?') ? '&' : '?') + params.toString();
      }

      try {
        const response = await HttpHelpers.get(pageUrl, { headers });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Extract data from response
        let pageData = response.data;
        if (responseDataPath) {
          const pathParts = responseDataPath.split('.');
          for (const part of pathParts) {
            pageData = pageData?.[part];
          }
        }

        if (!Array.isArray(pageData)) {
          throw new Error('Response data is not an array');
        }

        allResults.push(...pageData);

        // Check if there are more pages
        if (pageData.length < pageSize) {
          hasMore = false;
        }

        // Update pagination variables
        if (type === 'cursor') {
          cursor = response.data.next_cursor || response.data.nextCursor || null;
          if (!cursor) hasMore = false;
        } else if (type === 'offset') {
          currentOffset += pageSize;
        } else if (type === 'page') {
          currentPage++;
        }

        // Check for Link header (GitHub-style pagination)
        if (type === 'link') {
          const linkHeader = response.headers['link'];
          if (!linkHeader || !linkHeader.includes('rel="next"')) {
            hasMore = false;
          } else {
            // Extract next URL from Link header
            const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (nextMatch) {
              pageUrl = nextMatch[1];
            } else {
              hasMore = false;
            }
          }
        }

      } catch (error: any) {
        throw new Error(`Pagination failed at page ${currentPage}: ${error.message}`);
      }
    }

    return allResults;
  }

  /**
   * Download file
   */
  static async downloadFile(url: string, options: Partial<HttpRequestOptions> = {}): Promise<Blob> {
    const response = await HttpHelpers.request({
      ...options,
      url,
      json: false
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return response.data as Blob;
  }

  /**
   * Upload file
   */
  static async uploadFile(
    url: string,
    file: File | Blob,
    fieldName: string = 'file',
    additionalFields?: Record<string, any>,
    options: Partial<HttpRequestOptions> = {}
  ): Promise<any> {
    const formData = new FormData();
    formData.append(fieldName, file);

    if (additionalFields) {
      Object.entries(additionalFields).forEach(([key, value]) => {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
      });
    }

    return await HttpHelpers.request({
      ...options,
      method: 'POST',
      url,
      body: formData,
      json: false
    });
  }

  /**
   * Build query string from object
   */
  static buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    return searchParams.toString();
  }

  /**
   * Parse query string to object
   */
  static parseQueryString(queryString: string): Record<string, any> {
    const params = new URLSearchParams(queryString);
    const result: Record<string, any> = {};

    params.forEach((value, key) => {
      if (result[key]) {
        if (Array.isArray(result[key])) {
          result[key].push(value);
        } else {
          result[key] = [result[key], value];
        }
      } else {
        result[key] = value;
      }
    });

    return result;
  }
}
