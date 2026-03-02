import { ApiErrorResponse } from "@/types/api";
import { RateLimitState } from "@/types/evaluator";

export type ClientApiError = {
  message: string;
  code: string;
  requestId?: string;
  hint?: string;
  rateLimit?: RateLimitState;
};

const STATUS_FALLBACK: Record<number, string> = {
  400: "The request is invalid. Check your input and try again.",
  401: "Please sign in and retry.",
  403: "You do not have permission for this action.",
  404: "The requested resource was not found.",
  408: "The request timed out. Try again.",
  413: "Uploaded file is too large.",
  429: "Rate limit reached. Please wait and retry.",
  500: "Server error occurred. Please try again.",
  502: "Upstream service error. Please retry shortly.",
  503: "Service is temporarily unavailable. Please retry shortly.",
  504: "The operation took too long. Try again.",
};

function fallbackMessage(status: number, provided?: string): string {
  if (provided) {
    return provided;
  }

  return STATUS_FALLBACK[status] ?? "Request failed. Please try again.";
}

function parseRateLimit(value: unknown): RateLimitState | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const typed = value as Record<string, unknown>;
  if (
    typeof typed.limit === "number" &&
    typeof typed.remaining === "number" &&
    typeof typed.resetAt === "string"
  ) {
    return {
      limit: typed.limit,
      remaining: typed.remaining,
      resetAt: typed.resetAt,
    };
  }

  return undefined;
}

export async function getErrorFromResponse(
  response: Response,
  defaultMessage?: string,
): Promise<ClientApiError> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return {
      message: fallbackMessage(response.status, defaultMessage),
      code: "UNKNOWN",
    };
  }

  const typed = payload as Partial<ApiErrorResponse> & { error?: unknown };

  if (typeof typed.error === "string") {
    return {
      message: fallbackMessage(response.status, typed.error),
      code: "LEGACY",
      rateLimit: parseRateLimit((typed as { rateLimit?: unknown }).rateLimit),
    };
  }

  if (typed.error && typeof typed.error === "object") {
    const errorObject = typed.error as Record<string, unknown>;
    const message =
      typeof errorObject.message === "string"
        ? errorObject.message
        : defaultMessage;

    return {
      message: fallbackMessage(response.status, message),
      code:
        typeof errorObject.code === "string" ? errorObject.code : "UNKNOWN",
      requestId:
        typeof errorObject.requestId === "string"
          ? errorObject.requestId
          : undefined,
      hint:
        typeof errorObject.hint === "string" ? errorObject.hint : undefined,
      rateLimit: parseRateLimit((typed as { rateLimit?: unknown }).rateLimit),
    };
  }

  return {
    message: fallbackMessage(response.status, defaultMessage),
    code: "UNKNOWN",
  };
}
