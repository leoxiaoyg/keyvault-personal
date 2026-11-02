# Test plan

## Automated

`npm test` covers vault-core:

- encrypt / decrypt round-trip
- wrong password, flipped ciphertext, flipped auth tag
- lock wipes in-memory access
- tag trim, case-insensitive dedupe, max 3
- legacy entries without tags
- import merge with the same key, including tags
- reject truncated backup, different salt, different password
- documented header lengths (must stay aligned with Android)

Desktop production build: `npm run build`.

CI (`.github/workflows/ci.yml`) runs tests on Ubuntu and the desktop build on Windows. A `v*` tag also packages the portable `.exe` and attaches it to the GitHub Release.

## P0 smoke (desktop)

1. Create a vault with a long master password.
2. Add an entry with one account and one tag. Save. The card shows the tag.
3. Add a second entry with a different tag. Filter by tag. Only matching cards remain.
4. Keep a tag filter on, search a username that exists under another tag. Result is empty.
5. Export `.kvault`. Import it into the same vault. Existing sites stay; new sites are added.
6. Import a truncated or foreign-password backup. The vault stays unchanged and shows an error.
7. Close the window. Re-open. Unlock is required.

## P0 smoke (Android, still experimental)

1. Build a debug APK (`docs/ANDROID-PACKAGING.md`).
2. Create a vault on desktop, export `.kvault`.
3. Import on the phone with the same master password. Tags and accounts survive.
4. Edit a tag on the phone, export, import back on desktop.

Until those four steps pass on a physical device, keep the Android status as experimental.
