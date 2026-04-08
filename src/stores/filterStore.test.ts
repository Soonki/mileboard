import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from './filterStore';

beforeEach(() => {
  // Reset store to initial state before each test
  useFilterStore.getState().clearAll();
});

describe('filterStore', () => {
  describe('initial state', () => {
    it('has empty Sets for all filter axes', () => {
      const state = useFilterStore.getState();
      expect(state.statusIds.size).toBe(0);
      expect(state.assigneeIds.size).toBe(0);
      expect(state.categoryIds.size).toBe(0);
    });
  });

  describe('toggleStatus', () => {
    it('adds id to statusIds', () => {
      useFilterStore.getState().toggleStatus(1);
      expect(useFilterStore.getState().statusIds.has(1)).toBe(true);
    });

    it('removes id from statusIds on second toggle', () => {
      useFilterStore.getState().toggleStatus(1);
      useFilterStore.getState().toggleStatus(1);
      expect(useFilterStore.getState().statusIds.has(1)).toBe(false);
      expect(useFilterStore.getState().statusIds.size).toBe(0);
    });

    it('creates a new Set reference (immutability)', () => {
      const before = useFilterStore.getState().statusIds;
      useFilterStore.getState().toggleStatus(1);
      const after = useFilterStore.getState().statusIds;
      expect(before).not.toBe(after);
    });
  });

  describe('toggleAssignee', () => {
    it('adds null to assigneeIds (unassigned)', () => {
      useFilterStore.getState().toggleAssignee(null);
      expect(useFilterStore.getState().assigneeIds.has(null)).toBe(true);
    });

    it('adds numeric id to assigneeIds', () => {
      useFilterStore.getState().toggleAssignee(5);
      expect(useFilterStore.getState().assigneeIds.has(5)).toBe(true);
    });

    it('creates a new Set reference (immutability)', () => {
      const before = useFilterStore.getState().assigneeIds;
      useFilterStore.getState().toggleAssignee(null);
      const after = useFilterStore.getState().assigneeIds;
      expect(before).not.toBe(after);
    });
  });

  describe('toggleCategory', () => {
    it('adds id to categoryIds', () => {
      useFilterStore.getState().toggleCategory(10);
      expect(useFilterStore.getState().categoryIds.has(10)).toBe(true);
    });

    it('creates a new Set reference (immutability)', () => {
      const before = useFilterStore.getState().categoryIds;
      useFilterStore.getState().toggleCategory(10);
      const after = useFilterStore.getState().categoryIds;
      expect(before).not.toBe(after);
    });
  });

  describe('removeFilter', () => {
    it('removes a status filter', () => {
      useFilterStore.getState().toggleStatus(1);
      useFilterStore.getState().removeFilter('status', 1);
      expect(useFilterStore.getState().statusIds.has(1)).toBe(false);
    });

    it('removes an assignee filter with null', () => {
      useFilterStore.getState().toggleAssignee(null);
      useFilterStore.getState().removeFilter('assignee', null);
      expect(useFilterStore.getState().assigneeIds.has(null)).toBe(false);
    });

    it('removes a category filter', () => {
      useFilterStore.getState().toggleCategory(10);
      useFilterStore.getState().removeFilter('category', 10);
      expect(useFilterStore.getState().categoryIds.has(10)).toBe(false);
    });

    it('creates a new Set reference (immutability)', () => {
      useFilterStore.getState().toggleStatus(1);
      const before = useFilterStore.getState().statusIds;
      useFilterStore.getState().removeFilter('status', 1);
      const after = useFilterStore.getState().statusIds;
      expect(before).not.toBe(after);
    });
  });

  describe('clearAll', () => {
    it('clears all filter Sets', () => {
      useFilterStore.getState().toggleStatus(1);
      useFilterStore.getState().toggleAssignee(5);
      useFilterStore.getState().toggleCategory(10);

      useFilterStore.getState().clearAll();

      const state = useFilterStore.getState();
      expect(state.statusIds.size).toBe(0);
      expect(state.assigneeIds.size).toBe(0);
      expect(state.categoryIds.size).toBe(0);
    });
  });

  describe('hasActiveFilters', () => {
    it('returns false when all Sets are empty', () => {
      expect(useFilterStore.getState().hasActiveFilters()).toBe(false);
    });

    it('returns true when any Set is non-empty', () => {
      useFilterStore.getState().toggleStatus(1);
      expect(useFilterStore.getState().hasActiveFilters()).toBe(true);
    });

    it('returns true when only assigneeIds is non-empty', () => {
      useFilterStore.getState().toggleAssignee(null);
      expect(useFilterStore.getState().hasActiveFilters()).toBe(true);
    });

    it('returns false after clearAll', () => {
      useFilterStore.getState().toggleCategory(10);
      useFilterStore.getState().clearAll();
      expect(useFilterStore.getState().hasActiveFilters()).toBe(false);
    });
  });
});
