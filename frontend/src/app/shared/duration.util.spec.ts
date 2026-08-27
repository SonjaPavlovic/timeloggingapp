import { formatDuration } from './duration.util';

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
