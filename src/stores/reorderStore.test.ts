import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useReorderStore } from './reorderStore';
import {
  loadReorderConfig,
  saveReorderConfig,
} from '../services/reorderStorage';

vi.mock('../services/reorderStorage', () => ({
  loadReorderConfig: vi.fn(),
  saveReorderConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@dnd-kit/sortable', async () => {
  return {
    SortableContext: ({ children }: { children: React.ReactNode }) => children,
    verticalListSortingStrategy: {},
    useSortable: vi.fn(() => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: false,
    })),
    arrayMove: (arr: number[], from: number, to: number): number[] => {
      const result = [...arr];
      const [item] = result.splice(from, 1);
      result.splice(to, 0, item);
      return result;
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  useReorderStore.setState({ orderMap: {} });
});

describe('reorderStore', () => {
  describe('initial state', () => {
    it('has orderMap as empty object', () => {
      const state = useReorderStore.getState();
      expect(state.orderMap).toEqual({});
    });
  });

  describe('reorder', () => {
    it('moves activeId to overId position within lane using arrayMove', () => {
      useReorderStore.setState({ orderMap: { lane1: [1, 2, 3] } });

      useReorderStore.getState().reorder('lane1', 1, 3);

      expect(useReorderStore.getState().orderMap.lane1).toEqual([2, 3, 1]);
      expect(saveReorderConfig).toHaveBeenCalledWith({
        lane1: [2, 3, 1],
      });
    });

    it('does nothing when activeId is not found in orderMap', () => {
      useReorderStore.setState({ orderMap: { lane1: [1, 2, 3] } });

      useReorderStore.getState().reorder('lane1', 99, 2);

      expect(useReorderStore.getState().orderMap.lane1).toEqual([1, 2, 3]);
      expect(saveReorderConfig).not.toHaveBeenCalled();
    });

    it('does nothing when overId is not found in orderMap', () => {
      useReorderStore.setState({ orderMap: { lane1: [1, 2, 3] } });

      useReorderStore.getState().reorder('lane1', 1, 99);

      expect(useReorderStore.getState().orderMap.lane1).toEqual([1, 2, 3]);
      expect(saveReorderConfig).not.toHaveBeenCalled();
    });

    it('does nothing when lane has no orderMap entry', () => {
      useReorderStore.setState({ orderMap: {} });

      useReorderStore.getState().reorder('lane1', 1, 2);

      expect(useReorderStore.getState().orderMap).toEqual({});
      expect(saveReorderConfig).not.toHaveBeenCalled();
    });
  });

  describe('setLaneOrder', () => {
    it('updates orderMap for the given laneId', () => {
      useReorderStore.getState().setLaneOrder('lane1', [3, 1, 2]);

      expect(useReorderStore.getState().orderMap.lane1).toEqual([3, 1, 2]);
      expect(saveReorderConfig).toHaveBeenCalledWith({ lane1: [3, 1, 2] });
    });

    it('preserves other lanes when updating one lane', () => {
      useReorderStore.setState({
        orderMap: { lane1: [1, 2], lane2: [3, 4] },
      });

      useReorderStore.getState().setLaneOrder('lane1', [2, 1]);

      expect(useReorderStore.getState().orderMap).toEqual({
        lane1: [2, 1],
        lane2: [3, 4],
      });
    });
  });

  describe('removeLaneOrder', () => {
    it('removes laneId from orderMap', () => {
      useReorderStore.setState({
        orderMap: { lane1: [1, 2], lane2: [3, 4] },
      });

      useReorderStore.getState().removeLaneOrder('lane1');

      expect(useReorderStore.getState().orderMap).toEqual({
        lane2: [3, 4],
      });
      expect(saveReorderConfig).toHaveBeenCalledWith({ lane2: [3, 4] });
    });
  });

  describe('updateOnCrossLaneMove', () => {
    it('removes issueId from fromLane and appends to toLane (D-07, D-08)', () => {
      useReorderStore.setState({
        orderMap: { lane1: [1, 2, 3], lane2: [4, 5] },
      });

      useReorderStore.getState().updateOnCrossLaneMove(2, 'lane1', 'lane2');

      expect(useReorderStore.getState().orderMap).toEqual({
        lane1: [1, 3],
        lane2: [4, 5, 2],
      });
      expect(saveReorderConfig).toHaveBeenCalledWith({
        lane1: [1, 3],
        lane2: [4, 5, 2],
      });
    });

    it('works when toLane has no existing orderMap', () => {
      useReorderStore.setState({
        orderMap: { lane1: [1, 2, 3] },
      });

      useReorderStore.getState().updateOnCrossLaneMove(2, 'lane1', 'lane2');

      expect(useReorderStore.getState().orderMap).toEqual({
        lane1: [1, 3],
        lane2: [2],
      });
    });

    it('works when fromLane has no existing orderMap', () => {
      useReorderStore.setState({
        orderMap: { lane2: [4, 5] },
      });

      useReorderStore.getState().updateOnCrossLaneMove(2, 'lane1', 'lane2');

      expect(useReorderStore.getState().orderMap).toEqual({
        lane1: [],
        lane2: [4, 5, 2],
      });
    });
  });

  describe('loadFromStorage', () => {
    it('restores orderMap from plugin-store', async () => {
      vi.mocked(loadReorderConfig).mockResolvedValue({
        lane1: [3, 1, 2],
        lane2: [5, 4],
      });

      await useReorderStore.getState().loadFromStorage();

      expect(useReorderStore.getState().orderMap).toEqual({
        lane1: [3, 1, 2],
        lane2: [5, 4],
      });
    });

    it('keeps orderMap as {} when storage returns null', async () => {
      vi.mocked(loadReorderConfig).mockResolvedValue(null);

      await useReorderStore.getState().loadFromStorage();

      expect(useReorderStore.getState().orderMap).toEqual({});
    });
  });
});
