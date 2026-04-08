# Pitfalls Research

**Domain:** Adding filtering, sorting, intra-lane reordering, and multi-select bulk move to existing kanban board
**Researched:** 2026-04-08
**Confidence:** HIGH (codebase analysis + @dnd-kit issue tracker + Backlog API docs + Zustand community patterns)

## Critical Pitfalls

### Pitfall 1: Filtered View Corrupts DnD ID Resolution

**What goes wrong:**
Filters hide cards from the UI, but `boardStore.data` holds the full unfiltered dataset. The current `findLaneContaining()` in Board.tsx searches the full `data` to resolve drag IDs. When filtering is active, the user sees card X in Lane A (filtered view), but if card X actually sits at a different position in the unfiltered data, `resolveOverLaneId()` and `findLaneContaining()` may resolve to a lane that contains hidden cards, causing the drop to target the wrong lane or producing a no-op.

More critically: if filter state is stored inside `boardStore.data` (filtered data replaces canonical data), then `moveIssue`'s rollback via `set({ data: snapshot })` would restore a filtered snapshot, losing hidden cards permanently from the UI until a full refresh.

**Why it happens:**
The current architecture stores raw `BoardData` in the store and renders it directly. There is no layer between canonical data and displayed data. Adding filtering requires introducing that layer, and the mistake is to store filtered data as canonical state.

**How to avoid:**
- Keep filtering as a **derived computation** only. `boardStore.data` always holds the full unfiltered dataset. A separate `filterStore` (or slice) holds `{ status: string[], assignee: string[], category: string[] }`.
- Create a pure function `filterIssues(issues: BacklogIssue[], filters: FilterState): BacklogIssue[]` used at render time.
- DnD handlers (`handleDragStart`, `handleDragEnd`, `moveIssue`) always operate on the **unfiltered** canonical data via issue ID. Since IDs are stable regardless of filtering, `findLaneContaining(data, issueId)` works correctly.
- Rollback in `moveIssue` continues to snapshot the full unfiltered `data` -- filters reapply automatically at render time.

**Warning signs:**
- After applying a filter, dragging a card results in a no-op (card snaps back)
- Rollback after API failure shows cards that should be hidden by the active filter
- `findLaneContaining` returns null for a card that is visible on screen

**Phase to address:**
Filtering phase (Phase 1). This architectural decision must be made first because sorting, reorder, and multi-select all depend on the same canonical-vs-derived data split.

---

### Pitfall 2: SortableContext Items Array Diverges from Rendered Cards

**What goes wrong:**
`SortableContext` in Lane.tsx currently receives `issueIds = issues.map(i => i.id)`. When filtering hides some cards or sorting reorders them, this `items` array must exactly match the rendered card elements in count and order. If there is any mismatch -- e.g., `items` is `[1, 2, 3, 4, 5]` but only cards `[1, 3, 5]` are rendered because 2 and 4 are filtered out -- @dnd-kit looks for DOM nodes that do not exist, causing measurement failures and broken collision detection.

**Why it happens:**
@dnd-kit's SortableContext uses the `items` array to compute sort indices and collision rectangles. Each ID in the array must correspond to a rendered `useSortable` node. Orphaned IDs in the array cause dnd-kit to silently fail collision detection for that lane.

**How to avoid:**
- Create a single pipeline function: `getVisibleIssues(issues, filters, sortConfig) => BacklogIssue[]`.
- Use its output for **both** the rendered cards and the `SortableContext items` prop.
- Never compute items independently from rendered cards.
- In Lane.tsx: `const visibleIssues = getVisibleIssues(issues, filters, sort); const itemIds = visibleIssues.map(i => i.id);` then render `visibleIssues` as cards and pass `itemIds` to `SortableContext`.

**Warning signs:**
- Console warnings about missing sortable nodes
- Cards animate to wrong positions during drag
- Collision detection works in unfiltered view but breaks after applying a filter
- Empty lanes that should have visible cards (filter miscalculation)

**Phase to address:**
Filtering phase (Phase 1), reinforced in Sorting phase (Phase 2). Every feature that changes visible cards must flow through the same pipeline.

