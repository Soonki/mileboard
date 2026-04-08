# Architecture Patterns

**Domain:** Filtering, sorting, intra-lane reorder, and multi-select bulk move for existing Tauri kanban app
**Researched:** 2026-04-08
**Confidence:** HIGH (based on direct codebase analysis + @dnd-kit / Zustand documented patterns)

## Current Architecture Snapshot

```
App.tsx
  +-- BoardHeader (reload, settings)
  +-- Board (DndContext owner, drag state, lane rendering)
        +-- Lane[] (useDroppable, SortableContext)
              +-- LaneHeader (name, date, member breakdown)
              +-- IssueCard[] (useSortable, click-to-open)
        +-- DragOverlay (floating card during drag)

Stores:
  boardStore  -- status, BoardData, fetchBoard(), moveIssue()
  settingsStore -- ConnectionSettings, loadFromStorage(), saveToStorage()

Services:
  tauriBridge.ts -- fetchBoardData(), updateIssueMilestone()
  settingsStorage.ts -- loadSettings(), saveSettings()
```

**Key invariants to preserve:**
- Components NEVER call `invoke()` directly -- all IPC goes through `tauriBridge.ts`
- Zustand `set()` always uses immutable spread -- no mutation
- Board-level `onDragOver` manages drop target highlighting (not `useDroppable.isOver`)
- Multi-milestone issues have DnD disabled (`useSortable({ disabled: true })`)
- Optimistic update + rollback pattern in `moveIssue()`

---

## Recommended Architecture

### Overview: Where Each Feature Lives

```
                    NEW                          MODIFIED
                    ===                          ========
Types:              FilterState, SortConfig,     (none)
                    SelectionState, LaneOrder

Store:              filterStore (new)            boardStore (add selectors,
                                                  intra-lane reorder, bulk move)

Components:         FilterBar (new)              Board (multi-select DnD logic)
                    FilterDropdown (new)         Lane (selection-aware rendering)
                    SortControls (new)           IssueCard (selection checkbox)
                    SelectionToolbar (new)       BoardHeader (filter/sort mount point)
                                                 DragOverlayCard (multi-count badge)

Utils:              filterIssues.ts (new)        (none)
                    sortIssues.ts (new)
                    extractFilterOptions.ts (new)

Services:           laneOrderStorage.ts (new)    (none -- no new IPC needed)

Rust Backend:       (none -- no changes needed)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **FilterBar** (new) | Renders filter dropdowns for status/assignee/category. Dispatches to filterStore. | filterStore, boardStore (reads unique values) |
| **FilterDropdown** (new) | Multi-select checkbox dropdown for one filter dimension. Generic, reusable. | FilterBar (props callback) |
| **SortControls** (new) | Toggle sort mode (assignee / due date / none) and direction. | filterStore (sort co-located with filter state) |
| **SelectionToolbar** (new) | Shows "N selected" + lane-move target dropdown. Appears when selection.size > 0. | boardStore (reads lanes), boardStore.bulkMoveIssues() |
| **Board** (modified) | Adds multi-select DnD: tracks selectedIds, adjusts onDragEnd for bulk moves and intra-lane reorder. | boardStore, filterStore |
| **Lane** (modified) | Receives filtered+sorted issues. Passes `isSelected`/`onToggleSelect` to cards. | Board (props), IssueCard (props) |
| **IssueCard** (modified) | Adds selection checkbox (click vs drag differentiation). Visual selected state. | Lane (props callback) |
| **DragOverlayCard** (modified) | Shows "+N" badge when dragging multiple selected cards. | Board (props: selectedCount) |
| **BoardHeader** (modified) | Mounts FilterBar and SortControls next to reload/settings buttons. | FilterBar, SortControls |

### Data Flow

```
                                    filterStore
                                   (filters, sort)
                                        |
                                        v
boardStore.data -----> filterIssues() -----> sortIssues() -----> Lane.issues
  (raw BoardData)      (per-lane)            (per-lane)          (displayed)
                                                                     |
                                                          laneOrderStorage
                                                        (intra-lane reorder
                                                         persisted locally)
