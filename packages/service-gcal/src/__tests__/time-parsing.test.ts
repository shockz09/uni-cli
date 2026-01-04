/**
 * Time and duration parsing tests
 *
 * Tests for Bug #4: parseInt Without Radix
 * Times starting with 0 (like 08:00, 09:30) could be misinterpreted.
 */

import { describe, expect, it } from 'bun:test';

/**
 * Parse a time string like "10am", "2:30pm", "14:00" into hours and minutes
 * (copied from update.ts for testing - should be extracted to shared utils)
 */
function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  // Try 24-hour format (14:00)
  let match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
  }

  // Try 12-hour format (10am, 2:30pm)
  match = timeStr.toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3];

    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    return { hours, minutes };
  }

  return null;
}

/**
 * Parse duration string like "30m", "1h", "1h30m" into minutes
 */
function parseDuration(durationStr: string): number | null {
  let totalMinutes = 0;

  const hoursMatch = durationStr.match(/(\d+)\s*h/i);
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1], 10) * 60;
  }

  const minsMatch = durationStr.match(/(\d+)\s*m/i);
  if (minsMatch) {
    totalMinutes += parseInt(minsMatch[1], 10);
  }

  if (!hoursMatch && !minsMatch) {
    const num = parseInt(durationStr, 10);
    if (!Number.isNaN(num)) {
      totalMinutes = num;
    }
  }

  return totalMinutes > 0 ? totalMinutes : null;
}

describe('time parsing', () => {
  describe('BUG-004: parseInt with radix for times starting with 0', () => {
    it('should correctly parse 08:00 (leading zero)', () => {
      const result = parseTime('08:00');
      expect(result).toEqual({ hours: 8, minutes: 0 });
    });

    it('should correctly parse 09:30 (leading zero)', () => {
      const result = parseTime('09:30');
      expect(result).toEqual({ hours: 9, minutes: 30 });
    });

    it('should correctly parse 8am (single digit)', () => {
      const result = parseTime('8am');
      expect(result).toEqual({ hours: 8, minutes: 0 });
    });

    it('should correctly parse 9:30am (leading zero in minutes)', () => {
      const result = parseTime('9:30am');
      expect(result).toEqual({ hours: 9, minutes: 30 });
    });

    it('should correctly parse 09:05 (leading zeros)', () => {
      const result = parseTime('09:05');
      expect(result).toEqual({ hours: 9, minutes: 5 });
    });
  });

  describe('24-hour format', () => {
    it('should parse 00:00 (midnight)', () => {
      expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 });
    });

    it('should parse 12:00 (noon)', () => {
      expect(parseTime('12:00')).toEqual({ hours: 12, minutes: 0 });
    });

    it('should parse 14:30', () => {
      expect(parseTime('14:30')).toEqual({ hours: 14, minutes: 30 });
    });

    it('should parse 23:59', () => {
      expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 });
    });
  });

  describe('12-hour format', () => {
    it('should parse 12am (midnight)', () => {
      expect(parseTime('12am')).toEqual({ hours: 0, minutes: 0 });
    });

    it('should parse 12pm (noon)', () => {
      expect(parseTime('12pm')).toEqual({ hours: 12, minutes: 0 });
    });

    it('should parse 1pm', () => {
      expect(parseTime('1pm')).toEqual({ hours: 13, minutes: 0 });
    });

    it('should parse 11:30pm', () => {
      expect(parseTime('11:30pm')).toEqual({ hours: 23, minutes: 30 });
    });

    it('should handle case insensitivity', () => {
      expect(parseTime('2PM')).toEqual({ hours: 14, minutes: 0 });
      expect(parseTime('2Pm')).toEqual({ hours: 14, minutes: 0 });
      expect(parseTime('2pM')).toEqual({ hours: 14, minutes: 0 });
    });
  });

  describe('invalid times', () => {
    it('should return null for invalid format', () => {
      expect(parseTime('not a time')).toBeNull();
      expect(parseTime('')).toBeNull();
      expect(parseTime('abc')).toBeNull();
    });

    it('should parse but not validate hour ranges (validation is separate)', () => {
      // Note: parseTime only parses format, doesn't validate ranges
      // 25:00 matches the regex pattern but is semantically invalid
      // Range validation should happen at a higher level
      expect(parseTime('25:00')).toEqual({ hours: 25, minutes: 0 });
    });
  });
});

describe('duration parsing', () => {
  describe('hours format', () => {
    it('should parse 1h', () => {
      expect(parseDuration('1h')).toBe(60);
    });

    it('should parse 2h', () => {
      expect(parseDuration('2h')).toBe(120);
    });

    it('should handle uppercase H', () => {
      expect(parseDuration('1H')).toBe(60);
    });
  });

  describe('minutes format', () => {
    it('should parse 30m', () => {
      expect(parseDuration('30m')).toBe(30);
    });

    it('should parse 45m', () => {
      expect(parseDuration('45m')).toBe(45);
    });

    it('should handle uppercase M', () => {
      expect(parseDuration('30M')).toBe(30);
    });
  });

  describe('combined format', () => {
    it('should parse 1h30m', () => {
      expect(parseDuration('1h30m')).toBe(90);
    });

    it('should parse 2h15m', () => {
      expect(parseDuration('2h15m')).toBe(135);
    });

    it('should handle spaces', () => {
      expect(parseDuration('1 h 30 m')).toBe(90);
    });
  });

  describe('plain number format', () => {
    it('should treat plain number as minutes', () => {
      expect(parseDuration('60')).toBe(60);
      expect(parseDuration('90')).toBe(90);
    });
  });

  describe('invalid durations', () => {
    it('should return null for invalid format', () => {
      expect(parseDuration('not a duration')).toBeNull();
      expect(parseDuration('')).toBeNull();
    });

    it('should return null for zero duration', () => {
      expect(parseDuration('0')).toBeNull();
      expect(parseDuration('0m')).toBeNull();
    });
  });
});
