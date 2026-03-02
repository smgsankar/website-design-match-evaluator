import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { AppError, toErrorResponse, unauthorizedError } from "@/lib/api-errors";
import { peekAiReviewLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return toErrorResponse(unauthorizedError(), {
      code: "UNAUTHORIZED",
      message: "Sign in to check AI review quota.",
    });
  }

  try {
    const state = await peekAiReviewLimit(userId);

    if (
      typeof state.limit !== "number" ||
      typeof state.remaining !== "number" ||
      typeof state.resetAt !== "string"
    ) {
      throw new AppError({
        status: 500,
        code: "INTERNAL_ERROR",
        message: "Rate limit state is invalid.",
      });
    }

    return NextResponse.json({
      limit: state.limit,
      remaining: state.remaining,
      resetAt: state.resetAt,
    });
  } catch (error) {
    return toErrorResponse(error, {
      code: "INTERNAL_ERROR",
      message: "Failed to fetch AI review quota.",
    });
  }
}
