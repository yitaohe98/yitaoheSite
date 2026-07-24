# Comment Feature Testing Runbook

This runbook explains how to test the guestbook on a feature branch:

- locally with Hugo, Cloudflare Pages Functions, local D1, Turnstile test keys,
  and remote Workers AI; and
- optionally as a Cloudflare Pages preview deployment before merging.

The local application is served by Wrangler at `http://localhost:8788`.
Running only `hugo server` is not sufficient because Hugo cannot execute
`functions/api/comments.js` or provide D1 and Workers AI bindings.

## 1. Safety model

Keep the environments separate:

| Environment | Static site | Database | Turnstile | Workers AI |
| --- | --- | --- | --- | --- |
| Local | Hugo-generated `public/` | Wrangler local D1 | Cloudflare dummy test keys | Remote Cloudflare binding |
| Branch preview | Cloudflare Pages preview | Separate preview D1 recommended | Separate preview widget or dummy test keys | Preview `AI` binding |
| Production | Cloudflare Pages production | Production D1 | Production widget and secret | Production `AI` binding |

Never put API tokens, Turnstile secrets, `.dev.vars`, `wrangler.toml`, local D1
state, or database exports into Git.

## 2. Verify or create the feature branch

Check the current branch and working tree before changing anything:

```sh
git status --short --branch
git branch --show-current
```

If Git reports `No commits yet`, this is an unborn repository rather than a
normal feature branch based on existing history. Check:

```sh
git remote -v
git branch --all
```

If this checkout was expected to contain existing history, stop and restore or
re-clone that history before committing. If it is intentionally a new
repository, create and review the initial commit deliberately; do not run the
`main`-branch commands below until `main` exists.

If the feature branch already exists:

```sh
git switch codex/comments-feature
```

Otherwise, create it from the intended base branch:

```sh
git switch main
git pull --ff-only
git switch -c codex/comments-feature
```

Do not switch branches with uncommitted work unless those changes are meant to
move with you. Never use a destructive reset to resolve a dirty working tree.

## 3. Install and verify prerequisites

Required tools:

```sh
hugo version
node --version
wrangler --version
```

The tested local setup used Hugo Extended, Node.js, and Wrangler 4.x.

If Homebrew and npm need the configured mirrors:

```sh
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_API_DOMAIN=https://mirrors.ustc.edu.cn/homebrew-bottles/api
export HOMEBREW_BOTTLE_DOMAIN=https://mirrors.ustc.edu.cn/homebrew-bottles
npm config set registry https://registry.npmmirror.com
```

Install missing dependencies:

```sh
brew install node
npm install -g wrangler
```

Authenticate Wrangler and confirm the selected account:

```sh
wrangler login
wrangler whoami
```

## 4. Create or select the D1 database

Create the Cloudflare D1 database once if it does not already exist:

```sh
wrangler d1 create yitaohe-comments --location apac
```

Wrangler prints a database UUID. Copy that UUID; do not invent one.

Creating the Cloudflare database provides the identifier required by the
Wrangler configuration. Local commands still use a separate local database
unless `--remote` is explicitly supplied.

## 5. Create the ignored local configuration

Copy the repository template:

```sh
cp wrangler.toml.example wrangler.toml
```

Replace `REPLACE_WITH_D1_DATABASE_ID` with the UUID returned by D1:

```toml
name = "yitaohe-site"
pages_build_output_dir = "./public"
compatibility_date = "2026-07-24"

[[d1_databases]]
binding = "COMMENTS_DB"
database_name = "yitaohe-comments"
database_id = "<actual-database-uuid>"

[ai]
binding = "AI"
remote = true
```

`wrangler.toml` is ignored by Git in this repository. The checked-in
`wrangler.toml.example` remains the safe template.

## 6. Configure local-only secrets

Create the ignored local secret file:

```sh
cp .dev.vars.example .dev.vars
```

Use Cloudflare's always-pass Turnstile test secret:

