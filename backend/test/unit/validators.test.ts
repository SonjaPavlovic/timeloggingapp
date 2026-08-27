import {
  isValidDate,
  validateActivityTypeShape,
  validateDateRange,
  validateTimeEntryShape,
} from '../../src/services/validators';

describe('isValidDate', () => {
  it.each(['2026-01-15', '2024-02-29'])('accepts valid date %s', (d) => {
    expect(isValidDate(d)).toBe(true);
  });

  it.each(['2026-13-01', '2026-02-30', '2023-02-29', '2026-1-15', 'not-a-date', ''])(
    'rejects invalid date %s',
    (d) => {
      expect(isValidDate(d)).toBe(false);
    },
  );
});

describe('validateTimeEntryShape', () => {
  const valid = {
    activityTypeId: 1,
    description: 'Implemented totals endpoint',
    date: '2026-01-15',
    startTime: '09:00:00',
    endTime: '10:30:00',
  };

  it('accepts a fully valid entry', () => {
    expect(validateTimeEntryShape(valid)).toEqual([]);
  });

  it('flags every missing required field', () => {
    const errors = validateTimeEntryShape({});
    const fields = errors.map((e) => e.field).sort();
    expect(fields).toEqual(['activityTypeId', 'date', 'description', 'endTime', 'startTime']);
  });

  it('rejects a zero-length entry (endTime == startTime)', () => {
    const errors = validateTimeEntryShape({ ...valid, endTime: valid.startTime });
    expect(errors.some((e) => e.field === 'endTime')).toBe(true);
  });

  it('accepts endTime earlier than startTime (midnight rollover, not an error)', () => {
    const errors = validateTimeEntryShape({ ...valid, startTime: '23:30:00', endTime: '00:15:00' });
    expect(errors).toEqual([]);
  });

  it('rejects a malformed date', () => {
    const errors = validateTimeEntryShape({ ...valid, date: '15-01-2026' });
    expect(errors.some((e) => e.field === 'date')).toBe(true);
  });

  it('rejects a malformed time', () => {
    const errors = validateTimeEntryShape({ ...valid, startTime: '9am' });
    expect(errors.some((e) => e.field === 'startTime')).toBe(true);
  });

  it('rejects a description over 500 characters', () => {
    const errors = validateTimeEntryShape({ ...valid, description: 'x'.repeat(501) });
    expect(errors.some((e) => e.field === 'description')).toBe(true);
  });

  it('accepts a description of exactly 500 characters', () => {
    const errors = validateTimeEntryShape({ ...valid, description: 'x'.repeat(500) });
    expect(errors).toEqual([]);
  });

  it('rejects an empty/whitespace-only description', () => {
    const errors = validateTimeEntryShape({ ...valid, description: '   ' });
    expect(errors.some((e) => e.field === 'description')).toBe(true);
  });
});

describe('validateActivityTypeShape', () => {
  it('accepts a valid name', () => {
    expect(validateActivityTypeShape({ name: 'Development' })).toEqual([]);
  });

  it('rejects a missing name', () => {
    expect(validateActivityTypeShape({}).length).toBeGreaterThan(0);
  });

  it('rejects a whitespace-only name', () => {
    expect(validateActivityTypeShape({ name: '   ' }).length).toBeGreaterThan(0);
  });

  it('rejects a name over 100 characters', () => {
    expect(validateActivityTypeShape({ name: 'x'.repeat(101) }).length).toBeGreaterThan(0);
  });

  it('accepts a name of exactly 100 characters', () => {
    expect(validateActivityTypeShape({ name: 'x'.repeat(100) })).toEqual([]);
  });
});

describe('validateDateRange', () => {
  it('accepts an empty query', () => {
    expect(validateDateRange({})).toEqual([]);
  });

  it('accepts a valid from/to pair', () => {
    expect(validateDateRange({ from: '2026-01-15', to: '2026-01-16' })).toEqual([]);
  });

  it('rejects a malformed from', () => {
    expect(validateDateRange({ from: 'nope' }).some((e) => e.field === 'from')).toBe(true);
  });

  it('rejects from later than to', () => {
    expect(
      validateDateRange({ from: '2026-01-16', to: '2026-01-15' }).some((e) => e.field === 'from'),
    ).toBe(true);
  });
});
