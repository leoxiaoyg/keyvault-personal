# Security

KeyVault Personal encrypts the vault on disk and keeps it on the device. It does not replace a careful machine, a strong master password, or a backup you can still open.

## What is protected

The vault file is encrypted with AES-256-GCM. The key is derived from the master password with PBKDF2-HMAC-SHA512, 100,000 iterations, a 16-byte salt, and a 32-byte key. Each save uses a fresh 12-byte IV. The authentication tag is stored with the ciphertext, so a modified file fails to decrypt.

File layout: `[Salt 16][IV 12][AuthTag 16][Ciphertext]`.

The master password is not written into the vault file. A wrong password fails GCM authentication and the vault stays locked. There is no password hint and no recovery path. If the master password is lost, the data cannot be opened.

The desktop app and the Android plugin use the same layout. The app does not upload the vault, and the source tree does not include telemetry or an account service.

Export writes a copy of the encrypted file (`.kvault`). It is not a plaintext dump.

## What you still have to assume

While the vault is unlocked, the derived key and the decrypted entries are in process memory. Locking zeroes the key buffer and drops the in-memory copy. That does not scrub every string the UI or the runtime already made. A debugger, another process with access to this process, or someone at the unlocked machine can read entries until you lock or quit.

The Electron renderer runs with `sandbox: false`. Treat the installed app like any other local program: if the OS account is compromised, the unlocked vault is too.

Copied secrets stay on the system clipboard for up to 30 seconds. The app clears the clipboard only if it still holds that same text. Locking the vault does not clear the clipboard. Anything else that can read the clipboard during that window can read the secret.

There is no idle timeout and no lock-on-minimize. You lock manually, or you quit the app.

PBKDF2 at 100,000 iterations slows offline guessing. It is not Argon2, and a weak master password can still be guessed from a stolen vault file. Use a long password you do not reuse.

Import decrypts the backup with the key of the vault that is already open. A `.kvault` from a different salt or a different master password will not merge.

Android support is experimental. Do not treat the mobile build as a reviewed daily driver yet.

This project is not a certified cryptographic product, and it does not implement the SM2/SM3/SM4 suite.

## Reporting a vulnerability

Use a [private security advisory](https://github.com/leoxiaoyg/keyvault-personal/security/advisories/new) on this repository. Do not open a public issue for an unfixed vulnerability, and do not include a real vault file.