```dotenv
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
RATE_LIMIT_SECRET=<long-random-local-value>
TURNSTILE_ALLOW_TEST_KEYS=true
```

Generate a rate-limit secret:

```sh
openssl rand -hex 32
```

Paste the generated value into `.dev.vars`. Do not commit this file.

The matching public Turnstile test site key is:

```text
1x00000000000000000000AA
```

## 7. Build Hugo with the Turnstile test widget

The Turnstile site key is a Hugo build-time value. Build the static site with:

```sh
HUGO_PARAMS_TURNSTILESITEKEY=1x00000000000000000000AA \
  hugo --minify --cleanDestinationDir
```

Verify that the widget was embedded:

```sh
rg "data-sitekey=1x00000000000000000000AA" \
  public/comments/index.html \
  public/zh/comments/index.html
```

Important: running plain `hugo` afterward regenerates `public/` without the
site key. The form will then be disabled and display:

```text
Comment submission is not configured in this build.
```

Re-run the Turnstile-enabled Hugo command whenever that happens.

## 8. Initialize local D1

Apply the migration to the local database:

```sh
wrangler d1 migrations apply yitaohe-comments --local
```

Confirm the tables:

```sh
wrangler d1 execute yitaohe-comments --local \
  --command "SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name"
```

Do not add `--remote` during local testing.

## 9. Network requirement for Workers AI

D1 runs locally, but Workers AI always runs remotely. Wrangler creates a
temporary `*.workers.dev` connection for the remote binding.

On networks where `workers.dev` DNS or WebSockets are filtered, symptoms
include:

```text
Active tail WebSocket error
ETIMEDOUT
ENETUNREACH
Workers AI moderation timed out
```

In the tested environment, enabling the proxy application's TUN/global mode
fixed this connection. Start TUN before Wrangler.

An HTTP check can verify the proxy route:

```sh
HTTPS_PROXY=http://127.0.0.1:7890 \
  curl --max-time 10 -I https://yitaohe-site.<account-subdomain>.workers.dev
```

`200 Connection established` followed by a Cloudflare `404` is acceptable: it
proves the connection reached Cloudflare even when no permanent Worker exists
at that root URL.

Do not add static `workers.dev` addresses to `/etc/hosts`; preview hostnames
and Cloudflare addresses can change.

## 10. Start the complete local application

With TUN active:

```sh
wrangler pages dev --log-level info
```

Open:

- English: `http://localhost:8788/comments/`
- Chinese: `http://localhost:8788/zh/comments/`

Expected startup output includes:

```text
env.COMMENTS_DB ... D1 Database local
env.AI ... AI remote
Ready on http://localhost:8788
```

Wrangler watches Function source changes. Restart it after changing bindings,
`.dev.vars`, or `wrangler.toml`.

## 11. Run automated checks

In another terminal:

```sh
node --test tests/comments-api.test.mjs
```

The current suite covers:

- Unicode normalization and character limits;
- Turnstile input requirements;
- stable pagination cursors;
- spam detection;
- English and Chinese targeted-abuse detection;
- obfuscation and zero-width-character handling;
- safe, unsafe, and unavailable AI outcomes;
- local rate limiting; and
- public-field filtering.

Run the Hugo build check without losing the local Turnstile widget:

```sh
HUGO_PARAMS_TURNSTILESITEKEY=1x00000000000000000000AA \
  hugo --minify --cleanDestinationDir
```

## 12. Manual browser test matrix

Use a new Turnstile token for each submission. Wait one minute between
successful attempts or clear the local rate-limit table as described below.

| Test | Expected HTTP/result | Stored? | Public? |
| --- | --- | --- | --- |
| Normal English comment | `201`, `published` | Approved | Yes |
| Normal Chinese comment | `201`, `published` | Approved | Yes |
| Empty name/body | Client error or `422` | No | No |
| Name over 40 characters | Client error or `422` | No | No |
| Body over 200 characters | Client error or `422` | No | No |
| Targeted abuse | `422`, `MODERATION_REJECTED` | No | No |
| Obvious spam/scam | `422`, `MODERATION_REJECTED` | No | No |
| AI unavailable/timeout | `202`, `pending` | Pending | No |
| Second submission in one minute | `429`, `RATE_LIMITED` | No | No |
| Safe HTML/script text | Published as harmless text or rejected | Maybe | Never executed |

