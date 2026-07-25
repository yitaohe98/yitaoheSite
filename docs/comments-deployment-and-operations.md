# Comments Deployment and Operations Guide

This guide covers the first production deployment and ongoing operation of the
guestbook on `yitaohe.com`.

The production architecture is:

```text
Visitor
  → Cloudflare Turnstile
  → Cloudflare Pages Function (/api/comments)
  → deterministic abuse and spam checks
  → Workers AI translation and moderation
  → Cloudflare D1
```

The Git production branch is `main`. The feature branch is
`codex/comments-feature`.

## 1. Public repository safety

The repository is public, so assume every tracked file and every Git commit can
be read by anyone.

These values are safe to expose:

- the Turnstile **site key**, because browsers need it to render the widget;
- the D1 database ID, which is an identifier rather than an authentication
  credential;
- placeholder values in `.dev.vars.example`; and
- Cloudflare's documented dummy test keys.

These values must remain private:

- the production Turnstile secret key;
- `RATE_LIMIT_SECRET`;
- Cloudflare API tokens;
- `.dev.vars`;
- local Wrangler state under `.wrangler/`; and
- database exports containing visitor comments.

The repository ignores `.dev.vars`, `wrangler.toml`, `.wrangler/`, and comment
backups. Before every commit, check:

```sh
git status --short
git diff --check
git check-ignore -v .dev.vars wrangler.toml .wrangler
```

Do not force-add ignored files. Do not commit generated `public/` changes.

If a real secret is ever committed, removing the file in a later commit is not
enough because the value remains in Git history. Rotate the affected secret
immediately in Cloudflare.

## 2. Production deployment checklist

Complete these steps before merging the feature branch:

- [ ] Production D1 database exists.
- [ ] Migration `0001_comments.sql` is applied to production D1.
- [ ] Pages production D1 binding is named `COMMENTS_DB`.
- [ ] Pages production Workers AI binding is named `AI`.
- [ ] Production Turnstile widget allows `yitaohe.com` and
      `www.yitaohe.com`.
- [ ] `TURNSTILE_SECRET_KEY` is stored as an encrypted Pages secret.
- [ ] `RATE_LIMIT_SECRET` is stored as an encrypted Pages secret.
- [ ] `HUGO_PARAMS_TURNSTILESITEKEY` contains the public production site key.
- [ ] Production does not define `TURNSTILE_ALLOW_TEST_KEYS=true`.
- [ ] Pages production branch is `main`.
- [ ] Pages build command is `hugo --minify`.
- [ ] Pages output directory is `public`.

## 3. Create and migrate production D1

Authenticate Wrangler and verify the active Cloudflare account:

```sh
wrangler login
wrangler whoami
```

List existing databases:

```sh
wrangler d1 list
```

If the production database does not exist, create it:

```sh
wrangler d1 create yitaohe-comments --location apac
```

Wrangler prints the database UUID. Copy `wrangler.toml.example` to the ignored
local file `wrangler.toml`, then replace `REPLACE_WITH_D1_DATABASE_ID` with that
UUID:

```sh
cp wrangler.toml.example wrangler.toml
```

Review unapplied production migrations:

```sh
wrangler d1 migrations list yitaohe-comments --remote
```

Apply them:

```sh
wrangler d1 migrations apply yitaohe-comments --remote
```

The `--remote` flag is important: without it, Wrangler operates on the local
test database.

