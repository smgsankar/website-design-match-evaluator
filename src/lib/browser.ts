import type { Browser } from "playwright-core";

import { ViewportConfig } from "@/types/evaluator";

const NAVIGATION_TIMEOUT_MS = 30_000;

async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL === "1") {
    const chromium = (await import("@sparticuz/chromium-min")).default;
    const playwright = await import("playwright-core");

    const executablePath =
      process.env.CHROMIUM_EXECUTABLE_PATH ?? (await chromium.executablePath());

    return playwright.chromium.launch({
      args: chromium.args,
      executablePath,
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

    await page.waitForTimeout(1200);

    const buffer = await page.screenshot({
      type: "png",
      fullPage: false,
      animations: "disabled",
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
