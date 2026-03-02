import { describe, expect, it } from "vitest";

import { getErrorFromResponse } from "@/lib/client-api-error";

describe("getErrorFromResponse", () => {
  it("parses structured API errors", async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: "RATE_LIMITED",
          message: "AI review limit reached.",
          hint: "Wait an hour.",
          requestId: "req_123",
        },
        rateLimit: {
          limit: 5,
          remaining: 0,
          resetAt: "2026-03-02T12:00:00.000Z",
        },
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      },
    );

    const parsed = await getErrorFromResponse(response);

    expect(parsed.code).toBe("RATE_LIMITED");
    expect(parsed.message).toBe("AI review limit reached.");
    expect(parsed.hint).toBe("Wait an hour.");
    expect(parsed.requestId).toBe("req_123");
    expect(parsed.rateLimit?.remaining).toBe(0);
  });

  it("falls back for non-json error payloads", async () => {
    const response = new Response("plain-text failure", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });

    const parsed = await getErrorFromResponse(response, "Fallback message");

    expect(parsed.code).toBe("UNKNOWN");
    expect(parsed.message).toBe("Fallback message");
  });
});
