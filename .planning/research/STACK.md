# Stack Research: v1.1 Additions

**Project:** mileboard v1.1 (Filtering, Sorting, Intra-lane Reorder, Multi-select Bulk Move)
**Researched:** 2026-04-08
**Confidence:** HIGH

**Scope:** This document covers ONLY new stack needs for v1.1 features. The existing validated stack (Tauri 2.10.x, React 18/19, TypeScript, Vite, Zustand 5, @dnd-kit/core+sortable, CSS Modules, sonner, Vitest+RTL, plugin-store) is not re-evaluated.

---

## Key Finding: Zero New Dependencies Needed

After investigating all four v1.1 features, the existing stack already provides everything required. No new npm packages should be added.

---

## Feature-by-Feature Stack Analysis

### 1. Filtering (Status / Assignee / Category, Multi-select OR)

**What's needed:** Multi-select dropdown components with checkbox-style selection for filtering board cards.

**Recommendation: Build custom `MultiSelectFilter` component. Do NOT add a library.**

| Approach | Bundle | Customization | Rationale |
|----------|--------|---------------|-----------|
| Custom component (CSS Modules) | 0 KB | Full control | Project uses Unicode-only icons, CSS Modules styling. Custom component integrates perfectly. |
| react-multi-select-component | ~5 KB gzip | CSS variables | Styling via CSS variables (`--rmsc-*`), not CSS Modules. Would be the only component library in the project. Overkill for 3 simple filter dropdowns. |
| react-select | ~12 KB gzip | Complex styled-components API | Far too heavy. Runtime CSS-in-JS conflicts with CSS Modules philosophy. |

**Why custom is correct:**

1. **Scope is narrow.** Only 3 filter dropdowns needed (status, assignee, category). Each has a known, finite list of options loaded from board data. No async search, no creation, no grouping needed.
2. **Consistency.** The project has no external UI component libraries. Adding one for 3 dropdowns introduces a styling mismatch (CSS variables vs CSS Modules).
3. **Implementation is ~100 lines.** A `MultiSelectFilter` component with: button trigger, dropdown panel with checkboxes, "select all/clear" buttons, click-outside-to-close. All styled with CSS Modules.
4. **Filter state lives in Zustand.** Filter selections are pure state -- `{ statuses: number[], assignees: (number|null)[], categories: number[] }`. Applied as derived state via a selector that filters `BoardData.milestones[].issues`.

**Existing stack used:**
- Zustand 5 -- new `filterStore` or extend `boardStore` with filter slice
- CSS Modules -- `MultiSelectFilter.module.css`
- React `useState` -- local open/close state for dropdown panel

**Confidence:** HIGH -- Multiple real-world examples of building custom multi-select with pure React + CSS. The feature scope doesn't justify a library.

### 2. Sorting (Assignee / Due Date)

**What's needed:** Sort cards within each lane by assignee name or due date.

**Recommendation: Pure TypeScript comparator functions. Zero libraries.**

| Approach | Notes |
|----------|-------|
| Custom comparators | `Array.prototype.sort()` with `localeCompare` for names, date string comparison for dates |
| lodash/sortBy | Adds ~25KB for a single function. Overkill. |
| fast-sort | 1KB library, but standard Array.sort with a comparator is sufficient |

**Implementation:**
```typescript
type SortKey = 'default' | 'assignee' | 'dueDate';
type SortDirection = 'asc' | 'desc';

function sortIssues(issues: BacklogIssue[], key: SortKey, dir: SortDirection): BacklogIssue[] {
  if (key === 'default') return issues; // Server order
  const sorted = [...issues].sort(comparatorFor(key));
  return dir === 'desc' ? sorted.reverse() : sorted;
}
```

**Existing stack used:**
- Zustand 5 -- sort key/direction in store
- TypeScript -- type-safe comparator functions
- Applied as derived state (same pipeline as filtering: raw data -> filter -> sort -> render)

**Confidence:** HIGH -- Standard JavaScript. No library needed.

### 3. Intra-Lane DnD Reordering (Local Persistence)

**What's needed:** Reorder cards within the same lane via drag-and-drop. Persist the custom order locally (not synced to Backlog API).

**Recommendation: Use existing @dnd-kit/sortable `arrayMove` + @tauri-apps/plugin-store. Zero new libraries.**

**Already installed and verified:**
- `@dnd-kit/sortable` v10.0.0 exports `arrayMove(array, from, to)` -- confirmed by reading the installed package's type definitions
- `@dnd-kit/sortable` exports `verticalListSortingStrategy` -- already used in `Lane.tsx`
- `SortableContext` already wraps issue cards in `Lane.tsx`
- `useSortable` already used in `IssueCard.tsx`

