# External Integrations

**Project:** mileboard
**Status:** Pre-implementation (planning phase complete, no source files yet)
**Last updated:** 2026-04-07

---

## External APIs

### Backlog REST API v2

The sole external API. All calls are proxied through the Rust backend — the React frontend never makes HTTP requests directly.

**Base URL pattern:** `https://{hostUrl}/api/v2`

Where `{hostUrl}` is user-configured (e.g., `your-space.backlog.com`). Supported domains:
- `*.backlog.com`
- `*.backlog.jp`
- `*.backlogtool.com`

#### Authentication

| Method | Description | Usage in mileboard |
|--------|-------------|-------------------|
| API Key | Appended as query parameter: `?apiKey=<key>` | **Primary method** — simpler, no expiry, sufficient for a desktop app |
| OAuth 2.0 | Bearer token, expires in 3600s | Not used — adds complexity without benefit for single-user desktop context |

The API key is stored in `@tauri-apps/plugin-store` (plaintext JSON on disk per user decision D-12 in `.planning/phases/01-foundation-connection-settings/01-RESEARCH.md`). It is never logged and never passed to the frontend JavaScript context — it stays in Rust-managed state.

#### Endpoints Used

| Method | Endpoint | Purpose | Phase |
|--------|----------|---------|-------|
| `GET` | `/api/v2/users/myself` | Validate API key — returns authenticated user | Phase 1 |
| `GET` | `/api/v2/projects` | Fetch project list for settings dropdown (non-archived only) | Phase 1 |
| `GET` | `/api/v2/projects/{projectIdOrKey}/versions` | Fetch milestones (versions) — filtered by prefix and date range | Phase 2 |
| `GET` | `/api/v2/issues` | Fetch issues per milestone (paginated) or unassigned issues | Phase 2 |
| `GET` | `/api/v2/rateLimit` | Query actual rate limit thresholds for the user's Backlog plan | Phase 2 |
| `PATCH` | `/api/v2/issues/{issueIdOrKey}` | Update issue milestone assignment (DnD drop) | Phase 5 |

#### Key API Behaviors and Constraints

**`milestoneId[]` full-array replacement (CRITICAL)**
The `PATCH /api/v2/issues/:issueIdOrKey` endpoint treats `milestoneId[]` as a complete replacement, not an append. Sending only the new milestone silently destroys any existing milestone assignments outside the app's managed prefix. The Rust backend must:
1. `GET` the issue's current `milestone[]` array before every PATCH
2. Partition milestones into "managed" (matching configured prefix) and "external" (not matching)
3. Replace only the managed milestone, preserve all external milestones
4. Send the complete merged `milestoneId[]` array

Reference: `.planning/research/PITFALLS.md` Pitfall 1; `.planning/research/ARCHITECTURE.md` (Milestone Array Preservation section)

**Rate Limiting**

| Request type | Limit (approx) | Response headers |
|-------------|----------------|-----------------|
| Read operations | ~600 per window | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| Search operations | ~150 per window | Same headers |
| Update operations | ~150 per window | Same headers |

- HTTP `429 Too Many Requests` returned when limits exceeded
- Limits are **per-user** (shared across all tools the user is running)
- Exact thresholds vary by plan (Free vs Paid) — must query `/api/v2/rateLimit` at startup
- Implementation: sequential fetching with `X-RateLimit-Remaining` monitoring in `src-tauri/src/rate_limiter.rs`