```

**Critical design decision:** Filtering and sorting are VIEW-LAYER operations. Raw `BoardData` in `boardStore` is never mutated by filters. Derived/filtered data is computed at render time via useMemo or inline in Board.

---

## New Types

### FilterState

```typescript
// src/types/filter.ts

export type SortField = 'none' | 'assignee' | 'dueDate';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  /** Selected status IDs (empty = show all) */
  statusIds: Set<number>;
  /** Selected assignee IDs (empty = show all). -1 = unassigned */
  assigneeIds: Set<number>;
  /** Selected category IDs (empty = show all) */
  categoryIds: Set<number>;
  /** Sort field */
  sortField: SortField;
  /** Sort direction */
  sortDirection: SortDirection;
}
```

### SelectionState (in Board local state)

```typescript
// Local to Board component -- NOT in Zustand store.
// Selection is transient UI state, not app state.

const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
```

### LaneOrder (for intra-lane reorder persistence)

```typescript
// src/types/laneOrder.ts

/** Map of laneId -> ordered array of issue IDs */
export type LaneOrderMap = Record<string, number[]>;
```

---

## New Store: filterStore

```typescript
// src/stores/filterStore.ts

interface FilterStoreState {
  statusIds: Set<number>;
  assigneeIds: Set<number>;
  categoryIds: Set<number>;
  sortField: SortField;
  sortDirection: SortDirection;

  toggleStatus: (id: number) => void;
  toggleAssignee: (id: number) => void;
  toggleCategory: (id: number) => void;
  clearFilters: () => void;
  setSortField: (field: SortField) => void;
  setSortDirection: (dir: SortDirection) => void;
}
```

**Why a separate store (not boardStore)?**
- Separation of concerns: boardStore owns API data + mutations; filterStore owns view preferences.
- Filter changes trigger re-renders only in components subscribing to filterStore, not all boardStore subscribers.
- filterStore is pure frontend state with no API side effects.

**Why NOT persist filterStore?**
- Filters are session-scoped. Reopening the app should show the full board, not a filtered view that may confuse. Deliberate UX choice.

---

## Modified Store: boardStore

### New Actions

```typescript
// Additions to BoardStoreState interface:

/** Reorder an issue within its lane (local only, no API call) */
reorderInLane: (laneId: string, oldIndex: number, newIndex: number) => void;

/** Bulk move multiple issues to a target lane */
bulkMoveIssues: (issueIds: number[], toLaneId: string) => void;
```

### reorderInLane Implementation Pattern

```typescript
reorderInLane: (laneId, oldIndex, newIndex) => {
  const data = get().data;
  if (!data) return;

  // Use @dnd-kit's arrayMove for immutable array reorder
  // import { arrayMove } from '@dnd-kit/sortable';

  if (laneId === 'unassigned') {
    set({
      data: {
        ...data,
        unassignedIssues: arrayMove(data.unassignedIssues, oldIndex, newIndex),
      },
    });
  } else {
    set({
      data: {
        ...data,
        milestones: data.milestones.map((mwi) => {
          if (`milestone-${mwi.milestone.id}` === laneId) {
            return { ...mwi, issues: arrayMove(mwi.issues, oldIndex, newIndex) };
          }
          return mwi;
        }),
      },
    });
  }
  // Persist order to plugin-store (fire-and-forget)
  // saveLaneOrder(projectKey, laneId, reorderedIds);
},
```

**Note:** `arrayMove` is already exported by `@dnd-kit/sortable` (installed at ^10.0.0). No new dependency needed.

### bulkMoveIssues Implementation Pattern

```typescript
bulkMoveIssues: (issueIds, toLaneId) => {
  const snapshot = get().data;
  if (!snapshot) return;

  // 1. Collect all issues being moved, determine their source lanes
  // 2. Remove from all source lanes (immutable)
  // 3. Add to target lane (immutable)
  // 4. Optimistic update via set()
  // 5. Sequential API calls (one per issue) with rate-limit awareness
  // 6. On any failure: rollback to snapshot, toast error with count
},
```

**Rate limiting concern:** Bulk moving N issues means N sequential `updateIssueMilestone` calls. The existing tauriBridge function handles one issue at a time. This is correct -- Backlog API has no batch endpoint. The Rust backend already respects `X-RateLimit-Remaining`. For bulk moves, fire sequentially (not in parallel) to respect rate limits. Show progress in the SelectionToolbar ("Moving 3/5...").

---

## New Utility Functions

### filterIssues.ts

```typescript
// src/utils/filterIssues.ts

