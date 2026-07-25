# Blog Import and Publishing Guide

This is the working guide for turning a PDF, exported conversation, rough notes,
or an English draft into a bilingual post on yitaohe.com.

When a future task says “follow the blog publishing guide,” use this file as the
source of truth. The goal is not literal translation. The goal is to publish two
versions that feel as though they were written naturally in their own language,
while preserving the same facts and point of view.

## 1. Editorial voice

The site should sound like Yitao explaining something to an interested visitor,
not like a company blog, academic report, or AI-generated summary.

Use these qualities in both languages:

- Personal, direct, and specific.
- Thoughtful without sounding grand or overly serious.
- Clear enough for a technical reader, but not filled with unnecessary jargon.
- Honest about uncertainty; do not turn assumptions into conclusions.
- Concise. Remove repetition, filler introductions, and sections that do not add
  a new idea.
- Prefer concrete details, decisions, and observations over abstract lessons.

Do not invent facts, experiences, numbers, motivations, or conclusions to make a
story smoother. If the source is ambiguous, preserve the ambiguity or flag it for
review.

## 2. English editing

Treat supplied English as a draft, even when it is already complete.

- Preserve the author's meaning, facts, and first-person perspective.
- Fix PDF extraction artifacts, broken lines, unexpected indentation, duplicated
  text, and copied chat scaffolding.
- Rewrite awkward or generic AI phrasing.
- Prefer short, natural sentences and concrete verbs.
- Remove repeated summaries such as saying the same lesson in the introduction,
  a heading, and the conclusion.
- Avoid inflated claims and formulaic transitions such as “In today's rapidly
  evolving landscape” or “This journey taught me.”
- Use sentence-case headings that state the section's actual idea.
- Keep technical terms in their normal English form.

The English article is an edited original, not a transcript of the PDF or chat.

## 3. Chinese rewriting

The Chinese version is a separate piece of writing based on the same source. Do
not translate sentence by sentence.

### Desired tone

- Natural modern Chinese, with the rhythm of something originally written in
  Chinese.
- Personal and approachable, while remaining reasonably serious for technical
  discussion or career experience.
- Conversational in moderation; avoid both stiff résumé language and exaggerated
  internet slang.
- It is acceptable to reorganize sentences or paragraphs when Chinese reads
  better that way.

### Avoid translation-like Chinese

Do not mechanically reproduce English syntax, transitions, or metaphors. In
particular:

- Avoid excessive “对于……而言”, “与此同时”, “此外”, “值得注意的是”, and
  “这段旅程”.
- Avoid repeatedly using “进行”, “实现”, “赋能”, “探索”, “思考”, or “反思”
  when a simpler verb says the same thing.
- Do not force every English pronoun, subject, or connective into the Chinese
  sentence.
- Do not translate headings literally if a more direct Chinese heading fits the
  section.
- Keep familiar technical terms such as MVP, SEO, Cloudflare, Stripe, and AI when
  that is how a Chinese technical reader would normally say them.

Meaning may be expressed differently, but facts, degree of certainty, and the
author's conclusion must stay consistent with the English version.

## 4. Article structure

Use ordinary Markdown. Do not paste visual formatting from a PDF.

A typical post should contain:

1. A short opening that quickly establishes what happened or what question the
   post examines.
2. Three to five meaningful `##` sections.
3. A conclusion that adds perspective instead of repeating the introduction.

Formatting rules:

- Use `##` for main sections; use deeper headings only when genuinely necessary.
- Keep paragraphs focused and reasonably short.
- Use bullet lists for parallel items, not as a substitute for prose.
- Use numbered lists only when order matters or the text presents questions or
  steps.
- Use blockquotes sparingly for one line that is genuinely worth emphasizing.
- Use fenced code blocks with a language identifier.
- Preserve inline code, URLs, commands, product names, and code blocks when
  translating.
- Do not manually create a table of contents. Hugo builds it from headings.
- Do not manually add a reading-time label. Hugo calculates and localizes it.
- Do not use spaces or indentation to create layout. Site CSS owns presentation.

## 5. Titles, descriptions, and headings

### Title

- Be specific and human rather than optimized into clickbait.
- Preserve useful concrete details such as time, cost, or outcome.
- Keep it compact enough to work as a desktop article heading. The layout keeps
  titles on one line on large screens and allows wrapping on smaller screens.
