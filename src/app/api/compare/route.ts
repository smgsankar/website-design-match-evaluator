import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { AppError, toErrorResponse, unauthorizedError } from "@/lib/api-errors";
import { captureWebsiteScreenshot } from "@/lib/browser";
import { bufferToDataUrl, generateDiff } from "@/lib/image-diff";
import { validateWebsiteUrl } from "@/lib/url-validation";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIEWPORT_WIDTH = 2560;
const MAX_VIEWPORT_HEIGHT = 2560;

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return toErrorResponse(unauthorizedError(), {
      code: "UNAUTHORIZED",
      message: "Sign in to compare design and website screenshots.",
    });
  }

  try {
    const formData = await request.formData();
    const designImage = formData.get("designImage");
    const websiteUrl = formData.get("websiteUrl");

    if (!(designImage instanceof File)) {
      throw new AppError({
        status: 400,
        code: "IMAGE_INVALID",
        message: "Upload a design image to continue.",
      });
    }

    if (designImage.size > MAX_IMAGE_BYTES) {
      throw new AppError({
        status: 400,
        code: "IMAGE_TOO_LARGE",
        message: "Design image exceeds the 5MB limit.",
      });
    }

    if (!designImage.type.startsWith("image/")) {
      throw new AppError({
        status: 400,
        code: "IMAGE_INVALID",
        message: "Design file must be an image format.",
      });
    }

    const urlValue = websiteUrl?.toString() ?? "";
    const urlValidation = validateWebsiteUrl(urlValue);
    if (!urlValidation.ok) {
      throw new AppError({
        status: 400,
        code: "URL_BLOCKED",
        message: urlValidation.error,
      });
    }

    const designBuffer = Buffer.from(await designImage.arrayBuffer());
    const designMeta = await sharp(designBuffer).metadata();

    if (!designMeta.width || !designMeta.height) {
      throw new AppError({
        status: 400,
        code: "IMAGE_INVALID",
        message: "Unable to read design image dimensions.",
      });
    }

    if (
      designMeta.width > MAX_VIEWPORT_WIDTH ||
      designMeta.height > MAX_VIEWPORT_HEIGHT
    ) {
      throw new AppError({
        status: 400,
        code: "BAD_REQUEST",
        message:
          "Design image dimensions are too large for capture. Keep it within 2560x2560.",
      });
    }

    const viewport = {
      name: "detected",
      label: "Design image",
      width: designMeta.width,
      height: designMeta.height,
    };

    let capturedBuffer: Buffer;

    try {
      capturedBuffer = await captureWebsiteScreenshot(
        urlValidation.normalizedUrl,
        viewport,
      );
    } catch(error) {
      throw new AppError({
        status: 502,
        code: "CAPTURE_FAILED",
        message: error instanceof Error ? error.message : "Could not capture the website screenshot.",
        hint: "Ensure the URL is publicly reachable and fully loaded in a browser.",
      });
    }

    let diffResult;

    try {
      diffResult = await generateDiff(designBuffer, capturedBuffer);
    } catch {
      throw new AppError({
        status: 500,
        code: "DIFF_FAILED",
        message: "Unable to compute pixel comparison for these images.",
      });
    }

    return NextResponse.json({
      comparisonId: crypto.randomUUID(),
      referenceImage: bufferToDataUrl(diffResult.designImage),
      websiteImage: bufferToDataUrl(diffResult.capturedImage),
      diffImage: bufferToDataUrl(diffResult.diffImage),
      metrics: diffResult.metrics,
      viewport,
    });
  } catch (error) {
    return toErrorResponse(error, {
      code: "INTERNAL_ERROR",
      message: "Comparison request failed unexpectedly.",
    });
  }
}
