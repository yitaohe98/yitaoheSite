# Test execution report

**Date:** 2026-07-24
**Branch:** `codex/comments-feature`

## Automated checks

| Check | Result |
| --- | --- |
| Hugo production build | PASS — 28 ZH pages and 27 EN pages |
| Pages Function syntax | PASS |
| Comment API unit tests | PASS — 9 tests |
| D1 migration in SQLite | PASS |
| `_routes.json` syntax | PASS |
| Backup script shell syntax | PASS |
| English guestbook markup and messages | PASS |
| Chinese guestbook markup and messages | PASS |
| Turnstile action and widget markup | PASS with Cloudflare test site key |
| Public feed uses cursor endpoint | PASS |
| Comment rendering uses DOM `textContent` | PASS |

The automated API tests cover:

- Unicode normalization and length validation.
- Honeypot rejection.
- Chinese detection and translation before moderation.
- Safe publication.
- Private `pending` storage when moderation fails.
- Unsafe rejection without comment storage.
- Approximate one-attempt-per-minute throttling before AI work.
- Cursor encoding and validation.
- Public-response field filtering and next-cursor generation.

## Requires configured Cloudflare preview

- Live D1 migration and binding.
- Real Turnstile success, expiration, and replay behavior.
- Live Workers AI translation and Llama Guard output.
- D1-console approve, hide, restore, and permanent-delete procedures.
- Remote SQL export and restore into a disposable D1 database.
- Keyboard, mobile, mainland-network, and browser accessibility checks.
- Production Pages routing and caching behavior.

Production launch should wait until the checks above pass in a Cloudflare Pages
preview environment with production-shaped bindings and test data.