---

### Pitfall 3: Optimistic Bulk Move Creates Cascading Rollback Disaster

**What goes wrong:**
Multi-select bulk move (e.g., 5 selected cards from Lane A to Lane B) fires 5 separate `updateIssueMilestone` API calls. The current `moveIssue` captures `snapshot = get().data` before the move and uses it for rollback. For bulk: if call 3 of 5 fails, `set({ data: snapshot })` reverts ALL 5 cards to pre-move state, even though calls 1 and 2 succeeded on the server. The UI now shows all 5 in Lane A, but the server has cards 1 and 2 in Lane B. State is permanently desynchronized.

Additionally, the `update_milestone` Rust function does a GET-then-PATCH for each issue (to preserve non-prefix milestones). For 5 cards, that is 10 API calls against the 150 update requests/minute limit.

**Why it happens:**
The v1.0 rollback pattern (full snapshot replacement) works for single-card moves but is fundamentally broken for multi-card operations. Each subsequent API call operates on progressively staler state if any preceding call modified the data.

**How to avoid:**
- **Sequential execution with per-item tracking**: Apply all moves optimistically in one state update. Execute API calls sequentially (not parallel -- rate limits). Track success/failure per card.
- **No full-snapshot rollback for bulk**: On failure of card N, keep cards 1..N-1 as moved (they succeeded on server), revert card N and cards N+1..end (unsent). Then trigger `fetchBoard()` to resync.
- **Progress UI**: Show "Moving 3/5..." progress indicator. On partial failure, show "3 moved, 2 failed" with details.
- **Rate limit guard**: With 150 update req/min and each bulk-move card needing 2 API calls (GET + PATCH), cap bulk selection at ~20 cards (40 API calls, well within the rate limit window). Show a warning if the user selects more.
- **Post-operation resync**: After any bulk operation, always call `fetchBoard()` to ensure UI matches server truth.

**Warning signs:**
- After a bulk move error, card counts don't add up (some cards appear in neither lane)
- After a bulk move, manual refresh shows different layout than pre-refresh
- 429 errors in logs during bulk operations
- UI freezes during bulk move (blocking sequential API calls without async handling)

**Phase to address:**
Multi-select phase (Phase 4). This is the hardest phase architecturally -- must come after filtering, sorting, and intra-lane reorder are stable.

---

### Pitfall 4: Intra-Lane Reorder Triggers False Positives During Cross-Lane Drag

**What goes wrong:**
Currently, `handleDragEnd` in Board.tsx only acts when `fromLaneId !== toLaneId` (inter-lane move). Adding intra-lane reorder means `fromLaneId === toLaneId` with `active.id !== over.id` must trigger a reorder. But during a cross-lane drag, the card passes over sibling cards in the source lane before leaving it. With `SortableContext` + `verticalListSortingStrategy` already present in Lane.tsx, dnd-kit may fire `onDragOver` events with `over.id` pointing to sibling cards in the source lane, triggering false intra-lane reorders before the card even leaves the lane.

**Why it happens:**
The Lane component already wraps cards in `SortableContext` with `verticalListSortingStrategy`. This is inert in v1.0 because `handleDragEnd` ignores same-lane drops. But once intra-lane reorder is enabled, every `onDragOver` where `over.id` is a sibling card in the same lane becomes a potential reorder event. The user intends to drag to another lane, but the card first passes over siblings.

**How to avoid:**
- **Handle reorder only in `onDragEnd`, not `onDragOver`.** When `fromLaneId === toLaneId` and `active.id !== over.id` in `onDragEnd`, apply `arrayMove` to reorder. This means no live-preview of reorder position during drag, but it eliminates false triggers entirely.
- **Alternative (with live preview):** Track `hasLeftSourceLane` flag. Set it to true when `onDragOver` detects the card over a different lane's item/container. Once true, ignore same-lane sort events for the rest of the drag. Reset on `onDragEnd`.
- **Do NOT apply `arrayMove` in `onDragOver`** for same-container reorders unless you implement the `hasLeftSourceLane` guard. The current `closestCorners` collision detection is too aggressive for distinguishing "reorder intent" from "passing through."

