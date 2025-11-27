/**
 * __tests__/mockExtractor.test.ts
 * 
 * Purpose: Unit tests for mock task extraction logic.
 * Validates that the extraction algorithm is deterministic and handles edge cases.
 */

import { extractTasksMock, normalizeTasks } from '../lib/mockExtractor';

describe('Mock Task Extractor', () => {
  describe('extractTasksMock', () => {
    it('should extract tasks from bullet points', () => {
      const notes = `
        Meeting Notes:
        - John to review PR #234
        - Sarah will update documentation
        - Mike needs to fix login bug
      `;

      const result = extractTasksMock(notes);
      
      expect(result.tasks.length).toBeGreaterThan(0);
      expect(result.tasks[0].title).toContain('John to review PR #234');
      expect(result.metadata?.model).toBe('mock-extractor-v1');
    });

    it('should detect priority from keywords', () => {
      const notes = `
        - URGENT: Fix production bug (high priority)
        - Update README when possible (low priority)
        - Review code
      `;

      const result = extractTasksMock(notes);
      
      expect(result.tasks[0].priority).toBe('high');
      expect(result.tasks[1].priority).toBe('low');
      expect(result.tasks[2].priority).toBe('medium');
    });

    it('should extract assignees from @mentions', () => {
      const notes = `
        - @john review the PR
        - @sarah update docs
      `;

      const result = extractTasksMock(notes);
      
      expect(result.tasks[0].assignee).toBe('john');
      expect(result.tasks[1].assignee).toBe('sarah');
    });

    it('should extract assignees from "Name will" pattern', () => {
      const notes = `
        - John will review the code
        - Sarah needs to update documentation
      `;

      const result = extractTasksMock(notes);
      
      expect(result.tasks[0].assignee).toBe('John');
      expect(result.tasks[1].assignee).toBe('Sarah');
    });

    it('should handle empty notes gracefully', () => {
      const result = extractTasksMock('');
      
      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0].title).toBe('Review meeting notes');
    });

    it('should be deterministic (same input = same output)', () => {
      const notes = '- TODO: Fix bug\n- ACTION: Update docs';
      
      const result1 = extractTasksMock(notes);
      const result2 = extractTasksMock(notes);
      
      expect(result1.tasks).toEqual(result2.tasks);
    });
  });

  describe('normalizeTasks', () => {
    it('should trim whitespace from tasks', () => {
      const tasks = [
        { title: '  Review code  ', description: '  Fix bugs  ' },
      ];

      const normalized = normalizeTasks(tasks);
      
      expect(normalized[0].title).toBe('Review code');
      expect(normalized[0].description).toBe('Fix bugs');
    });

    it('should set default priority if missing', () => {
      const tasks = [
        { title: 'Task 1', description: 'Desc 1' },
      ];

      const normalized = normalizeTasks(tasks);
      
      expect(normalized[0].priority).toBe('medium');
    });
  });
});
