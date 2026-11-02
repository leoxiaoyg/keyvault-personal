# Roadmap

Public work board for this repository. Open items should also exist as GitHub Issues after a `v*` release.

## Done

- Local AES-256-GCM vault, site → account → binding model
- Windows portable build and CI
- Entry tags, tag filter, search AND tag
- Bundle `@keyvault/core` into the Electron main process
- Import merge checks for truncated / foreign-password backups

## Open

1. **Android device interop** — install a debug APK on a phone, then import/export `.kvault` both ways with tags intact. Until that passes, Android stays experimental.
2. **macOS / Linux packages** — Windows portable `.exe` is the supported binary. Other desktops are source-only.
3. **Idle lock** — the vault now locks on window close. It still does not lock on idle or minimize.
4. **Tag admin** — no rename, delete, or color. Entries keep at most three tags.

## Out of scope

Cloud sync, accounts, payments, telemetry, and a SM2/SM3/SM4 suite.