Reference: `.planning/research/PITFALLS.md` Pitfall 4; [Backlog rate limit docs](https://developer.nulab.com/docs/backlog/rate-limit/)

**Pagination**
`GET /api/v2/issues` returns max 100 issues per request. Lanes with >100 issues require pagination using `offset` and `count` query parameters. The Rust backend iterates until the response count is less than `count`.

#### IPC Bridge (Frontend to Backend)

The frontend accesses the Backlog API exclusively through typed `invoke()` wrappers in `src/api/tauriBridge.ts`:

```typescript
tauriBridge.getSettings()
tauriBridge.saveSettings(settings)
tauriBridge.getMilestones(prefix, rangeStart, rangeEnd)
tauriBridge.getIssues(milestoneId)
tauriBridge.getUnassignedIssues(projectKey)
tauriBridge.updateIssueMilestone(issueIdOrKey, newMilestoneId, currentMilestoneIds)
```

These map 1:1 to Rust commands registered in `src-tauri/src/lib.rs`:
- `get_settings` / `save_settings` — `src-tauri/src/commands/settings.rs`
- `get_milestones` — `src-tauri/src/commands/milestones.rs`
- `get_issues` / `get_unassigned_issues` — `src-tauri/src/commands/issues.rs`
- `update_issue_milestone` — `src-tauri/src/commands/issue_update.rs`

Reference: `.planning/research/ARCHITECTURE.md` (Typed Tauri Bridge section)

---

## Databases / Storage

### `@tauri-apps/plugin-store` (Local Filesystem)

**Purpose:** Persistent settings storage across app restarts.

**Stored data:**
| Key | Type | Description |
|-----|------|-------------|
| `hostUrl` | `string` | Backlog space hostname (e.g., `your-space.backlog.com`) |
| `apiKey` | `string` | Backlog API key (stored plaintext per decision D-12) |
| `projectId` | `number \| null` | Selected project's numeric ID |
| `projectKey` | `string` | Selected project key (e.g., `PROJ`) |
| `milestonePrefix` | `string` | Prefix filter for milestone lanes (e.g., `Sprint-`; empty string = no filter) |

**Storage location:** JSON file in the OS app data directory (managed by Tauri). Not in localStorage — localStorage does not persist reliably across Tauri updates.

**Accessed by:**
- `src/services/settingsStorage.ts` — `loadSettings()` and `saveSettings()` functions
- `src/stores/settingsStore.ts` — Zustand store calls settingsStorage on init and save

**Rust registration:** `tauri_plugin_store::Builder::new().build()` in `src-tauri/src/lib.rs`

Reference: `.planning/phases/01-foundation-connection-settings/01-02-PLAN.md`

> **Security note:** The research identified that storing the API key in plaintext is a known limitation (see `.planning/research/PITFALLS.md` Pitfall 9). OS-native credential storage (`tauri-plugin-keyring`) was considered but its Tauri 2 compatibility was unconfirmed at research time. Plaintext storage via plugin-store was explicitly chosen by the user (decision D-12).

---

## Auth Providers

mileboard has **no authentication providers of its own**. Authentication is entirely delegated to the external Backlog API:

- Users authenticate to Backlog using their personal API key
- The API key is obtained from the user's Backlog personal settings page
- mileboard validates the key via `GET /api/v2/users/myself` on connection test
- There is no user account system, login screen, or session management within mileboard itself

---

## Webhooks / Events

### Tauri Event System (Internal)

mileboard does not use external webhooks. Internally, the Tauri event system may be used for:
- Push updates from the Rust backend to the React frontend after a PATCH operation completes
- This would use `tauri::Event` emitted from Rust and received via `listen()` in the frontend

This is an architecture option noted in `.planning/research/PITFALLS.md` (Pitfall 7) to reduce IPC round-trips — not yet committed to in the plans.

### No External Webhooks

- Backlog's webhook feature is not used
- No incoming webhook endpoints (mileboard is a desktop app with no server component)
- Real-time board updates use polling (planned as a Phase 2+ differentiator, not MVP)

---

## Third-Party Services

### Backlog (Nulab)

| Attribute | Value |
|-----------|-------|
| Provider | Nulab Inc. |
| API version | REST API v2 |
| Official docs | https://developer.nulab.com/docs/backlog/ |
| Auth docs | https://developer.nulab.com/docs/backlog/auth/ |
| Rate limit docs | https://developer.nulab.com/docs/backlog/rate-limit/ |
| Account requirement | Active Backlog account with API key access |
| Plan sensitivity | Rate limits differ between Free and Paid plans |

### OS Default Browser (via `@tauri-apps/plugin-opener`)

When a user clicks an issue card, the app constructs a Backlog issue URL and opens it in the user's default browser. This uses `@tauri-apps/plugin-opener` (Tauri's replacement for the deprecated `shell.open()`). No data is sent — the URL is simply opened.

**URL pattern:** `https://{hostUrl}/view/{issueKey}`

### No Other Third-Party Services

mileboard has no:
- Analytics or telemetry services
- Crash reporting services
- Feature flag services
- Payment services
- Email or notification services
- CDN or asset hosting (distributed as a self-contained binary)