- Chinese punctuation and word order should be natural; it need not mirror the
  English title.

### Description

- One concise sentence.
- Explain what the reader will find, not merely repeat the title.
- Avoid “In this article, I will…” and its Chinese equivalent.

### Headings

- Each heading should make a distinct claim or introduce a distinct stage.
- Prefer headings such as “Building was the easy part” over generic labels such
  as “Development.”
- Rewrite headings independently in Chinese. Similar meaning is enough; identical
  grammar is not required.

## 6. Front matter and file pairing

Store paired posts at matching paths:

```text
content/en/blogs/<category>/<post-name>/index.md
content/zh/blogs/<category>/<post-name>/index.md
```

Use this front matter shape:

```yaml
---
title: "Natural title in this language"
date: YYYY-MM-DD
description: "One concise sentence."
primary_category: "Visible category label"
categories: ["stable-category-key"]
tags: ["Tag One", "Tag Two"]
draft: false
translationKey: "stable-shared-key"
---
```

Rules:

- Both language files must share the same `translationKey`.
- Use equivalent categories and tags, written naturally for each language where
  they are visible.
- Do not change an existing published URL accidentally.
- When rewriting a published title, preserve its URL with an explicit `slug` if
  necessary.
- Use ISO dates (`YYYY-MM-DD`).
- Do not add fields merely because they appeared in copied source material.

## 7. Site presentation handled by the template

Article pages already provide:

- Category, publication date, and localized estimated reading time.
- A generated table of contents when the post has headings.
- A wider header that shares its left edge with the reading column.
- A one-line desktop title when the viewport has enough room.
- A narrower, readable body column.
- Responsive title wrapping and table-of-contents layout on smaller screens.
- Light and dark themes.

Content Markdown should not reproduce any of these elements.

## 8. Import workflow

When given a PDF, pasted conversation, or rough text:

1. Read the whole source before drafting.
2. Extract the factual spine:
   - What happened?
   - Why did it matter?
   - What decisions were made?
   - What evidence or numbers support the account?
   - What remains uncertain?
3. Separate source content from ChatGPT/Codex instructions, repeated summaries,
   and formatting artifacts.
4. Draft or revise the English article first.
5. Check its structure, facts, headings, and conclusion.
6. Rewrite the Chinese article from the meaning of the approved English version
   and the original source—not sentence by sentence.
7. Compare both versions for factual consistency.
8. Render the site and review both languages in light and dark mode.
9. Iterate with the author. Do not commit the article until the author accepts
   the wording and presentation.

If the supplied source is already Chinese, reverse steps 4 and 6: polish the
Chinese source first, then write a natural English counterpart.

## 9. Validation checklist

Before considering an imported post complete:

- [ ] English reads naturally and does not retain chat/PDF artifacts.
- [ ] Chinese reads like original Chinese rather than a translation.
- [ ] Facts, numbers, uncertainty, and conclusions agree across languages.
- [ ] Headings are meaningful and generate a clean table of contents.
- [ ] No manually written table of contents or reading-time text remains.
- [ ] Front matter parses and both files share a `translationKey`.
- [ ] Existing URLs remain stable.
- [ ] Desktop title/header/body alignment looks intentional.
- [ ] Mobile layout wraps without horizontal overflow.
- [ ] Light and dark modes both remain readable.
- [ ] Hugo builds successfully.
- [ ] `git diff --check` reports no whitespace errors.
- [ ] Only intended files are included in the eventual commit.

Minimum local checks from the repository root:

```bash
hugo --destination /tmp/yitaohe-site-check
git diff --check
git status --short
```

## 10. Reusable instruction for a future Codex task

The following is enough to start a future import:

> Read `docs/blog-publishing-guide.md` completely and follow it. Use the attached
> PDF/text as the source for a new English blog post and a natural Chinese
> counterpart. Preserve facts but clean up the structure and prose. Do not
> translate Chinese sentence by sentence. Add the paired Markdown files, preserve
> URL and `translationKey` conventions, build the Hugo site, and give me both
> local preview links for review. Do not commit until I approve the wording.

This guide records the current editorial and presentation decisions. Update it
when a future review establishes a better recurring rule.