Confirm the production tables:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name"
```

Expected application tables:

```text
comment_rate_limits
comments
```

## 4. Configure the Pages project

Open:

```text
Cloudflare Dashboard
→ Workers & Pages
→ yitaohe-site
→ Settings
```

Configure the **Production** environment.

### Bindings

Add:

| Binding type | Variable name | Resource |
| --- | --- | --- |
| D1 database | `COMMENTS_DB` | `yitaohe-comments` |
| Workers AI | `AI` | Workers AI |

Bindings let the Pages Function access Cloudflare services without placing API
credentials in the repository.

### Turnstile

Create a production Turnstile widget and allow:

```text
yitaohe.com
www.yitaohe.com
```

Turnstile provides two values:

- **site key**: public, embedded into the comments page;
- **secret key**: private, used by the Pages Function to validate tokens.

Add the secret key under **Variables and Secrets**:

| Name | Type |
| --- | --- |
| `TURNSTILE_SECRET_KEY` | Encrypted secret |

Add the public site key as a build variable:

| Name | Type |
| --- | --- |
| `HUGO_PARAMS_TURNSTILESITEKEY` | Plain-text build variable |

The Function validates the Turnstile hostname and the action
`comment_submit`.

### Rate-limit secret

Generate a random value locally:

```sh
openssl rand -hex 32
```

Copy the result directly into Cloudflare as:

| Name | Type |
| --- | --- |
| `RATE_LIMIT_SECRET` | Encrypted secret |

Do not save this value in the repository. It is used to create anonymous,
non-reversible rate-limit identities instead of storing raw visitor IP
addresses.

### Production-only safety

Production must not define:

```text
TURNSTILE_ALLOW_TEST_KEYS=true
```

That variable is only for local or isolated preview testing.

Save binding and secret changes before deploying. Redeploy if Cloudflare asks
for a deployment before new bindings become active.

## 5. Merge and deploy

Create a pull request:

```sh
gh pr create \
  --base main \
  --head codex/comments-feature \
  --title "Add moderated guestbook comments" \
  --body "Adds D1-backed comments, Turnstile protection, Workers AI moderation, bilingual UI, tests, documentation, and content-first page styling."
```

Merge it after reviewing the final diff:

```sh
gh pr merge --squash --delete-branch
```

If Cloudflare Pages is connected to GitHub, `main` is configured as the
production branch, and automatic production deployments are enabled, the merge
starts a production build automatically.

Monitor the deployment in:

```text
Cloudflare Dashboard
→ Workers & Pages
→ yitaohe-site
→ Deployments
```

## 6. First production smoke test

After deployment:

1. Open `https://www.yitaohe.com/comments/`.
2. Confirm the Turnstile widget loads.
3. Submit one harmless English comment.
4. Confirm it appears in the public list.
5. Submit one harmless Chinese comment after the rate-limit interval.
6. Confirm translation and moderation complete and the original Chinese text
   is displayed.
7. Submit an obvious targeted-abuse test and confirm it is rejected.
8. Confirm rejected text was not stored.
9. Check the Chinese page at `https://www.yitaohe.com/zh/comments/`.

The API health check is:

```sh
curl -i "https://www.yitaohe.com/api/comments?limit=1"
```

A healthy response returns HTTP `200` and JSON containing `ok: true`.

## 7. Read comments

The safest operational workflow is:

1. run a `SELECT`;
2. copy the exact comment ID;
3. run one narrowly targeted mutation;
4. run another `SELECT` to verify it.

List the 50 most recent comments:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "SELECT id, display_name, body, status, moderation_result, needs_review, datetime(created_at / 1000, 'unixepoch') AS created_utc FROM comments ORDER BY created_at DESC LIMIT 50"
```

List only comments waiting for review:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "SELECT id, display_name, body, moderation_result, datetime(created_at / 1000, 'unixepoch') AS created_utc FROM comments WHERE status='pending' ORDER BY created_at ASC"
```

Inspect one exact comment:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "SELECT * FROM comments WHERE id='<comment-id>'"
```

Count comments by status:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "SELECT status, COUNT(*) AS count FROM comments GROUP BY status ORDER BY status"
```

## 8. Approve a pending comment

Inspect the comment body first. Then approve only the exact pending ID:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "UPDATE comments SET status='approved', needs_review=0, moderated_at=CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id='<comment-id>' AND status='pending'"
```

Verify:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "SELECT id, status, needs_review, moderated_at FROM comments WHERE id='<comment-id>'"
```

## 9. Hide a public comment

Hiding keeps the record for later review but removes it from the public API:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "UPDATE comments SET status='hidden', deleted_at=CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id='<comment-id>' AND status='approved'"
```

Verify that the status is `hidden`:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "SELECT id, status, deleted_at FROM comments WHERE id='<comment-id>'"
```

## 10. Restore a hidden comment

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "UPDATE comments SET status='approved', deleted_at=NULL WHERE id='<comment-id>' AND status='hidden'"
```

Verify:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "SELECT id, status, deleted_at FROM comments WHERE id='<comment-id>'"
```

