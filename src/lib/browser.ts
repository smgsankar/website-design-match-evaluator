import type { Browser } from "playwright-core";

import { ViewportConfig } from "@/types/evaluator";

const NAVIGATION_TIMEOUT_MS = 30_000;

async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL === "1") {
    const chromium = (await import("@sparticuz/chromium")).default;
    const playwright = await import("playwright-core");

    return playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const { chromium } = await import("playwright");

  return chromium.launch({
    headless: true,
  });
}

export async function captureWebsiteScreenshot(
  websiteUrl: string,
  viewport: ViewportConfig,
): Promise<Buffer> {
  const browser = await launchBrowser();

  try {
    const context = await browser.newContext({
      viewport: {
        width: viewport.width,
        height: viewport.height,
      },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    await page.goto(websiteUrl, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    try {
      await page.waitForLoadState("load", { timeout: 5_000 });
    } catch {
      // Some local dev servers never reach a stable load state; continue.
    }

    try {
      await page.evaluate(async () => {
        await document.fonts?.ready;
      });
    } catch {
      // Ignore font-readiness failures from cross-origin stylesheets.
    }

    await page.waitForTimeout(500);

    const buffer = await page.screenshot({
      type: "png",
      fullPage: false,
      animations: "disabled",
      omitBackground: true,
    });

    await context.close();

    return buffer;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown capture failure";
    throw new Error(`Unable to capture website screenshot: ${message}`);
  } finally {
    await browser.close();
  }
}