**Warning signs:**
- Cards in the source lane shuffle when dragging a card toward another lane
- After dropping in a different lane, the source lane's order has changed
- Flickering card positions during cross-lane drag near the source lane boundary

**Phase to address:**
Intra-lane reorder phase (Phase 3). Must be carefully integrated with the existing inter-lane DnD in Board.tsx.

---

### Pitfall 5: Local Sort Order Lost on Every Data Refresh

**What goes wrong:**
Intra-lane reorder is "local persistence" -- no API backing, saved to `plugin-store`. After a user reorders cards, `fetchBoard()` runs (manual refresh, or after a milestone move), returns Backlog's default order, and `set({ status: 'loaded', data, ... })` replaces the entire `boardStore.data`, destroying local order. New cards from the API that were not in the local order map have no defined position.

**Why it happens:**
The current `fetchBoard` action does `set({ data })` with the raw API response, replacing all state. There is no merge step. Local sort order exists as supplementary metadata outside `boardStore.data`, but without a merge strategy, any refresh destroys it.

**How to avoid:**
- Store local order in a **separate structure**: `{ [laneId]: number[] }` mapping lane IDs to ordered arrays of issue IDs. Persist to `plugin-store`.
- After `fetchBoard()` completes, apply a **merge**: for each lane, take the local order array, filter out IDs that no longer exist in that lane, append new IDs (from API response) that are not in the local order (at the end).
- On inter-lane move, update local order for both source lane (remove ID) and target lane (append ID).
- When a sort mode (assignee/due date) is active, **disable manual reorder**. Sorting and manual reorder are mutually exclusive. The UI should clearly indicate which mode is active.
- Provide a "reset order" action per lane to clear local customization.

**Warning signs:**
- User reorders cards, clicks refresh, and order reverts to API default
- New cards from API are missing from the view (they exist in data but not in the local order map, and the rendering code only shows cards in the local order)
- After moving a card between lanes, the card does not appear in the target lane's local order

**Phase to address:**
Intra-lane reorder phase (Phase 3). The merge strategy must be designed before implementing the persistence.

---

### Pitfall 6: @dnd-kit Has No Native Multi-Select Drag Support

**What goes wrong:**
Developers assume @dnd-kit supports dragging multiple items and try to pass multiple IDs to `useSortable`, create multiple concurrent drag operations, or render multiple `DragOverlay` instances. None of these work. @dnd-kit fundamentally supports one active draggable item at a time. Attempting workarounds causes "Maximum update depth exceeded" errors or silent failures.

