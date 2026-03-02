import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { generateAiReview } from "@/lib/ai-review";
import { AppError, toErrorResponse, unauthorizedError } from "@/lib/api-errors";
import { consumeAiReviewLimit } from "@/lib/rate-limit";
import { RateLimitState } from "@/types/evaluator";

export const runtime = "nodejs";

function isImagePayload(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("data:image/") || value.startsWith("https://"))
  );
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return toErrorResponse(unauthorizedError(), {
      code: "UNAUTHORIZED",
      message: "Sign in to request AI review.",
    });
  }

  let rateLimitState: RateLimitState | undefined;

  try {
    const limitResult = await consumeAiReviewLimit(userId);

    rateLimitState = {
      limit: limitResult.limit,
      remaining: limitResult.remaining,
      resetAt: limitResult.resetAt,
    };

    if (!limitResult.success) {
      throw new AppError({
        status: 429,
        code: "RATE_LIMITED",
        message: "AI review limit reached for this hour.",
        hint: "Wait for the quota reset time, then try again.",
      });
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new AppError({
        status: 400,
        code: "INVALID_PAYLOAD",
        message: "Request payload is invalid JSON.",
      });
    }

    const typedBody = body as Record<string, unknown>;
    const referenceImage = typedBody.referenceImage ?? typedBody.designImage;
    const websiteImage = typedBody.websiteImage ?? typedBody.capturedImage;
    const diffImage = typedBody.diffImage;

    if (!isImagePayload(referenceImage)) {
      throw new AppError({
        status: 400,
        code: "INVALID_PAYLOAD",
        message: "Reference image is missing from the review request.",
      });
    }

    if (!isImagePayload(websiteImage) || !isImagePayload(diffImage)) {
      throw new AppError({
        status: 400,
        code: "INVALID_PAYLOAD",
        message: "Website capture and diff images are required for AI review.",
      });
    }

    if (typeof typedBody.websiteUrl !== "string" || !typedBody.websiteUrl) {
      throw new AppError({
        status: 400,
        code: "INVALID_PAYLOAD",
        message: "Website URL is required for AI review.",
      });
    }

    let review;

    try {
      review = await generateAiReview({
        websiteUrl: typedBody.websiteUrl,
        viewport: {
          name: (typedBody.viewport as { name?: string } | undefined)?.name ?? "desktop",
          width: Number(
            (typedBody.viewport as { width?: number } | undefined)?.width ?? 1440,
          ),
          height: Number(
            (typedBody.viewport as { height?: number } | undefined)?.height ?? 900,
          ),
        },
        metrics: {
          mismatchPercent: Number(
            (typedBody.metrics as { mismatchPercent?: number } | undefined)
              ?.mismatchPercent ?? 0,
          ),
          mismatchPixels: Number(
            (typedBody.metrics as { mismatchPixels?: number } | undefined)
              ?.mismatchPixels ?? 0,
          ),
          totalPixels: Number(
            (typedBody.metrics as { totalPixels?: number } | undefined)
              ?.totalPixels ?? 0,
          ),
        },
        referenceImage,
        websiteImage,
        diffImage,
      });
    } catch {
      throw new AppError({
        status: 502,
        code: "AI_UNAVAILABLE",
        message: "AI review service is currently unavailable.",
        hint: "Check AI provider credentials and try again shortly.",
      });
    }

    return NextResponse.json({
      rateLimit: rateLimitState,
      review,
    });
  } catch (error) {
    const extras = rateLimitState ? { rateLimit: rateLimitState } : undefined;

    return toErrorResponse(
      error,
      {
        code: "INTERNAL_ERROR",
        message: "Failed to process AI review.",
      },
      extras,
    );
  }
}
