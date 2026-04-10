---
phase: 07-sort
reviewed: 2026-04-10T12:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/types/sort.ts
  - src/utils/sortUtils.ts
  - src/services/sortStorage.ts
  - src/stores/sortStore.ts
  - src/components/SortDropdown/SortDropdown.tsx
  - src/components/SortDropdown/SortDropdown.module.css
  - src/components/FilterBar/FilterBar.tsx
  - src/components/FilterBar/FilterBar.module.css
  - src/components/Board/Board.tsx
  - src/App.tsx
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-04-10T12:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 7 adds sort functionality to the mileboard kanban board. The implementation is well-structured: clean type definitions (`SortConfig`, `SortField`, `SortDirection`), an immutable pure sorting function (`applySortToIssues`), plugin-store persistence with input validation, a Zustand store, an accessible SortDropdown component with keyboard navigation, FilterBar integration, and Board.tsx sort pipeline.

Overall quality is high. The code follows project conventions (immutability, Unicode-only icons, CSS Modules with design tokens, Japanese UI labels). The sort pipeline correctly composes with the existing filter pipeline in `Board.tsx`. The `applySortToIssues` function properly handles null values by pushing them to the end regardless of direction, with secondary keyId sort for stability.

Two issues were found: one warning regarding unhandled promise rejections from fire-and-forget async calls, and one info-level observation about the direction toggle being clickable when sort is disabled.

## Warnings

### WR-01: Unhandled promise rejection from fire-and-forget saveSortConfig

**File:** `src/stores/sortStore.ts:19,25`
**Issue:** Both `setField` and `toggleDirection` call `saveSortConfig()` without awaiting or catching the returned promise. If the Tauri plugin-store fails (e.g., disk write error, store corruption), this produces an unhandled promise rejection. In Tauri/WebView contexts, unhandled rejections can surface as console errors or, depending on environment configuration, crash the renderer process.
**Fix:** Add a `.catch()` handler to log errors gracefully. The state update itself is synchronous and should not be blocked, so fire-and-forget is the right pattern -- just add error handling:
```typescript
setField: (field) => {
  set({ field });
  saveSortConfig({ field, direction: get().direction }).catch((err) => {
    console.error('ソート設定の保存に失敗しました', err);
  });
},

toggleDirection: () => {
  const next = get().direction === 'asc' ? 'desc' : 'asc';
  set({ direction: next });
  saveSortConfig({ field: get().field, direction: next }).catch((err) => {
    console.error('ソート設定の保存に失敗しました', err);
  });
},
```

## Info

### IN-01: Direction toggle is interactive when sort field is 'none'

**File:** `src/components/FilterBar/FilterBar.tsx:83-90`
**Issue:** The direction toggle button applies `directionInactive` styling (grayed out, `cursor: default`) when `sortField === 'none'`, correctly signaling it has no effect. However, the `onClick={toggleDirection}` handler still fires, toggling and persisting the direction value even though no sort is active. This is not a bug (the persisted direction will be applied once a sort field is selected), but it is a minor UX inconsistency -- the button appears disabled but responds to clicks.
**Fix:** Optionally add `disabled` attribute when sort is inactive to make the visual state match the interactive state:
```tsx
<button
  type="button"
  className={`${styles.directionToggle} ${sortField !== 'none' ? styles.directionActive : styles.directionInactive}`}
  onClick={toggleDirection}
  disabled={sortField === 'none'}
  aria-label={sortDirection === 'asc' ? '降順に切り替え' : '昇順に切り替え'}
>
  {sortDirection === 'asc' ? '\u2191' : '\u2193'}
</button>
```

---

_Reviewed: 2026-04-10T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
