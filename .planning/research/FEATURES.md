# Feature Research: v1.1 Filtering, Sorting, Reordering, and Multi-Select

**Domain:** Kanban board enhancement features (filtering, sorting, intra-lane reorder, multi-select bulk operations)
**Researched:** 2026-04-08
**Confidence:** HIGH

## Scope

This research covers ONLY the four new v1.1 features. All v1.0 table stakes (T1-T13) are already shipped. The features under investigation are:

1. **Filtering** -- Status, assignee, and category multi-select OR filters
2. **Sorting** -- Assignee-order and due-date-order card sorting within lanes
3. **Intra-lane DnD reordering** -- Manual card ordering within a lane, persisted locally
4. **Multi-select bulk lane move** -- Select multiple cards, drag or move them to another lane at once

---

## Feature Landscape

### Table Stakes (Users Expect These for v1.1)

These are the minimum viable features for a "filtering and efficiency" milestone. Shipping v1.1 without any of these makes the milestone feel incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **F1: Status filter (multi-select OR)** | Every kanban tool (Jira, Trello, Linear) has status filtering. Users need to focus on open-only or resolved-only during different planning activities. | LOW | Client-side filter on already-loaded `issue.status.name`. No API call needed. OR logic within the facet: selecting "Open" OR "In Progress" shows both. |
| **F2: Assignee filter (multi-select OR)** | Daily scrum focuses on one person's workload. Jira's quick filters support this natively. Without it, users visually scan cards -- slow and error-prone on 7 lanes. | LOW | Client-side filter on `issue.assignee.name`. Include a "No Assignee" option for unassigned issues. OR logic: selecting "Alice" OR "Bob" shows both. |
| **F3: Category filter (multi-select OR)** | Backlog uses categories to group issues by feature area or team. Planning sessions often focus on a specific category. | LOW | Client-side filter on `issue.category[].name`. Same OR logic. Backlog issues can have multiple categories -- match if ANY category matches ANY selected filter value. |
| **F4: Sort by assignee** | After filtering, users need to group related cards together. Sorting by assignee clusters one person's work visually within each lane. | LOW | Alphabetical sort by `issue.assignee.name`. Null assignees go to bottom. Applied per-lane independently. |
| **F5: Sort by due date** | Planning requires knowing which issues are time-critical. Due-date sort surfaces overdue and upcoming items at the top. | LOW | Ascending sort by `issue.dueDate`. Null due dates go to bottom. Applied per-lane independently. |
| **F6: Filter bar UI** | The filter controls themselves need a standard, recognizable UI pattern. Users expect horizontal filter dropdowns above the board. | LOW-MED | Horizontal bar above board lanes. Each filter is a dropdown/popover with checkboxes. Active filters shown as dismissible chips. "Clear all" button when any filter active. |

### Differentiators (Competitive Advantage)

