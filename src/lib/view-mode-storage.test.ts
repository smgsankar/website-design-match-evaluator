import { beforeEach, describe, expect, it } from "vitest";

import {
  COMPARISON_VIEW_STORAGE_KEY,
  getStoredViewMode,
  setStoredViewMode,
} from "@/lib/view-mode-storage";

describe("view mode storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns slider by default", () => {
    expect(getStoredViewMode()).toBe("slider");
  });

  it("persists side-by-side mode", () => {
    setStoredViewMode("sideBySide");

    expect(window.localStorage.getItem(COMPARISON_VIEW_STORAGE_KEY)).toBe(
      "sideBySide",
    );
    expect(getStoredViewMode()).toBe("sideBySide");
  });

  it("persists heatmap mode", () => {
    setStoredViewMode("heatmap");

    expect(window.localStorage.getItem(COMPARISON_VIEW_STORAGE_KEY)).toBe(
      "heatmap",
    );
    expect(getStoredViewMode()).toBe("heatmap");
  });

  it("falls back to slider for unknown values", () => {
    window.localStorage.setItem(COMPARISON_VIEW_STORAGE_KEY, "anything");

    expect(getStoredViewMode()).toBe("slider");
  });
});
