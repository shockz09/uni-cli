/**
 * Google Calendar date calculation tests
 *
 * Tests for Bug #1: Off-by-One Date Calculation
 * The endDate calculation was adding an extra day: --days 1 showed 2 days.
 */

import { describe, expect, it } from 'bun:test';
import { calculateEndDate } from '@uni/shared';

describe('gcal date calculations', () => {
  describe('BUG-001: off-by-one date calculation', () => {
    it('--days 1 should only include the same day', () => {
      const startDate = new Date('2026-01-04T00:00:00');
      const endDate = calculateEndDate(startDate, 1);

      // End date should be same day at 23:59:59.999
      expect(endDate.getDate()).toBe(4);
      expect(endDate.getMonth()).toBe(0); // January
      expect(endDate.getFullYear()).toBe(2026);
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(endDate.getSeconds()).toBe(59);
      expect(endDate.getMilliseconds()).toBe(999);
    });

    it('--days 1 should have same date string as start', () => {
      const startDate = new Date('2026-01-04T00:00:00');
      const endDate = calculateEndDate(startDate, 1);

      expect(endDate.toDateString()).toBe(startDate.toDateString());
    });

    it('--days 2 should span exactly 2 calendar days', () => {
      const startDate = new Date('2026-01-04T00:00:00');
      const endDate = calculateEndDate(startDate, 2);

      // End date should be Jan 5 at 23:59:59.999
      expect(endDate.getDate()).toBe(5);
      expect(endDate.getMonth()).toBe(0);
    });

    it('--days 7 should span exactly 7 calendar days', () => {
      const startDate = new Date('2026-01-04T00:00:00');
      const endDate = calculateEndDate(startDate, 7);

      // End date should be Jan 10 at 23:59:59.999
      expect(endDate.getDate()).toBe(10);
      expect(endDate.getMonth()).toBe(0);
    });

    it('should handle month boundary', () => {
      const startDate = new Date('2026-01-30T00:00:00');
      const endDate = calculateEndDate(startDate, 5);

      // Should cross into February
      expect(endDate.getDate()).toBe(3);
      expect(endDate.getMonth()).toBe(1); // February
    });

    it('should handle year boundary', () => {
      const startDate = new Date('2025-12-30T00:00:00');
      const endDate = calculateEndDate(startDate, 5);

      // Should cross into 2026
      expect(endDate.getDate()).toBe(3);
      expect(endDate.getMonth()).toBe(0); // January
      expect(endDate.getFullYear()).toBe(2026);
    });
  });

  describe('edge cases', () => {
    it('should handle leap year correctly', () => {
      // 2028 is a leap year
      const startDate = new Date('2028-02-28T00:00:00');
      const endDate = calculateEndDate(startDate, 2);

      expect(endDate.getDate()).toBe(29); // Feb 29 exists in 2028
      expect(endDate.getMonth()).toBe(1);
    });

    it('should handle daylight saving time transition', () => {
      // DST starts March 9, 2025 in US
      const startDate = new Date('2025-03-08T00:00:00');
      const endDate = calculateEndDate(startDate, 3);

      // Should still span 3 days correctly
      expect(endDate.getDate()).toBe(10);
    });
  });

  describe('time components', () => {
    it('should always set end time to 23:59:59.999', () => {
      const testCases = [1, 2, 7, 14, 30];

      for (const days of testCases) {
        const startDate = new Date('2026-01-04T00:00:00');
        const endDate = calculateEndDate(startDate, days);

        expect(endDate.getHours()).toBe(23);
        expect(endDate.getMinutes()).toBe(59);
        expect(endDate.getSeconds()).toBe(59);
        expect(endDate.getMilliseconds()).toBe(999);
      }
    });

    it('should not be affected by start date time', () => {
      // Even if start is at noon, end should be at 23:59:59.999
      const startDate = new Date('2026-01-04T12:30:45');
      const endDate = calculateEndDate(startDate, 1);

      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
    });
  });
});
