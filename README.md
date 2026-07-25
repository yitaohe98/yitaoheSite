# yitaohe-site

Personal site for **Yitao He** — technical blog and personal brand, powered by Hugo and deployed to Cloudflare Pages. Multilingual (EN / 中文).

## What it is

- **Static site generator** — Hugo
- **Content** — Markdown in `content/` (one folder per language: `zh`, `en`)
- **Layouts** — Hugo templates in `layouts/` (partials for header, footer, head-meta, blog-card)
- **Assets** — CSS, JS, favicon, and `robots.txt` in `static/`
- **i18n** — UI strings in `i18n/` (en.toml, zh-cn.toml, zh.toml for language switcher and nav)
- **Docs** — PRD, architecture, roadmap, translation design, test cases in `docs/`
- **Guestbook** — Pages Function + D1 comments with Turnstile and Workers AI moderation
- **Util** — `util/set_default_lang.py` to switch default site language (zh/en)

## URL scheme

- **Default language (EN):** `/`, `/overview/`, `/blogs/`, `/blogs/{category}/{slug}/`, `/comments/`
- **Chinese:** `/zh/`, `/zh/overview/`, `/zh/blogs/`, `/zh/comments/`
- **Sitemap:** `/sitemap.xml` — **robots.txt:** `/robots.txt` (Allow all, points to sitemap)

## Repo structure

```text
config.toml
content/
  zh/                    # Chinese content
    _index.md
    overview/_index.md
    blogs/_index.md, blogs/{category}/{slug}/index.md
    comments/_index.md
  en/                    # English content (mirror structure)
    _index.md
    overview/_index.md
    blogs/...
    comments/_index.md
layouts/
  _default/baseof.html, list.html, single.html
  index.html             # Home page
  overview/list.html
  blogs/list.html
  comments/list.html
  partials/
    header.html, footer.html, head-meta.html, blog-card.html
static/
  css/site.css
  js/site.js
  favicon.png
  robots.txt
i18n/
  en.toml, zh-cn.toml, zh.toml   # UI strings and brand tagline
data/
  glossary.yaml          # Translation glossary (for future tooling)
util/
  set_default_lang.py    # Switch default content language (zh/en)
docs/
  v1.0prd.md
  architecture.md
  roadmap.md
  translation.md
  testcases.md
  test-results.md        # Snapshot of last automated test run
  decisions/
    001-static-first.md
    002-cloudflare-pages.md
    003-markdown-workflow.md
```

## Local development

1. [Install Hugo](https://gohugo.io/getting-started/installing/).
2. Run `hugo server` from the repo root.
3. Open the local URL Hugo prints (e.g. `http://localhost:1313`).

To change the default language (which version appears at `/`):  
`python util/set_default_lang.py zh` or `python util/set_default_lang.py en`, then restart `hugo server`.

## Deployment (Cloudflare Pages)

- Point the project at this repository.
- **Build command:** `hugo`
- **Output directory:** `public`

On `git push`, Cloudflare Pages builds and deploys the site.

The guestbook additionally requires D1, Workers AI, Turnstile, and runtime
secrets. See `docs/comments-operations.md` for setup, moderation, backup, and
restore procedures.
