# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in mileboard, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Use [GitHub's private vulnerability reporting](https://github.com/Soonki/mileboard/security/advisories/new) to submit a report
3. Include steps to reproduce, affected versions, and potential impact

We will acknowledge reports within 48 hours and aim to release patches promptly.

## Security Model

mileboard is a desktop application that connects to the Backlog REST API. Key security considerations:

- **API key storage:** Backlog API keys are stored in plaintext JSON in the OS app data directory via Tauri's `plugin-store`. This is a local desktop application — keys are not transmitted to any server other than the configured Backlog host.
- **Network:** All API calls go through the Rust backend (`tauri-plugin-http`). The frontend WebView does not make direct network requests to Backlog.
- **CSP:** A Content Security Policy restricts the WebView to loading only local resources.

## Recommendations for Users

- Use a Backlog API key with the minimum required scope
- Do not run mileboard on shared or untrusted machines
- Revoke and rotate API keys if you suspect compromise