/**
 * Filter issues by active filter criteria.
 * Empty set for any dimension = no filter (show all).
 * Multiple values in one dimension = OR (show if matches any).
 * Multiple dimensions = AND (must match all active dimensions).
 */
export function filterIssues(
  issues: readonly BacklogIssue[],
  filters: { statusIds: Set<number>; assigneeIds: Set<number>; categoryIds: Set<number> },
): BacklogIssue[] {
  return issues.filter((issue) => {
    if (filters.statusIds.size > 0 && !filters.statusIds.has(issue.status.id))
      return false;
    if (filters.assigneeIds.size > 0) {
      const assigneeId = issue.assignee?.id ?? -1; // -1 = unassigned sentinel
      if (!filters.assigneeIds.has(assigneeId)) return false;
    }
    if (filters.categoryIds.size > 0) {
      const hasCat = issue.category.some((c) => filters.categoryIds.has(c.id));
      if (!hasCat) return false;
    }
    return true;
  });
}
```

### sortIssues.ts

```typescript
// src/utils/sortIssues.ts

/**
 * Sort issues by field. Stable sort preserves original order for ties.
 * Assignee sort: alphabetical by name, unassigned always last.
 * DueDate sort: chronological, null dates always last.
 */
export function sortIssues(
  issues: BacklogIssue[],
  field: SortField,
  direction: SortDirection,
): BacklogIssue[] {
  if (field === 'none') return issues;
  // [...issues] for immutability, .sort() is stable in modern engines
  const sorted = [...issues].sort(comparator);
  return direction === 'desc' ? sorted.reverse() : sorted;
}
```

### extractFilterOptions.ts

```typescript
// src/utils/extractFilterOptions.ts

/**
 * Extract unique statuses, assignees, categories from raw BoardData.
 * Used to populate FilterDropdown option lists.
 * Pure functions -- called with useMemo in FilterBar.
 */
export function extractStatuses(data: BoardData): BacklogStatus[];
export function extractAssignees(data: BoardData): (BacklogUser | null)[];
export function extractCategories(data: BoardData): BacklogCategory[];
```

### laneOrderStorage.ts

```typescript
// src/services/laneOrderStorage.ts

/**
 * Persist/load per-lane issue ordering via plugin-store.
 * Key format: "laneOrder:{projectKey}" -> LaneOrderMap
 * When board refreshes, apply saved order then append new issues at end.
 */
export async function loadLaneOrders(projectKey: string): Promise<LaneOrderMap>;
export async function saveLaneOrder(
  projectKey: string,
  laneId: string,
  issueIds: number[],
): Promise<void>;
```

**Why per-projectKey?** User may switch between projects. Lane orders should be scoped to avoid cross-project contamination.

---

## Patterns to Follow

### Pattern 1: Filter as Derived Data (Never Mutate Source)

**What:** Filtering and sorting are computed at render time from raw `boardStore.data`. Filtered results are never stored in state.

**When:** Always, for all filter/sort operations.

**Why:** Avoids data synchronization issues. When board is refreshed (reload button), the raw data updates and filters automatically re-apply without explicit re-filter logic.

```typescript
// In Board component:
const rawData = useBoardStore((s) => s.data);
const filters = useFilterStore();

