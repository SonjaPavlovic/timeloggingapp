import { calculateDurationMinutes, formatDuration, isValidTime } from '../../src/services/duration';

describe('calculateDurationMinutes', () => {
  it('computes a whole-hour same-day span', () => {
    expect(calculateDurationMinutes('09:00:00', '10:30:00')).toBe(90);
  });

  it('computes a part-hour same-day span', () => {
    expect(calculateDurationMinutes('09:00:00', '09:45:00')).toBe(45);
  });

  it('computes a midnight-rollover span (23:30 -> 00:15)', () => {
    expect(calculateDurationMinutes('23:30:00', '00:15:00')).toBe(45);
  });

  it('truncates sub-minute spans to whole minutes (90s -> 1m)', () => {
    expect(calculateDurationMinutes('09:00:00', '09:01:30')).toBe(1);
  });

  it('throws on a zero-length span (end == start)', () => {
    expect(() => calculateDurationMinutes('09:00:00', '09:00:00')).toThrow();
  });

  it('handles a full-day rollover just short of 24h', () => {
    expect(calculateDurationMinutes('00:00:01', '00:00:00')).toBe(1439); // 23h59m59s truncated
  });
});

describe('formatDuration', () => {
  it('formats 90 minutes as "1h 30m"', () => {
    expect(formatDuration(90)).toBe('1h 30m');
  });

  it('formats 45 minutes as "0h 45m"', () => {
    expect(formatDuration(45)).toBe('0h 45m');
  });

  it('formats 120 minutes as "2h 00m"', () => {
    expect(formatDuration(120)).toBe('2h 00m');
  });
});

describe('isValidTime', () => {
  it.each(['00:00:00', '23:59:59', '09:00:00'])('accepts valid time %s', (t) => {
    expect(isValidTime(t)).toBe(true);
  });

  it.each(['24:00:00', '09:60:00', '09:00:60', '9:00:00', 'not-a-time', ''])(
    'rejects invalid time %s',
    (t) => {
      expect(isValidTime(t)).toBe(false);
    },
  );
});
