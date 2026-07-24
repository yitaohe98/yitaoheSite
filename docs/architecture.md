# Architecture Overview

This repository implements the v1.0 architecture for **yitaohe.com** as defined in the PRD, extended with multilingual support (EN / 中文).

## Stack

- **Static site generator**: Hugo
- **Hosting**: Cloudflare Pages (builds the Hugo site from this repo)
- **Content format**: Markdown (all posts and pages)
- **Version control**: Git (GitHub)

## Principles

- **Static-first**: all pages are generated at build time.
- **Static-first runtime**: authored pages require no application server. A
  narrowly scoped Cloudflare Pages Function and D1 database power the optional
  guestbook API under `/api/comments`.
- **Content in Git**: all posts and pages live inside `content/` and are versioned with the code.
- **Separation of concerns**:
  - `content/` holds Markdown content (per-language folders `zh/`, `en/`).
  - `layouts/` defines HTML templates and presentation; reusable pieces live in `partials/`.
  - `static/` contains static assets (CSS, JS, favicon, robots.txt).
  - `i18n/` holds UI strings and brand tagline per language.
  - `docs/` keeps product and architecture documentation.

## URL model

- **Default language** (configurable; currently EN): `/`, `/overview/`, `/blogs/`, `/blogs/{category}/{slug}/`, `/comments/`.
- **Chinese**: `/zh/`, `/zh/overview/`, `/zh/blogs/`, `/zh/comments/`.
- **Sitemap**: `/sitemap.xml`. **robots.txt**: `/robots.txt` (Allow all, Sitemap URL).

## Multilingual

- One content directory per language under `content/` (`zh`, `en`). Same structure in each; matching pages are linked via `translationKey` in front matter.
- UI strings (nav, brand tagline, section titles) come from `i18n/*.toml`. Hugo uses language key (e.g. `zh`) so `i18n/zh.toml` is used for `/zh/` pages.
- Language switcher in the header links to the same page in the other language. Default language can be changed with `util/set_default_lang.py`.
- See `docs/translation.md` for full design.

## Security and crawlers

- **robots.txt** in `static/` is copied to the site root; it allows all crawlers and points to the sitemap.
- HTTPS and security headers are the responsibility of the host (Cloudflare).
- Guestbook submissions require server-validated Turnstile, prepared D1
  statements, plain-text rendering, moderation, and an approximate per-minute
  submission limit.

## Extending the site

- **New page type**: add a section under `content/{lang}/`, then add a layout under `layouts/` (e.g. `layouts/mysection/list.html`) and a nav link in `layouts/partials/header.html`.
- **New language**: add `[languages.xx]` in `config.toml`, create `content/xx/` and `i18n/xx.toml` (and `i18n/xx.toml` if the language key differs from the file name), mirror the structure of `content/zh/` or `content/en/`.
- **UI copy**: edit the appropriate `i18n/*.toml` file.
- **Branding / layout**: edit `layouts/partials/header.html`, `footer.html`, and `static/css/site.css`.
