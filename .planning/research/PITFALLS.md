# Domain Pitfalls

**Domain:** Tauri + React kanban board with Backlog API v2 integration
**Researched:** 2026-04-07

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or major production issues.

---

### Pitfall 1: milestoneId[] Full-Array Replacement Destroys Unmanaged Milestones

**What goes wrong:** The Backlog API v2 PATCH `/api/v2/issues/:issueIdOrKey` treats `milestoneId[]` as a **full replacement** of the milestone array, not an append operation. If an issue has milestones `[A, B, C]` and the app only knows about milestone `B` (because `A` and `C` are outside the prefix filter), sending `milestoneId[]=B&milestoneId[]=D` silently deletes milestones `A` and `C`. This is a data-loss scenario.

**Why it happens:** The PROJECT.md explicitly notes this: "PATCH時にmilestoneId[]は全配列を置換するため、プレフィックス以外のマイルストーンは保持が必要." Developers often forget to read-before-write when the API looks like a simple PATCH, or they cache stale milestone data and send an outdated array.

**Consequences:**
- Silent data loss of milestones outside the app's visible scope
- Users lose cross-project or non-prefixed milestone assignments with no undo
- Particularly dangerous because it produces no error -- the API returns 200 OK

**Prevention:**
1. **Always GET the issue before PATCH.** Extract the current `milestone[]` array from the response. Merge the new milestone assignment with existing milestones that fall outside the app's managed prefix.
2. **Build a `preserveExternalMilestones(currentMilestones, managedPrefix, newMilestoneId)` utility** that filters current milestones into "managed" (matching prefix) and "external" (not matching), replaces only the managed one, and returns the full merged array.
3. **Unit test this utility exhaustively** with cases: no external milestones, multiple external milestones, issue with zero milestones, issue with the target milestone already present.
4. **Never cache milestone arrays for PATCH.** Always fetch fresh before writing.

**Detection:** Compare milestone counts before/after PATCH in integration tests. Log warnings when the outgoing `milestoneId[]` array is shorter than the incoming one.

**Phase impact:** Must be addressed in the **API integration phase** (core data layer). This is the single most dangerous pitfall in the entire project.

**Confidence:** HIGH -- confirmed by PROJECT.md requirement and Backlog API documentation showing `milestoneId[]` as a "(Multiple)" parameter with full-replacement semantics.

---

### Pitfall 2: onDragOver State Updates Cause Infinite Re-render Loops

**What goes wrong:** When implementing cross-container drag (moving issues between milestone lanes), calling `setState` inside `onDragOver` creates a feedback loop. The state update triggers a re-render, which changes the DOM layout, which fires another `onDragOver` with a different collision target, which triggers another `setState`. When the dragged item is near the boundary between two lanes, `active` and `over` flip back and forth rapidly, triggering React's "Maximum update depth exceeded" error.

**Why it happens:** dnd-kit's multi-container pattern requires state manipulation in `onDragOver` to show the item in the target container during drag. But the collision detection recalculates after every render, and if the item's position is ambiguous (near a boundary), it oscillates between containers.

**Consequences:**
- App crashes with React error during drag operations
- Occurs unpredictably depending on cursor position, making it hard to catch in manual testing
- Users experience frozen UI or lost drag state

**Prevention:**
1. **Debounce `onDragOver` handler** with a ~100ms delay to prevent rapid state oscillation. Use a ref-based debounce (not a state-based one) to avoid additional re-renders.
2. **Implement custom collision detection** that filters out self-container collisions when the dragged item intersects its own current container. This prevents the flip-flop between source and target.
3. **Guard against no-op state updates.** Before calling `setState` in `onDragOver`, check if the item is already in the target container. Skip the update if nothing changed.
4. **Consider deferring visual container transfer to `onDragEnd` only.** This sacrifices the "live preview" of the item appearing in the target lane during drag, but eliminates the re-render loop entirely. For a kanban with ~7 lanes, the visual trade-off is acceptable.

**Detection:** Automated test that programmatically drags an item to the exact midpoint between two lanes. Monitor React render counts during drag operations.

**Phase impact:** Must be addressed in the **DnD implementation phase**. Cannot be deferred -- it is a show-stopper.