**What changes in the DnD flow:**
1. Currently, `Board.tsx` `handleDragEnd` only handles cross-lane moves (`fromLaneId !== toLaneId`). Intra-lane reordering needs the `fromLaneId === toLaneId` case.
2. Use `arrayMove` from `@dnd-kit/sortable` to compute the new order.
3. Store custom order as `Record<string, number[]>` (laneId -> issueId order) in `@tauri-apps/plugin-store`.

**Persistence via plugin-store (already installed):**
- `@tauri-apps/plugin-store` v2.4.x is already used for `settings.json`
- Add a second store file (e.g., `card-order.json`) or a new key in the existing store
- `plugin-store` supports any JSON-serializable value. A `Record<string, number[]>` for lane -> issue ID ordering is ideal
- Auto-save with 100ms debounce is built in

**Key integration point:** When board data refreshes from Backlog API, merge the persisted order with fresh data. New issues (not in persisted order) go to the end. Removed issues are pruned from the persisted order.

**Confidence:** HIGH -- `arrayMove` verified in installed package. `plugin-store` API verified from type definitions. `SortableContext` + `useSortable` already wired up.

### 4. Multi-Select Bulk Lane Move

**What's needed:** Select multiple cards (Ctrl+click / Shift+click), then drag them all to another lane.

**Recommendation: Custom selection state in Zustand + custom DragOverlay. Zero new libraries.**