Features that elevate mileboard beyond a basic filtered board. These represent significant UX wins but are more complex.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **D1: Intra-lane DnD reordering (local persistence)** | Manual card ordering lets users prioritize within a sprint. No other Backlog tool provides this because Backlog API has no issue-order concept. Local persistence means the custom order survives app restarts. | MEDIUM | Uses existing @dnd-kit/sortable infrastructure (SortableContext is already wired in Lane.tsx). Requires: (1) `arrayMove` in onDragEnd for same-lane detection, (2) storing order maps in Tauri plugin-store keyed by `{projectKey}:{laneId}`, (3) merging persisted order with live API data on refresh. |
| **D2: Multi-select cards** | Select multiple cards to operate on them as a batch. Essential for large-scale sprint replanning where 10-20 issues need to move at once. | MEDIUM | Selection state (Set of issue IDs) in Zustand. Ctrl+Click for toggle, Shift+Click for range select. Visual: selected cards get highlight border/background. Selection persists across lanes. |
| **D3: Bulk lane move (DnD or action)** | After selecting multiple cards, move them all to a target lane. Transforms a 10-drag operation into 1 action. | HIGH | Two interaction options: (a) drag any selected card and all move together, or (b) "Move to..." context menu/button. dnd-kit does NOT natively support multi-drag; requires custom implementation. The drag overlay shows card count badge. API calls must be sequential (rate limit) with progress feedback. |
| **D4: Combined filter display** | Show active filter state as chips/pills above the board, with counts of matching issues per lane updating in real-time. | LOW | Enhances filter discoverability. Each chip shows "Status: Open, In Progress" with X to remove. Lane headers update count to show "5 / 12" (filtered / total). |
| **D5: Sort indicator in lane header** | Visual indicator of current sort order in each lane header. | LOW | Small icon (arrow up/down) and sort field name. Clicking toggles direction. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **AND logic between filter values within same facet** | Some users want "Status = Open AND In Progress" | AND within a single facet is logically impossible (an issue has one status). OR within facet, AND between facets is the standard pattern. | Use OR within facets, AND between facets. This is the universal standard (Jira, Trello, Linear, Amazon). |
| **Saved filter presets** | Users want to save "My daily scrum" filter combo | Adds persistence complexity, UI for naming/managing presets, and confusion about which preset is active. For 3 filter facets, this is overkill. | Filters auto-persist last selection in plugin-store. On app restart, the last filter state is restored. No named presets needed. |
| **Server-side filtering** | Reduce data transfer by filtering at API level | Backlog API supports status/assignee/category filters, but client already loads all issues for all lanes. Adding server-side filtering means re-fetching on every filter change, introducing latency and API rate consumption. | Client-side filtering on already-loaded data. Instant response, zero API calls, no rate limit impact. |
| **Free-text search across all fields** | Find issues by keyword anywhere | Scope creep for v1.1. Full-text search needs debounced input, highlight matching text, and handling across summary/description/comments. | Defer to v1.2. The three structured filters cover 90% of planning use cases. |
| **Cross-lane multi-select drag (maintaining relative order)** | Select cards from different lanes and drag together | Extremely complex: cards from multiple source lanes, ambiguous insertion point, multiple API calls to different milestones. | Allow multi-select across lanes but use a "Move to..." action button rather than cross-lane DnD. Simpler and more predictable. |
| **Custom sort fields** | Sort by priority, creation date, custom fields | Scope creep. Assignee and due date cover the two most common planning scenarios (who and when). | Ship with assignee + due date sort. Add more sort options in future milestones based on user feedback. |
| **Reorder persistence synced to Backlog** | Push manual card order back to Backlog | Backlog API has no issue ordering within milestone concept. Creating a fake ordering (e.g., via custom fields) couples mileboard to Backlog data model in fragile ways. | Local-only persistence via plugin-store. Clear UX messaging: "Custom order is local to this device." |

---

## Feature Dependencies

```
Existing v1.0 (all shipped):
  Board + Lanes + Cards + DnD + Optimistic UI

v1.1 Feature Dependencies:

F6 (Filter bar UI)
  |
  +---> F1 (Status filter)
  +---> F2 (Assignee filter)
  +---> F3 (Category filter)
  |
  +---> D4 (Combined filter chips display)

F1 + F2 + F3 ---> Lane cards rendering respects active filters
  |
  +---> Lane header counts update (filtered count / total count)

F4 (Sort by assignee) --independent-- F5 (Sort by due date)
  |
  Both require:
  +---> Sort control UI in lane header or filter bar
  +---> D5 (Sort indicator)

D1 (Intra-lane DnD reorder)
  |
  +---> Requires modification of Board.tsx onDragEnd to detect same-lane drops
  +---> Requires local persistence layer (plugin-store)
  +---> CONFLICTS with active sort: if sort is active, manual reorder is disabled
  |       (cannot have both "sorted by due date" and "manually ordered")

D2 (Multi-select)
  |
  +---> D3 (Bulk lane move) -- bulk move requires selection first
  |
  +---> Must coordinate with IssueCard.tsx click handler
  |     (click = open in browser, Ctrl+click = toggle selection)
  |
  +---> Must coordinate with existing DnD
  |     (drag selected card = bulk move, not individual move)

D3 (Bulk lane move)
  |
  +---> Requires D2 (multi-select) as prerequisite
  +---> Extends existing moveIssue in boardStore to handle arrays
  +---> Sequential API calls with progress indicator
  +---> Optimistic UI for batch: move all cards, rollback all on any failure
```

