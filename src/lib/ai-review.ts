import OpenAI from "openai";

import { AiReview } from "@/types/evaluator";

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
  });
}

function sanitizeReview(review: Partial<AiReview>): AiReview {
  return {
    summary:
      typeof review.summary === "string"
        ? review.summary
        : "Generated review is unavailable.",
    findings: Array.isArray(review.findings)
      ? review.findings
          .filter((item): item is NonNullable<AiReview["findings"][number]> => Boolean(item))
          .map((finding) => ({
            category:
              finding.category === "layout" ||
              finding.category === "spacing" ||
              finding.category === "typography" ||
              finding.category === "color" ||
              finding.category === "component"
                ? finding.category
                : "layout",
            severity:
              finding.severity === "high" ||
              finding.severity === "medium" ||
              finding.severity === "low"
                ? finding.severity
                : "medium",
            observation:
              typeof finding.observation === "string"
                ? finding.observation
                : "Mismatch identified.",
            suggestedFix:
              typeof finding.suggestedFix === "string"
                ? finding.suggestedFix
                : "Adjust layout styles to better match the design.",
            selectorHint:
              typeof finding.selectorHint === "string"
                ? finding.selectorHint
                : undefined,
            cssHint:
              typeof finding.cssHint === "string" ? finding.cssHint : undefined,
          }))
      : [],
    recommendedChanges: Array.isArray(review.recommendedChanges)
      ? review.recommendedChanges.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    priorityOrder: Array.isArray(review.priorityOrder)
      ? review.priorityOrder.filter((item): item is string => typeof item === "string")
      : [],
  };
}

type GenerateReviewInput = {
  websiteUrl: string;
  viewport: {
    name: string;
    width: number;
    height: number;
  };
  metrics: {
    mismatchPercent: number;
    mismatchPixels: number;
    totalPixels: number;
  };
  referenceImage: string;
  websiteImage: string;
  diffImage: string;
};

export async function generateAiReview(
  payload: GenerateReviewInput,
): Promise<AiReview> {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content:
          "You are a senior frontend design QA reviewer. The uploaded REFERENCE DESIGN is the immutable source-of-truth target. The CAPTURED WEBSITE is the implementation that must be changed to match the reference. Never suggest changing the reference design. Analyze differences and produce strict JSON with this shape: { summary: string, findings: Array<{ category: 'layout'|'spacing'|'typography'|'color'|'component', severity: 'high'|'medium'|'low', observation: string, suggestedFix: string, selectorHint?: string, cssHint?: string }>, recommendedChanges: string[], priorityOrder: string[] }. Keep it concise, actionable, and implementation-focused.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Website URL: ${payload.websiteUrl}\nViewport: ${payload.viewport.name} (${payload.viewport.width}x${payload.viewport.height})\nMismatch: ${payload.metrics.mismatchPercent}% (${payload.metrics.mismatchPixels}/${payload.metrics.totalPixels})\nImportant mapping:\n- Reference design image = TARGET (do not change this)\n- Captured website image = CURRENT implementation (this must be changed)\n- Diff heatmap = mismatch visualization\nProvide only website implementation changes to match the reference exactly.`,
          },
          {
            type: "text",
            text: "Image 1: Reference design (target).",
          },
          {
            type: "image_url",
            image_url: {
              url: payload.referenceImage,
            },
          },
          {
            type: "text",
            text: "Image 2: Captured website (needs changes).",
          },
          {
            type: "image_url",
            image_url: {
              url: payload.websiteImage,
            },
          },
          {
            type: "text",
            text: "Image 3: Diff heatmap.",
          },
          {
            type: "image_url",
            image_url: {
              url: payload.diffImage,
            },
          },
        ],
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    throw new Error("AI review did not return any content.");
  }

  let parsed: Partial<AiReview>;
  try {
    parsed = JSON.parse(raw) as Partial<AiReview>;
  } catch {
    throw new Error("AI review response was not valid JSON.");
  }

  return sanitizeReview(parsed);
}
