# Test Cases (based on v1.0 PRD)

Test cases derived from the Product Requirements Document for yitaohe.com. Use this list for manual QA, acceptance, or as a checklist before release.

---

## 1. Navigation & URL structure (PRD §4)

| ID   | Requirement / Source | Test case | Expected result |
|------|----------------------|-----------|------------------|
| N-01 | §4.1 Top-level nav   | On every page, header shows links: Overview, Blogs, Comments. | All three links visible and clickable. |
| N-02 | §4.2 URL structure    | Visit `/overview/` (or `/en/overview/`). | Overview page loads; URL matches. |
| N-03 | §4.2 URL structure    | Visit `/blogs/` (or `/en/blogs/`). | Blogs listing loads; URL matches. |
| N-04 | §4.2 URL structure    | Visit `/blogs/{category}/{slug}/` for an existing post. | Post page loads; URL matches pattern. |
| N-05 | §4.2 URL structure    | Visit `/comments/` (or `/en/comments/`). | Comments/contact page loads; URL matches. |
| N-06 | §4.2 URL structure    | Visit root `/` (and `/en/` if EN is used). | Home page loads without error. |

---

## 2. Overview page (PRD §6.1)

| ID   | Requirement / Source | Test case | Expected result |
|------|----------------------|-----------|------------------|
| O-01 | §6.1 Personal intro  | On Overview page, verify presence of a short personal introduction. | Intro text is visible and readable. |
| O-02 | §6.1 Technical focus  | On Overview page, verify a technical focus / tagline is shown. | e.g. “Systems Engineer · Distributed Systems · Reliability” or equivalent. |
| O-03 | §6.1 Featured posts   | On Overview page, a “Featured posts” (or equivalent) section exists. | Section shows 3–5 curated posts or placeholder when fewer exist. |
| O-04 | §6.1 Contact         | On Overview page, contact options are present. | GitHub and Email (or equivalent) are present; links or copy action work. |
| O-05 | §6.1 Goal (10 sec)   | A new visitor opens Overview and scans the page. | Within ~10 seconds they can tell who you are and what you focus on. |

---

## 3. Blogs listing (PRD §6.2)

| ID   | Requirement / Source | Test case | Expected result |
|------|----------------------|-----------|------------------|
| B-01 | §6.2 Chronological   | Open Blogs listing; check order of posts. | Newest first (reverse chronological). |
| B-02 | §6.2 Category        | Open a post; check that it has a category (e.g. system-design, life). | Category is shown (e.g. badge or meta). |
| B-03 | §6.2 Category browse  | If category links exist, click one. | Only posts in that category are listed (or category is reflected in URL/content). |
| B-04 | §6.2 Tag filtering    | If tag links/filters exist, use one. | List filters by tag as designed. |
| B-05 | §6.2 Pagination      | If there are more posts than one page, check for “next”/“previous”. | Pagination works; page count or next/prev is correct. |

---

## 4. Blog post page (PRD §6.3)

| ID   | Requirement / Source | Test case | Expected result |
|------|----------------------|-----------|------------------|
| P-01 | §6.3 Title           | Open any blog post. | Post title is displayed clearly. |
| P-02 | §6.3 Table of Contents | Open a long post with multiple headings. | ToC is present and links scroll to correct sections (or ToC is absent for short posts). |
| P-03 | §6.3 Code highlighting | Open a post that contains a code block. | Code is visibly highlighted (or at least monospace/readable). |
| P-04 | §6.3 Prev/Next       | If implemented, open a post and use previous/next. | Navigates to the correct adjacent post. |
| P-05 | §6.3 SEO meta        | View page source of a post; check `<meta>` and `<title>`. | Title and meta description (and OG if implemented) are present and sensible. |

---

## 5. Comments page (PRD §6.4)

| ID   | Requirement / Source | Test case | Expected result |
|------|----------------------|-----------|------------------|
| C-01 | Guestbook form | Open Comments page. | Display-name field, comment field, character counters, Turnstile, and submit button are present. |
| C-02 | Public feed | Open Comments page with approved D1 records. | Approved comments load newest first; internal moderation data is absent. |
| C-03 | Bilingual UI | Compare `/comments/` and `/zh/comments/`. | All form, loading, success, pending, and error messages use the current page language. |
| C-04 | Input limits | Submit blank, whitespace-only, over-40-character name, and over-200-character comment values. | Client and server reject every invalid value. |
| C-05 | Turnstile | Submit with missing, invalid, expired, and reused tokens. | Each submission is rejected before AI moderation or comment storage. |
| C-06 | Approximate rate limit | Submit twice from one network identity during the same minute bucket. | First attempt proceeds; second receives HTTP 429 and a localized message. |
| C-07 | Chinese moderation | Submit safe Chinese text. | Text is translated to English for moderation, but the stored/public comment remains the original Chinese. |
| C-08 | Moderation failure | Make translation or moderation unavailable. | Comment is stored privately as `pending`; visitor receives the localized pending-review prompt. |
| C-09 | Unsafe content | Submit input classified as unsafe. | Request is rejected and the comment text is not stored. |
| C-10 | Cursor pagination | Load more than 20 approved comments while new comments arrive. | Older pages contain no duplicate or skipped records. |
| C-11 | Plain-text rendering | Submit HTML/script-shaped text through a test fixture. | Content is rendered with `textContent` and never executes. |
| C-12 | Moderation operations | Approve pending, hide approved, restore hidden, and permanently delete test records. | Public visibility matches each documented state transition. |