### Critical Dependency Notes

- **Filter + Sort + Reorder interaction:** When a sort is active, intra-lane manual reorder must be disabled (they conflict). When filters hide cards, the hidden cards' positions must be preserved in the reorder map. This three-way interaction is the most complex design challenge in v1.1.
- **Multi-select + Click conflict:** Currently, clicking a card opens it in the browser. Multi-select needs Ctrl+Click to toggle selection. These must coexist without confusion: plain click = open, Ctrl+Click = select, drag = move.
- **Multi-select + DnD conflict:** When cards are selected and user drags one, should it move just that card or all selected cards? The expected behavior (matching Trello, Jira) is: if the dragged card is in the selection, move all selected; if not, deselect all and move just the dragged card.
- **Filters persist, sort persists, reorder persists:** All three need local persistence via plugin-store. They should be stored per-project to avoid confusion when switching projects.

---

## Implementation Recommendations

### Filtering: Client-Side Faceted Filter Pattern

**UX Pattern (based on Jira, Trello, Linear analysis):**

1. Horizontal filter bar positioned between BoardHeader and board lanes
2. Each facet is a dropdown button labeled "Status", "Assignee", "Category"
3. Clicking opens a popover with checkboxes for each value
4. Values are dynamically populated from the loaded board data (not hardcoded)
5. OR logic within each facet, AND logic between facets
6. Active selections shown as dismissible chips next to each dropdown
7. "Clear all filters" button appears when any filter is active
8. Lane headers show "N / M" (filtered visible count / total count) when filters active
9. Empty lanes after filtering show "No matching issues" rather than disappearing

**State model:**
```
filterState: {
  statuses: Set<string>     // empty = show all, non-empty = OR filter
  assignees: Set<string>    // includes special "__unassigned__" value
  categories: Set<string>   // match if issue has ANY matching category
}
```

**Filtering logic:** An issue is visible if:
- (filterState.statuses is empty OR issue.status.name is in filterState.statuses)
- AND (filterState.assignees is empty OR issue.assignee matches)
- AND (filterState.categories is empty OR any issue.category matches)

### Sorting: Per-Lane Sort with Conflict Handling

**UX Pattern:**
1. Sort control in filter bar (global) or per-lane header (per-lane). Recommend **global** for simplicity -- same sort applied to all lanes.
2. Options: "Default" (API order), "Assignee (A-Z)", "Due Date (Earliest first)"
3. Active sort shows indicator icon and label
4. When sort is active, disable intra-lane manual reorder (show tooltip explaining why)

**State model:**
```
sortState: {
  field: 'default' | 'assignee' | 'dueDate'
  direction: 'asc' | 'desc'
}
```

### Intra-Lane DnD Reorder: arrayMove + Local Persistence

**Implementation pattern with existing dnd-kit:**
1. In Board.tsx `onDragEnd`, detect same-lane drops (fromLaneId === toLaneId)
2. For same-lane drops, use `arrayMove` from `@dnd-kit/sortable` to reorder
3. Update boardStore with new issue order
4. Persist order map to plugin-store: `{ [laneId]: [issueId1, issueId2, ...] }`
5. On data refresh (fetchBoard), merge persisted order with fresh API data:
   - New issues (not in persisted order) go to the bottom
   - Removed issues (in persisted order but not in API data) are pruned
   - Existing issues maintain their persisted position

**Conflict with sort:** When `sortState.field !== 'default'`, intra-lane reorder is disabled. The `useSortable` hook's `disabled` prop controls this.

**Persistence key:** `card-order:{projectKey}` to scope per project. Store as JSON in plugin-store alongside settings.

### Multi-Select + Bulk Move: Custom Implementation on dnd-kit

**Selection UX (based on react-beautiful-dnd multi-drag pattern + Trello/Jira analysis):**

1. **Ctrl+Click** (Cmd+Click on macOS): Toggle individual card selection
2. **Shift+Click**: Range select within same lane (from last selected to clicked)
3. **Escape**: Clear all selections
4. **Click without modifier**: Clear selection and open card in browser (existing behavior)
5. Selected cards show visual highlight (colored border + subtle background)
6. Selection count badge appears in a floating toolbar at bottom of screen

