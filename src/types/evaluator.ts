export type ComparisonViewMode = "slider" | "sideBySide" | "heatmap";

export type ViewportConfig = {
  name: string;
  width: number;
  height: number;
  label: string;
};

export type ComparisonMetrics = {
  mismatchPercent: number;
  mismatchPixels: number;
  totalPixels: number;
};

export type CompareResponse = {
  comparisonId: string;
  referenceImage: string;
  websiteImage: string;
  diffImage: string;
  metrics: ComparisonMetrics;
  viewport: ViewportConfig;
};

export type AiFinding = {
  category: "layout" | "spacing" | "typography" | "color" | "component";
  severity: "high" | "medium" | "low";
  observation: string;
  suggestedFix: string;
  selectorHint?: string;
  cssHint?: string;
};

export type AiReview = {
  summary: string;
  findings: AiFinding[];
  recommendedChanges: string[];
  priorityOrder: string[];
};

export type RateLimitState = {
  limit: number;
  remaining: number;
  resetAt: string;
};

export type ReviewResponse = {
  rateLimit: RateLimitState;
  review: AiReview;
};
