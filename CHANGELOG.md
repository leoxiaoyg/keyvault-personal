# Changelog

## Unreleased

- Add print preview for a plaintext paper backup. Confirm writes a PDF or PNG, then opens the system print dialog.

## 1.1.0

- Add tags on site entries, with reuse, custom tags, and list filtering.
- Keep search and tag filters independent: both must match.
- Load older vault files that have no tags.
- Bundle `@keyvault/core` into the Electron main process so the desktop app starts from a production build.
- Confirm imports, keep existing sites, and reject truncated or unreadable backups.
- Lock the vault when the window closes.
- Attach the Windows portable build to GitHub Releases on `v*` tags.

## 1.0.0

- First public desktop release: local AES-256-GCM vault, layered site/account/binding model, export/import.
