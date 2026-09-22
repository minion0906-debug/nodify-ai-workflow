/**
 * Date Transformation Helpers
 * Provides utility functions for date manipulation and formatting
 */

export class DateHelpers {
  /**
   * Format date to string
   * Supports common format tokens:
   * YYYY - 4 digit year
   * YY - 2 digit year
   * MM - 2 digit month
   * DD - 2 digit day
   * HH - 2 digit hour (24h)
   * mm - 2 digit minute
   * ss - 2 digit second
   */
  static formatDate(date: Date | string | number, format: string = 'YYYY-MM-DD'): string {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
      throw new Error('Invalid date provided to formatDate()');
    }

    const tokens: Record<string, string> = {
      YYYY: d.getFullYear().toString(),
      YY: d.getFullYear().toString().slice(-2),
      MM: String(d.getMonth() + 1).padStart(2, '0'),
      DD: String(d.getDate()).padStart(2, '0'),
      HH: String(d.getHours()).padStart(2, '0'),
      mm: String(d.getMinutes()).padStart(2, '0'),
      ss: String(d.getSeconds()).padStart(2, '0'),
      SSS: String(d.getMilliseconds()).padStart(3, '0')
    };

    let result = format;
    Object.keys(tokens).forEach(token => {
      result = result.replace(new RegExp(token, 'g'), tokens[token]);
    });

    return result;
  }

  /**
   * Parse date from string
   */
  static parseDate(dateString: string): Date {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      throw new Error(`Unable to parse date: ${dateString}`);
    }

    return date;
  }

  /**
   * Add days to date
   */
  static addDays(date: Date | string, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * Add hours to date
   */
  static addHours(date: Date | string, hours: number): Date {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d;
  }

  /**
   * Add minutes to date
   */
  static addMinutes(date: Date | string, minutes: number): Date {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + minutes);
    return d;
  }

  /**
   * Add seconds to date
   */
  static addSeconds(date: Date | string, seconds: number): Date {
    const d = new Date(date);
    d.setSeconds(d.getSeconds() + seconds);
    return d;
  }

  /**
   * Subtract days from date
   */
  static subtractDays(date: Date | string, days: number): Date {
    return DateHelpers.addDays(date, -days);
  }

  /**
   * Get difference in days between two dates
   */
  static diffDays(date1: Date | string, date2: Date | string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get difference in hours between two dates
   */
  static diffHours(date1: Date | string, date2: Date | string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60));
  }

  /**
   * Get difference in minutes between two dates
   */
  static diffMinutes(date1: Date | string, date2: Date | string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60));
  }

  /**
   * Check if date is in the past
   */
  static isPast(date: Date | string): boolean {
    return new Date(date) < new Date();
  }

  /**
   * Check if date is in the future
   */
  static isFuture(date: Date | string): boolean {
    return new Date(date) > new Date();
  }

  /**
   * Check if date is today
   */
  static isToday(date: Date | string): boolean {
    const d = new Date(date);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }

  /**
   * Get start of day
   */
  static startOfDay(date: Date | string): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get end of day
   */
  static endOfDay(date: Date | string): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  /**
   * Get start of month
   */
  static startOfMonth(date: Date | string): Date {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get end of month
   */
  static endOfMonth(date: Date | string): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  /**
   * Get day of week (0 = Sunday, 6 = Saturday)
   */
  static getDayOfWeek(date: Date | string): number {
    return new Date(date).getDay();
  }

  /**
   * Get day name
   */
  static getDayName(date: Date | string, short: boolean = false): string {
    const days = short
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return days[new Date(date).getDay()];
  }

  /**
   * Get month name
   */
  static getMonthName(date: Date | string, short: boolean = false): string {
    const months = short
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return months[new Date(date).getMonth()];
  }

  /**
   * Check if year is leap year
   */
  static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Get days in month
   */
  static getDaysInMonth(date: Date | string): number {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }

  /**
   * Format as relative time (e.g., "2 hours ago")
   */
  static timeAgo(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffWeek < 4) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
    if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
    return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
  }

  /**
   * Get Unix timestamp (seconds)
   */
  static getTimestamp(date?: Date | string): number {
    const d = date ? new Date(date) : new Date();
    return Math.floor(d.getTime() / 1000);
  }

  /**
   * Create date from Unix timestamp
   */
  static fromTimestamp(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }

  /**
   * Get ISO string
   */
  static toISOString(date: Date | string): string {
    return new Date(date).toISOString();
  }

  /**
   * Check if two dates are on the same day
   */
  static isSameDay(date1: Date | string, date2: Date | string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  }

  /**
   * Get current date/time
   */
  static now(): Date {
    return new Date();
  }

  /**
   * Create date from components
   */
  static create(year: number, month: number, day: number = 1, hour: number = 0, minute: number = 0, second: number = 0): Date {
    return new Date(year, month - 1, day, hour, minute, second);
  }
}
