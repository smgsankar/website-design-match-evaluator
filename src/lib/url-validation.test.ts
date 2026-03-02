import { afterEach, describe, expect, it, vi } from "vitest";

import { validateWebsiteUrl } from "@/lib/url-validation";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("validateWebsiteUrl", () => {
  it("rejects localhost by default", () => {
    const result = validateWebsiteUrl("http://localhost:3000");

    expect(result.ok).toBe(false);
  });

  it("accepts localhost when ALLOW_LOCALHOST_CAPTURE is true", () => {
    vi.stubEnv("ALLOW_LOCALHOST_CAPTURE", "true");

    const result = validateWebsiteUrl("http://localhost:3000");

    expect(result.ok).toBe(true);
  });

  it("rejects private IPv4 ranges", () => {
    const result = validateWebsiteUrl("http://192.168.1.3");

    expect(result.ok).toBe(false);
  });

  it("accepts public https urls", () => {
    const result = validateWebsiteUrl("https://example.com");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalizedUrl).toMatch(/^https:\/\/example\.com/);
    }
  });
});
