# Project Research Summary

**Project:** mileboard v1.1 (Filtering, Sorting, Intra-lane Reorder, Multi-select Bulk Move)
**Domain:** Kanban board enhancement -- client-side filtering/sorting + DnD extensions
**Researched:** 2026-04-08
**Confidence:** HIGH

## Executive Summary

mileboard v1.1 adds four productivity features to an already-shipped Tauri kanban app: multi-facet filtering (status/assignee/category), card sorting (assignee/due date), intra-lane drag-and-drop reordering with local persistence, and multi-select bulk lane move. The entire v1.1 feature set can be implemented without adding any new npm dependencies -- the existing stack already provides every primitive needed. Treat filtering and sorting as pure view-layer derived computations on immutable canonical board data, implement intra-lane reorder using the already-wired arrayMove from @dnd-kit/sortable, and implement multi-select as external selection state with a batched action bar rather than multi-drag (which @dnd-kit does not support natively).

The four features have a clear sequential dependency: filtering establishes the filterStore infrastructure and the critical canonical-vs-derived data split; sorting builds on the filter bar UI and must define the sort/reorder conflict before intra-lane reorder; reorder modifies the Board.tsx onDragEnd handler that multi-select also needs; and multi-select+bulk move is safest last when filtering, sorting, and DnD are all stable.

The primary risk is the three-way interaction between filtering, sorting, and manual reorder: filtered views must never affect the canonical data (or DnD ID resolution breaks), SortableContext items must always match rendered card nodes exactly (or collision detection silently breaks), and manual reorder must be disabled when sort is active. The secondary risk is bulk move rollback: the existing single-card snapshot rollback is wrong for multi-card operations and must be replaced with per-item success tracking.

## Key Findings

### Recommended Stack

Zero new dependencies required for v1.1. @dnd-kit/sortable arrayMove (verified at v10.0.0) handles intra-lane reorder. @tauri-apps/plugin-store (already used for settings) supports per-project lane order persistence. Zustand 5 natively supports multiple independent stores. All structural additions use the existing CSS Modules styling approach.

**Core technologies:**
- @dnd-kit/sortable v10.0.0: arrayMove + SortableContext for intra-lane reorder -- already wired in Lane.tsx
- Zustand 5: new filterStore (filter/sort state), selection as local useState in Board
- @tauri-apps/plugin-store v2.4.x: lane order persistence keyed per-project -- already used for settings
- CSS Modules + React: custom FilterDropdown (~100 LOC) -- no external UI library needed
- TypeScript Array.sort with comparators: sort by assignee/dueDate -- no lodash needed

### Expected Features

**Must have (table stakes for v1.1):**
- Status filter (multi-select OR) -- every planning session needs open/resolved focus
- Assignee filter (multi-select OR) -- daily scrum focus on one person workload
- Category filter (multi-select OR) -- feature-area planning sessions
- Sort by assignee (alphabetical) -- clusters one person work visually within lanes
- Sort by due date (chronological) -- surfaces time-critical issues at top
- Filter bar UI with active chips and clear-all -- standard pattern users expect

**Should have (competitive differentiators):**
- Intra-lane DnD reorder with local persistence -- no other Backlog tool offers this
- Multi-select cards (Ctrl+click / Shift+click) -- essential for large sprint replanning
- Bulk lane move via action bar -- transforms 10-drag operation into 1 action
- Lane header filtered count (5/12) -- immediate filter impact feedback
- Sort indicator in lane header -- confirms active sort state

**Defer (v1.2+):**
- Free-text search -- debounce, highlight, scope creep for v1.1
- Saved named filter presets -- auto-persist last state is sufficient
- Server-side filtering -- client-side is instant; API re-fetch adds latency and rate consumption
- Cross-lane multi-select DnD maintaining relative order -- action bar covers the use case
- Custom sort fields beyond assignee + due date

### Architecture Approach