// Compute per-lane filtered+sorted issues
const displayIssues = useMemo(
  () => filterIssues(rawLaneIssues, filters),
  [rawLaneIssues, filters.statusIds, filters.assigneeIds, filters.categoryIds]
);
const sortedIssues = useMemo(
  () => sortIssues(displayIssues, filters.sortField, filters.sortDirection),
  [displayIssues, filters.sortField, filters.sortDirection]
);
```

### Pattern 2: Selection as Local State

**What:** Selected issue IDs are `useState<Set<number>>` in Board, not in Zustand.

**When:** Multi-select feature.

**Why:**
- Selection is transient -- cleared on any navigation, filter change, or board refresh.
- Keeping it in Board avoids unnecessary store subscriptions.
- Selection needs to coordinate with DnD context (both are Board-scoped).

**Clear selection on:**
- Board data refresh (`useEffect` on `data` reference change)
- Filter change (`useEffect` on filter values)
- Successful bulk move
- Escape key press

### Pattern 3: Intra-Lane Reorder with Persistence

**What:** Reorder issues within a lane via DnD. Persist order to `plugin-store`. No API call -- order is local-only.

**When:** Drag within the same lane (detected by `fromLaneId === toLaneId`).

**Why:** Backlog API has no issue ordering concept within milestones. This is a local convenience feature.

**Implementation flow:**
1. `onDragEnd` detects same-lane drag (`fromLaneId === toLaneId`)
2. Compute `oldIndex` and `newIndex` from active/over IDs within the lane's issue array
3. Call `boardStore.reorderInLane(laneId, oldIndex, newIndex)`
4. Store uses `arrayMove()` from `@dnd-kit/sortable` for immutable reorder
5. Fire-and-forget persist to `laneOrderStorage`
6. On board refresh, `fetchBoard` completion triggers order merge

**Merge strategy on refresh:**
```
savedOrder = [A, B, C]
freshIssues = [A, D, B]  (C removed from milestone, D added)

result = [A, B, D]  -- preserved order for known IDs, new IDs appended at end
```

### Pattern 4: Multi-Select DnD (Simulate Multi-Drag)

**What:** @dnd-kit does not natively support dragging multiple items. Simulate by dragging one representative item, then moving all selected items on `onDragEnd`.

**When:** User selects multiple cards then drags any selected card to a different lane.

**Approach:**
1. User Ctrl+clicks (or Cmd+clicks) cards to toggle selection. Shift+click for range select within a lane.
2. Selected cards get visual indicator (accent border, checked checkbox).
3. When dragging a selected card, `DragOverlay` shows the card with "+N" badge.
4. `onDragEnd`: if active card is in selectedIds AND selectedIds.size > 1, move ALL selectedIds to target lane via `bulkMoveIssues`.
5. If active card is NOT in selectedIds, move only that one card (existing single-drag behavior preserved).

```typescript
// In Board handleDragEnd (sketch):
const handleDragEnd = (event: DragEndEvent) => {
  const activeId = event.active.id as number;
  const fromLaneId = findLaneContaining(data, activeId);
  const toLaneId = resolveOverLaneId(data, event.over?.id);

  if (!fromLaneId || !toLaneId || !event.over) {
    // No valid drop target
  } else if (fromLaneId === toLaneId) {
    // Intra-lane reorder
    reorderInLane(fromLaneId, oldIdx, newIdx);
  } else if (selectedIds.has(activeId) && selectedIds.size > 1) {
    // Multi-select bulk move
    bulkMoveIssues([...selectedIds], toLaneId);
    setSelectedIds(new Set());
  } else {
    // Single card move (existing behavior)
    moveIssue(activeId, fromLaneId, toLaneId);
  }

  setActiveIssue(null);
  setOverLaneId(null);
};
```

### Pattern 5: Click vs Drag Differentiation on IssueCard

**What:** IssueCard now has three click behaviors: (1) select/deselect, (2) open in browser, (3) initiate drag. These must not conflict.

**Approach:**
- **Ctrl/Cmd+Click** = toggle selection (handled by `onToggleSelect` prop)
- **Plain click** (no drag) = open in Backlog browser (existing behavior)
- **Drag** = DnD (existing behavior, handled by `useSortable`)
- The `PointerSensor` with `distance: 5` already differentiates click from drag
- Selection toggle intercepts the click handler when modifier key is detected

```typescript
const handleClick = (e: React.MouseEvent) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    e.stopPropagation();
    onToggleSelect(issue.id);
    return;
  }
  // Existing: open in browser
  openUrl(backlogUrl);
};
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Filtered Data in boardStore

**What:** Putting `filteredMilestones` or `filteredIssues` into boardStore state.
**Why bad:** Creates two sources of truth. Filter changes require store updates. Board refresh must re-filter. Race conditions between fetch and filter set.
**Instead:** Compute filtered data at render time. `boardStore.data` stays raw.

