import { RateLimitState } from "@/types/evaluator";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "BAD_REQUEST"
  | "INVALID_PAYLOAD"
  | "URL_BLOCKED"
  | "IMAGE_INVALID"
  | "IMAGE_TOO_LARGE"
  | "CAPTURE_FAILED"
  | "DIFF_FAILED"
  | "RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type ApiErrorDetails = {
  code: ApiErrorCode;
  message: string;
  hint?: string;
  requestId: string;
};

export type ApiErrorResponse = {
  error: ApiErrorDetails;
  rateLimit?: RateLimitState;
};