boardStore.data (raw API response, never filtered) feeds through filterIssues() then sortIssues() pure functions at render time, producing visibleIssues that drives both Lane rendering and SortableContext items. Selection state lives as useState local to Board. filterStore owns filter and sort preferences as view-layer state. laneOrderStorage persists custom card order to plugin-store with a merge strategy applied after every fetchBoard(). The Rust backend requires zero changes.

**Major components:**
1. filterStore (new) -- filter facets + sort field/direction as session-scoped Zustand state; separate from boardStore
2. FilterBar + FilterDropdown + SortControls (new) -- filter/sort UI in BoardHeader; FilterDropdown generic/reusable
3. SelectionToolbar (new) -- floating action bar showing selected count + Move to lane dropdown
4. filterIssues + sortIssues + extractFilterOptions (new utils) -- pure functions forming the derived data pipeline
5. laneOrderStorage (new service) -- plugin-store persistence for per-project lane order maps with merge strategy
6. Board.tsx (modified) -- selectedIds state, multi-select DnD logic in onDragEnd, useMemo for filtered+sorted arrays
7. boardStore.ts (modified) -- reorderInLane() (arrayMove + persist) and bulkMoveIssues() (sequential API calls, per-item tracking)

### Critical Pitfalls

1. **Filtered view corrupts DnD ID resolution** -- boardStore.data must always be raw unfiltered. DnD handlers resolve lane IDs from raw data only. Architectural foundation for all features.

2. **SortableContext items array diverges from rendered cards** -- items prop and rendered cards must derive from the same getVisibleIssues() call. Divergence causes silent @dnd-kit collision detection failure.

3. **Bulk move cascading rollback disaster** -- Single-snapshot rollback is wrong for multi-card ops. Use per-item tracking: on failure of card N, keep 1..N-1 moved, revert N onwards, then fetchBoard() to resync.

4. **Intra-lane reorder triggers false positives during cross-lane drag** -- Apply arrayMove only in onDragEnd, not onDragOver. Or implement hasLeftSourceLane guard.

5. **Local sort order destroyed on every fetchBoard()** -- Store order separately, re-merge after every fetch: keep persisted positions, append new issues at end, prune removed issues.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Filtering + Filter Bar UI

**Rationale:** Highest value-to-effort ratio. No DnD changes needed. Establishes architectural foundation that Phases 2-4 all depend on.
**Delivers:** Status/assignee/category multi-select filters, filter bar UI with active chips, lane header filtered counts, clear-all action.
**Addresses:** F1 (status filter), F2 (assignee filter), F3 (category filter), F6 (filter bar UI), D4 (filter chips)
**Avoids:** Pitfall 1 (filtered view corrupts DnD) by design. Pitfall 2 (SortableContext mismatch) -- getVisibleIssues() pipeline locked in here.

### Phase 2: Sorting

**Rationale:** Builds on filter bar UI from Phase 1. Pure TypeScript comparators -- no DnD changes. Defines sort/reorder mutual exclusion before Phase 3.
**Delivers:** Sort by assignee and due date with direction toggle, sort indicator, sort preference persistence.
**Addresses:** F4 (sort by assignee), F5 (sort by due date), D5 (sort indicator)
**Avoids:** Sort-vs-reorder conflict defined here rather than retrofitted in Phase 3.

### Phase 3: Intra-Lane DnD Reorder

**Rationale:** Modifies Board.tsx onDragEnd -- the most sensitive code path. Isolated after Phases 1-2 are stable. Must complete before Phase 4.
**Delivers:** Manual card ordering within a lane, persisted per-project. Order survives app restart and API refresh via merge strategy. Reorder disabled when sort active.
**Addresses:** D1 (intra-lane DnD reorder, local persistence)
**Avoids:** Pitfall 4 (false reorder during cross-lane drag). Pitfall 5 (order lost on refresh) -- merge strategy is definition of done.

### Phase 4: Multi-Select + Bulk Lane Move

