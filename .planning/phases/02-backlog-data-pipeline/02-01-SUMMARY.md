---
phase: 02-backlog-data-pipeline
plan: 01
status: complete
started: "2026-04-08"
completed: "2026-04-08"
---

# Plan 02-01 Summary: Rust Backlog API Client Core

## What was built

Rust-side Backlog API data fetching layer in `src-tauri/src/backlog/` module:

- **types.rs**: Serde structs (Milestone, Issue, Status, Priority, User, Category, IssueCount, MilestoneWithIssues, BoardData) with `#[serde(rename_all = "camelCase")]` matching Backlog API JSON
- **error.rs**: `BacklogError` enum with thiserror Display producing Japanese error messages. No Serialize derive — errors convert to String at IPC boundary via `.to_string()`
- **client.rs**: `BacklogClient` wrapping `reqwest::Client` (30s timeout) for HTTP connection pooling
- **mod.rs**: Module re-exports

## Key implementation details

### BacklogClient
- `fetch_board`: Orchestrates statuses → milestones → issues per milestone → unassigned issues (all-or-nothing error propagation)
- `fetch_milestones`: Prefix + date range filter, undated milestones included (both dates None → true), stable sort by startDate → releaseDueDate → id
- `fetch_all_issues`: Count-first pagination strategy (sequential, no tokio::join!)
- `fetch_unassigned_issues`: Filters by no-milestone + not-closed status + optional category
- `throttle_if_needed`: Monitors X-RateLimit-Remaining, sleeps with 10s max cap, graceful degradation on missing headers
- `validate_params`: Rejects empty host/apiKey/projectKey with InvalidInput error

### Security
- API key never appears in error messages or logs (T-02-01)
- Uses `tauri_plugin_http::reqwest` re-export (no direct reqwest dependency)

## Deviations

1. **`.json()` → `.text()` + `serde_json::from_str()`**: `tauri_plugin_http::reqwest::Response` does not expose the `.json()` method. Used text deserialization pattern instead. No functional impact.
2. **`#[allow(dead_code)]` on mod backlog**: lib.rs declares `mod backlog` but doesn't use it yet (Plan 02-02 adds commands). Temporary allow until Plan 02-02 wires it up.
3. **`#[allow(clippy::too_many_arguments)]`**: `fetch_issues_page` and `build_issue_url` have 9 params due to Backlog API filter requirements. Accepted tradeoff vs introducing a params struct for internal-only functions.

## Test results

- 38 total tests (21 client + 9 error + 8 types)
- `cargo test` — all pass
- `cargo clippy -- -D warnings` — clean
- `cargo fmt --check` — formatted

## Commits

| Hash | Description |
|------|-------------|
| d91e5ea | feat(02-01): add Backlog API types, error enum, and module structure |
| 91cef96 | feat(02-01): implement BacklogClient with rate limiting, pagination, and filtering |

## Artifacts

| Path | Provides |
|------|----------|
| src-tauri/src/backlog/types.rs | Serde structs for Backlog API data |
| src-tauri/src/backlog/error.rs | BacklogError enum with Japanese messages |
| src-tauri/src/backlog/client.rs | BacklogClient HTTP client |
| src-tauri/src/backlog/mod.rs | Module re-exports |
| src-tauri/Cargo.toml | Added thiserror, chrono, tokio dependencies |
