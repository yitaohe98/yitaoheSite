import assert from "node:assert/strict";
import test from "node:test";

import {
  containsHan,
  countCharacters,
  decodeCursor,
  encodeCursor,
  looksLikeObviousSpam,
  looksLikeTargetedAbuse,
  normalizeComment,
  normalizeDisplayName,
  onRequest,
  parseModerationDecision,
  validateSubmission,
} from "../functions/api/comments.js";

test("normalizes and counts bilingual input by Unicode code point", () => {
  assert.equal(normalizeDisplayName("  Yitao   He  "), "Yitao He");
  assert.equal(normalizeComment(" hello\r\nworld \r"), "hello\nworld");
  assert.equal(countCharacters("你好😀"), 3);
  assert.equal(containsHan("hello"), false);
  assert.equal(containsHan("hello 世界"), true);
});

test("validates comment limits and Turnstile token", () => {
  assert.deepEqual(
    validateSubmission({
      displayName: " Visitor ",
      body: " 你好 ",
      website: "",
      turnstileToken: "token",
    }),
    {
      ok: true,
      displayName: "Visitor",
      body: "你好",
      turnstileToken: "token",
    },
  );

  assert.equal(
    validateSubmission({
      displayName: "",
      body: "hello",
      turnstileToken: "token",
    }).code,
    "INVALID_INPUT",
  );
  assert.equal(
    validateSubmission({
      displayName: "Visitor",
      body: "hello",
      website: "https://spam.example",
      turnstileToken: "token",
    }).code,
    "BOT_DETECTED",
  );
});

test("encodes and validates stable pagination cursors", () => {
  const cursor = encodeCursor({
    created_at: 1_721_824_000_000,
    id: "comment-id",
  });
  assert.deepEqual(decodeCursor(cursor), {
    createdAt: 1_721_824_000_000,
    id: "comment-id",
  });
  assert.equal(decodeCursor("not-valid"), null);
});

test("parses guard responses and catches only obvious spam", () => {
  assert.equal(parseModerationDecision({ response: "safe\n" }), "safe");
  assert.equal(
    parseModerationDecision({ response: "unsafe\nS1,S2" }),
    "unsafe",
  );
  assert.equal(parseModerationDecision({ response: "maybe" }), "unknown");
  assert.equal(looksLikeObviousSpam("See https://example.com"), false);
  assert.equal(
    looksLikeObviousSpam(
      "Limited offer https://one.example and https://two.example",
    ),
    true,
  );
});

test("detects targeted abuse without blanket-blocking profanity discussion", () => {
  assert.equal(looksLikeTargetedAbuse("Fuck you"), true);
  assert.equal(looksLikeTargetedAbuse("f.u.c.k y\u200Bou"), true);
  assert.equal(looksLikeTargetedAbuse("You're a worthless loser"), true);
  assert.equal(looksLikeTargetedAbuse("Go fuck yourself"), true);
  assert.equal(looksLikeTargetedAbuse("I am going to hurt you"), true);
  assert.equal(looksLikeTargetedAbuse("Kill yourself"), true);
  assert.equal(looksLikeTargetedAbuse("Those people are vermin"), true);
  assert.equal(looksLikeTargetedAbuse("你是傻逼"), true);
  assert.equal(looksLikeTargetedAbuse("你怎么不去死"), true);
  assert.equal(looksLikeTargetedAbuse("老子迟早弄死你"), true);
  assert.equal(looksLikeTargetedAbuse("nmsl"), true);
  assert.equal(looksLikeTargetedAbuse("This discusses the word fuck."), false);
  assert.equal(looksLikeTargetedAbuse("I disagree with your argument."), false);
  assert.equal(looksLikeTargetedAbuse("Please kill the server process."), false);
  assert.equal(looksLikeTargetedAbuse("The garbage collector is running."), false);
});

