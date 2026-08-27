import { isValidTime } from './duration';

export interface ValidationDetail {
  field: string;
  message: string;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDate(value: string): boolean {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;
  return true;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export interface TimeEntryInput {
  activityTypeId?: unknown;
  description?: unknown;
  date?: unknown;
  startTime?: unknown;
  endTime?: unknown;
}

/** Shape/format validation only. Activity-type existence is checked separately (needs the DB). */
export function validateTimeEntryShape(body: TimeEntryInput): ValidationDetail[] {
  const errors: ValidationDetail[] = [];

  if (typeof body.activityTypeId !== 'number' || !Number.isInteger(body.activityTypeId)) {
    errors.push({ field: 'activityTypeId', message: 'activityTypeId is required and must be an integer' });
  }

  if (!isNonEmptyString(body.description)) {
    errors.push({ field: 'description', message: 'description is required' });
  } else if (body.description.length > 500) {
    errors.push({ field: 'description', message: 'description must be 500 characters or fewer' });
  }

  if (typeof body.date !== 'string' || body.date.length === 0) {
    errors.push({ field: 'date', message: 'date is required' });
  } else if (!isValidDate(body.date)) {
    errors.push({ field: 'date', message: 'date must be a valid YYYY-MM-DD value' });
  }

  if (typeof body.startTime !== 'string' || body.startTime.length === 0) {
    errors.push({ field: 'startTime', message: 'startTime is required' });
  } else if (!isValidTime(body.startTime)) {
    errors.push({ field: 'startTime', message: 'startTime must be a valid HH:MM:SS value' });
  }

  if (typeof body.endTime !== 'string' || body.endTime.length === 0) {
    errors.push({ field: 'endTime', message: 'endTime is required' });
  } else if (!isValidTime(body.endTime)) {
    errors.push({ field: 'endTime', message: 'endTime must be a valid HH:MM:SS value' });
  }

  // Zero-length check only makes sense once both times are individually valid.
  if (
    typeof body.startTime === 'string' &&
    typeof body.endTime === 'string' &&
    isValidTime(body.startTime) &&
    isValidTime(body.endTime) &&
    body.startTime === body.endTime
  ) {
    errors.push({ field: 'endTime', message: 'endTime must not equal startTime (zero-length entry)' });
  }

  return errors;
}

export interface ActivityTypeInput {
  name?: unknown;
}

export function validateActivityTypeShape(body: ActivityTypeInput): ValidationDetail[] {
  const errors: ValidationDetail[] = [];

  if (!isNonEmptyString(body.name)) {
    errors.push({ field: 'name', message: 'name is required' });
  } else if (body.name.trim().length > 100) {
    errors.push({ field: 'name', message: 'name must be 100 characters or fewer' });
  }

  return errors;
}

export interface DateRangeQuery {
  from?: unknown;
  to?: unknown;
}

export function validateDateRange(query: DateRangeQuery): ValidationDetail[] {
  const errors: ValidationDetail[] = [];
  const { from, to } = query;

  if (from !== undefined && (typeof from !== 'string' || !isValidDate(from))) {
    errors.push({ field: 'from', message: 'from must be a valid YYYY-MM-DD value' });
  }
  if (to !== undefined && (typeof to !== 'string' || !isValidDate(to))) {
    errors.push({ field: 'to', message: 'to must be a valid YYYY-MM-DD value' });
  }
  if (
    errors.length === 0 &&
    typeof from === 'string' &&
    typeof to === 'string' &&
    from > to
  ) {
    errors.push({ field: 'from', message: 'from must not be later than to' });
  }

  return errors;
}
