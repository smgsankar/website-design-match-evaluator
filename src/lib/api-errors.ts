import { NextResponse } from "next/server";

import { ApiErrorCode, ApiErrorResponse } from "@/types/api";

type ErrorOptions = {
  status: number;
  code: ApiErrorCode;
  message: string;
  hint?: string;
};

export class AppError extends Error {
  status: number;
  code: ApiErrorCode;
  hint?: string;

  constructor(options: ErrorOptions) {
    super(options.message);
    this.status = options.status;
    this.code = options.code;
    this.hint = options.hint;
  }
}

export function toErrorResponse(
  error: unknown,
  fallback: Omit<ErrorOptions, "status"> & { status?: number },
  extras?: Pick<ApiErrorResponse, "rateLimit">,
): NextResponse<ApiErrorResponse> {
  const requestId = crypto.randomUUID();

  if (error instanceof AppError) {
    const body: ApiErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        hint: error.hint,
        requestId,
      },
      ...extras,
    };

    if (error.status >= 500) {
      console.error(`[${requestId}] ${error.code}: ${error.message}`);
    }

    return NextResponse.json(body, { status: error.status });
  }

  const status = fallback.status ?? 500;
  const body: ApiErrorResponse = {
    error: {
      code: fallback.code,
      message: fallback.message,
      hint: fallback.hint,
      requestId,
    },
    ...extras,
  };

  if (error instanceof Error) {
    console.error(`[${requestId}] Unexpected error`, error);
  } else {
    console.error(`[${requestId}] Unexpected non-error throw`, { error });
  }

  return NextResponse.json(body, { status });
}

export function unauthorizedError(): AppError {
  return new AppError({
    status: 401,
    code: "UNAUTHORIZED",
    message: "Sign in to use this feature.",
  });
}
