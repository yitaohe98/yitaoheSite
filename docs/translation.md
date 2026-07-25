# Translation & Multi-language Design

This document captures the translation and multi-language design for yitaohe.com, as discussed and aligned with the PRD. It covers UI behavior, content structure, automation, rules, and user comments.

---

## 1. Language switcher (EN/CN dropdown)

### 1.1 Goal

- A dropdown in the header with options: **EN**, **CN**, and (in the future) other languages.
- When the user selects a language, the site switches to that language and **subsequent navigation stays in that language** until they switch again.

### 1.2 Implementation (static-first)

- **No in-browser machine translation.** Each language is a separate set of pre-rendered pages.
- The dropdown is a set of **links** to the same page in another language:
  - On `/overview/` (Chinese), "EN" links to `/en/overview/`.
  - On `/en/overview/`, "CN" links back to `/overview/` (or `/zh/overview/` if using a prefix for Chinese).
- **Session persistence:** A small JS helper stores the last chosen language in `localStorage`. When the user visits `/` or a generic entry point, redirect to the preferred language version (e.g. `/en/`) so the “session” feels consistent.

---

## 2. Hugo and translation

### 2.1 What Hugo provides

- Hugo has **built-in multilingual support** but **does not translate text** for you.
- It **maps multiple content files** for the same logical page into “translations” (e.g. via `.Translations`).
- You supply the content in each language; Hugo serves the correct version by URL/language config.

### 2.2 What we supply

- **Actual CN/EN text:** Written by hand or drafted with AI (e.g. in Cursor), then human-reviewed.
- **Content layout:** One folder per language under `content/` (see below).

---

## 3. URL and content structure

### 3.1 URL strategy

- **Chinese (default):** Root paths — `/`, `/overview/`, `/blogs/...`, `/comments/`.
- **English:** Under `/en/` — `/en/`, `/en/overview/`, `/en/blogs/...`, `/en/comments/`.
- Config in `config.toml`: `[languages]` with `zh` as default and `en` with appropriate `weight` and `label`.

### 3.2 Content folders

- **One folder per language** under `content/`:

```
content/
  zh/
    overview/_index.md
    blogs/...
    comments/_index.md
  en/
    overview/_index.md
    blogs/...
    comments/_index.md
  (future: jp/, etc.)
```

- Each language folder **mirrors the same structure**. Hugo treats matching paths across languages as translations of the same page.

---

## 4. Keeping languages in sync

### 4.1 Same path + translationKey

- For every post, use the **same slug and path** in every language:
  - `content/zh/blogs/system-design/distributed-rate-limiter/index.md`
  - `content/en/blogs/system-design/distributed-rate-limiter/index.md`
- Add a **shared `translationKey`** in front matter (e.g. `translationKey: "distributed-rate-limiter-20260224"`) so we can pair and check translations programmatically.

### 4.2 Authoring workflow

1. Create or edit the **source** post (any supported language).
2. Run the sync/translation pipeline (script or API).
3. Pipeline ensures the counterpart file exists in every other language; if missing, it creates a stub and runs translation (Option B below).
4. Human reviews and publishes when ready (`draft: false`, `translationStatus: "done"`).

---

## 5. Automation: creation, check, translation

### 5.1 Option B: AI-generated translation draft

- When a new source post is created (or source is updated), the pipeline:
  - Creates/updates the source file (e.g. `content/zh/...`).
  - Ensures the corresponding file exists in each other language (e.g. `content/en/...`).
  - If the target file is missing or flagged for refresh, **calls an external translation step** (e.g. AI API or Cursor-assisted draft) to generate the body.
  - Writes the translated draft with `draft: true` and `translationStatus: "needs-review"`.
- Glossary (see below) is used during translation for consistent terminology.

### 5.2 Placeholder API / CLI

A future **content API or CLI** will:

- **Create post:** Accept section, slug, language, front matter, body. Write source file; ensure other-language files exist; trigger translation for missing/outdated targets.
- **Update post:** Update source file; optionally mark other-language versions as `needs-review` or re-run translation.
- **Check:** Validate that every `translationKey` in one language has a matching file (and optionally correct `translationKey`) in every other language; fail or warn in CI if not.

Endpoints (when implemented as HTTP API) could include:

- `POST /posts` → create post, run translation.
- `PUT /posts/{translationKey}` → update post.
- `POST /posts/{translationKey}/translate` → re-run translation for specified language(s).

---

## 6. Source language: any supported language

- Posts can be **created in any supported language** (Chinese, English, or a future language), not only Chinese.
- The **authored language** is the source; the system generates or updates translations into all other supported languages (e.g. EN → ZH, ZH → EN).
- The same path and `translationKey` are used in every language folder; the pipeline creates the source first, then creates/updates the other language versions.