### Anti-Pattern 2: Selection in Zustand Store

**What:** Creating a `selectionStore` or adding `selectedIds` to boardStore.
**Why bad:** Selection is transient, Board-scoped UI state. Storing in Zustand adds unnecessary subscriptions and complexity. Other components don't need selection state.
**Instead:** `useState<Set<number>>` in Board component.

### Anti-Pattern 3: Parallel API Calls for Bulk Move

**What:** Firing N `updateIssueMilestone` calls simultaneously with `Promise.all`.
**Why bad:** Backlog API has rate limits. N simultaneous calls may hit 429. No way to partially rollback.
**Instead:** Sequential calls with progress tracking. Rollback entire batch on first failure.

### Anti-Pattern 4: Re-fetching Board After Every Reorder

**What:** Calling `fetchBoard()` after intra-lane reorder to "persist" order.
**Why bad:** Reorder is local-only. Re-fetch would overwrite the custom order (API returns default order). Also wastes API calls.
**Instead:** Persist to `plugin-store` via `laneOrderStorage`. Apply saved order after each `fetchBoard` completion.

### Anti-Pattern 5: Filtering Before DnD Source Resolution

**What:** Passing filtered issue lists to `findLaneContaining()` / `resolveOverLaneId()`.
**Why bad:** A hidden (filtered-out) card's ID could still be referenced by DnD context. Lane resolution must use raw data to find the correct source lane.
**Instead:** DnD lane resolution always uses `boardStore.data` (raw). Only lane rendering uses filtered data.

### Anti-Pattern 6: Using Set Directly in Zustand with Default Equality

**What:** Storing `Set<number>` in Zustand and expecting component re-renders on set mutation.
**Why bad:** Zustand uses `Object.is` by default. Mutating a Set and calling `set()` with the same reference won't trigger re-renders.
**Instead:** Always create a new Set: `set({ statusIds: new Set([...prev, newId]) })`. Or use a custom equality function.

---

## Integration Points: New vs Modified

### New Files (16 including tests)

| File | Type | Purpose |
|------|------|---------|
| `src/types/filter.ts` | Type | FilterState, SortField, SortDirection |
| `src/types/laneOrder.ts` | Type | LaneOrderMap |
| `src/stores/filterStore.ts` | Store | Filter + sort state management |
| `src/stores/filterStore.test.ts` | Test | Filter store tests |
| `src/utils/filterIssues.ts` | Util | Issue filtering logic |
| `src/utils/filterIssues.test.ts` | Test | Filter logic tests |
| `src/utils/sortIssues.ts` | Util | Issue sorting logic |
| `src/utils/sortIssues.test.ts` | Test | Sort logic tests |
| `src/utils/extractFilterOptions.ts` | Util | Unique value extraction from BoardData |
| `src/utils/extractFilterOptions.test.ts` | Test | Extraction tests |
| `src/services/laneOrderStorage.ts` | Service | plugin-store lane order persistence |
| `src/services/laneOrderStorage.test.ts` | Test | Lane order persistence tests |
| `src/components/FilterBar/FilterBar.tsx` | Component | Filter controls container |
| `src/components/FilterDropdown/FilterDropdown.tsx` | Component | Multi-select checkbox dropdown |
| `src/components/SortControls/SortControls.tsx` | Component | Sort mode + direction toggle |
| `src/components/SelectionToolbar/SelectionToolbar.tsx` | Component | Bulk action bar |

### Modified Files (8)

| File | Change | Scope |
|------|--------|-------|
| `src/stores/boardStore.ts` | Add `reorderInLane()`, `bulkMoveIssues()` actions | Medium -- 2 new actions, ~50 LOC |
| `src/stores/boardStore.test.ts` | Add tests for new actions | Medium |
| `src/components/Board/Board.tsx` | Selection state, multi-DnD logic, filter/sort wiring, useMemo computations | Large -- most significant changes |
| `src/components/Lane/Lane.tsx` | Accept `selectedIds`, `onToggleSelect` props, pass to cards | Small |
| `src/components/IssueCard/IssueCard.tsx` | Add Ctrl+click selection, selected visual state, new CSS class | Medium |
| `src/components/DragOverlayCard/DragOverlayCard.tsx` | Add optional `selectedCount` prop for "+N" badge | Small |
| `src/components/BoardHeader/BoardHeader.tsx` | Mount FilterBar + SortControls in header actions area | Small |
| `src/global.css` | Add CSS variables for selection highlight, filter bar styling | Small |

