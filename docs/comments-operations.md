# Comments feature operations

The guestbook keeps the Hugo site static while using a Cloudflare Pages
Function, D1, Turnstile, and Workers AI for comment submissions.

## Runtime flow

1. The browser validates the name and comment lengths.
2. The Pages Function validates Turnstile on the server.
3. A privacy-preserving D1 minute bucket applies an approximate one-submission-
   per-minute limit.
4. Deterministic rules reject obvious targeted abuse, threats, self-harm
   encouragement, dehumanization, and spam, including common English and
   Chinese evasions.
5. Chinese or mixed Chinese/English input is translated to English with
   `@cf/meta/m2m100-1.2b`.
6. The English text is classified with `@cf/meta/llama-guard-3-8b`.
7. Safe comments are published. Unsafe comments are rejected without storing
   their text. Translation or moderation failures are stored privately with
   `status = 'pending'`.

Comments are displayed exactly as submitted. The translation exists only for
moderation and is not stored or displayed.

## Cloudflare setup

### 1. Create and migrate D1

Create a D1 database named `yitaohe-comments`, then apply the migration:

```sh
wrangler d1 create yitaohe-comments --location apac
wrangler d1 migrations apply yitaohe-comments --remote
```

The migration is stored in `migrations/0001_comments.sql`.

### 2. Configure Pages bindings

In both the production and preview environments, configure:

| Type | Name | Value |
| --- | --- | --- |
| D1 binding | `COMMENTS_DB` | `yitaohe-comments` |
| Workers AI binding | `AI` | Workers AI |
| Secret | `TURNSTILE_SECRET_KEY` | Turnstile secret |
| Secret | `RATE_LIMIT_SECRET` | A long random value |

`wrangler.toml.example` contains the equivalent repository configuration. Do
not copy it to `wrangler.toml` until its D1 database ID has been replaced.
Adding a Pages Wrangler file makes it the project configuration source of
truth.

### 3. Configure Turnstile

Create a Turnstile widget for the production hostname and any Pages preview
hostnames that should accept comments.

Add the public site key to the Pages build environment:

```text
HUGO_PARAMS_TURNSTILESITEKEY=<Turnstile site key>
```

The secret key belongs only in the Pages Function runtime secret named
`TURNSTILE_SECRET_KEY`.

For local UI builds, Cloudflare's always-pass test site key can be supplied
temporarily:

```sh
HUGO_PARAMS_TURNSTILESITEKEY=1x00000000000000000000AA hugo server
```

Use `.dev.vars.example` as the local Pages Function configuration template.
Production must not set `TURNSTILE_ALLOW_TEST_KEYS=true`.

## Moderation states

| Status | Public | Meaning |
| --- | --- | --- |
| `approved` | Yes | Automated moderation returned `safe`. |
| `pending` | No | Translation or moderation was unavailable or unrecognized. |
| `hidden` | No | The owner removed a previously visible comment. |

### Approve a pending comment

Inspect the comment text first, then run:

```sql
UPDATE comments
SET status = 'approved',
    needs_review = 0,
    moderated_at = unixepoch('subsec') * 1000
WHERE id = '<comment-id>'
  AND status = 'pending';
```

### Hide a comment

```sql
UPDATE comments
SET status = 'hidden',
    deleted_at = unixepoch('subsec') * 1000
WHERE id = '<comment-id>';
```

### Restore a hidden comment

```sql
UPDATE comments
SET status = 'approved',
    deleted_at = NULL
WHERE id = '<comment-id>'
  AND status = 'hidden';
```

### Permanently delete a comment

```sql
DELETE FROM comments WHERE id = '<comment-id>';
```

Permanent deletion applies to active D1. Local exports may retain older copies,
so keep only a small number of recent backups and delete obsolete exports when
appropriate. After restoring an older backup, review hidden and deleted
comments before making the restored database active.

## Backup and restore

Run:

```sh
scripts/backup-comments.sh
```

The script writes a dated SQL export under `backups/comments/`. That directory
is excluded from Git. For this low-volume guestbook, keep the three most recent
known-good exports and create a fresh export after meaningful moderation work.

Restore into a new, non-production D1 database first:

```sh
wrangler d1 create yitaohe-comments-restore --location apac
wrangler d1 execute yitaohe-comments-restore \
  --remote \
  --file=backups/comments/<selected-backup>.sql
```

Verify comment counts and statuses before changing any production binding.

## Public API

`GET /api/comments?limit=20&cursor=<opaque-cursor>` returns approved comments
newest first. The cursor uses the last comment's timestamp and ID, preventing
new submissions from shifting older pages.

`POST /api/comments` accepts JSON containing:

```json
{
  "displayName": "Visitor",
  "body": "Hello",
  "website": "",
  "turnstileToken": "<token>"
}
```

The `website` field is a honeypot and must remain empty. Public API responses
never include moderation results, rate-limit identities, or hidden comments.
