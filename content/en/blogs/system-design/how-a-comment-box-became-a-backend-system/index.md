---
title: "How a Comment Box Became a Backend System"
date: 2026-07-25
description: "The design decisions that turned a small guestbook into a stateful service beside a static Hugo site."
primary_category: "system design"
categories: ["system-design"]
tags: ["Cloudflare", "Hugo", "D1", "Pages Functions"]
draft: false
translationKey: "comment-box-backend-system"
---

I wanted a comment system on my personal website. The visible result is still a name field, a message field, and a list of comments; everything between those elements became a small backend system.

## The first boundary was state

The site was built with Hugo and deployed as static files. A new build could replace every generated page without affecting anything else because the site owned no runtime state.

Comments changed that assumption. A visitor had to write data, the data had to survive future builds, and other visitors had to read it. The first design decision was therefore not about the form. It was about where mutable state should live.

I kept Hugo responsible for the authored site and added one dynamic boundary:

```text
Browser
  → POST /api/comments
  → Cloudflare Pages Function
  → validation and moderation
  → D1

Browser
  → GET /api/comments
  → Cloudflare Pages Function
  → approved rows from D1
```

Only `/api/*` invokes server-side code. The pages, article content, CSS, and JavaScript remain static. Comments persist independently of Hugo builds and Cloudflare deployments.

This ruled out treating comments as generated site content. It also avoided adding a separate application server for a single interactive page. Pages Functions supplied the API boundary, and D1 supplied storage in the same deployment environment.

## Anonymous input defined the abuse controls

The guestbook did not need accounts. Requiring registration would add more identity and session machinery than the feature justified, so a submission contains only a public display name and comment body.

Removing authentication did not remove identity from the system; it changed what identity was needed. The API still needed to distinguish ordinary use from repeated submissions without retaining raw IP addresses.

The resulting request path combines several narrow controls:

- Turnstile verifies the browser token on the server.
- A keyed hash derives an abuse-control identifier from network data.
- D1 stores a short-lived minute bucket for approximate rate limiting.
- A honeypot catches simple automated submissions.
- Input length and request size are checked before expensive work.
- Prepared statements handle database writes.
- Submitted content is rendered as text, never as user-supplied HTML.

None of these controls is sufficient on its own. Together, they cover different failure modes while keeping the public submission flow anonymous.

## Moderation became a state machine

The initial moderation model looked binary: classify a comment as safe or unsafe, then publish or reject it. Testing exposed two missing cases.

First, an AI safety classifier is not necessarily a civility filter. A direct insult containing profanity could still be classified as safe because it did not match the model's safety taxonomy. The final pipeline therefore runs a small deterministic targeted-abuse check before Workers AI. It catches narrow English and Chinese attack patterns, while contextual uses of the same words still continue to AI moderation.

Second, an external model can time out or return an unexpected result. Publishing on that failure would make moderation availability part of the site's safety policy. Rejecting every failed request would lose legitimate comments.

The API instead uses explicit states:

- `approved`: safe and publicly readable.
- `pending`: stored privately because translation or moderation did not complete reliably.
- `hidden`: removed from the public feed but recoverable.
- clearly unsafe input: rejected without storing the comment text.

Chinese comments are translated to English for moderation, but the translation is not stored. The original text remains the public record.

The write path became:

```text
Turnstile
  → rate limit
  → deterministic abuse checks
  → optional translation
  → AI moderation
  → approved, pending, or rejected
```

This is more useful than a single boolean because operational failures and moderation decisions are different events.

## The read path shaped the data model

The public API returns approved, non-hidden comments newest first. It never returns moderation results, review flags, deletion metadata, rate-limit identifiers, or other internal fields.

Pagination uses an opaque cursor built from the last row's creation time and ID. Ordering by both fields makes the cursor stable when multiple comments have the same timestamp and avoids the shifting boundaries of offset pagination as new rows arrive.

Deletion also needed more than one operation. Hiding a comment sets its status and deletion timestamp so it can be restored. Permanent deletion removes the row only when recovery is no longer required. Backups add another copy of the data, so deleting from active D1 does not automatically remove the same content from older exports.

Those choices produced a small operating surface: inspect pending rows, approve them by ID, hide or restore a comment, export the database, and test a restore against a non-production database.

## Deployment configuration became part of the system

The application code is only one part of the deployed feature. The Pages environment also needs:

- a D1 database with the comments migration applied;
- a D1 binding named `COMMENTS_DB`;
- a Workers AI binding named `AI`;
- encrypted Turnstile and rate-limit secrets;
- a public Turnstile site key supplied during the Hugo build.

Preview and production deployments have separate bindings and variables. That separation is useful, but it also means a successful local test does not prove that a branch preview or production deployment has the same runtime capabilities.

The first preview build demonstrated a smaller version of the same issue. Local Hugo was newer than Cloudflare's default build version, so a template field that worked locally failed in Pages. Pinning `HUGO_VERSION` for both preview and production made the build environment explicit.

The database has its own lifecycle as well. Schema migrations run separately from Hugo builds, and rolling back the site should not delete D1. The older static site can ignore the additive tables while the data remains available for recovery.

## The interface stayed small

The feature expanded because public input introduced state, anonymous input introduced abuse controls, automated moderation introduced failure states, and persistent data introduced deployment and maintenance work.

The page still presents a simple guestbook. Its implementation is a static site with one deliberately narrow backend attached.
