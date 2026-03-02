import { ComparisonViewMode } from "@/types/evaluator";

export const COMPARISON_VIEW_STORAGE_KEY = "wdme:comparisonMode";

export function getStoredViewMode(): ComparisonViewMode {
  if (typeof window === "undefined") {
    return "slider";
  }

  const raw = window.localStorage.getItem(COMPARISON_VIEW_STORAGE_KEY);

  if (raw === "sideBySide") {
    return "sideBySide";
  }

  if (raw === "heatmap") {
    return "heatmap";
  }

  return "slider";
}

export function setStoredViewMode(mode: ComparisonViewMode): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(COMPARISON_VIEW_STORAGE_KEY, mode);
}