**Bulk Move UX:**
1. When cards are selected, a floating action bar appears at bottom: "[N] cards selected | Move to: [lane dropdown] | Cancel"
2. Optionally, dragging a selected card moves all selected cards
3. During bulk move, a progress indicator shows "Moving 5/12 cards..."
4. On any single API failure: rollback ALL moved cards to original positions, show error toast

**dnd-kit multi-drag limitation:** dnd-kit does NOT support multi-drag natively (confirmed via GitHub issue #120). Two approaches:
- **Option A (Recommended): Action bar with dropdown** -- Avoid DnD for bulk moves entirely. Selected cards + "Move to [lane]" button is simpler, more reliable, and accessible.
- **Option B: Custom multi-drag** -- Track selection state, modify DragOverlay to show stacked cards with count badge, move all selected in onDragEnd. Complex and fragile.

Recommend **Option A** because: (1) dnd-kit multi-drag is unsupported and fragile, (2) action bar is more accessible, (3) works for cross-lane selections, (4) clearer feedback with progress indicator.

---

## Phase Prioritization for v1.1

| Feature | User Value | Implementation Cost | Priority | Phase |
|---------|------------|---------------------|----------|-------|
| F6: Filter bar UI | HIGH | LOW-MED | P1 | 1 |
| F1: Status filter | HIGH | LOW | P1 | 1 |
| F2: Assignee filter | HIGH | LOW | P1 | 1 |
| F3: Category filter | HIGH | LOW | P1 | 1 |
| D4: Filter chips | MEDIUM | LOW | P1 | 1 |
| F4: Sort by assignee | MEDIUM | LOW | P2 | 2 |
| F5: Sort by due date | MEDIUM | LOW | P2 | 2 |
| D5: Sort indicator | LOW | LOW | P2 | 2 |
| D1: Intra-lane DnD reorder | MEDIUM | MEDIUM | P2 | 3 |
| D2: Multi-select | HIGH | MEDIUM | P2 | 4 |
| D3: Bulk lane move | HIGH | HIGH | P2 | 4 |

**Recommended phase grouping:**

1. **Phase 1: Filtering** -- F1, F2, F3, F6, D4. Highest value-to-effort ratio. All client-side. No DnD changes.
2. **Phase 2: Sorting** -- F4, F5, D5. Builds on filter bar UI. Simple comparator functions. Small scope.
3. **Phase 3: Intra-lane reorder** -- D1. Requires careful DnD event handling changes in Board.tsx. Separate from filters/sort to isolate DnD complexity.
4. **Phase 4: Multi-select + Bulk move** -- D2, D3. Most complex feature. Depends on stable DnD from Phase 3. Involves selection state, UI overlay, batch API calls.

**Phase ordering rationale:**
- Filtering first: no DnD changes needed, immediate daily-use value, establishes filter bar UI that sorting builds on
- Sorting before reorder: sorting is read-only (just changes display order), simpler than reorder, and the sort-vs-reorder conflict must be designed before implementing reorder
- Reorder before multi-select: multi-select + bulk move touches the same DnD event handlers; reorder must be stable first
- Multi-select last: highest complexity, depends on all previous phases being stable

---

## Competitor Feature Analysis

| Feature | Jira Board | Trello | Linear | mileboard v1.1 Approach |
|---------|-----------|--------|--------|-------------------------|
| Status filter | Quick filters (toggle buttons) | Label filter dropdown | Status filter in sidebar | Multi-select dropdown with chips |
| Assignee filter | Quick filter + avatar row | Member filter dropdown | Assignee filter in sidebar | Multi-select dropdown with chips |
| Category filter | Component filter (similar concept) | Label filter (approximate) | Label/Project filter | Multi-select dropdown with chips (Backlog categories) |
| Sort within column | Priority rank (drag) | Manual drag order | Priority auto-sort | Assignee/due-date sort + manual DnD reorder |
| Multi-select | Ctrl+Click, bulk change via "..." menu | Batch select via checkbox mode | Ctrl+Click, batch actions toolbar | Ctrl+Click + Shift+Click, floating action bar |
| Bulk move | Bulk change dialog (not DnD) | Move card menu (single) | Batch move in toolbar | Action bar "Move to [lane]" button |
| Persist card order | Server-side rank | Server-side position | Server-side priority | Local-only via plugin-store (Backlog API limitation) |

---

## Key Design Decisions to Make

1. **Filter bar location:** Above board (recommended) vs. sidebar panel. Above is more compact for a horizontal kanban layout.
2. **Sort scope:** Global (all lanes same sort) vs. per-lane. Recommend global for simplicity; per-lane adds confusion.
3. **Reorder + Sort conflict resolution:** When sort is active, disable reorder (recommended). Alternative: switching to manual reorder clears sort -- but this is confusing.
4. **Multi-select DnD vs. Action bar:** Action bar recommended over multi-drag DnD. See D3 notes above.
5. **Filter persistence scope:** Per project-key (recommended). Switching projects should not carry over filters from another project.
6. **Lane count display under filter:** "5 / 12 issues" (filtered/total) vs. "5 issues (7 hidden)". Former is more standard.

---

## Evolution from v1.0 Research

Notable changes from the v1.0 FEATURES.md:

- **A12 (Intra-lane reorder) was anti-feature, now promoted to differentiator D1.** The v1.0 rationale ("creates confusion when data refreshes") is addressed by the merge strategy: persisted order is reconciled with fresh API data on each fetch, and new/removed issues are handled gracefully.
- **D1/D2/D3 (Filters) were differentiators, now promoted to table stakes (F1-F3).** After shipping v1.0, filtering is the most obvious missing feature for daily use. Every planning session involves focusing on a subset of issues.
- **D8 (Bulk move) was Phase 3 "power feature", now Phase 4 core.** The project explicitly targets this for v1.1.

---

## Sources

- [Kanban Quick Filters -- Businessmap](https://businessmap.io/blog/kanban-board-filter) -- MEDIUM confidence (industry analysis)
- [Filter UI Patterns 2025 -- BricxLabs](https://bricxlabs.com/blogs/universal-search-and-filters-ui) -- MEDIUM confidence (UX patterns)
- [Faceted Filtering UX -- LogRocket](https://blog.logrocket.com/ux-design/faceted-filtering-better-ecommerce-experiences/) -- MEDIUM confidence (UX analysis)
- [Jira Quick Filters -- Atlassian](https://support.atlassian.com/jira-software-cloud/docs/configure-quick-filters/) -- HIGH confidence (official docs)
- [dnd-kit Multi-Select Issue #120 -- GitHub](https://github.com/clauderic/dnd-kit/issues/120) -- HIGH confidence (official issue tracker)
- [react-beautiful-dnd Multi-Drag Pattern -- GitHub](https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/patterns/multi-drag.md) -- HIGH confidence (official docs)
- [dnd-kit Sortable Docs](https://docs.dndkit.com/presets/sortable) -- HIGH confidence (official docs)
- [Kanban Card Ordering -- Businessmap](https://knowledgebase.businessmap.io/hc/en-us/articles/360015591279-How-to-Order-Your-Cards) -- MEDIUM confidence (product docs)
- [Kanban Tool Multi-Selection -- KanbanTool](https://kanbantool.com/support/kanban-board/multiple-selection) -- MEDIUM confidence (product docs)
- [Bulk Updates on Kanban -- NimbleWork](https://www.nimblework.com/blog/making-bulk-updates-kanban-board/) -- MEDIUM confidence (blog)
- [Tauri Plugin Store v2 -- Official](https://v2.tauri.app/plugin/store/) -- HIGH confidence (official docs)
- [Badges vs Chips vs Pills -- Smart Interface Design Patterns](https://smart-interface-design-patterns.com/articles/badges-chips-tags-pills/) -- MEDIUM confidence (UX reference)
- [SaaS Filter UI Patterns -- Eleken](https://www.eleken.co/blog-posts/filter-ux-and-ui-for-saas) -- MEDIUM confidence (UX analysis)

---
*Feature research for: mileboard v1.1 -- Filtering, Sorting, Reordering, Multi-Select*
*Researched: 2026-04-08*