**Why it happens:**
[@dnd-kit Issue #120](https://github.com/clauderic/dnd-kit/issues/120), open since 2021 and still unresolved, confirms multi-select drag is not supported. The `useSortable({ id })` API takes a single ID. The `DragOverlay` renders one overlay. The `DndContext` tracks one `active` item.

**How to avoid:**
- Use the **Atlassian/Trello pattern**: user selects multiple cards (Ctrl+click / Shift+click), then drags any one of them. The `DragOverlayCard` shows a stacked-cards visual or count badge ("3 items selected"). On `DragEnd`, move ALL selected cards to the target lane -- not just the dragged one.
- Selection state (`selectedIssueIds: Set<number>`) lives in a dedicated store slice, separate from board data.
- The existing `moveIssue` is supplemented by `moveSelectedIssues(toLaneId)` that iterates over the selected set.
- Multi-milestone cards (already DnD-disabled via `useSortable({ disabled })`) should also be non-selectable for bulk move.

**Warning signs:**
- Attempting to create multiple `useSortable` instances with the same ID
- "Maximum update depth exceeded" during drag with selected items
- Drag overlay renders the wrong card when multiple are selected
- Selected cards deselect unexpectedly during drag

**Phase to address:**
Multi-select phase (Phase 4). Implement selection mechanism first (Phase 4a), then bulk DnD (Phase 4b).

---

### Pitfall 7: Click Handler Three-Way Conflict (Selection vs. DnD vs. URL Open)

**What goes wrong:**
IssueCard currently has two competing interactions: `onClick` opens the Backlog URL, and `useSortable` listeners handle drag. Adding multi-select introduces a third: Ctrl+click for toggle selection and Shift+click for range selection. Without careful event discrimination, clicking to select opens the URL, or a short drag toggles selection.

**Why it happens:**
@dnd-kit's `useSortable` attaches pointer event listeners (`...listeners`) to the card. The existing `onClick` fires after a pointer-up that was not a drag (distance < 5px). Modifier key detection must happen in the same `onClick` handler, before the URL-open logic. But `onClick` fires after the dnd-kit listeners have already processed the event, creating timing issues.

**How to avoid:**
- **Modifier key discrimination in onClick**: `if (e.ctrlKey || e.metaKey) { toggleSelection(issue.id); e.stopPropagation(); return; }` and `if (e.shiftKey) { rangeSelect(issue.id); e.stopPropagation(); return; }` before the URL-open logic. This is the standard pattern used by Finder, Jira, and Trello.
- DnD listeners remain on the card element -- the PointerSensor's `activationConstraint: { distance: 5 }` naturally separates click (< 5px movement) from drag (>= 5px).
- When at least one card is selected (selection mode active), consider changing default click to toggle selection, with a dedicated "open in browser" icon button. This avoids the confusing "click to deselect also opens the URL" scenario.
- Ensure `e.stopPropagation()` is called for selection clicks to prevent event bubbling to parent DndContext handlers.

**Warning signs:**
- Ctrl+click opens the URL instead of selecting the card
- Dragging a card toggles its selection state on drop
- Shift+click selects a range AND opens the URL
- Selection state changes during drag operations

**Phase to address:**
Multi-select phase (Phase 4). The click handler refactoring must be designed before implementing selection.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store filtered data as canonical state | Simpler component code | Rollback/refresh destroys hidden cards, DnD state desyncs | Never |
| Parallel API calls for bulk move | Faster bulk operation completion | Backlog 150 update/min rate limit hit, partial failure chaos | Never for this API |
| Local sort order in useState (not plugin-store) | Quick prototype | Lost on any component unmount/remount, not persisted | Only for initial prototype, replace before merge |
| Single snapshot rollback for bulk operations | Reuse existing moveIssue pattern unchanged | Server-UI desync on partial failure | Never for multi-card operations |
| Apply arrayMove in onDragOver for intra-lane sort | Smooth live-preview reorder | False reorders during cross-lane drags, flickering | Only with hasLeftSourceLane guard implemented |
| Filter options computed on every render | No memoization boilerplate | Sluggish filter dropdown on 200+ cards | Acceptable for MVP if cards < 100, must memoize for scale |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Backlog PATCH + bulk move | Parallel PATCH calls hitting 150/min rate limit | Sequential calls with X-RateLimit-Remaining monitoring; stop on approaching limit |
| Backlog PATCH + milestoneId[] in bulk | Using stale milestone data from first fetch for all PATCHes | Re-fetch issue or batch-fetch all issues before PATCH sequence starts |
| SortableContext + filter | Passing unfiltered items array while rendering filtered cards | Derive both from single `getVisibleIssues()` pipeline |
| SortableContext + sort | Passing unsorted items array while rendering sorted cards | Same pipeline: filter then sort, use result for both items and render |
| closestCorners + empty-after-filter lanes | Lane has useDroppable but SortableContext has zero items; collision detection may miss the lane | Verify empty-lane droppability after filter (already have useDroppable on lane container -- should work, but test explicitly) |
| plugin-store + rapid reorder writes | Writing on every drag event (many rapid writes) | Debounce writes to plugin-store (500ms after last reorder) |
| Zustand selectors + filter state | Creating new filter function on every render | Memoize selectors with `useShallow` or stable references |
| DragOverlay + multi-select | Rendering standard DragOverlayCard for multi-select drag | Check `selectedIssueIds.size > 1` in DragOverlay and render count badge |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-rendering all 7 lanes on filter toggle | Visible lag when clicking filter checkbox | `React.memo` on Lane component; filter selector returns stable reference when filter result unchanged | 50+ cards across lanes |
| Recomputing memberBreakdown for filtered views | LaneHeader sluggish during filter change | `useMemo` keyed on filtered issues array identity | 100+ cards with frequent filter toggling |
| Synchronous plugin-store writes during reorder | UI micro-freeze on each drag | Async write with 500ms debounce | Rapid consecutive reorders |
| Computing unique filter options (assignees/statuses/categories) on every render | Filter dropdown opens slowly | Cache option lists; invalidate on fetchBoard only | 200+ unique assignees or categories |
| Rendering large selection set highlights | Jank when selecting 20+ cards via Shift+click | Batch selection state updates; use CSS class toggle instead of re-render | 30+ selected cards |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing filter preferences with raw user/assignee data | Minor privacy concern if plugin-store file is shared | Store assignee IDs (not names) in filter preferences; resolve names at render time |
| Not validating issue IDs before bulk move | Stale IDs cause 404 errors on PATCH; confusing error messages | Validate all IDs exist in current boardStore.data before API calls |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Filter hides all cards in a lane, lane appears empty | User thinks data is missing | Show "N件のカードがフィルタで非表示" in empty-after-filter lanes |
| No visual indicator that filter is active | User forgets filter is on, wonders why cards are missing | Active filter chip/badge near board header; one-click "clear all filters" |
| Sort and manual reorder conflict silently | User reorders cards, then activating sort overrides silently | Disable manual reorder when sort active; show clear mode indicator |
| No progress feedback during bulk move | User doesn't know if bulk operation is in progress or frozen | Progress indicator "3/5 moved"; disable board interaction during bulk |
| Shift+click range includes hidden (filtered) cards | User selects range that moves cards they cannot see | Range selection operates only on visible (post-filter) card list |
| Drag overlay doesn't indicate multi-select count | User drags one card, doesn't realize others will also move | Stacked card visual or badge "3件選択中" on DragOverlay |
| No keyboard shortcut to clear selection | Deselecting requires clicking empty space | Escape clears selection; show "Esc to deselect" hint when cards selected |
| Sorting resets on refresh without indication | User sets sort, refreshes, sort reverts to default | Persist sort preference in plugin-store; restore on load |

## "Looks Done But Isn't" Checklist

- [ ] **Filtering:** Filter state survives `fetchBoard()` refresh -- verify filter remains active after data reload
- [ ] **Filtering:** Empty-after-filter lanes show informative message, not just EmptyLane placeholder
- [ ] **Filtering:** LaneHeader issue count and memberBreakdown reflect **filtered** card count, not total
- [ ] **Filtering:** DnD still works correctly with filter active (drag a visible card, it moves to correct lane)
- [ ] **Sorting:** Sort is stable -- cards with identical sort keys maintain consistent relative order across re-renders
- [ ] **Sorting:** Sort direction (asc/desc) indicator visible; clicking sort field toggles direction
- [ ] **Sorting:** Changing sort field does not clear active filters
- [ ] **Sorting:** Sort preference persists across app restart
- [ ] **Intra-lane reorder:** Order persists across app restart via plugin-store
- [ ] **Intra-lane reorder:** Order survives fetchBoard() refresh (merge strategy correctly handles new/removed cards)
- [ ] **Intra-lane reorder:** Manual reorder is disabled/hidden when sort mode is active
- [ ] **Intra-lane reorder:** Multi-milestone cards (DnD disabled) still display in their correct local-order position
- [ ] **Intra-lane reorder:** Cross-lane drag does not accidentally reorder source lane
- [ ] **Multi-select:** Selection clears after successful bulk move completes
- [ ] **Multi-select:** Escape key clears selection
- [ ] **Multi-select:** Selected cards from multiple different lanes all move to the drop target lane
- [ ] **Multi-select:** Multi-milestone cards cannot be selected for bulk move
- [ ] **Multi-select:** Partial failure UI shows which specific cards failed
- [ ] **Multi-select:** Board resyncs with server (fetchBoard) after bulk operation

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Filtered view breaks DnD state | LOW | Call `fetchBoard()` to resync; filters reapply automatically from separate filter state |
| SortableContext items mismatch | LOW | Fix the derived computation pipeline; no data loss |
| Bulk move partial failure desync | MEDIUM | Call `fetchBoard()` to resync with server; show user summary of succeeded/failed cards |
| Intra-lane order lost on refresh | LOW | User re-reorders manually, or use "reset order" to clear and start fresh |
| Local sort order file corrupted | LOW | Delete the plugin-store entry for lane orders; cards revert to API default order |
| Click handler conflicts | LOW | Refactor event handler priority; add e2e test for each interaction mode |
| Rate limit hit during bulk move | MEDIUM | Wait 60 seconds for rate limit reset; retry failed cards or do full resync |
| False intra-lane reorder during cross-lane drag | LOW | Order reverts on next fetchBoard; implement hasLeftSourceLane guard |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Filtered view corrupts DnD (P1) | Phase 1 (Filtering) | Test: apply filter, drag visible card, verify it moves correctly and hidden cards are unaffected |
| SortableContext items mismatch (P2) | Phase 1 + Phase 2 | Test: filter cards, verify SortableContext items count equals rendered card count per lane |
| Bulk move cascading rollback (P3) | Phase 4 (Multi-select) | Test: mock API failure on 3rd of 5 cards; verify cards 1-2 stay moved, cards 3-5 revert |
| Intra-lane vs cross-lane conflict (P4) | Phase 3 (Reorder) | Test: drag card past siblings toward another lane; verify source lane order unchanged after drop |
| Local order lost on refresh (P5) | Phase 3 (Reorder) | Test: reorder cards, call fetchBoard, verify custom order persists; add new card via API, verify it appends |
| No native multi-select DnD (P6) | Phase 4 (Multi-select) | Test: select 3 cards, drag one, verify all 3 move and DragOverlay shows count |
| Click handler conflicts (P7) | Phase 4 (Multi-select) | Test: Ctrl+click selects without URL open; plain click opens URL; drag moves without selecting |

## Sources

- [@dnd-kit Issue #120: Multi-select drag support](https://github.com/clauderic/dnd-kit/issues/120) -- No built-in support confirmed, open since 2021
- [@dnd-kit Issue #1188: Sorting too complicated](https://github.com/clauderic/dnd-kit/issues/1188) -- Cross-container sort complexity
- [@dnd-kit Issue #833: Async reordering and drop animation](https://github.com/clauderic/dnd-kit/issues/833) -- Reorder timing issues
- [@dnd-kit Issue #1421: Too many re-renders in multiple containers](https://github.com/clauderic/dnd-kit/issues/1421) -- Performance with multiple SortableContexts
- [@dnd-kit Discussion #1313: Multiple draggable elements](https://github.com/clauderic/dnd-kit/discussions/1313) -- Community workarounds for multi-drag
- [@dnd-kit SortableContext Docs](https://docs.dndkit.com/presets/sortable/sortable-context) -- Items array must match rendered nodes
- [@dnd-kit Collision Detection Docs](https://docs.dndkit.com/api-documentation/context-provider/collision-detection-algorithms) -- Custom collision strategies
- [Backlog API Rate Limit](https://developer.nulab.com/docs/backlog/rate-limit/) -- 150 update req/min, per-user not per-key
- [Backlog API Update Issue](https://developer.nulab.com/docs/backlog/api/2/update-issue/) -- milestoneId[] full-array replacement
- [Zustand Stale Closure Discussion #1394](https://github.com/pmndrs/zustand/discussions/1394) -- Use getState() in action handlers
- [Zustand Stale Closure Discussion #784](https://github.com/pmndrs/zustand/discussions/784) -- Closure pitfalls
- Codebase analysis: `boardStore.ts` (moveIssue rollback pattern), `Board.tsx` (DnD handler structure), `Lane.tsx` (SortableContext usage), `IssueCard.tsx` (click handler + useSortable), `client.rs` (rate limiting + milestone preservation)

---
*Pitfalls research for: mileboard v1.1 -- filtering, sorting, intra-lane reorder, multi-select bulk move*
*Researched: 2026-04-08*