**@dnd-kit does NOT have built-in multi-select drag.** This is a well-known limitation (GitHub issue #120, 160+ upvotes). The solution is to manage selection state externally and handle it in DnD callbacks.

**Implementation approach:**
1. **Selection store** (Zustand): `selectedIds: Set<number>`, toggle/range-select actions
2. **Visual selection**: CSS class on selected cards (`IssueCard.module.css`)
3. **Drag behavior**: When dragging a selected card, the `DragOverlay` shows a stacked card count badge. On `handleDragEnd`, move ALL selected cards to the target lane.
4. **API calls**: Sequential `updateIssueMilestone` for each selected card (respecting Backlog API rate limits). Use existing optimistic update pattern with batch rollback on failure.

**Existing stack used:**
- Zustand 5 -- selection state
- @dnd-kit/core -- `DragOverlay` (already used for single-card overlay)
- CSS Modules -- selection highlight styling
- sonner -- batch operation progress/error toasts

**Keyboard integration:**
- Ctrl+Click: Toggle individual card selection
- Shift+Click: Range select within a lane
- Escape: Clear selection
- All achievable with standard React event handlers, no library needed

**Confidence:** HIGH -- Pattern is well-documented in @dnd-kit community. Selection is pure state management. The DnD hooks don't need changes -- only the `handleDragEnd` callback needs to check for multi-selection.

---

## Stack Additions Summary

### New Dependencies: NONE

| Feature | Existing Stack Component Used | How |
|---------|-------------------------------|-----|
| Multi-select filter dropdowns | CSS Modules + Zustand + React | Custom `MultiSelectFilter` component |
| Sorting | TypeScript + Zustand | Pure comparator functions, sort key in store |
| Intra-lane reorder | @dnd-kit/sortable `arrayMove` + plugin-store | Already installed, add reorder handler + persistence |
| Multi-select bulk move | Zustand + @dnd-kit/core + CSS Modules | Selection state in store, batch move in `handleDragEnd` |

### New Zustand State Additions

```typescript
// Option A: Extend boardStore
interface BoardStoreState {
  // ... existing fields ...
  
  // Filtering
  filters: {
    statuses: number[];
    assignees: (number | null)[];  // null = unassigned
    categories: number[];
  };
  setFilter: (key: keyof Filters, values: number[] | (number | null)[]) => void;
  clearFilters: () => void;
  
  // Sorting
  sortKey: 'default' | 'assignee' | 'dueDate';
  sortDirection: 'asc' | 'desc';
  setSort: (key: SortKey, direction?: SortDirection) => void;
  
  // Selection (for multi-select bulk move)
  selectedIssueIds: Set<number>;
  toggleSelect: (id: number) => void;
  rangeSelect: (id: number, laneIssueIds: number[]) => void;
  clearSelection: () => void;
  
  // Card order (for intra-lane reorder)
  cardOrder: Record<string, number[]>;  // laneId -> issueId[]
  reorderCards: (laneId: string, fromIndex: number, toIndex: number) => void;
}

// Option B: Separate stores (recommended for separation of concerns)
// filterStore, selectionStore -- boardStore stays focused on data + API
```

**Recommendation: Option B (separate stores).** The boardStore is already ~180 lines. Filter/selection/order are UI concerns orthogonal to data fetching. Separate stores keep each under 100 lines and make testing easier.

### New plugin-store Usage

```typescript
// card-order persistence via @tauri-apps/plugin-store
// Key: `cardOrder:{projectKey}` to scope per-project
// Value: Record<string, number[]>
// Load on board fetch, save on reorder (auto-save debounce handles batching)
```

---

## What NOT to Add

| Library | Why Not |
|---------|---------|
| react-multi-select-component | 5KB for 3 dropdowns. CSS variable theming doesn't match CSS Modules. Only external UI lib in the project. |
| react-select | 12KB, runtime CSS-in-JS, wildly overkill for static filter lists. |
| lodash | Only `sortBy` would be used. Standard `Array.sort` with a comparator is sufficient. |
| immer | Zustand's spread-based immutability is working well. Immer adds ~6KB for a pattern the team already follows. |
| @dnd-kit/accessibility | Not a real package. `@dnd-kit/core` already includes `KeyboardSensor` and ARIA announcements. |
| uuid / nanoid | Selection uses issue IDs (numbers from Backlog API). No need for generated IDs. |

---

## Alternatives Considered

| Decision | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Filter dropdowns | Custom component | react-multi-select-component | Only 3 dropdowns needed. Library adds styling mismatch + dependency. |
| Sort | Array.sort comparators | lodash sortBy | One-line comparators. No library needed for 2 sort keys. |
| Card order persistence | plugin-store (existing) | Separate SQLite via plugin-sql | Overkill. Card order is a simple JSON map. plugin-store handles it perfectly. |
| Selection state | Zustand Set<number> | React Context | Zustand is already the state management solution. No reason to add Context alongside it. |
| Multi-drag UX | Custom selection + batch move | @dnd-kit multi-drag | @dnd-kit has no built-in multi-drag. Custom approach is the documented community pattern. |

---

## Version Compatibility (Verified)

| Package | Installed Version | Used For (v1.1) | Status |
|---------|-------------------|-----------------|--------|
| @dnd-kit/sortable | 10.0.0 | `arrayMove`, `SortableContext`, `useSortable` | Already used. `arrayMove` export verified. |
| @dnd-kit/core | 6.3.1 | `DndContext`, `DragOverlay`, sensors | Already used. No changes needed. |
| @dnd-kit/utilities | 3.2.2 | `CSS.Transform.toString` | Already used. No changes needed. |
| @tauri-apps/plugin-store | 2.4.2+ | Card order persistence | Already used for settings. Verified `set/get<T>` supports arbitrary JSON. |
| zustand | 5.0.12+ | Filter, sort, selection stores | Already used. Multiple stores supported natively. |

---

## Sources

- [@dnd-kit/sortable exports](https://github.com/clauderic/dnd-kit/blob/master/packages/sortable/src/utilities/arrayMove.ts) -- `arrayMove` verified in installed package type definitions
- [@dnd-kit multi-select issue #120](https://github.com/clauderic/dnd-kit/issues/120) -- Confirms no built-in multi-select, documents custom pattern
- [@dnd-kit sortable documentation](https://docs.dndkit.com/presets/sortable) -- SortableContext, verticalListSortingStrategy usage
- [@dnd-kit keyboard sensor](https://docs.dndkit.com/api-documentation/sensors/keyboard) -- Built-in accessibility
- [Tauri plugin-store documentation](https://v2.tauri.app/plugin/store/) -- Key-value persistence API
- [@tauri-apps/plugin-store npm](https://www.npmjs.com/package/@tauri-apps/plugin-store) -- v2.4.2 API reference
- [react-multi-select-component GitHub](https://github.com/hc-oss/react-multi-select-component) -- Evaluated and rejected (5KB, CSS variables, not CSS Modules)
- [hello-pangea/dnd multi-drag pattern](https://github.com/hello-pangea/dnd/blob/main/docs/patterns/multi-drag.md) -- Multi-drag pattern reference (different library, same UX pattern)
- Installed package analysis: `node_modules/@dnd-kit/sortable/dist/index.d.ts`, `node_modules/@tauri-apps/plugin-store/dist-js/index.d.ts` -- Direct verification of exports and APIs

---
*Stack research for: mileboard v1.1*
*Researched: 2026-04-08*