For a safe English comment, expected logs are:

```text
[comments] Turnstile verification started
[comments] Turnstile verification completed in ...ms
[comments] Workers AI moderation started
[comments] Workers AI moderation completed in ...ms
POST /api/comments 201 Created
```

For Chinese text, translation runs before moderation:

```text
[comments] Workers AI translation started
[comments] Workers AI translation completed in ...ms
[comments] Workers AI moderation started
```

Deterministic targeted-abuse rules run before Workers AI. A matching comment
returns `422`; no AI completion log is expected for that submission.

## 13. Inspect local moderation outcomes

List recent local comments:

```sh
wrangler d1 execute yitaohe-comments --local \
  --command "SELECT id, display_name, body, status, moderation_result, needs_review, datetime(created_at / 1000, 'unixepoch') AS created_utc FROM comments ORDER BY created_at DESC LIMIT 20"
```

Typical private outcomes:

| `status` | `moderation_result` | Meaning |
| --- | --- | --- |
| `approved` | `safe` | Workers AI classified the comment safe |
| `pending` | `moderation_unavailable` | AI failed or timed out |
| `pending` | `moderation_unrecognized` | AI returned an unexpected result |
| Not inserted | `targeted_abuse` | Deterministic policy rejected it |
| Not inserted | `obvious_spam` | Deterministic spam policy rejected it |

The public GET endpoint returns only approved, non-deleted comments.

## 14. Local moderation and cleanup

Approve pending local test comments:

```sh
wrangler d1 execute yitaohe-comments --local \
  --command "UPDATE comments SET status='approved', needs_review=0, moderated_at=CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE status='pending'"
```

Hide a local test comment:

```sh
wrangler d1 execute yitaohe-comments --local \
  --command "UPDATE comments SET status='hidden', deleted_at=CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id='<comment-id>'"
```

Restore it:

```sh
wrangler d1 execute yitaohe-comments --local \
  --command "UPDATE comments SET status='approved', deleted_at=NULL WHERE id='<comment-id>' AND status='hidden'"
```

Clear only local rate-limit records:

```sh
wrangler d1 execute yitaohe-comments --local \
  --command "DELETE FROM comment_rate_limits"
```

Clear all local test comments only when an empty local database is intended:

```sh
wrangler d1 execute yitaohe-comments --local \
  --command "DELETE FROM comments"
```

These commands affect local Wrangler state only because they include
`--local`.

## 15. Troubleshooting

### Submission is not configured

Cause: Hugo was built without `HUGO_PARAMS_TURNSTILESITEKEY`.

Fix:

```sh
HUGO_PARAMS_TURNSTILESITEKEY=1x00000000000000000000AA \
  hugo --minify --cleanDestinationDir
```

Restart Wrangler and hard-refresh the browser.

### Stuck at "Checking and publishing your comment..."

Check the terminal stages:

- no POST or Turnstile log: browser submission did not reach the Function;
- Turnstile started but did not complete: Turnstile network problem;
- AI started but timed out: remote Workers AI binding/network problem;
- `POST 202`: the comment was saved pending;
- `POST 201`: the comment was approved and published.

With the current safeguards, Turnstile times out after 8 seconds and Workers AI
after 15 seconds instead of leaving the request open indefinitely.

### Workers AI REST works but the local binding times out

This usually means ordinary HTTPS to `api.cloudflare.com` works while
Wrangler's `*.workers.dev` WebSocket path does not. Enable TUN/global proxy
mode and restart Wrangler.

To isolate model/account access, create a Workers AI API token in the
Cloudflare dashboard and test the exact model:

