import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
};

const hasRedisConfig =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const ratelimit = hasRedisConfig
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX, "1 h"),
      analytics: true,
      prefix: "wdme-ai-review",
    })
  : null;

const localFallbackStore = new Map<string, { count: number; resetAt: number }>();

function fallbackLimit(userId: string): RateLimitResult {
  const now = Date.now();
  const current = localFallbackStore.get(userId);

  if (!current || now >= current.resetAt) {
    const resetAt = now + RATE_LIMIT_WINDOW_SECONDS * 1000;
    localFallbackStore.set(userId, { count: 1, resetAt });

    return {
      success: true,
      limit: RATE_LIMIT_MAX,
      remaining: RATE_LIMIT_MAX - 1,
      resetAt: new Date(resetAt).toISOString(),
    };
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return {
      success: false,
      limit: RATE_LIMIT_MAX,
      remaining: 0,
      resetAt: new Date(current.resetAt).toISOString(),
    };
  }

  current.count += 1;
  localFallbackStore.set(userId, current);

  return {
    success: true,
    limit: RATE_LIMIT_MAX,
    remaining: RATE_LIMIT_MAX - current.count,
    resetAt: new Date(current.resetAt).toISOString(),
  };
}

export async function consumeAiReviewLimit(userId: string): Promise<RateLimitResult> {
  if (!ratelimit) {
    return fallbackLimit(userId);
  }

  const result = await ratelimit.limit(userId);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    resetAt: new Date(result.reset).toISOString(),
  };
}

export async function peekAiReviewLimit(userId: string): Promise<RateLimitResult> {
  if (!ratelimit) {
    const now = Date.now();
    const current = localFallbackStore.get(userId);

    if (!current || now >= current.resetAt) {
      return {
        success: true,
        limit: RATE_LIMIT_MAX,
        remaining: RATE_LIMIT_MAX,
        resetAt: new Date(now + RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString(),
      };
    }

    return {
      success: current.count < RATE_LIMIT_MAX,
      limit: RATE_LIMIT_MAX,
      remaining: Math.max(0, RATE_LIMIT_MAX - current.count),
      resetAt: new Date(current.resetAt).toISOString(),
    };
  }

  const result = await ratelimit.getRemaining(userId);

  return {
    success: result.remaining > 0,
    limit: RATE_LIMIT_MAX,
    remaining: result.remaining,
    resetAt: new Date(result.reset).toISOString(),
  };
}
