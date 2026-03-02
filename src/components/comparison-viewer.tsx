"use client";

import Image from "next/image";
import { CSSProperties, useMemo, useState } from "react";

import { ComparisonViewMode } from "@/types/evaluator";

type ComparisonViewerProps = {
  mode: ComparisonViewMode;
  referenceImage: string;
  websiteImage: string;
  diffImage: string;
  imageWidth: number;
  imageHeight: number;
  isUpdating: boolean;
  loadingMessage: string | null;
};

export function ComparisonViewer({
  mode,
  referenceImage,
  websiteImage,
  diffImage,
  imageWidth,
  imageHeight,
  isUpdating,
  loadingMessage,
}: ComparisonViewerProps) {
  const [sliderValue, setSliderValue] = useState(50);

  const sliderClip = useMemo(
    () => `inset(0 ${100 - sliderValue}% 0 0)`,
    [sliderValue],
  );
  const sliderStyle = useMemo(
    () =>
      ({
        aspectRatio: `${imageWidth} / ${imageHeight}`,
        "--comparison-ratio": String(imageWidth / imageHeight),
      }) as CSSProperties,
    [imageHeight, imageWidth],
  );

  return (
    <section className="comparison-stack">
      <div className="comparison-canvas-wrapper">
        {mode === "slider" ? (
          <div className="comparison-canvas slider-mode" style={sliderStyle}>
            <Image
              className="layer-base"
              src={websiteImage}
              alt="Captured website screenshot"
              fill
              unoptimized
            />
            <Image
              className="layer-top"
              src={referenceImage}
              alt="Uploaded reference design"
              fill
              unoptimized
              style={{ clipPath: sliderClip }}
            />
            <div className="slider-label slider-label-reference">Reference</div>
            <div className="slider-label slider-label-website">Website</div>
            <div className="slider-divider" style={{ left: `${sliderValue}%` }} />
            <input
              className="slider-input"
              type="range"
              min={0}
              max={100}
              value={sliderValue}
              onChange={(event) => setSliderValue(Number(event.target.value))}
              aria-label="Comparison slider"
            />
          </div>
        ) : mode === "sideBySide" ? (
          <div className="comparison-canvas side-mode">
            <figure>
              <figcaption>Reference Design</figcaption>
              <Image
                src={referenceImage}
                alt="Uploaded reference design"
                width={imageWidth}
                height={imageHeight}
                unoptimized
              />
            </figure>
            <figure>
              <figcaption>Captured Website</figcaption>
              <Image
                src={websiteImage}
                alt="Captured website screenshot"
                width={imageWidth}
                height={imageHeight}
                unoptimized
              />
            </figure>
          </div>
        ) : (
          <div className="comparison-canvas heatmap-mode">
            <figure>
              <figcaption>Pixel Diff Heatmap</figcaption>
              <Image
                src={diffImage}
                alt="Pixel difference heatmap"
                width={imageWidth}
                height={imageHeight}
                unoptimized
              />
            </figure>
          </div>
        )}

        {isUpdating && loadingMessage ? (
          <div className="canvas-overlay" role="status" aria-live="polite">
            <div className="overlay-spinner" />
            <p>{loadingMessage}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
