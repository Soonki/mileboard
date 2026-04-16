# Contributing to mileboard

Thank you for your interest in contributing! This guide will help you get started.

## Reporting Bugs

1. Search [existing issues](https://github.com/Soonki/mileboard/issues) to avoid duplicates
2. Use the **Bug Report** issue template
3. Include: OS, Node.js/Rust versions, steps to reproduce, expected vs actual behavior

## Suggesting Features

1. Use the **Feature Request** issue template
2. Describe the problem being solved, not just the solution
3. Include mockups or examples if possible

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS
- A [Backlog](https://backlog.com/) account with an API key (for manual testing)

### Getting Started

```bash
git clone https://github.com/Soonki/mileboard.git
cd mileboard
npm install
```

> **Note:** Before running `npm run tauri dev`, ensure all [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) are installed for your OS. Without them, the Rust build will fail.

## Code Style

- **Immutability:** Use Zustand `set()` with spread syntax to create new objects. Never mutate state directly
- **File naming:** `PascalCase.tsx` (components), `camelCase.ts` (services), `Component.module.css` (styles)
- **Error handling:** Services return discriminated unions `{ success, data?, error? }`. UI displays Japanese error messages
- **Icons:** Unicode characters only (no icon libraries)
- **Styling:** CSS Modules only

## Testing

- **TDD approach:** Write tests first (RED), implement (GREEN), refactor (IMPROVE)
- **Coverage target:** 80%+
- **Test files:** Co-located with source (e.g. `Board.test.tsx` next to `Board.tsx`)
- **Tauri mocking:** Tauri plugins are globally mocked in `tests/setup.ts`

```bash
# Frontend tests
npx vitest run

# Rust tests
cd src-tauri && cargo test
```

## Pull Request Process

1. Fork the repository and create a feature branch from `main`
2. Follow the existing code conventions
3. Add or update tests for any changed code
4. Ensure all tests pass (frontend + Rust)
5. Fill out the PR template
6. PRs require review before merge

## Architecture Notes

- **tauriBridge:** All frontend-to-backend communication goes through `src/services/tauriBridge.ts`. Never call Tauri APIs directly from components
- **Zustand stores:** `settingsStore` for connection config, `boardStore` for issues and milestones
- **milestoneId[] preservation:** Backlog's PATCH API replaces the entire `milestoneId` array. When moving an issue, milestones outside the current prefix filter must be preserved

## Release Procedure

Releases are automated via [`.github/workflows/release.yml`](.github/workflows/release.yml). Pushing a tag matching `v*` (or manually dispatching the workflow) builds Windows NSIS + MSI installers and attaches them to a **draft** GitHub Release.

### Releasing a new version

1. **Bump the version in three files** (they must stay in sync — Tauri reads `tauri.conf.json` but the other two affect metadata / npm listing):
   - `package.json` → `version`
   - `src-tauri/Cargo.toml` → `[package] version`
   - `src-tauri/tauri.conf.json` → `version`
2. **Commit:** `chore: release v0.1.1`
3. **Tag & push:**
   ```bash
   git tag v0.1.1
   git push origin v0.1.1
   ```
4. **Wait for the `Release` workflow** (Actions tab). First-time runs take ~10-15 min (empty Rust cache), subsequent ~5-7 min. It will:
   - Build `mileboard_<version>_x64-setup.exe` (NSIS) and `mileboard_<version>_x64_en-US.msi` (MSI)
   - Create a **draft** GitHub Release named `mileboard v0.1.1` with both installers attached
5. **Verify the draft** on the Releases page:
   - Download the NSIS `.exe`, spot-check it installs and launches on a clean machine (or with the local app uninstalled)
   - Edit the auto-generated release notes if needed
6. **Publish** — *Edit* the draft Release → *Publish release*

### Re-running a release without a new tag

If the workflow fails partway or you want to regenerate installers for an existing tag, use **workflow_dispatch** from the Actions tab and enter the tag name. The existing draft Release will be updated.

### Code signing (future)

The workflow includes commented-out placeholders for `WINDOWS_CERTIFICATE` / `WINDOWS_CERTIFICATE_PASSWORD` secrets. Once a code-signing certificate is acquired, add the secrets and uncomment the env lines — no other changes needed to enable Authenticode signing.
