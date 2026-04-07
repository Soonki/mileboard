# Requirements: mileboard

**Defined:** 2026-04-07
**Core Value:** Milestone-to-milestone issue drag-and-drop for fast team planning adjustment

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Connection

- [ ] **CONN-01**: User can enter API key, host, and project key and validate the connection
- [ ] **CONN-02**: Connection settings are persisted locally and survive app restarts
- [ ] **CONN-03**: User can set a milestone filter prefix

### Board Display

- [ ] **BOARD-01**: Prefix-matching milestones appear as chronological lanes (last month through 6 months ahead)
- [ ] **BOARD-02**: Issues without a milestone appear in an "Unassigned" lane
- [ ] **BOARD-03**: Each issue card displays key, title, status badge, assignee, and priority
- [ ] **BOARD-04**: Cards are color-coded by status for visual distinction
- [ ] **BOARD-05**: Lane headers display total issue count
- [ ] **BOARD-06**: Lane headers display member-by-member issue count breakdown

### Drag & Drop

- [ ] **DND-01**: Dragging a card between lanes changes the issue's milestone in Backlog
- [ ] **DND-02**: Optimistic UI update on drop with rollback to original lane on API failure
- [ ] **DND-03**: Multi-milestone issues display in earliest-start-date lane with warning badge and cross-lane DnD disabled

### UX

- [ ] **UX-01**: Loading state displayed during initial data fetch
- [ ] **UX-02**: Error toast displayed on API failure
- [ ] **UX-03**: Clicking a card opens the Backlog issue in the default browser

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Filters

- **FILT-01**: User can filter cards by assignee

### UX Polish

- **UXP-01**: Lanes can be collapsed to show header only
- **UXP-02**: Lane headers display milestone start/end dates
- **UXP-03**: Drop zones and insertion points highlight visually during drag

### Power Features

- **PWR-01**: Cards within a lane can be sorted by priority, status, etc.
- **PWR-02**: Multiple cards can be selected and bulk-moved to another milestone

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Status filter | Assignee filter is sufficient. Revisit in v3 |
| Priority filter | Assignee filter is sufficient. Revisit in v3 |
| Keyboard DnD | Accessibility improvement but not needed for MVP/v2 |
| Auto-refresh (polling) | Manual reload is sufficient. Revisit in v3 |
| Keyword search | ~7 lanes is visually scannable |
| Connection profile switching | Single-project operation assumed |
| Issue CRUD | Backlog native UI handles this. Card click navigates there |
| Status column view (traditional kanban) | Backlog native feature. Mileboard's value is milestone lanes |
| WIP count / WIP limit warnings | Member breakdown provides sufficient workload visibility |
| Gantt chart / timeline | Backlog native feature |
| Notifications / webhooks | Polling is sufficient for desktop app |
| Mobile support | Desktop app. Planning work happens at a PC |
| Offline mode | Live view of Backlog data. Offline editing risks conflicts |
| Comments / activity display | No value in duplicating Backlog's collaboration features |
| Custom field display | 5 core fields are sufficient |
| Multi-project unified view | Cross-project milestone conflicts are risky |
| Analytics / burndown / velocity | Backlog native feature |
| In-lane manual sort order persistence | Backlog API has no issue ordering concept. Refresh would break it |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONN-01 | Phase 1 | Pending |
| CONN-02 | Phase 1 | Pending |
| CONN-03 | Phase 1 | Pending |
| BOARD-01 | Phase 3 | Pending |
| BOARD-02 | Phase 3 | Pending |
| BOARD-03 | Phase 3 | Pending |
| BOARD-04 | Phase 4 | Pending |
| BOARD-05 | Phase 4 | Pending |
| BOARD-06 | Phase 4 | Pending |
| DND-01 | Phase 5 | Pending |
| DND-02 | Phase 5 | Pending |
| DND-03 | Phase 5 | Pending |
| UX-01 | Phase 3 | Pending |
| UX-02 | Phase 5 | Pending |
| UX-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after roadmap creation*