## 11. Permanently delete a comment

Create a backup first if the comment may need to be recovered.

Inspect the exact row:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "SELECT id, display_name, body, status FROM comments WHERE id='<comment-id>'"
```

Delete only that exact ID:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "DELETE FROM comments WHERE id='<comment-id>'"
```

Verify that no row remains:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "SELECT id FROM comments WHERE id='<comment-id>'"
```

Permanent deletion removes the active D1 row. Older SQL exports can still
contain it, so apply the backup-retention policy described below.

## 12. Rate-limit operations

The application automatically removes old rate-limit records. Inspect recent
record counts with:

```sh
wrangler d1 execute yitaohe-comments --remote \
  --command "SELECT COUNT(*) AS active_rate_limit_records FROM comment_rate_limits"
```

Do not clear the entire production rate-limit table during normal operation.
If emergency cleanup is necessary, first inspect the table and confirm that the
command targets the production database intentionally.

## 13. Backup production comments

Create a backup before bulk moderation, deletion, schema work, or restoration:

```sh
scripts/backup-comments.sh
```

The script exports the remote `yitaohe-comments` database into:

```text
backups/comments/comments-<UTC timestamp>.sql
```

This directory is excluded from Git. Database exports contain visitor content
and must not be committed or shared publicly.

For this low-volume guestbook:

- keep the three most recent known-good backups;
- create a fresh backup before destructive operations;
- delete obsolete exports securely; and
- remember that an old export may contain comments later deleted from D1.

## 14. Restore safely

Never test a restore directly against the active production database.

Create a separate database:

```sh
wrangler d1 create yitaohe-comments-restore --location apac
```

Import the selected backup:

```sh
wrangler d1 execute yitaohe-comments-restore --remote \
  --file=backups/comments/<selected-backup>.sql
```

Inspect counts and statuses in the restored database before changing any Pages
binding. Review hidden or previously deleted content so an old backup does not
accidentally republish it.

## 15. Monitoring and troubleshooting

Inspect production Function logs in:

```text
Cloudflare Dashboard
→ Workers & Pages
→ yitaohe-site
→ Logs
```

Useful outcomes:

| Result | Meaning |
| --- | --- |
| `POST /api/comments` → `201` | Approved and published |
| `POST /api/comments` → `202` | Stored privately as pending |
| `POST /api/comments` → `422` | Invalid, failed verification, or rejected moderation |
| `POST /api/comments` → `429` | Rate limited |
| `POST /api/comments` → `500` | D1 or application failure |
| `POST /api/comments` → `503` | Required binding or secret missing |

If the form says submission is not configured, confirm:

- the build variable `HUGO_PARAMS_TURNSTILESITEKEY` exists;
- Hugo rebuilt after it was added;
- `TURNSTILE_SECRET_KEY` exists as an encrypted secret;
- D1 is bound as `COMMENTS_DB`; and
- Workers AI is bound as `AI`.

If comments become `pending`, inspect `moderation_result`. Translation or AI
failures intentionally remain private instead of being published.

## 16. Rotate secrets

Rotate the Turnstile secret in the Turnstile dashboard, then update the
encrypted Pages secret `TURNSTILE_SECRET_KEY` and redeploy.

To rotate `RATE_LIMIT_SECRET`:

1. generate a new value with `openssl rand -hex 32`;
2. replace the encrypted Pages secret;
3. redeploy; and
4. allow old rate-limit rows to expire naturally.

Never paste secret values into GitHub issues, pull requests, build logs, chat
screenshots, or repository documentation.

## 17. Roll back the site

If the deployment is unhealthy, revert the merge commit in GitHub:

```sh
git switch main
git pull --ff-only
git revert <merge-or-squash-commit-id>
git push origin main
```

Cloudflare Pages will deploy the reverted `main` commit when automatic
production deployments are enabled.

The additive D1 tables may remain. The older static site does not use them.
Do not delete production D1 during an application rollback; preserve visitor
comments until the incident is understood.

## 18. Official references

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Cloudflare Pages bindings and secrets](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare D1 Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Cloudflare Turnstile setup](https://developers.cloudflare.com/turnstile/get-started/)
- [Cloudflare Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
