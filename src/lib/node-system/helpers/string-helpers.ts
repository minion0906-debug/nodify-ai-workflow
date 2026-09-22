/**
 * String Transformation Helpers
 * Provides utility functions for string manipulation
 */

export class StringHelpers {
  /**
   * Convert string to slug (URL-friendly)
   */
  static slugify(text: string): string {
    if (typeof text !== 'string') {
      throw new Error('slugify() requires a string argument');
    }

    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word chars
      .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Capitalize first letter
   */
  static capitalize(text: string): string {
    if (typeof text !== 'string') {
      throw new Error('capitalize() requires a string argument');
    }

    if (text.length === 0) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Capitalize first letter of each word
   */
  static titleCase(text: string): string {
    if (typeof text !== 'string') {
      throw new Error('titleCase() requires a string argument');
    }

    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Convert to camelCase
   */
  static camelCase(text: string): string {
    if (typeof text !== 'string') {
      throw new Error('camelCase() requires a string argument');
    }

    return text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
  }

  /**
   * Convert to snake_case
   */
  static snakeCase(text: string): string {
    if (typeof text !== 'string') {
      throw new Error('snakeCase() requires a string argument');
    }

    return text
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Convert to kebab-case
   */
  static kebabCase(text: string): string {
    if (typeof text !== 'string') {
      throw new Error('kebabCase() requires a string argument');
    }

    return text
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Truncate string to max length
   */
  static truncate(text: string, maxLength: number, suffix: string = '...'): string {
    if (typeof text !== 'string') {
      throw new Error('truncate() requires a string as first argument');
    }

    if (text.length <= maxLength) {
      return text;
    }

    return text.slice(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Template string replacement
   */
  static template(template: string, data: Record<string, any>): string {
    if (typeof template !== 'string') {
      throw new Error('template() requires a string as first argument');
    }

    return template.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      const value = StringHelpers.getNestedValue(data, trimmedKey);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Strip HTML tags
   */
  static stripHtml(html: string): string {
    if (typeof html !== 'string') {
      throw new Error('stripHtml() requires a string argument');
    }

    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Escape HTML special characters
   */
  static escapeHtml(text: string): string {
    if (typeof text !== 'string') {
      throw new Error('escapeHtml() requires a string argument');
    }

    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, char => map[char]);
  }

  /**
   * Pad string to length
   */
  static pad(text: string, length: number, char: string = ' ', position: 'start' | 'end' | 'both' = 'end'): string {
    if (typeof text !== 'string') {
      throw new Error('pad() requires a string as first argument');
    }

    const padLength = Math.max(0, length - text.length);

    if (position === 'start') {
      return char.repeat(padLength) + text;
    } else if (position === 'end') {
      return text + char.repeat(padLength);
    } else {
      const leftPad = Math.floor(padLength / 2);
      const rightPad = padLength - leftPad;
      return char.repeat(leftPad) + text + char.repeat(rightPad);
    }
  }

  /**
   * Extract email addresses from text
   */
  static extractEmails(text: string): string[] {
    if (typeof text !== 'string') {
      throw new Error('extractEmails() requires a string argument');
    }

    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    return text.match(emailRegex) || [];
  }

  /**
   * Extract URLs from text
   */
  static extractUrls(text: string): string[] {
    if (typeof text !== 'string') {
      throw new Error('extractUrls() requires a string argument');
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  }

  /**
   * Count words in text
   */
  static wordCount(text: string): number {
    if (typeof text !== 'string') {
      throw new Error('wordCount() requires a string argument');
    }

    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Reverse string
   */
  static reverse(text: string): string {
    if (typeof text !== 'string') {
      throw new Error('reverse() requires a string argument');
    }

    return text.split('').reverse().join('');
  }

  /**
   * Remove extra whitespace
   */
  static normalizeWhitespace(text: string): string {
    if (typeof text !== 'string') {
      throw new Error('normalizeWhitespace() requires a string argument');
    }

    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Check if string contains substring (case-insensitive)
   */
  static containsIgnoreCase(text: string, search: string): boolean {
    if (typeof text !== 'string' || typeof search !== 'string') {
      throw new Error('containsIgnoreCase() requires string arguments');
    }

    return text.toLowerCase().includes(search.toLowerCase());
  }

  /**
   * Replace all occurrences
   */
  static replaceAll(text: string, search: string, replace: string): string {
    if (typeof text !== 'string') {
      throw new Error('replaceAll() requires a string as first argument');
    }

    return text.split(search).join(replace);
  }

  /**
   * Generate random string
   */
  static random(length: number = 10, charset: string = 'alphanumeric'): string {
    const charsets: Record<string, string> = {
      alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      numeric: '0123456789',
      hex: '0123456789abcdef',
      base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    };

    const chars = charsets[charset] || charset;
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }
}
