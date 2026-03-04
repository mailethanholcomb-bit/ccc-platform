// ============================================================
// CCC Platform - Utility Functions
// ============================================================

// ---- Formatting ------------------------------------------------

/**
 * Format a number as US currency.
 * Example: 1234567.89 -> "$1,234,567.89"
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a decimal as a percentage.
 * Example: 0.173 -> "17.3%"
 */
export function formatPercent(value: number | null | undefined, decimals: number = 1): string {
  if (value == null) return '--';
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number as a multiple.
 * Example: 3.55 -> "3.55x"
 */
export function formatMultiple(value: number | null | undefined): string {
  if (value == null) return '--';
  return `${value.toFixed(2)}x`;
}

// ---- Business Day Calculations ---------------------------------

/**
 * Returns a list of US federal holidays for the given year.
 * Includes: New Year's, MLK Day, Presidents Day, Memorial Day,
 * Independence Day, Labor Day, Columbus Day, Veterans Day,
 * Thanksgiving, Christmas.
 */
function getFederalHolidays(year: number): Date[] {
  const holidays: Date[] = [];

  // New Year's Day — January 1
  holidays.push(new Date(year, 0, 1));

  // MLK Day — Third Monday of January
  holidays.push(getNthWeekday(year, 0, 1, 3));

  // Presidents Day — Third Monday of February
  holidays.push(getNthWeekday(year, 1, 1, 3));

  // Memorial Day — Last Monday of May
  holidays.push(getLastWeekday(year, 4, 1));

  // Independence Day — July 4
  holidays.push(new Date(year, 6, 4));

  // Labor Day — First Monday of September
  holidays.push(getNthWeekday(year, 8, 1, 1));

  // Columbus Day — Second Monday of October
  holidays.push(getNthWeekday(year, 9, 1, 2));

  // Veterans Day — November 11
  holidays.push(new Date(year, 10, 11));

  // Thanksgiving — Fourth Thursday of November
  holidays.push(getNthWeekday(year, 10, 4, 4));

  // Christmas Day — December 25
  holidays.push(new Date(year, 11, 25));

  return holidays;
}

/**
 * Get the Nth occurrence of a given weekday in a month.
 * weekday: 0=Sunday, 1=Monday, ..., 6=Saturday
 */
function getNthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const firstDay = first.getDay();
  let day = 1 + ((weekday - firstDay + 7) % 7);
  day += (n - 1) * 7;
  return new Date(year, month, day);
}

/**
 * Get the last occurrence of a given weekday in a month.
 */
function getLastWeekday(year: number, month: number, weekday: number): Date {
  const lastDay = new Date(year, month + 1, 0); // last day of month
  const lastDayOfWeek = lastDay.getDay();
  const diff = (lastDayOfWeek - weekday + 7) % 7;
  return new Date(year, month, lastDay.getDate() - diff);
}

/**
 * Check if two dates fall on the same calendar day.
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Check whether a date is a business day (not a weekend, not a
 * US federal holiday).
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  // Weekend check
  if (day === 0 || day === 6) return false;

  // Holiday check
  const holidays = getFederalHolidays(date.getFullYear());
  for (const holiday of holidays) {
    if (isSameDay(date, holiday)) return false;
  }

  return true;
}

/**
 * Add a given number of business days to a start date.
 * Skips weekends and US federal holidays.
 * Supports negative values (subtracts business days).
 */
export function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  const direction = days >= 0 ? 1 : -1;
  let remaining = Math.abs(days);

  while (remaining > 0) {
    result.setDate(result.getDate() + direction);
    if (isBusinessDay(result)) {
      remaining--;
    }
  }

  return result;
}

// ---- Deadline Status -------------------------------------------

/**
 * Determine the status of a deadline relative to today.
 * Returns ON_TIME, WARNING (within 2 business days), or OVERDUE.
 * Also returns percentElapsed (0-100+) representing how much of
 * the time window has passed.
 */
export function getDeadlineStatus(
  deadline: Date | null,
): { status: 'ON_TIME' | 'WARNING' | 'OVERDUE'; percentElapsed: number } {
  if (!deadline) {
    return { status: 'ON_TIME', percentElapsed: 0 };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate(),
  );

  // Count business days remaining
  let businessDaysRemaining = 0;
  const cursor = new Date(today);
  if (deadlineDay > today) {
    while (cursor < deadlineDay) {
      cursor.setDate(cursor.getDate() + 1);
      if (isBusinessDay(cursor)) {
        businessDaysRemaining++;
      }
    }
  }

  // Calculate percentage elapsed — assume a 10 business-day window
  // as a reasonable default for deal response deadlines.
  const WINDOW_DAYS = 10;
  const elapsed = WINDOW_DAYS - businessDaysRemaining;
  const percentElapsed = Math.max(0, Math.round((elapsed / WINDOW_DAYS) * 100));

  if (deadlineDay < today) {
    return { status: 'OVERDUE', percentElapsed: Math.max(percentElapsed, 100) };
  }

  if (businessDaysRemaining <= 2) {
    return { status: 'WARNING', percentElapsed };
  }

  return { status: 'ON_TIME', percentElapsed };
}

// ---- Profile Completion ----------------------------------------

/**
 * Calculate the completion percentage of a profile (or any flat
 * record). Counts non-null, non-empty fields vs total fields.
 * Excludes internal fields like "id", "userId", "createdAt", "updatedAt".
 */
export function calculateProfileCompletion(profile: Record<string, unknown>): number {
  const excludeKeys = new Set(['id', 'userId', 'createdAt', 'updatedAt']);
  const keys = Object.keys(profile).filter((k) => !excludeKeys.has(k));

  if (keys.length === 0) return 0;

  let filled = 0;
  for (const key of keys) {
    const val = profile[key];
    if (val == null) continue;
    if (typeof val === 'string' && val.trim() === '') continue;
    if (Array.isArray(val) && val.length === 0) continue;
    filled++;
  }

  return Math.round((filled / keys.length) * 100);
}

// ---- Type Conversion -------------------------------------------

/**
 * Safely convert a Prisma Decimal (or any unknown value) to a
 * plain number. Returns null if the conversion is not possible.
 */
export function toNumber(value: unknown): number | null {
  if (value == null) return null;

  // Prisma Decimal objects have a toNumber() method
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const obj = value as { toNumber: () => number };
    const num = obj.toNumber();
    return Number.isFinite(num) ? num : null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

// ---- Tailwind Class Merging ------------------------------------

/**
 * Merge and deduplicate Tailwind CSS class names.
 * Filters out falsy values so you can use conditional classes:
 *   cn('px-4', isActive && 'bg-blue-500', isDisabled && 'opacity-50')
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter((c): c is string => typeof c === 'string' && c.length > 0).join(' ');
}
