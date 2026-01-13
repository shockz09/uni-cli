/**
 * Pipe module tests
 *
 * Tests for JSON path selection, filtering, and template substitution.
 */

import { describe, expect, it } from 'bun:test';
import { getByPath, selectPath, evaluateFilter, substituteTemplate } from '../core/pipe';

describe('pipe', () => {
  describe('getByPath', () => {
    const testObj = {
      name: 'John',
      age: 30,
      address: {
        city: 'NYC',
        zip: '10001',
      },
      tags: ['a', 'b', 'c'],
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
    };

    it('should return the whole object for empty path', () => {
      expect(getByPath(testObj, '')).toEqual(testObj);
      expect(getByPath(testObj, '.')).toEqual(testObj);
    });

    it('should get top-level properties', () => {
      expect(getByPath(testObj, 'name')).toBe('John');
      expect(getByPath(testObj, 'age')).toBe(30);
    });

    it('should get nested properties', () => {
      expect(getByPath(testObj, 'address.city')).toBe('NYC');
      expect(getByPath(testObj, 'address.zip')).toBe('10001');
    });

    it('should get array elements by index', () => {
      expect(getByPath(testObj, 'tags[0]')).toBe('a');
      expect(getByPath(testObj, 'tags[2]')).toBe('c');
      expect(getByPath(testObj, 'items[0].name')).toBe('Item 1');
      expect(getByPath(testObj, 'items[1].id')).toBe(2);
    });

    it('should return undefined for non-existent paths', () => {
      expect(getByPath(testObj, 'nonexistent')).toBeUndefined();
      expect(getByPath(testObj, 'address.country')).toBeUndefined();
      expect(getByPath(testObj, 'tags[10]')).toBeUndefined();
    });

    it('should handle null/undefined gracefully', () => {
      expect(getByPath(null, 'foo')).toBeUndefined();
      expect(getByPath(undefined, 'foo')).toBeUndefined();
    });

    it('should return array for wildcard', () => {
      expect(getByPath(testObj, 'tags[*]')).toEqual(['a', 'b', 'c']);
      expect(getByPath(testObj, 'items[*]')).toEqual(testObj.items);
    });
  });

  describe('selectPath', () => {
    const testData = {
      events: [
        {
          title: 'Meeting 1',
          attendees: [
            { email: 'a@test.com' },
            { email: 'b@test.com' },
          ],
        },
        {
          title: 'Meeting 2',
          attendees: [
            { email: 'c@test.com' },
          ],
        },
      ],
    };

    it('should return array for single object', () => {
      expect(selectPath({ foo: 'bar' }, '')).toEqual([{ foo: 'bar' }]);
    });

    it('should return array as-is for empty path', () => {
      expect(selectPath([1, 2, 3], '')).toEqual([1, 2, 3]);
    });

    it('should select simple path', () => {
      // selectPath flattens arrays, so events array is returned as individual items
      expect(selectPath(testData, 'events')).toEqual(testData.events);
    });

    it('should select with wildcard', () => {
      const result = selectPath(testData, 'events[*].title');
      expect(result).toEqual(['Meeting 1', 'Meeting 2']);
    });

    it('should flatten nested wildcards', () => {
      const result = selectPath(testData, 'events[*].attendees[*].email');
      expect(result).toEqual(['a@test.com', 'b@test.com', 'c@test.com']);
    });

    it('should handle array input', () => {
      const arrayData = [
        { name: 'A', value: 1 },
        { name: 'B', value: 2 },
      ];
      expect(selectPath(arrayData, '[*].name')).toEqual(['A', 'B']);
    });
  });

  describe('evaluateFilter', () => {
    const item = {
      name: 'Test Item',
      count: 50,
      status: 'active',
      tags: ['important', 'urgent'],
    };

    it('should return true for empty filter', () => {
      expect(evaluateFilter(item, '')).toBe(true);
    });

    it('should evaluate equality', () => {
      expect(evaluateFilter(item, "status == 'active'")).toBe(true);
      expect(evaluateFilter(item, "status == 'inactive'")).toBe(false);
      expect(evaluateFilter(item, 'count == 50')).toBe(true);
    });

    it('should evaluate inequality', () => {
      expect(evaluateFilter(item, "status != 'inactive'")).toBe(true);
      expect(evaluateFilter(item, "status != 'active'")).toBe(false);
    });

    it('should evaluate numeric comparisons', () => {
      expect(evaluateFilter(item, 'count > 30')).toBe(true);
      expect(evaluateFilter(item, 'count > 60')).toBe(false);
      expect(evaluateFilter(item, 'count < 100')).toBe(true);
      expect(evaluateFilter(item, 'count >= 50')).toBe(true);
      expect(evaluateFilter(item, 'count <= 50')).toBe(true);
    });

    it('should evaluate contains', () => {
      expect(evaluateFilter(item, "name contains 'Test'")).toBe(true);
      expect(evaluateFilter(item, "name contains 'test'")).toBe(true); // case-insensitive
      expect(evaluateFilter(item, "name contains 'xyz'")).toBe(false);
    });

    it('should evaluate startsWith', () => {
      expect(evaluateFilter(item, "name startsWith 'Test'")).toBe(true);
      expect(evaluateFilter(item, "name startsWith 'Item'")).toBe(false);
    });

    it('should evaluate endsWith', () => {
      expect(evaluateFilter(item, "name endsWith 'Item'")).toBe(true);
      expect(evaluateFilter(item, "name endsWith 'Test'")).toBe(false);
    });

    it('should evaluate logical AND', () => {
      expect(evaluateFilter(item, "status == 'active' and count > 30")).toBe(true);
      expect(evaluateFilter(item, "status == 'active' and count > 60")).toBe(false);
    });

    it('should evaluate logical OR', () => {
      expect(evaluateFilter(item, "status == 'inactive' or count > 30")).toBe(true);
      expect(evaluateFilter(item, "status == 'inactive' or count > 60")).toBe(false);
    });

    it('should evaluate logical NOT', () => {
      expect(evaluateFilter(item, "not status == 'inactive'")).toBe(true);
      expect(evaluateFilter(item, "not status == 'active'")).toBe(false);
    });

    it('should handle primitive values', () => {
      expect(evaluateFilter(42, 'value > 30')).toBe(true);
      expect(evaluateFilter('hello', "value contains 'ell'")).toBe(true);
    });

    it('should return false for invalid expressions', () => {
      expect(evaluateFilter(item, 'invalid syntax {{{')).toBe(false);
    });
  });

  describe('substituteTemplate', () => {
    const item = {
      title: 'Test Event',
      email: 'user@test.com',
      nested: {
        value: 'deep',
      },
    };

    it('should substitute simple fields', () => {
      expect(substituteTemplate('Hello {{title}}', item, 0)).toBe('Hello Test Event');
      expect(substituteTemplate('Email: {{email}}', item, 0)).toBe('Email: user@test.com');
    });

    it('should substitute nested fields', () => {
      expect(substituteTemplate('Value: {{nested.value}}', item, 0)).toBe('Value: deep');
    });

    it('should substitute {{.}} with primitive value', () => {
      expect(substituteTemplate('Value: {{.}}', 'hello', 0)).toBe('Value: hello');
      expect(substituteTemplate('Value: {{value}}', 'hello', 0)).toBe('Value: hello');
    });

    it('should substitute {{index}} with current index', () => {
      expect(substituteTemplate('Item {{index}}', item, 0)).toBe('Item 0');
      expect(substituteTemplate('Item {{index}}', item, 5)).toBe('Item 5');
    });

    it('should handle multiple substitutions', () => {
      expect(substituteTemplate('{{title}} - {{email}}', item, 0)).toBe('Test Event - user@test.com');
    });

    it('should handle whitespace in templates', () => {
      expect(substituteTemplate('{{ title }}', item, 0)).toBe('Test Event');
      expect(substituteTemplate('{{  email  }}', item, 0)).toBe('user@test.com');
    });

    it('should replace missing fields with empty string', () => {
      expect(substituteTemplate('{{nonexistent}}', item, 0)).toBe('');
    });

    it('should handle no substitutions', () => {
      expect(substituteTemplate('plain text', item, 0)).toBe('plain text');
    });
  });

  describe('integration scenarios', () => {
    it('should handle calendar-like data', () => {
      const calendarData = {
        events: [
          { title: 'Meeting', start: '10:00', attendees: [{ email: 'a@x.com' }, { email: 'b@x.com' }] },
          { title: 'Lunch', start: '12:00', attendees: [{ email: 'c@x.com' }] },
        ],
      };

      // Select all event titles
      const titles = selectPath(calendarData, 'events[*].title');
      expect(titles).toEqual(['Meeting', 'Lunch']);

      // Select all attendee emails
      const emails = selectPath(calendarData, 'events[*].attendees[*].email');
      expect(emails).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
    });

    it('should handle spreadsheet-like data', () => {
      const rows = [
        { task: 'Fix bug', status: 'done', priority: 1 },
        { task: 'Write docs', status: 'todo', priority: 2 },
        { task: 'Review PR', status: 'todo', priority: 1 },
      ];

      // Filter by status
      const todoItems = rows.filter(row => evaluateFilter(row, "status == 'todo'"));
      expect(todoItems.length).toBe(2);

      // Filter by priority
      const highPriority = rows.filter(row => evaluateFilter(row, 'priority == 1'));
      expect(highPriority.length).toBe(2);

      // Combined filter
      const urgentTodo = rows.filter(row =>
        evaluateFilter(row, "status == 'todo' and priority == 1")
      );
      expect(urgentTodo.length).toBe(1);
      expect(urgentTodo[0].task).toBe('Review PR');
    });

    it('should handle email-like data', () => {
      const emails = [
        { from: 'boss@company.com', subject: 'URGENT: Review needed', unread: true },
        { from: 'spam@example.com', subject: 'You won!', unread: true },
        { from: 'boss@company.com', subject: 'FYI: Update', unread: false },
      ];

      // Filter urgent from boss
      const urgentFromBoss = emails.filter(email =>
        evaluateFilter(email, "from contains 'boss' and subject contains 'urgent'")
      );
      expect(urgentFromBoss.length).toBe(1);

      // Build commands
      const commands = urgentFromBoss.map((email, i) =>
        substituteTemplate("slack send #alerts 'From: {{from}} - {{subject}}'", email, i)
      );
      expect(commands[0]).toBe("slack send #alerts 'From: boss@company.com - URGENT: Review needed'");
    });
  });
});
