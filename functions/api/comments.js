const MAX_DISPLAY_NAME_LENGTH = 40;
const MAX_COMMENT_LENGTH = 200;
const MAX_REQUEST_BYTES = 4096;
const PAGE_SIZE = 20;
const TURNSTILE_ACTION = "comment_submit";
const TURNSTILE_TIMEOUT_MS = 8_000;
const AI_TIMEOUT_MS = 15_000;
const TRANSLATION_MODEL = "@cf/meta/m2m100-1.2b";
const MODERATION_MODEL = "@cf/meta/llama-guard-3-8b";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
};

const TARGETED_ABUSE_PATTERNS = [
  // Direct and lightly obfuscated English profanity aimed at a person.
  /\b(?:f[\s._*@#!$-]*u[\s._*@#!$-]*c[\s._*@#!$-]*k|f[\s._*@#!$-]*c[\s._*@#!$-]*k|screw)[\s._*@#!$-]*(?:you|u)\b/iu,
  /\b(?:go[\s._-]+)?f[\s._*@#!$-]*u[\s._*@#!$-]*c[\s._*@#!$-]*k[\s._-]+(?:yourself|off)\b/iu,
  /\b(?:shut[\s._-]+(?:the[\s._-]+)?f[\s._*@#!$-]*u[\s._*@#!$-]*c[\s._*@#!$-]*k[\s._-]+up|stfu)\b/iu,

  // Personal degradation and commands intended to humiliate.
  /\b(?:you(?:'re| are)?|u(?:\s+r)?)\s+(?:(?:an?|the)\s+)?(?:asshole|arsehole|bitch|cunt|motherfucker|piece of shit|son of a bitch|idiot|moron|loser|scum|trash|garbage|worthless|pathetic|disgusting)\b/iu,
  /\b(?:you|u)\s+(?:suck|stink)\b/iu,
  /\b(?:nobody|no one)\s+(?:likes|wants|cares about)\s+(?:you|u)\b/iu,
  /\b(?:get lost|drop dead)\b/iu,

  // Self-harm encouragement, direct threats, and dehumanization.
  /\b(?:(?:kill|hang|hurt)\s+yourself|kys)\b/iu,
  /\b(?:you\s+(?:should|deserve to)\s+(?:die|suffer|be killed)|i\s+(?:will|'ll|am going to|gonna)\s+(?:kill|hurt|beat|shoot|stab)\s+you)\b/iu,
  /\b(?:you|they|those people)\s+are\s+(?:subhuman|vermin|animals?|parasites?)\b/iu,

  // Common Chinese targeted abuse, threats, and romanized evasions.
  /(?:操|肏|草|艹)\s*(?:你|您)(?:妈|娘|全家)?/u,
  /(?:你|您)(?:他妈的?)?(?:是|真是|就是)?\s*(?:傻逼|傻屄|煞笔|沙比|蠢货|白痴|脑残|垃圾|废物|人渣|贱人|狗东西)/u,
  /(?:你|您)\s*(?:不配活着|怎么不去死|应该去死)/u,
  /(?:我|老子)\s*(?:要|会|迟早)\s*(?:弄死|杀了|打死|砍死)\s*(?:你|您)/u,
  /(?:去死|滚蛋|滚开)/u,
  /\b(?:nmsl|cao\s*ni\s*ma|sha\s*bi)\b/iu,
];

export function countCharacters(value) {
  return Array.from(value).length;
}

export function normalizeDisplayName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/gu, " ") : "";
}

export function normalizeComment(value) {
  return typeof value === "string"
    ? value.replace(/\r\n?/gu, "\n").trim()
    : "";
}

export function containsHan(value) {
  return /\p{Script=Han}/u.test(value);
}

export function looksLikeObviousSpam(value) {
  const urls = value.match(/(?:https?:\/\/|www\.)\S+/giu) || [];
  const promotional =
    /\b(?:buy now|limited offer|promo code|guaranteed income|crypto giveaway|contact me on telegram|whatsapp me)\b/iu.test(
      value,
    ) ||
    /(?:加微信|稳赚|返利|推广链接|限时优惠|代开发票|博彩|下注)/u.test(value);

  return urls.length >= 2 || (urls.length >= 1 && promotional);
}

export function looksLikeTargetedAbuse(value) {
  if (typeof value !== "string") return false;

  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  return TARGETED_ABUSE_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
}

export function parseModerationDecision(result) {
  const output =
    typeof result === "string"
      ? result
      : typeof result?.response === "string"
        ? result.response
        : "";
  const firstLine = output.trim().split(/\r?\n/u, 1)[0]?.toLowerCase();

  if (firstLine === "safe") return "safe";
  if (firstLine === "unsafe") return "unsafe";
  return "unknown";
}

export function encodeCursor(comment) {
  return btoa(
    JSON.stringify({
      createdAt: Number(comment.created_at),
      id: String(comment.id),
    }),
  )
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/u, "");
}

export function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== "string" || cursor.length > 256) return null;

  try {
    const normalized = cursor.replace(/-/gu, "+").replace(/_/gu, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    const parsed = JSON.parse(atob(normalized + padding));
    if (
      !Number.isSafeInteger(parsed.createdAt) ||
      typeof parsed.id !== "string" ||
      parsed.id.length < 1 ||
      parsed.id.length > 64
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders,
    },
  });
}

function errorResponse(code, status, extraHeaders = {}) {
  return jsonResponse({ ok: false, error: { code } }, status, extraHeaders);
}

function publicComment(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    body: row.body,
    createdAt: new Date(Number(row.created_at)).toISOString(),
  };
}

function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function readJsonBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new Error("UNSUPPORTED_MEDIA_TYPE");
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export function validateSubmission(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  if (typeof payload.website === "string" && payload.website.trim()) {
    return { ok: false, code: "BOT_DETECTED" };
  }

  const displayName = normalizeDisplayName(payload.displayName);
  const body = normalizeComment(payload.body);
  const turnstileToken =
    typeof payload.turnstileToken === "string"
      ? payload.turnstileToken.trim()
      : "";

  if (
    countCharacters(displayName) < 1 ||
    countCharacters(displayName) > MAX_DISPLAY_NAME_LENGTH ||
    countCharacters(body) < 1 ||
    countCharacters(body) > MAX_COMMENT_LENGTH
  ) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  if (!turnstileToken || turnstileToken.length > 2048) {
    return { ok: false, code: "VERIFICATION_FAILED" };
  }

  return {
    ok: true,
    displayName,
    body,
    turnstileToken,
  };
}

async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) {
    return { ok: false, configurationError: true };
  }

  const remoteIp = request.headers.get("cf-connecting-ip") || "";
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET_KEY);
  form.set("response", token);
  if (remoteIp) form.set("remoteip", remoteIp);
  form.set("idempotency_key", crypto.randomUUID());

  const startedAt = Date.now();
  const abortController = new AbortController();
  const timeoutId = setTimeout(
    () => abortController.abort("Turnstile verification timed out"),
    TURNSTILE_TIMEOUT_MS,
  );
  let response;

  console.log("[comments] Turnstile verification started");
  try {
    response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: form,
        signal: abortController.signal,
      },
    );
    console.log(
      `[comments] Turnstile verification completed in ${Date.now() - startedAt}ms`,
    );
  } catch (error) {
    console.error(
      `[comments] Turnstile verification failed after ${Date.now() - startedAt}ms:`,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) return { ok: false };

  const result = await response.json();
  const requestHostname = new URL(request.url).hostname;
  const allowTestKeys = env.TURNSTILE_ALLOW_TEST_KEYS === "true";
  const hostnameMatches =
    allowTestKeys ||
    !result.hostname ||
    result.hostname.toLowerCase() === requestHostname.toLowerCase();
  const actionMatches =
    allowTestKeys || result.action === TURNSTILE_ACTION;

  return {
    ok: result.success === true && hostnameMatches && actionMatches,
  };
}

