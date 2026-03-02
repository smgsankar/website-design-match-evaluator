import pixelmatch from "pixelmatch";
import sharp from "sharp";

import { ComparisonMetrics } from "@/types/evaluator";

export type DiffResult = {
  width: number;
  height: number;
  designImage: Buffer;
  capturedImage: Buffer;
  diffImage: Buffer;
  metrics: ComparisonMetrics;
};

export async function generateDiff(
  designBuffer: Buffer,
  capturedBuffer: Buffer,
): Promise<DiffResult> {
  const designMeta = await sharp(designBuffer).metadata();
  if (!designMeta.width || !designMeta.height) {
    throw new Error("Could not read design image dimensions.");
  }

  const width = designMeta.width;
  const height = designMeta.height;

  const normalizedDesign = await sharp(designBuffer)
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();

  const normalizedCapture = await sharp(capturedBuffer)
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();

  const designRaw = await sharp(normalizedDesign)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const captureRaw = await sharp(normalizedCapture)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const diffRaw = Buffer.alloc(designRaw.info.width * designRaw.info.height * 4);

  const mismatchPixels = pixelmatch(
    designRaw.data,
    captureRaw.data,
    diffRaw,
    designRaw.info.width,
    designRaw.info.height,
    {
      threshold: 0.12,
      includeAA: true,
      alpha: 0.6,
      diffColor: [255, 84, 84],
      aaColor: [255, 215, 0],
      diffMask: false,
    },
  );

  const totalPixels = designRaw.info.width * designRaw.info.height;
  const mismatchPercent = Number(((mismatchPixels / totalPixels) * 100).toFixed(2));

  const diffImage = await sharp(diffRaw, {
    raw: {
      width: designRaw.info.width,
      height: designRaw.info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  return {
    width,
    height,
    designImage: normalizedDesign,
    capturedImage: normalizedCapture,
    diffImage,
    metrics: {
      mismatchPercent,
      mismatchPixels,
      totalPixels,
    },
  };
}

export function bufferToDataUrl(buffer: Buffer, mimeType = "image/png"): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