```sh
export CLOUDFLARE_ACCOUNT_ID="<account-id>"
read -s "CLOUDFLARE_API_TOKEN?Cloudflare API token: "
export CLOUDFLARE_API_TOKEN
```

```sh
curl --max-time 60 \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/ai/run/@cf/meta/llama-guard-3-8b" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"messages":[{"role":"user","content":"Display name: Test\nComment: Hello"}],"max_tokens":32,"temperature":0}' \
  -w "\nHTTP %{http_code}, total %{time_total}s\n"
```

Never paste or commit the API token.

### A profanity was classified safe

Llama Guard is a safety classifier, not a general profanity filter. The
Function therefore applies deterministic policy rules before AI for targeted
abuse, threats, self-harm encouragement, dehumanization, obvious spam, and
common English/Chinese evasions.

Standalone profanity is not automatically blocked when it is not targeted.
Changing that behavior requires an intentional blanket-profanity policy.

## 16. Test a pushed feature branch with a Pages preview

Before pushing, inspect exactly what will be committed:

```sh
git status --short
git diff --check
git check-ignore -v .dev.vars wrangler.toml .wrangler
```

Do not blindly stage secrets or local state. Stage only intended source,
documentation, schema, and test files, then commit and push:

```sh
git add <reviewed-feature-files>
git commit -m "Add moderated guestbook comments"
git push -u origin codex/comments-feature
```

For a Git-connected Pages project, pushing a non-production branch creates a
preview deployment when preview builds are enabled. Cloudflare also creates a
branch alias such as:

```text
codex-comments-feature.<project>.pages.dev
```

Configure the **Preview** environment separately in Cloudflare Pages:

- D1 binding `COMMENTS_DB` → preferably a dedicated preview database;
- Workers AI binding `AI`;
- runtime secret `TURNSTILE_SECRET_KEY`;
- runtime secret `RATE_LIMIT_SECRET`;
- build variable `HUGO_PARAMS_TURNSTILESITEKEY`;
- `TURNSTILE_ALLOW_TEST_KEYS=true` only when dummy Turnstile keys are used.

For a dedicated preview D1 database:

```sh
wrangler d1 create yitaohe-comments-preview --location apac
wrangler d1 migrations apply yitaohe-comments-preview --remote
```

Bind that database only to the Pages Preview environment. Avoid testing branch
code against production comment data.

Use either:

- a separate Turnstile widget that allows the preview hostname; or
- Cloudflare dummy test keys for a non-production preview.

Never use dummy keys or `TURNSTILE_ALLOW_TEST_KEYS=true` in production.

List preview deployments:

```sh
wrangler pages deployment list \
  --project-name yitaohe-site \
  --environment preview
```

Tail the latest preview Functions logs:

```sh
wrangler pages deployment tail \
  --project-name yitaohe-site \
  --environment preview \
  --format pretty
```

Run the same manual test matrix against the branch preview URL. Confirm that
the preview response includes `X-Robots-Tag: noindex`:

```sh
curl -I https://<preview-url>.pages.dev
```

## 17. Before merging

Confirm:

- automated API tests pass;
- the Hugo build succeeds;
- English and Chinese pages render correctly;
- safe comments publish;
- targeted abuse and obvious spam are rejected;
- uncertain/unavailable AI results remain private and pending;
- pagination works with more than 20 approved comments;
- preview bindings and secrets are separate from production where practical;
- `.dev.vars`, `wrangler.toml`, `.wrangler/`, and backups are absent from the
  commit; and
- the feature branch contains no real visitor or test database exports.

## References

- [Cloudflare Pages local development](https://developers.cloudflare.com/pages/functions/local-development/)
- [Cloudflare Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare Pages preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Cloudflare D1 local development](https://developers.cloudflare.com/d1/best-practices/local-development/)
- [Cloudflare Turnstile testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
- [Workers AI errors](https://developers.cloudflare.com/workers-ai/platform/errors/)
- [Wrangler proxy support](https://developers.cloudflare.com/workers/wrangler/configuration/#proxy-support)