**Confidence:** HIGH -- documented in [dnd-kit issue #1421](https://github.com/clauderic/dnd-kit/issues/1421) and [issue #1678](https://github.com/clauderic/dnd-kit/issues/1678), confirmed across multiple reporters.

---

### Pitfall 3: Optimistic Update Flicker on Drop (State Source Conflict)

**What goes wrong:** After a drag-and-drop completes, the card briefly snaps back to its original lane for a fraction of a second before settling into the new lane. This happens because dnd-kit's internal drag state and Zustand's store state are two separate sources of truth, and they disagree during the drop-to-API-response window.

**Why it happens:** The sequence is: (1) `onDragEnd` fires, (2) dnd-kit clears its internal drag overlay, (3) Zustand state hasn't been updated yet (or the update hasn't triggered a re-render), (4) the component renders with the old Zustand state for one frame, (5) Zustand updates and the component renders correctly. The gap between steps 3 and 5 causes the flicker.

**Consequences:**
- Visually jarring "rubber-banding" effect that undermines the optimistic UI goal
- Users perceive the app as laggy or buggy despite fast actual updates
- Particularly noticeable on slower machines or when React batching delays the re-render

**Prevention:**
1. **Use a temporary local state buffer** during the mutation window. Set temp state in `onDragEnd` synchronously, pass `tempState ?? zustandState` to the render tree, clear temp state after the API call resolves or rejects. This is the pattern recommended in [dnd-kit discussion #1522](https://github.com/clauderic/dnd-kit/discussions/1522).
2. **Update Zustand state synchronously in `onDragEnd`** before the API call starts. Use `store.setState()` (not an async action) to ensure the state update is applied in the same React batch as the drop event.
3. **Use `flushSync` from react-dom** if React batching delays the state update past the dnd-kit overlay teardown.

**Detection:** Slow down network requests artificially (add 2s delay to API calls) and visually inspect drop behavior. Automate with a Playwright test that captures screenshots at 60fps during drop.

**Phase impact:** Must be addressed in the **DnD + optimistic update integration phase**. The DnD phase and API integration phase must be designed together for this to work.

**Confidence:** HIGH -- documented in [dnd-kit discussion #1522](https://github.com/clauderic/dnd-kit/discussions/1522) with confirmed solution.

---

### Pitfall 4: Backlog API Rate Limits Exhaust During Initial Load

**What goes wrong:** Loading 7 milestone lanes with their issues requires multiple API calls. If each lane triggers a separate `GET /api/v2/issues` call (and possibly `GET /api/v2/versions` for milestone metadata), the app fires ~10-15 requests in rapid succession. The Backlog API has a per-minute rate limit of **150 requests for search operations** and **600 for reads**, but recommends "minimum 1-second delays between requests" for batch operations. On the free plan, limits are likely stricter (exact numbers not published -- must query `/api/v2/rateLimit`).

**Why it happens:** Developers naturally parallelize API calls for performance. But Backlog's rate limiter is per-user (not per-API-key), meaning the desktop app shares the rate budget with any concurrent Backlog usage (browser, mobile, other tools).

**Consequences:**
- 429 Too Many Requests errors during initial data load
- Partial data displayed (some lanes loaded, others empty)
- Confusing UX where the app appears broken on first launch

**Prevention:**
1. **Implement sequential fetching with configurable delay** (start with 200ms between requests). Use the `X-RateLimit-Remaining` response header to dynamically adjust delay.
2. **Fetch milestone list first, then batch issue queries.** Use `milestoneId[]` filter parameter on `GET /api/v2/issues` to fetch issues per milestone, but execute these sequentially, not in `Promise.all`.
3. **Query `/api/v2/rateLimit` at app startup** to discover actual limits for the user's plan. Store these limits and use them to calibrate request spacing.
4. **Show per-lane loading indicators** so users see progressive loading rather than a blank screen.
5. **Implement request queue in the Rust backend** (not the frontend). The Tauri Rust layer should own the HTTP client and enforce rate limiting centrally, preventing the frontend from accidentally firing parallel requests.

**Detection:** Monitor `X-RateLimit-Remaining` header in every response. Log warnings when remaining drops below 20% of limit. Alert on any 429 response.

**Phase impact:** Must be addressed in the **API integration phase** as a core concern of the HTTP client layer.

**Confidence:** HIGH -- rate limits confirmed via [Backlog API rate limit docs](https://developer.nulab.com/docs/backlog/rate-limit/) and [Get Rate Limit endpoint](https://developer.nulab.com/docs/backlog/api/2/get-rate-limit/) showing 150 update / 150 search / 600 read per window.

---

## Moderate Pitfalls

---

### Pitfall 5: Multiple-Milestone Issues Create Ambiguous Drag Behavior

**What goes wrong:** The PROJECT.md specifies that issues with multiple milestones should display in the earliest-start-date lane with a warning badge, and lane-to-lane DnD should be disabled for these issues. But the implementation is tricky: dnd-kit doesn't natively support "conditionally draggable based on data." If the draggable is rendered but the drop is rejected, the user sees a confusing animation of the card returning to its original position.

**Why it happens:** Developers implement the "no DnD for multi-milestone issues" rule either too late (reject in `onDragEnd`, causing a wasted drag animation) or incorrectly (disable the draggable entirely, preventing intra-lane reordering which the spec allows).

**Prevention:**
1. **Use dnd-kit's `disabled` property on `useSortable` to disable cross-container drag** but NOT intra-container drag. This requires a custom approach: allow dragging but restrict valid drop targets.
2. **Better approach: Use the `accept` property on droppable containers** combined with a data attribute on draggable items. Tag multi-milestone items with `data: { multiMilestone: true }` and have lane droppables reject items with that flag (except their own lane).
3. **Show a visual indicator immediately on drag start** (e.g., red outline, cursor change) for multi-milestone items to communicate "this cannot be moved between lanes" before the user attempts the drop.
4. **Use `onDragStart` to set a "restricted drag" mode** in Zustand state that highlights only the current lane as a valid target.

**Detection:** E2E test that creates an issue with 2+ milestones and attempts cross-lane drag. Verify the issue stays in its original lane.

**Phase impact:** **DnD implementation phase**, but depends on API data model being established first.

**Confidence:** MEDIUM -- based on dnd-kit API capabilities and the PROJECT.md requirement. Exact implementation pattern needs validation.

---

### Pitfall 6: Optimistic Rollback Loses Concurrent Edits

**What goes wrong:** User drags issue X from Lane A to Lane B. The app optimistically moves X to Lane B in Zustand. The API call fails (network error, 429, concurrent edit conflict). The app rolls back to the snapshot taken before the drag. But during the API round-trip, the user may have initiated another drag (issue Y from Lane B to Lane C). The rollback of issue X's move overwrites the optimistic state of issue Y's move, reverting both.

**Why it happens:** Naive rollback replaces the entire store state with a pre-mutation snapshot. If multiple mutations are in flight, later mutations' optimistic state is discarded when an earlier mutation rolls back.

**Consequences:**
- Visual state jumps unexpectedly
- Users lose confidence in the UI -- "I moved that card, where did it go?"
- Can create impossible states where the UI shows something different from the server

**Prevention:**
1. **Use per-issue rollback, not per-store rollback.** Instead of snapshotting the entire Zustand store, snapshot only the affected issue's position (milestoneId and lane assignment). On rollback, restore only that issue's data.
2. **Implement a mutation queue** that tracks in-flight optimistic updates. Each mutation has an ID, a target issue, and a rollback patch. Rollback applies only the relevant patch without affecting other in-flight mutations.
3. **Re-fetch the issue from the API after rollback** to ensure the displayed state matches the server state, rather than relying solely on the snapshot.
4. **Disable drag for issues with in-flight mutations** (show a spinner on the card) to prevent concurrent edits on the same issue.

**Detection:** Integration test that fires two rapid drag operations and simulates failure of the first. Verify the second drag's optimistic state is preserved.

**Phase impact:** **Optimistic update implementation phase.** Must be designed upfront, not retrofitted.

**Confidence:** HIGH -- this is a well-documented edge case in optimistic update literature. See [TkDodo's concurrent optimistic updates article](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query).

---

### Pitfall 7: Tauri IPC Serialization Overhead on Frequent Operations

**What goes wrong:** Every `invoke()` call from the React frontend to the Tauri Rust backend serializes arguments to JSON and deserializes the response from JSON. For a kanban board where users may rapidly drag multiple cards, each drag triggers at least one `invoke()` for the PATCH call. If the developer also routes reads through `invoke()` (e.g., for rate-limited sequential fetching), the serialization overhead accumulates.

**Why it happens:** Tauri's IPC uses a JSON-RPC-like protocol. Arguments and return values must be serializable to JSON. On Windows specifically, benchmarks show ~200ms for 10MB payloads through WebView2, though typical issue payloads are small (< 10KB).

**Consequences:**
- Perceived lag between drop and visual confirmation
- On Windows, the overhead is measurably worse than macOS due to WebView2 serialization characteristics
- If issue lists are large (100+ issues across 7 lanes), initial data transfer through IPC adds latency

**Prevention:**
1. **Keep IPC payloads minimal.** Do not send entire issue objects through IPC when only the milestoneId change is needed. For PATCH operations, send only `{ issueIdOrKey, milestoneIds }`.
2. **Batch initial data loading in the Rust backend.** Instead of 7 separate `invoke()` calls (one per lane), have a single Rust command `fetch_all_lane_data()` that performs all API calls in Rust and returns the combined result in one IPC round-trip.
3. **Cache in Rust, not React.** Keep the full issue data in Rust-side state (e.g., `tokio::sync::RwLock<HashMap>`) and only send display-relevant fields to the frontend.
4. **Use Tauri's event system for push updates** instead of polling via `invoke()`. After a PATCH completes on the Rust side, emit a `tauri::Event` with the updated issue data.

**Detection:** Measure round-trip time of `invoke()` calls with `performance.now()` in development. Flag any call exceeding 50ms.

**Phase impact:** **Architecture/scaffolding phase.** The decision of where to put the HTTP client (Rust vs. frontend) and what data crosses the IPC boundary must be made early.

**Confidence:** MEDIUM -- IPC overhead is real but unlikely to be the bottleneck for this app's data volumes (~100-500 issues, ~7 lanes). Confirmed via [Tauri IPC discussion](https://github.com/tauri-apps/wry/issues/767) and [performance benchmarks](https://github.com/tauri-apps/tauri/discussions/5690).

---

### Pitfall 8: Empty Lane Droppable Target Missing

**What goes wrong:** When all issues are dragged out of a milestone lane, the lane becomes empty. If the sortable container has no children, dnd-kit has no droppable targets within that container. The user cannot drag items back into the empty lane.

**Why it happens:** `SortableContext` registers droppable areas based on its children. No children means no droppable area. The container `div` itself is not automatically a drop target.

**Consequences:**
- Empty lanes become "dead zones" that cannot receive dropped items
- Users must reload the app or use the Backlog web UI to move issues back
- Particularly likely for the "Unassigned" lane, which may frequently empty out during planning

**Prevention:**
1. **Add a dedicated `useDroppable` hook on the lane container element** in addition to the `SortableContext` for its children. This ensures the lane itself is always a valid drop target, even when empty.
2. **Render a placeholder element** inside empty lanes (e.g., "Drop issues here" message) that acts as a sortable item with a special ID. Filter it out when reading state.
3. **Test explicitly with an empty lane** in every DnD test scenario.

**Detection:** E2E test: drag all items out of a lane, then attempt to drag an item back in. Verify the drop is accepted.

**Phase impact:** **DnD implementation phase.** Easy to miss, trivial to fix, but must be in the implementation checklist.

**Confidence:** HIGH -- this is a known dnd-kit pattern documented in the [official examples](https://docs.dndkit.com/api-documentation/context-provider/collision-detection-algorithms) and the [multiple containers documentation](https://deepwiki.com/clauderic/dnd-kit/4.4-multiple-containers).

---

### Pitfall 9: API Key Storage in Plain Text

**What goes wrong:** The app requires a Backlog API key for authentication. If stored in a plain JSON config file (via `tauri-plugin-store`), the API key is readable by any process on the user's machine. This is a security issue, especially for a tool intended for team use.

**Why it happens:** `tauri-plugin-store` is the easiest persistence option and appears in most Tauri tutorials. Developers default to it without considering that API keys are credentials, not preferences.

**Consequences:**
- API keys readable in plain text on disk
- Potential unauthorized access to Backlog projects
- Security-conscious organizations may reject the tool

**Prevention:**
1. **Use OS-native credential storage.** On macOS use Keychain, on Windows use Credential Manager, on Linux use Secret Service. The community `tauri-plugin-keyring` (available for Tauri 2) wraps these platforms.
2. **If `tauri-plugin-keyring` is not mature enough**, use `tauri-plugin-store` but encrypt the API key value before storage using a machine-specific key derivation (e.g., DPAPI on Windows, Keychain on macOS).
3. **Never log API keys.** Ensure error messages and debug output mask the key.
4. **Validate the API key on startup** with a lightweight API call (e.g., `GET /api/v2/space`) before attempting data loads.

**Detection:** Security review: search codebase for plain-text credential storage. Check the store file on disk for readable API keys.

**Phase impact:** **Connection settings phase.** Must be decided before implementing the settings persistence.

**Confidence:** MEDIUM -- `tauri-plugin-keyring` compatibility with Tauri 2 needs validation. The `Stronghold` plugin is being deprecated in Tauri v3, so it's not a long-term solution either. See [Tauri secure storage discussion](https://github.com/orgs/tauri-apps/discussions/7846).

---

## Minor Pitfalls

---

### Pitfall 10: Collision Detection Algorithm Mismatch for Horizontal Kanban

**What goes wrong:** The default `rectIntersection` collision detection works poorly for kanban boards where lanes are stacked horizontally. It may detect the lane container as the target rather than the correct position within the lane. The dragged card appears to "skip" positions or target the wrong lane.

**Prevention:**
1. **Use `closestCorners` instead of `closestCenter` or `rectIntersection`** for kanban layouts. The official docs recommend this specifically for stacked droppable containers.
2. **Implement a custom collision detection function** that first identifies the target lane (using `pointerWithin`) and then identifies the position within the lane (using `closestCenter` among that lane's items).
3. Base the custom collision detection on the dnd-kit `MultipleContainers.tsx` example.

**Phase impact:** DnD implementation phase.

**Confidence:** HIGH -- explicitly documented in [dnd-kit collision detection docs](https://docs.dndkit.com/api-documentation/context-provider/collision-detection-algorithms).

---

### Pitfall 11: Zustand Re-renders Entire Board on Single Issue Update

**What goes wrong:** A naive Zustand store that holds all issues in a single flat array causes every lane component to re-render when any issue changes, because the selector returns a new array reference on every state change.

**Prevention:**
1. **Structure the Zustand store by milestone lane** (e.g., `{ lanes: { [milestoneId]: Issue[] } }`), not as a flat list. Lane components select only their own data.
2. **Use Zustand's `useShallow` or custom equality functions** in selectors to prevent re-renders when unrelated data changes.
3. **Memoize lane components** with `React.memo()` and ensure props are referentially stable.
4. **For DnD operations, consider `zustand-mutative`** instead of `immer` middleware -- it is 10x faster for array operations on large datasets (5,236 ops/sec vs 255 ops/sec in 50K-array benchmarks). However, for this app's scale (~500 issues), manual spread operators are sufficient and avoid the dependency.

**Phase impact:** State management design phase (early architecture).

**Confidence:** HIGH -- standard Zustand performance pattern.

---

### Pitfall 12: Stale Closure in DnD Event Handlers

**What goes wrong:** `onDragEnd` and `onDragOver` callbacks close over stale Zustand state if defined inline or with outdated dependency arrays. The handler reads old issue positions and applies incorrect state updates.

**Prevention:**
1. **Use Zustand's `getState()` inside event handlers** instead of relying on state from `useStore()` selectors. `getState()` always returns the current state, avoiding stale closures.
2. **Wrap handlers in `useCallback` with correct dependencies**, or use refs to always hold the latest handler reference.
3. **Never read state from a selector inside `onDragEnd`** -- always use `store.getState()` for the freshest data.

**Phase impact:** DnD implementation phase.

**Confidence:** HIGH -- common React closure pitfall, amplified by dnd-kit's callback-heavy API.

---

### Pitfall 13: Backlog API Pagination Silently Truncates Results

**What goes wrong:** `GET /api/v2/issues` returns a maximum of 100 issues per request by default. If a milestone has more than 100 issues, the app silently shows an incomplete list without any indication to the user.

**Prevention:**
1. **Implement pagination** using `offset` and `count` parameters. Loop until fewer results than `count` are returned.
2. **Show total count in lane header** (the API returns `X-Total-Count` or similar) and compare with loaded count to detect truncation.
3. **Set `count=100` (maximum)** per request and paginate if the response contains exactly 100 items.

**Phase impact:** API integration phase.

**Confidence:** MEDIUM -- Backlog API pagination behavior confirmed in [issue list docs](https://developer.nulab.com/docs/backlog/api/2/get-issue-list/), but exact max per page needs validation.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Connection settings | API key in plain text (Pitfall 9) | Use OS-native credential storage via keyring plugin |
| API integration layer | milestoneId[] full replacement (Pitfall 1) | Read-before-write with external milestone preservation |
| API integration layer | Rate limit exhaustion (Pitfall 4) | Sequential fetching with rate limit header monitoring |
| API integration layer | Pagination truncation (Pitfall 13) | Paginate all list endpoints |
| State management design | Store structure causes full-board re-renders (Pitfall 11) | Structure store by lane, use shallow selectors |
| State management design | Stale closures in DnD handlers (Pitfall 12) | Use `getState()` in callbacks |
| DnD implementation | Infinite re-render loop on drag (Pitfall 2) | Custom collision detection + debounced onDragOver |
| DnD implementation | Empty lane dead zone (Pitfall 8) | useDroppable on lane container |
| DnD implementation | Wrong collision detection for horizontal layout (Pitfall 10) | Use closestCorners, implement custom strategy |
| DnD + multi-milestone | Ambiguous drag for multi-milestone issues (Pitfall 5) | Conditional drop acceptance + visual indicators |
| Optimistic updates | Drop flicker (Pitfall 3) | Temp state buffer during mutation window |
| Optimistic updates | Concurrent rollback destroys other edits (Pitfall 6) | Per-issue rollback patches, not full-store snapshots |
| Architecture | IPC overhead accumulation (Pitfall 7) | Batch API calls in Rust, minimize IPC payload |

---

## Sources

- [Backlog API Rate Limit Documentation](https://developer.nulab.com/docs/backlog/rate-limit/) -- HIGH confidence
- [Backlog API Get Rate Limit Endpoint](https://developer.nulab.com/docs/backlog/api/2/get-rate-limit/) -- HIGH confidence (confirmed 150 update / 150 search / 600 read limits)
- [Backlog API Update Issue](https://developer.nulab.com/docs/backlog/api/2/update-issue/) -- HIGH confidence
- [Backlog API Tips (Multiple Parameters)](https://developer.nulab.com/docs/backlog/tips/) -- HIGH confidence
- [dnd-kit Issue #1421: Too Many Re-renders in Multiple Containers](https://github.com/clauderic/dnd-kit/issues/1421) -- HIGH confidence
- [dnd-kit Issue #1678: Maximum Update Depth Exceeded](https://github.com/clauderic/dnd-kit/issues/1678) -- HIGH confidence
- [dnd-kit Discussion #1522: Item Flicker on Drop with Optimistic Updates](https://github.com/clauderic/dnd-kit/discussions/1522) -- HIGH confidence
- [dnd-kit Issue #994: Sortable Re-renders All Items](https://github.com/clauderic/dnd-kit/issues/994) -- HIGH confidence
- [dnd-kit Collision Detection Algorithms](https://docs.dndkit.com/api-documentation/context-provider/collision-detection-algorithms) -- HIGH confidence
- [dnd-kit Multiple Containers](https://deepwiki.com/clauderic/dnd-kit/4.4-multiple-containers) -- MEDIUM confidence
- [Tauri IPC Discussion (wry #767)](https://github.com/tauri-apps/wry/issues/767) -- MEDIUM confidence
- [Tauri IPC Performance Discussion](https://github.com/tauri-apps/tauri/discussions/5690) -- MEDIUM confidence
- [Tauri Stronghold Plugin](https://v2.tauri.app/plugin/stronghold/) -- HIGH confidence (noted deprecation in v3)
- [Tauri Secure Storage Discussion](https://github.com/orgs/tauri-apps/discussions/7846) -- MEDIUM confidence
- [TkDodo: Concurrent Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) -- HIGH confidence
- [Zustand Mutative Performance Benchmarks](https://github.com/mutativejs/zustand-mutative) -- MEDIUM confidence