### Unchanged (critical to preserve)

| File | Why Unchanged |
|------|---------------|
| `src/services/tauriBridge.ts` | No new IPC commands needed. Existing `updateIssueMilestone` reused for bulk moves. |
| `src/stores/settingsStore.ts` | No new settings needed. |
| `src/services/settingsStorage.ts` | No changes to connection settings persistence. |
| `src-tauri/` (all Rust files) | No backend changes. Filtering/sorting/selection are frontend-only. Bulk move reuses existing IPC command. |

---

## Scalability Considerations

| Concern | Current (~50 issues) | At 200 issues | At 500+ issues |
|---------|---------------------|---------------|----------------|
| Filter computation | Negligible | Negligible | useMemo sufficient |
| Sort computation | Negligible | Negligible | useMemo sufficient |
| Selection re-render | Fine | Fine -- Set lookup is O(1) | Fine |
| Bulk move API calls | N/A | Sequential OK (~60/min rate limit) | Needs progress UI + cancel button |
| Lane order storage | Tiny JSON | Small JSON | Consider pruning stale entries |
| DnD with many items | @dnd-kit handles well | OK | May need virtualization (out of v1.1 scope) |

---

## Suggested Build Order (Dependency-Driven)

```
Phase 1: Filtering + Sorting (foundation, no DnD changes)
  Types (filter.ts) -> filterStore -> filterIssues util -> sortIssues util
  -> extractFilterOptions util -> FilterDropdown -> FilterBar -> SortControls
  -> BoardHeader modification -> Board wiring with useMemo
  Dependencies: None on other features. Immediate user value.

Phase 2: Intra-Lane Reorder (DnD modification)
  laneOrder type -> laneOrderStorage service -> boardStore.reorderInLane()
  -> Board onDragEnd same-lane detection -> order merge on fetchBoard
  Dependencies: None on Phase 1. But both modify Board.tsx.
  Build after Phase 1 to avoid merge conflicts.

Phase 3: Multi-Select + Bulk Move (builds on all prior)
  Selection state in Board -> IssueCard Ctrl+click -> DragOverlayCard badge
  -> boardStore.bulkMoveIssues() -> SelectionToolbar
  -> Board onDragEnd multi-select logic
  Dependencies: Requires Phase 2 (same-lane vs cross-lane distinction
  in onDragEnd already resolved). Benefits from Phase 1 (filtered view
  narrows visible cards before selecting).
```

**Rationale for ordering:**
1. **Filtering first** -- adds no risk to existing DnD logic, provides immediate value, establishes filterStore infrastructure.
2. **Intra-lane reorder second** -- modifies `onDragEnd` (most sensitive code path). Cleaner to do this before adding multi-select complexity.
3. **Multi-select last** -- most complex feature, touches the most files, builds on all prior work. Easier to test when filtering and reorder are already stable.

---

## Sources

- [dnd-kit Sortable documentation (arrayMove, SortableContext)](https://docs.dndkit.com/presets/sortable) -- HIGH confidence
- [dnd-kit multi-select discussion #120](https://github.com/clauderic/dnd-kit/issues/120) -- MEDIUM confidence (community patterns, no official API)
- [dnd-kit multi-drag discussion #1313](https://github.com/clauderic/dnd-kit/discussions/1313) -- MEDIUM confidence
- [Zustand selectors and derived state discussion](https://github.com/pmndrs/zustand/discussions/387) -- HIGH confidence
- [Tauri plugin-store documentation](https://v2.tauri.app/plugin/store/) -- HIGH confidence
- [hello-pangea/dnd multi-drag pattern](https://github.com/hello-pangea/dnd/blob/HEAD/docs/patterns/multi-drag.md) -- MEDIUM confidence (reference adapted for @dnd-kit)
- [Zustand persist middleware docs](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) -- HIGH confidence
- Direct codebase analysis of all source files in `mileboard/src/` and `mileboard/src-tauri/src/`
