# Roadmap: mileboard

## Overview

Mileboard delivers a Tauri desktop app that displays Backlog milestones as kanban lanes and enables drag-and-drop issue reassignment. The roadmap progresses from connection foundation through a Rust API layer, then builds the read-only board, enriches it with visual detail, and finally adds the core drag-and-drop interaction with optimistic updates. Each phase delivers a verifiable capability that the next phase builds upon.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Connection Settings** - Tauri scaffold with settings form that validates and persists Backlog API connection
- [ ] **Phase 2: Backlog Data Pipeline** - Rust API client with rate limiting, milestone/issue fetching, and typed IPC bridge
- [ ] **Phase 3: Core Kanban Board** - Milestone lanes with issue cards, unassigned lane, and loading states
- [ ] **Phase 4: Board Enrichment** - Status color coding, lane header stats, member breakdown, and card-to-browser linking
- [ ] **Phase 5: Drag & Drop with Optimistic Updates** - Cross-lane drag-and-drop, milestone mutation, optimistic UI, rollback, multi-milestone handling, and error toasts

## Phase Details

### Phase 1: Foundation & Connection Settings
**Goal**: Users can configure and validate their Backlog connection, with settings persisted across app restarts
**Depends on**: Nothing (first phase)
**Requirements**: CONN-01, CONN-02, CONN-03
**Success Criteria** (what must be TRUE):
  1. User can enter API key, host URL, and project key in a settings form and receive validation feedback (success or error)
  2. User can set a milestone prefix that will be used to filter which milestones appear as lanes
  3. Connection settings survive app restart without re-entry
  4. Invalid credentials show a clear error message, not a silent failure
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Backlog API service layer: type contracts, backlogApi.ts (testConnection + fetchProjects), Vitest infrastructure
- [ ] 01-02-PLAN.md — Project scaffold and persistence: Cargo.toml plugins, Tauri capabilities, settingsStore.ts (Zustand), settingsStorage.ts, global.css tokens
- [ ] 01-03-PLAN.md — Settings UI: SettingsForm (6 states), SettingsCard, SettingsModal, App.tsx routing, human verification

**UI hint**: yes

### Phase 2: Backlog Data Pipeline
**Goal**: The Rust backend reliably fetches milestones and issues from Backlog with rate-limit awareness and exposes them to the frontend via typed IPC commands
**Depends on**: Phase 1
**Requirements**: (infrastructure -- enables Phases 3-5)
**Success Criteria** (what must be TRUE):
  1. Invoking the milestone fetch command from the frontend returns prefix-filtered milestones within the configured date range (last month through 6 months ahead)
  2. Invoking the issue fetch command returns all issues for a given milestone, including paginated results beyond the first page
  3. Invoking the unassigned issues command returns issues with no milestone in the configured project
  4. API calls respect Backlog rate limits -- sequential fetching with header-based throttling prevents 429 errors
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Core Kanban Board
**Goal**: Users see their Backlog milestones as chronological lanes with issue cards, plus an unassigned lane, with loading feedback during data fetch
**Depends on**: Phase 2
**Requirements**: BOARD-01, BOARD-02, BOARD-03, UX-01
**Success Criteria** (what must be TRUE):
  1. Milestones matching the configured prefix appear as horizontal lanes ordered chronologically from last month to 6 months ahead
  2. Issues without a milestone appear in a dedicated "Unassigned" lane
  3. Each issue card displays its key, title, status badge, assignee name, and priority indicator
  4. A loading state (skeleton or spinner) is visible while initial data is being fetched
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

**UI hint**: yes

### Phase 4: Board Enrichment
**Goal**: The board provides at-a-glance workload visibility through status colors, lane statistics, and direct linking to Backlog issues
**Depends on**: Phase 3
**Requirements**: BOARD-04, BOARD-05, BOARD-06, UX-03
**Success Criteria** (what must be TRUE):
  1. Issue cards are visually distinguished by status through color coding (e.g., open/in-progress/closed have distinct colors)
  2. Each lane header displays the total issue count for that lane
  3. Each lane header shows a member-by-member breakdown of issue counts (workload distribution)
  4. Clicking an issue card opens the corresponding Backlog issue page in the user's default browser
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

**UI hint**: yes

### Phase 5: Drag & Drop with Optimistic Updates
**Goal**: Users can reassign issues between milestones by dragging cards across lanes, with instant visual feedback and safe rollback on failure
**Depends on**: Phase 4
**Requirements**: DND-01, DND-02, DND-03, UX-02
**Success Criteria** (what must be TRUE):
  1. Dragging a card from one milestone lane to another updates the issue's milestone in Backlog
  2. The card moves instantly on drop (optimistic update) and snaps back to its original lane if the API call fails
  3. Issues assigned to multiple milestones display a warning badge, appear in the earliest-start-date lane, and cannot be dragged between lanes (only within their current lane)
  4. API failures during drag-and-drop display an error toast with a meaningful message
  5. Non-prefix milestones already assigned to an issue are preserved when the visible milestone is changed
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Connection Settings | 0/3 | Not started | - |
| 2. Backlog Data Pipeline | 0/3 | Not started | - |
| 3. Core Kanban Board | 0/3 | Not started | - |
| 4. Board Enrichment | 0/2 | Not started | - |
| 5. Drag & Drop with Optimistic Updates | 0/3 | Not started | - |