function createPostHarness({
  moderationResponse = { response: "safe" },
  translationResponse = { translated_text: "Display name: Visitor\nComment: Hello" },
  rateLimitChanges = 1,
  aiError = false,
} = {}) {
  const calls = {
    ai: [],
    insertedComment: null,
  };

  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (
                sql.includes("INSERT INTO comment_rate_limits")
              ) {
                return { meta: { changes: rateLimitChanges } };
              }
              if (sql.includes("INSERT INTO comments")) {
                calls.insertedComment = args;
                return { meta: { changes: 1 } };
              }
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };

  const ai = {
    async run(model, input) {
      calls.ai.push({ model, input });
      if (aiError) throw new Error("AI unavailable");
      if (model.includes("m2m100")) return translationResponse;
      return moderationResponse;
    },
  };

  const env = {
    COMMENTS_DB: db,
    AI: ai,
    TURNSTILE_SECRET_KEY: "test-secret",
    RATE_LIMIT_SECRET: "rate-limit-secret-at-least-32-characters",
  };

  return { calls, env };
}

async function submitComment(harness, body = "Hello") {
  const pending = [];
  const request = new Request("https://example.com/api/comments", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.12",
      origin: "https://example.com",
    },
    body: JSON.stringify({
      displayName: "Visitor",
      body,
      website: "",
      turnstileToken: "valid-token",
    }),
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      success: true,
      hostname: "example.com",
      action: "comment_submit",
    });

  try {
    const response = await onRequest({
      request,
      env: harness.env,
      waitUntil(promise) {
        pending.push(promise);
      },
    });
    await Promise.all(pending);
    return response;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("translates Chinese before moderation and publishes safe input", async () => {
  const harness = createPostHarness();
  const response = await submitComment(harness, "你好");
  const payload = await response.json();

  assert.equal(response.status, 201);
  assert.equal(payload.status, "published");
  assert.equal(harness.calls.ai.length, 2);
  assert.match(harness.calls.ai[0].model, /m2m100/u);
  assert.match(harness.calls.ai[1].model, /llama-guard/u);
  assert.equal(harness.calls.insertedComment[3], "approved");
});

test("stores a private pending comment when moderation is unavailable", async () => {
  const harness = createPostHarness({ aiError: true });
  const response = await submitComment(harness);
  const payload = await response.json();

  assert.equal(response.status, 202);
  assert.equal(payload.status, "pending");
  assert.equal(harness.calls.insertedComment[3], "pending");
  assert.equal(harness.calls.insertedComment[5], 1);
});

test("does not store comments classified as unsafe", async () => {
  const harness = createPostHarness({
    moderationResponse: { response: "unsafe\nS1" },
  });
  const response = await submitComment(harness);
  const payload = await response.json();

  assert.equal(response.status, 422);
  assert.equal(payload.error.code, "MODERATION_REJECTED");
  assert.equal(harness.calls.insertedComment, null);
});

test("rejects targeted abuse before calling Workers AI", async () => {
  const harness = createPostHarness();
  const response = await submitComment(harness, "Fuck you");
  const payload = await response.json();

  assert.equal(response.status, 422);
  assert.equal(payload.error.code, "MODERATION_REJECTED");
  assert.equal(harness.calls.ai.length, 0);
  assert.equal(harness.calls.insertedComment, null);
});

test("applies the approximate one-per-minute limit before AI work", async () => {
  const harness = createPostHarness({ rateLimitChanges: 0 });
  const response = await submitComment(harness);
  const payload = await response.json();

  assert.equal(response.status, 429);
  assert.equal(payload.error.code, "RATE_LIMITED");
  assert.equal(harness.calls.ai.length, 0);
});

test("returns only public fields with a stable next cursor", async () => {
  const rows = Array.from({ length: 21 }, (_, index) => ({
    id: `comment-${String(21 - index).padStart(2, "0")}`,
    display_name: `Visitor ${index + 1}`,
    body: `Comment ${index + 1}`,
    created_at: 1_721_824_000_000 - index,
    moderation_result: "must-not-leak",
  }));
  const db = {
    prepare() {
      return {
        bind() {
          return {
            async all() {
              return { results: rows };
            },
          };
        },
      };
    },
  };

  const response = await onRequest({
    request: new Request("https://example.com/api/comments?limit=20"),
    env: { COMMENTS_DB: db },
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.comments.length, 20);
  assert.ok(payload.nextCursor);
  assert.deepEqual(Object.keys(payload.comments[0]).sort(), [
    "body",
    "createdAt",
    "displayName",
    "id",
  ]);
  assert.equal(
    decodeCursor(payload.nextCursor).id,
    rows[19].id,
  );
});