**Rationale:** Most complex feature. Depends on Phase 2 and Phase 3. Action bar recommended -- @dnd-kit has no native multi-drag support (Issue #120, open since 2021).
**Delivers:** Ctrl+click/Shift+click selection, selection toolbar, Move to lane bulk action with sequential API calls and progress feedback, partial failure handling, board resync.
**Addresses:** D2 (multi-select), D3 (bulk lane move)
**Avoids:** Pitfall 3 (cascading rollback). Pitfall 6 (@dnd-kit no multi-drag). Pitfall 7 (click handler conflicts).

### Phase Ordering Rationale

- Filtering first: No DnD risk, immediate user value, establishes canonical/derived split.
- Sorting before reorder: Sort-vs-reorder exclusion must be designed before reorder is built.
- Reorder before multi-select: Both modify the same onDragEnd handler.
- Multi-select last: Highest complexity, most files, most API risk.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Intra-lane reorder):** hasLeftSourceLane guard behavior with closestCorners may need experimentation.
- **Phase 4 (Bulk move):** Confirm Rust backend surfaces X-RateLimit-Remaining to frontend. Validate selection cap UX.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Filtering):** Faceted filter OR-within/AND-between is thoroughly documented.
- **Phase 2 (Sorting):** Array.sort with comparators. Entirely standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new deps. Verified against installed type definitions and official docs. |
| Features | HIGH | Derived from competitor analysis (Jira, Trello, Linear) and v1.0 user feedback. |
| Architecture | HIGH | Direct codebase analysis + @dnd-kit and Zustand official docs. |
| Pitfalls | HIGH | 7 pitfalls from @dnd-kit issue tracker (confirmed open bugs), Backlog API docs, codebase analysis. |

**Overall confidence:** HIGH

### Gaps to Address

- **Sort preference persistence scope:** FEATURES.md says persist sort; ARCHITECTURE.md says filterStore is session-scoped. Resolution: persist sort in plugin-store, keep filter selections session-only. Resolve in Phase 2 planning.
- **Bulk move selection cap:** Warn-and-allow vs hard-block at ~20 cards. Resolve in Phase 4 planning.
- **Empty lane after filter UX copy:** Exact Japanese string confirmation needed in Phase 1 planning.
- **Cross-lane multi-select behavior:** Exact interaction spec when cards from multiple lanes are selected. Resolve in Phase 4 planning.

## Sources

### Primary (HIGH confidence)
- @dnd-kit/sortable docs (https://docs.dndkit.com/presets/sortable) -- arrayMove, SortableContext items requirement
- @dnd-kit Issue #120 (https://github.com/clauderic/dnd-kit/issues/120) -- confirmed no native multi-select drag support
- Tauri plugin-store v2 docs (https://v2.tauri.app/plugin/store/) -- key-value persistence API
- Backlog API Rate Limit docs (https://developer.nulab.com/docs/backlog/rate-limit/) -- 150 update req/min per-user
- Backlog API Update Issue (https://developer.nulab.com/docs/backlog/api/2/update-issue/) -- milestoneId[] full-array replacement
- Jira Quick Filters docs -- filter UX reference
- Direct codebase analysis: boardStore.ts, Board.tsx, Lane.tsx, IssueCard.tsx, client.rs, installed package type definitions

### Secondary (MEDIUM confidence)
- @dnd-kit Discussion #1313 -- community multi-drag workarounds
- hello-pangea/dnd multi-drag pattern -- multi-drag UX adapted for @dnd-kit
- react-beautiful-dnd multi-drag -- Atlassian-documented selection UX pattern
- Zustand selectors discussion -- derived state patterns

### Tertiary (MEDIUM confidence)
- BricxLabs Filter UI Patterns 2025
- LogRocket Faceted Filtering UX
- Eleken SaaS Filter UI

---
*Research completed: 2026-04-08*
*Ready for roadmap: yes*