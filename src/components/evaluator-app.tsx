"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import { ComparisonViewer } from "@/components/comparison-viewer";
import { getErrorFromResponse } from "@/lib/client-api-error";
import { getStoredViewMode, setStoredViewMode } from "@/lib/view-mode-storage";
import {
  AiReview,
  ComparisonViewMode,
  CompareResponse,
  RateLimitState,
} from "@/types/evaluator";

type EvaluatorStatus =
  | "idle"
  | "processing.compare.capture"
  | "processing.compare.diff"
  | "processing.review"
  | "ready"
  | "error";

const statusToTone: Record<EvaluatorStatus, "neutral" | "error"> = {
  idle: "neutral",
  "processing.compare.capture": "neutral",
  "processing.compare.diff": "neutral",
  "processing.review": "neutral",
  ready: "neutral",
  error: "error",
};

export function EvaluatorApp() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [designFileName, setDesignFileName] = useState("");

  const [status, setStatus] = useState<EvaluatorStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [comparisonMode, setComparisonMode] =
    useState<ComparisonViewMode>("slider");

  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  const [review, setReview] = useState<AiReview | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);

  const requestSequence = useRef(0);

  const formatUiError = ({
    message,
    requestId,
    hint,
  }: {
    message: string;
    requestId?: string;
    hint?: string;
  }): string => {
    const extras = [hint, requestId ? `Ref: ${requestId}` : undefined]
      .filter(Boolean)
      .join(" ");

    return extras ? `${message} ${extras}` : message;
  };

  useEffect(() => {
    setComparisonMode(getStoredViewMode());
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    fetch("/api/rate-limit", { signal: abortController.signal })
      .then(async (response) => {
        if (!response.ok) {
          const parsedError = await getErrorFromResponse(
            response,
            "Could not load AI quota right now.",
          );
          setStatusMessage(formatUiError(parsedError));
          return;
        }

        const payload = (await response.json()) as RateLimitState;
        if (
          typeof payload.limit === "number" &&
          typeof payload.remaining === "number" &&
          typeof payload.resetAt === "string"
        ) {
          setRateLimit(payload);
        }
      })
      .catch(() => {
        // Ignore load-time quota failures.
      });

    return () => abortController.abort();
  }, []);

  const isCompareBusy =
    status === "processing.compare.capture" || status === "processing.compare.diff";
  const isReviewBusy = status === "processing.review";

  const statusTone = statusToTone[status];

  const canCompare = Boolean(designFile) && Boolean(websiteUrl.trim()) && !isCompareBusy;

  const loadingMessage =
    status === "processing.compare.capture" || status === "processing.compare.diff"
      ? statusMessage
      : null;

  const handleModeChange = (next: ComparisonViewMode) => {
    setComparisonMode(next);
    setStoredViewMode(next);
  };

  const runComparison = async () => {
    if (!designFile) {
      setCompareError("Upload a design image before running comparison.");
      setStatus("error");
      return;
    }

    if (!websiteUrl.trim()) {
      setCompareError("Enter a website URL before running comparison.");
      setStatus("error");
      return;
    }

    setCompareError(null);
    setReviewError(null);
    setReview(null);

    const requestId = ++requestSequence.current;

    try {
      setStatus("processing.compare.capture");
      setStatusMessage("Capturing website using design image dimensions...");

      const formData = new FormData();
      formData.set("designImage", designFile);
      formData.set("websiteUrl", websiteUrl.trim());

      const response = await fetch("/api/compare", {
        method: "POST",
        body: formData,
      });

      if (requestSequence.current !== requestId) {
        return;
      }

      if (!response.ok) {
        const parsedError = await getErrorFromResponse(
          response,
          "Unable to process comparison.",
        );
        throw new Error(formatUiError(parsedError));
      }

      const payload = (await response.json()) as CompareResponse;

      setStatus("processing.compare.diff");
      setStatusMessage("Computing pixel comparison...");

      await new Promise((resolve) => {
        window.setTimeout(resolve, 320);
      });

      if (requestSequence.current !== requestId) {
        return;
      }

      setComparison(payload);
      setStatus("ready");
      setStatusMessage(null);
    } catch (error) {
      if (requestSequence.current !== requestId) {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Unable to process comparison.";
      setCompareError(message);
      setStatus("error");
      setStatusMessage("Comparison failed. Fix the issue and retry.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runComparison();
  };

  const runAiReview = async () => {
    if (!comparison) {
      return;
    }

    try {
      setReviewError(null);
      setStatus("processing.review");
      setStatusMessage("Generating AI review from current comparison...");

      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comparisonId: comparison.comparisonId,
          websiteUrl: websiteUrl.trim(),
          viewport: comparison.viewport,
          metrics: comparison.metrics,
          referenceImage: comparison.referenceImage,
          websiteImage: comparison.websiteImage,
          diffImage: comparison.diffImage,
        }),
      });

      if (!response.ok) {
        const parsedError = await getErrorFromResponse(
          response,
          "Unable to generate AI review.",
        );

        if (parsedError.rateLimit) {
          setRateLimit(parsedError.rateLimit);
        }

        throw new Error(formatUiError(parsedError));
      }

      const payload = (await response.json()) as {
        rateLimit?: RateLimitState;
        review?: AiReview;
      };

      if (payload.rateLimit) {
        setRateLimit(payload.rateLimit);
      }

      if (payload.review) {
        setReview(payload.review);
      }

      setStatus("ready");
      setStatusMessage(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to generate AI review.";
      setReviewError(message);
      setStatus("error");
      setStatusMessage("AI review failed. Check your quota or retry.");
    }
  };

  const formattedResetTime = useMemo(() => {
    if (!rateLimit?.resetAt) {
      return null;
    }

    const parsed = new Date(rateLimit.resetAt);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [rateLimit?.resetAt]);

  return (
    <div className="workspace-shell">
      <form className="control-panel" onSubmit={handleSubmit}>
        <label className="field">
          <span>Design Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setDesignFile(nextFile);
              setDesignFileName(nextFile?.name ?? "");
            }}
          />
        </label>

        <label className="field">
          <span>Website URL</span>
          <input
            type="url"
            placeholder="https://example.com"
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
          />
        </label>

        <div className="actions-row">
          <button type="submit" className="btn btn-primary" disabled={!canCompare}>
            {isCompareBusy ? "Processing..." : "Compare Design vs Website"}
          </button>
          {designFileName ? <p className="file-pill">{designFileName}</p> : null}
        </div>
      </form>

      <div className={clsx("status-banner", `tone-${statusTone}`)}>
        {statusMessage ?? "Upload a design and run the comparison."}
      </div>

      {compareError ? <p className="error-text">{compareError}</p> : null}

      {comparison ? (
        <section className="result-panel">
          <header className="result-header">
            <div className="toggle-group">
              <p>Comparison View</p>
              <div className="segmented">
                <button
                  type="button"
                  className={clsx(comparisonMode === "slider" && "active")}
                  onClick={() => handleModeChange("slider")}
                  disabled={isCompareBusy}
                >
                  Slider
                </button>
                <button
                  type="button"
                  className={clsx(comparisonMode === "sideBySide" && "active")}
                  onClick={() => handleModeChange("sideBySide")}
                  disabled={isCompareBusy}
                >
                  Side-by-side
                </button>
                <button
                  type="button"
                  className={clsx(comparisonMode === "heatmap" && "active")}
                  onClick={() => handleModeChange("heatmap")}
                  disabled={isCompareBusy}
                >
                  Heatmap
                </button>
              </div>
            </div>
          </header>

          <div className="metrics-row">
            <article>
              <p>Pixel Mismatch</p>
              <h3>{comparison.metrics.mismatchPercent}%</h3>
            </article>
            <article>
              <p>Compared Pixels</p>
              <h3>{comparison.metrics.totalPixels.toLocaleString()}</h3>
            </article>
            <article>
              <p>Detected Capture Size</p>
              <h3>
                {comparison.viewport.label} ({comparison.viewport.width}x
                {comparison.viewport.height})
              </h3>
            </article>
          </div>

          <ComparisonViewer
            mode={comparisonMode}
            referenceImage={comparison.referenceImage}
            websiteImage={comparison.websiteImage}
            diffImage={comparison.diffImage}
            imageWidth={comparison.viewport.width}
            imageHeight={comparison.viewport.height}
            isUpdating={isCompareBusy}
            loadingMessage={loadingMessage}
          />

          <section className="ai-review-panel">
            <div className="ai-header">
              <div>
                <h2>AI Review</h2>
                <p>
                  Get targeted implementation suggestions to close design gaps.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void runAiReview()}
                disabled={isReviewBusy || isCompareBusy}
              >
                {isReviewBusy ? "Reviewing..." : "Get AI Review"}
              </button>
            </div>

            {rateLimit ? (
              <p className="quota-text">
                AI quota: {rateLimit.remaining}/{rateLimit.limit} left this hour
                {formattedResetTime ? ` (resets at ${formattedResetTime})` : ""}
              </p>
            ) : null}

            {reviewError ? <p className="error-text">{reviewError}</p> : null}

            {review ? (
              <div className="review-content">
                <p className="review-summary">{review.summary}</p>

                <div className="review-list">
                  <h3>Findings</h3>
                  {review.findings.length === 0 ? (
                    <p>No specific findings returned.</p>
                  ) : (
                    review.findings.map((finding, index) => (
                      <article key={`${finding.category}-${index}`}>
                        <header>
                          <span>{finding.severity.toUpperCase()}</span>
                          <strong>{finding.category}</strong>
                        </header>
                        <p>{finding.observation}</p>
                        <p>{finding.suggestedFix}</p>
                        {finding.selectorHint ? (
                          <code>Selector: {finding.selectorHint}</code>
                        ) : null}
                        {finding.cssHint ? <code>CSS: {finding.cssHint}</code> : null}
                      </article>
                    ))
                  )}
                </div>

                <div className="review-list">
                  <h3>Priority Order</h3>
                  {review.priorityOrder.length === 0 ? (
                    <p>No priority list returned.</p>
                  ) : (
                    <ol>
                      {review.priorityOrder.map((entry, index) => (
                        <li key={`${entry}-${index}`}>{entry}</li>
                      ))}
                    </ol>
                  )}
                </div>

                <div className="review-list">
                  <h3>Recommended Changes</h3>
                  {review.recommendedChanges.length === 0 ? (
                    <p>No additional recommendations returned.</p>
                  ) : (
                    <ul>
                      {review.recommendedChanges.map((entry, index) => (
                        <li key={`${entry}-${index}`}>{entry}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </section>
      ) : null}
    </div>
  );
}
