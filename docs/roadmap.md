# Roadmap

This roadmap mirrors the product roadmap defined in the v1.0 PRD.

## v1.0 ✅

- Chinese-first technical blog structure.
- Overview page implemented.
- Stable category and URL structure.

## v1.1 ✅

- UI refinements.
- Featured posts on the overview page.

## v1.2 ✅ (in progress)

- **Multi-language support (EN/中文)** — Implemented (content/zh, content/en, i18n, language switcher, default-language util).
- **Views / Likes** — Not yet; to use serverless without breaking static architecture.
- **Guestbook comments** — Implemented in source; Cloudflare D1, Workers AI,
  Turnstile, secrets, and production migration must be configured before
  launch.

## Later

- Optional: security.txt, stricter security headers.
- Optional: CSP after moving inline scripts to a single JS file.