---

## 6. Content model (PRD §5)

| ID   | Requirement / Source | Test case | Expected result |
|------|----------------------|-----------|------------------|
| M-01 | §5.1 Front matter     | Add or edit a post with required front matter: title, date, description, primary_category, categories, draft. | Post builds and displays without error. |
| M-02 | §5.2 primary_category | Create a post without `primary_category`. | Build fails or validation warns (if implemented); otherwise document that it’s required. |
| M-03 | §5.2 Slugs English    | Create a post with an English slug (e.g. `my-post`). | URL is clean and readable; no broken links. |
| M-04 | §5.2 Markdown         | Write post body in pure Markdown (headings, lists, links, code). | Renders correctly (no raw Markdown visible). |

---

## 7. SEO (PRD §8)

| ID   | Requirement / Source | Test case | Expected result |
|------|----------------------|-----------|------------------|
| S-01 | §8 Sitemap           | Request `/sitemap.xml` (or language-specific sitemap). | Valid sitemap returned; main sections and posts listed. |
| S-02 | §8 RSS                | Request `/index.xml` or `/en/index.xml` (or documented RSS URL). | Valid RSS feed returned; recent posts included. |
| S-03 | §8 Meta descriptions  | Check several pages (home, overview, a post). | Each has a `<meta name="description">` (or equivalent) with sensible content. |
| S-04 | §8 Open Graph         | View source of a page; check for `og:title`, `og:description`, `og:url` (and type where relevant). | OG tags present and correct for sharing. |
| S-05 | §8 Clean URLs         | Navigate site and inspect URLs. | URLs are readable (no odd query params or IDs in paths). |

---

## 8. Non-functional (PRD §10)

| ID   | Requirement / Source | Test case | Expected result |
|------|----------------------|-----------|------------------|
| F-01 | §10 Lighthouse       | Run Lighthouse (Performance, Accessibility, Best Practices, SEO) on production or staging. | Overall score ≥ 95 (or per-category as agreed). |
| F-02 | §10 First contentful paint | Measure FCP (e.g. Lighthouse or DevTools). | FCP < 1 second on a typical connection. |
| F-03 | §10 Static-first runtime | Deploy site and use it (navigate, open posts). | Authored pages remain static; only `/api/*` invokes the guestbook Function. |
| F-04 | §10 CDN / stability   | If deployed (e.g. Cloudflare Pages), confirm CDN and availability. | Site is served via CDN; no unnecessary origin dependency. |

---

## 9. Build & workflow (PRD §7)

| ID   | Requirement / Source | Test case | Expected result |
|------|----------------------|-----------|------------------|
| W-01 | §7.1 Local preview    | Run `hugo server` from repo root. | Site builds and is served locally (e.g. localhost:1313). |
| W-02 | §7.1 Build            | Run `hugo` (no server). | `public/` (or configured output) is generated without errors. |
| W-03 | §7.2 Content in Git   | Confirm all content lives under `content/` and is committed. | No content only in a DB or external CMS for MVP. |
| W-04 | §7.2 Scoped runtime API | Search codebase for runtime API calls. | Only the guestbook uses the same-origin `/api/comments` endpoint; core site content has no runtime dependency. |

---

## 10. Multi-language (current implementation)

*These reflect the current site; PRD §9.1 describes future multi-language.*

| ID   | Description | Test case | Expected result |
|------|-------------|-----------|------------------|
| L-01 | Language switcher     | On any page, use the language dropdown (e.g. “翻译/Language”). | Dropdown opens; all languages (e.g. 中文 - Chinese, English) listed. |
| L-02 | Switch to other lang  | Select the other language from the dropdown. | Page reloads in the selected language (same section/post when applicable). |
| L-03 | EN overview           | Open `/en/overview/`. | Content and UI are in English; featured posts are English. |
| L-04 | ZH overview           | Open `/overview/` (or default language overview). | Content and UI in Chinese (or default); featured posts match language. |
| L-05 | Default language      | Visit `/` with defaultContentLanguage = zh. | Root serves Chinese home. Repeat with defaultContentLanguage = en; root serves English home. |
| L-06 | Util script           | Run `python util/set_default_lang.py en` then rebuild; visit `/`. | Default language is English. Run with `zh` and rebuild; default is Chinese. |

---

## Summary

- **Navigation & URLs:** N-01–N-06  
- **Overview:** O-01–O-05  
- **Blogs listing:** B-01–B-05  
- **Blog post:** P-01–P-05  
- **Comments:** C-01–C-12
- **Content model:** M-01–M-04  
- **SEO:** S-01–S-05  
- **Non-functional:** F-01–F-04  
- **Workflow:** W-01–W-04  
- **Multi-language:** L-01–L-06  

Total: **56 test cases** (adjust scope for MVP-only by skipping §10 or marking L-* as “post-MVP” if you treat multi-language as v1.2).
