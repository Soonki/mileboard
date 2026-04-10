import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSortStore } from './sortStore';
import { loadSortConfig, saveSortConfig } from '../services/sortStorage';

vi.mock('../services/sortStorage', () => ({
  loadSortConfig: vi.fn(),
  saveSortConfig: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Reset store to initial state
  useSortStore.setState({ field: 'none', direction: 'asc' });
});

describe('sortStore', () => {
  describe('initial state', () => {
    it('has field=none and direction=asc', () => {
      const state = useSortStore.getState();
      expect(state.field).toBe('none');
      expect(state.direction).toBe('asc');
    });
  });

  describe('setField', () => {
    it('updates field to assignee and calls saveSortConfig', () => {
      useSortStore.getState().setField('assignee');

      expect(useSortStore.getState().field).toBe('assignee');
      expect(saveSortConfig).toHaveBeenCalledWith({
        field: 'assignee',
        direction: 'asc',
      });
    });

    it('resets field to none', () => {
      useSortStore.getState().setField('assignee');
      vi.clearAllMocks();
      useSortStore.getState().setField('none');

      expect(useSortStore.getState().field).toBe('none');
      expect(saveSortConfig).toHaveBeenCalledWith({
        field: 'none',
        direction: 'asc',
      });
    });
  });

  describe('toggleDirection', () => {
    it('switches asc to desc and calls saveSortConfig', () => {
      useSortStore.getState().toggleDirection();

      expect(useSortStore.getState().direction).toBe('desc');
      expect(saveSortConfig).toHaveBeenCalledWith({
        field: 'none',
        direction: 'desc',
      });
    });

    it('switches desc back to asc', () => {
      useSortStore.setState({ direction: 'desc' });
      vi.clearAllMocks();
      useSortStore.getState().toggleDirection();

      expect(useSortStore.getState().direction).toBe('asc');
      expect(saveSortConfig).toHaveBeenCalledWith({
        field: 'none',
        direction: 'asc',
      });
    });
  });

  describe('loadFromStorage', () => {
    it('restores field and direction from plugin-store', async () => {
      vi.mocked(loadSortConfig).mockResolvedValue({
        field: 'dueDate',
        direction: 'desc',
      });

      await useSortStore.getState().loadFromStorage();

      expect(useSortStore.getState().field).toBe('dueDate');
      expect(useSortStore.getState().direction).toBe('desc');
    });

    it('keeps default state when config is null', async () => {
      vi.mocked(loadSortConfig).mockResolvedValue(null);

      await useSortStore.getState().loadFromStorage();

      expect(useSortStore.getState().field).toBe('none');
      expect(useSortStore.getState().direction).toBe('asc');
    });

    it('keeps default state with invalid data (fallback)', async () => {
      // loadSortConfig validates and returns null for invalid data
      vi.mocked(loadSortConfig).mockResolvedValue(null);

      await useSortStore.getState().loadFromStorage();

      expect(useSortStore.getState().field).toBe('none');
      expect(useSortStore.getState().direction).toBe('asc');
    });
  });
});