---

## 7. Mixed-language content (ZH + EN in one post)

- Source posts may **mix Chinese and English** (e.g. technical terms, code, brand names, quotes).
- **Preserve target-language segments:** When translating (e.g. ZH → EN), segments that are already in the target language in the source are left unchanged in the translated output.
- **Preserve markup and code:** Code blocks, inline code, and structural Markdown are not translated; only translatable prose is.
- Additional behavior (what to preserve, how to handle mixed sentences) is defined by **translation rules** (see below).

---

## 8. Translation rules (configurable)

The system supports **configurable translation rules** applied during the automated translation step. Rules can be stored in repo config (e.g. `translation-rules.yaml` or content API config).

Examples:

| Rule | Description |
|------|-------------|
| **Preserve original language in target** | In the target-language version, keep segments already in that language unchanged (e.g. EN phrases in a ZH post remain in EN in the EN translation). |
| **Tone** | Use a specified tone (e.g. polite, formal, neutral) for the target language; may be set per language or per section. |
| **Glossary / terminology** | Use a shared glossary so that specific terms always translate the same way; glossary overrides default translation. |
| **Do not translate** | Inline code, code blocks, URLs, and specified front matter or patterns are copied as-is. |
| **Metadata** | Mark machine-translated content (e.g. `translationStatus: machine` or `needs-review`) for human review. |

---

## 9. Glossary and customized terminology

- **File:** e.g. `data/glossary.yaml`.
- **Format:** Pairs of terms per language, e.g.:

```yaml
terms:
  - key: "distributed-rate-limiter"
    zh: "分布式限流器"
    en: "distributed rate limiter"
  - key: "reliability-engineering"
    zh: "可靠性工程"
    en: "reliability engineering"
```

- The translation pipeline (and any AI or API) reads this file and **reuses these translations** so terminology is consistent across all posts. This gives **persistent, customized translations** for chosen terms.

---

## 10. UI strings (Hugo i18n)

- For **navigation, buttons, labels** (not full posts), use Hugo’s built-in i18n:
  - `i18n/en.toml`, `i18n/zh.toml`.
  - In templates: `{{ i18n "overview" }}` etc.
- This keeps UI wording consistent and in one place per language.

---

## 11. User comments

- User-generated comments arrive at runtime through the Pages Function; Hugo
  does not process or translate them.
- The English and Chinese pages share one guestbook.
- Comments are stored and displayed exactly as submitted.
- Chinese or mixed Chinese/English input is translated to English only for
  automated safety moderation. The translation is not stored or displayed.
- All guestbook controls, states, and error messages come from the regular
  Hugo i18n files.

---

## 12. Util: set default (main) language

The **default content language** controls which language is served at the root URL (`/`). It is set in `config.toml` as `defaultContentLanguage = "zh"` or `"en"`.

A small Python script in `util/` updates this value so you can switch the main page to Chinese or English without editing the config by hand.

### How to use the script

Run from the **repository root** (the directory that contains `config.toml`):

```bash
# Set Chinese as the main language (visitors to / see Chinese first)
python util/set_default_lang.py zh

# Or use cn as a shortcut for Chinese
python util/set_default_lang.py cn

# Set English as the main language (visitors to / see English first)
python util/set_default_lang.py en
```

The script rewrites the `defaultContentLanguage` line in `config.toml`. Rebuild or restart `hugo server` for the change to take effect. The dropdown and language-specific URLs (`/en/...`, etc.) are unchanged; only the root `/` behavior is affected.

---

## 13. Summary

| Topic | Approach |
|-------|----------|
| **Switcher** | EN/CN dropdown links to alternate-language URL; localStorage for preferred language. |
| **URLs** | Chinese at root; English under `/en/`; one folder per language in `content/`. |
| **Sync** | Same path + `translationKey`; automation creates/stubs and translates missing targets. |
| **Source language** | Any supported language; pipeline generates translations for all others. |
| **Mixed content** | Preserve target-language segments and code; use rules for the rest. |
| **Rules** | Configurable (tone, glossary, do-not-translate, metadata). |
| **Glossary** | `data/glossary.yaml` (or similar) for consistent terminology. |
| **Comments** | Translation in comment backend; same rules/glossary pattern. |
| **Default language** | `util/set_default_lang.py zh|en|cn` updates `defaultContentLanguage` in `config.toml`. |

This design stays **static-first** for the main site (Hugo + pre-rendered pages) and confines runtime translation to a future comment service and to dev-time/CI-time automation for posts.