async function hashRateLimitIdentity(ipAddress, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(ipAddress || "unknown"),
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function reserveRateLimit(db, request, env, now) {
  if (!env.RATE_LIMIT_SECRET) {
    return { ok: false, configurationError: true };
  }

  const identityHash = await hashRateLimitIdentity(
    request.headers.get("cf-connecting-ip") || "unknown",
    env.RATE_LIMIT_SECRET,
  );
  const minuteBucket = Math.floor(now / 60_000);
  const result = await db
    .prepare(
      `INSERT INTO comment_rate_limits (
        identity_hash,
        minute_bucket,
        created_at
      ) VALUES (?, ?, ?)
      ON CONFLICT(identity_hash, minute_bucket) DO NOTHING`,
    )
    .bind(identityHash, minuteBucket, now)
    .run();

  return {
    ok: Number(result.meta?.changes || 0) === 1,
  };
}

function translatedText(result) {
  if (typeof result?.translated_text === "string") {
    return result.translated_text.trim();
  }
  if (typeof result?.response === "string") {
    return result.response.trim();
  }
  return "";
}

async function runAiWithTimeout(env, model, input, stage) {
  const startedAt = Date.now();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${stage} timed out`)),
      AI_TIMEOUT_MS,
    );
  });

  console.log(`[comments] ${stage} started`);
  try {
    const result = await Promise.race([
      env.AI.run(model, input),
      timeout,
    ]);
    console.log(
      `[comments] ${stage} completed in ${Date.now() - startedAt}ms`,
    );
    return result;
  } catch (error) {
    console.error(
      `[comments] ${stage} failed after ${Date.now() - startedAt}ms:`,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function moderateComment(env, displayName, body) {
  if (looksLikeTargetedAbuse(body)) {
    return {
      decision: "unsafe",
      result: "targeted_abuse",
    };
  }

  if (!env.AI) {
    return {
      decision: "pending",
      result: "ai_binding_unavailable",
    };
  }

  const originalText = `Display name: ${displayName}\nComment: ${body}`;
  let englishText = originalText;

  try {
    if (containsHan(originalText)) {
      const translation = await runAiWithTimeout(
        env,
        TRANSLATION_MODEL,
        {
          text: originalText,
          source_lang: "zh",
          target_lang: "en",
        },
        "Workers AI translation",
      );
      englishText = translatedText(translation);
      if (!englishText) {
        return {
          decision: "pending",
          result: "translation_unavailable",
        };
      }
    }

    if (
      looksLikeTargetedAbuse(englishText) ||
      looksLikeObviousSpam(originalText) ||
      looksLikeObviousSpam(englishText)
    ) {
      return {
        decision: "unsafe",
        result: looksLikeTargetedAbuse(englishText)
          ? "targeted_abuse"
          : "obvious_spam",
      };
    }

    const moderation = await runAiWithTimeout(
      env,
      MODERATION_MODEL,
      {
        messages: [{ role: "user", content: englishText }],
        max_tokens: 32,
        temperature: 0,
      },
      "Workers AI moderation",
    );
    const decision = parseModerationDecision(moderation);

    if (decision === "safe" || decision === "unsafe") {
      return {
        decision,
        result: decision,
      };
    }

    return {
      decision: "pending",
      result: "moderation_unrecognized",
    };
  } catch {
    return {
      decision: "pending",
      result: "moderation_unavailable",
    };
  }
}

async function handleGet(context) {
  const { request, env } = context;
  if (!env.COMMENTS_DB) {
    return errorResponse("SERVICE_NOT_CONFIGURED", 503);
  }

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") || PAGE_SIZE);
  if (
    !Number.isInteger(requestedLimit) ||
    requestedLimit < 1 ||
    requestedLimit > PAGE_SIZE
  ) {
    return errorResponse("INVALID_CURSOR", 400);
  }

  const cursorValue = url.searchParams.get("cursor");
  const cursor = cursorValue ? decodeCursor(cursorValue) : null;
  if (cursorValue && !cursor) {
    return errorResponse("INVALID_CURSOR", 400);
  }

  let statement;
  if (cursor) {
    statement = env.COMMENTS_DB.prepare(
      `SELECT id, display_name, body, created_at
      FROM comments
      WHERE status = 'approved'
        AND deleted_at IS NULL
        AND (
          created_at < ?
          OR (created_at = ? AND id < ?)
        )
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    ).bind(
      cursor.createdAt,
      cursor.createdAt,
      cursor.id,
      requestedLimit + 1,
    );
  } else {
    statement = env.COMMENTS_DB.prepare(
      `SELECT id, display_name, body, created_at
      FROM comments
      WHERE status = 'approved'
        AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    ).bind(requestedLimit + 1);
  }

  const result = await statement.all();
  const rows = Array.isArray(result.results) ? result.results : [];
  const hasMore = rows.length > requestedLimit;
  const pageRows = hasMore ? rows.slice(0, requestedLimit) : rows;
  const nextCursor =
    hasMore && pageRows.length
      ? encodeCursor(pageRows[pageRows.length - 1])
      : null;

  return jsonResponse(
    {
      ok: true,
      comments: pageRows.map(publicComment),
      nextCursor,
    },
    200,
    {
      "cache-control": "public, max-age=0, s-maxage=30",
    },
  );
}

async function handlePost(context) {
  const { request, env } = context;
  if (!env.COMMENTS_DB) {
    return errorResponse("SERVICE_NOT_CONFIGURED", 503);
  }
  if (!isSameOrigin(request)) {
    return errorResponse("ORIGIN_NOT_ALLOWED", 403);
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_JSON";
    const status =
      code === "PAYLOAD_TOO_LARGE"
        ? 413
        : code === "UNSUPPORTED_MEDIA_TYPE"
          ? 415
          : 400;
    return errorResponse(code, status);
  }

  const submission = validateSubmission(payload);
  if (!submission.ok) {
    return errorResponse(
      submission.code,
      submission.code === "BOT_DETECTED" ? 400 : 422,
    );
  }

  let verification;
  try {
    verification = await verifyTurnstile(
      request,
      env,
      submission.turnstileToken,
    );
  } catch {
    return errorResponse("VERIFICATION_FAILED", 422);
  }
  if (verification.configurationError) {
    return errorResponse("SERVICE_NOT_CONFIGURED", 503);
  }
  if (!verification.ok) {
    return errorResponse("VERIFICATION_FAILED", 422);
  }

  const now = Date.now();
  let rateLimit;
  try {
    rateLimit = await reserveRateLimit(
      env.COMMENTS_DB,
      request,
      env,
      now,
    );
  } catch {
    return errorResponse("SERVER_ERROR", 500);
  }
  if (rateLimit.configurationError) {
    return errorResponse("SERVICE_NOT_CONFIGURED", 503);
  }
  if (!rateLimit.ok) {
    return errorResponse("RATE_LIMITED", 429, {
      "retry-after": "60",
    });
  }

  if (context.waitUntil) {
    context.waitUntil(
      env.COMMENTS_DB.prepare(
        "DELETE FROM comment_rate_limits WHERE created_at < ?",
      )
        .bind(now - 86_400_000)
        .run()
        .catch(() => undefined),
    );
  }

  const moderation = await moderateComment(
    env,
    submission.displayName,
    submission.body,
  );

  if (moderation.decision === "unsafe") {
    return errorResponse("MODERATION_REJECTED", 422);
  }

  const id = crypto.randomUUID();
  const status =
    moderation.decision === "safe" ? "approved" : "pending";
  const needsReview = status === "pending" ? 1 : 0;

  try {
    await env.COMMENTS_DB.prepare(
      `INSERT INTO comments (
        id,
        display_name,
        body,
        status,
        moderation_result,
        needs_review,
        moderation_model,
        created_at,
        moderated_at,
        deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    )
      .bind(
        id,
        submission.displayName,
        submission.body,
        status,
        moderation.result,
        needsReview,
        MODERATION_MODEL,
        now,
        status === "approved" ? now : null,
      )
      .run();
  } catch {
    return errorResponse("SERVER_ERROR", 500);
  }

  if (status === "pending") {
    return jsonResponse(
      {
        ok: true,
        status: "pending",
        comment: { id },
      },
      202,
      { "cache-control": "no-store" },
    );
  }

  return jsonResponse(
    {
      ok: true,
      status: "published",
      comment: publicComment({
        id,
        display_name: submission.displayName,
        body: submission.body,
        created_at: now,
      }),
    },
    201,
    { "cache-control": "no-store" },
  );
}

export async function onRequest(context) {
  try {
    if (context.request.method === "GET") return await handleGet(context);
    if (context.request.method === "POST") return await handlePost(context);
    return errorResponse("METHOD_NOT_ALLOWED", 405, {
      allow: "GET, POST",
    });
  } catch {
    return errorResponse("SERVER_ERROR", 500);
  }
}
