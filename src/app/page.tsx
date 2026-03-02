import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";

import { EvaluatorApp } from "@/components/evaluator-app";
import { SignedInUserChip } from "@/components/signed-in-user-chip";

const isClerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const flowSteps = [
  {
    title: "Upload design",
    detail: "Drop your reference image and set the target URL in a few seconds.",
  },
  {
    title: "Compare visually",
    detail:
      "Switch between slider, side-by-side, and heatmap to inspect mismatches.",
  },
  {
    title: "Get fix plan",
    detail:
      "Generate AI review with prioritized CSS and layout suggestions for exact match.",
  },
];

const highlights = [
  "Pixel-level diff heatmap",
  "Auto-detected capture size from design image",
  "Per-user AI review quota and secure access",
];

export default function Home() {
  if (!isClerkConfigured) {
    return (
      <main className="page-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Design QA Utility</p>
            <h1>Website Design Match Evaluator</h1>
            <p className="subtitle">
              Configure Clerk environment variables to enable authentication.
            </p>
          </div>
        </header>
        <section className="auth-cta-panel">
          <h2>Clerk not configured</h2>
          <p>
            Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, then
            restart the app.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Design QA Utility</p>
          <h1>Website Design Match Evaluator</h1>
          <p className="subtitle">
            Compare any live website against a target design and close visual gaps
            faster.
          </p>
        </div>
        <div className="topbar-actions">
          <SignedOut>
            <SignInButton mode="redirect" forceRedirectUrl="/">
              <button type="button" className="btn btn-secondary">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="redirect" forceRedirectUrl="/">
              <button type="button" className="btn btn-primary">
                Get started
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <SignedInUserChip />
          </SignedIn>
        </div>
      </header>

      <SignedOut>
        <section className="landing-hero">
          <article className="hero-copy">
            <p className="hero-kicker">Ship design-perfect UI with confidence</p>
            <h2 className="hero-title">From static mockup to match-ready frontend</h2>
            <p className="hero-subtitle">
              Stop guessing what is off. Capture the real page, inspect exact pixel
              mismatches, and get AI guidance to fix spacing, typography, and layout.
            </p>

            <div className="hero-actions">
              <SignUpButton mode="redirect" forceRedirectUrl="/">
                <button type="button" className="btn btn-primary">
                  Create account
                </button>
              </SignUpButton>
              <SignInButton mode="redirect" forceRedirectUrl="/">
                <button type="button" className="btn btn-secondary">
                  I already have access
                </button>
              </SignInButton>
            </div>

            <ul className="hero-highlights">
              {highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <aside className="hero-preview">
            <p className="preview-label">Quick outcome</p>
            <h3>Know what changed and what to fix</h3>
            <div className="preview-stack">
              <div className="preview-row">
                <span>MISMATCH SCORE</span>
                <strong>12.6%</strong>
              </div>
              <div className="preview-row">
                <span>TOP ISSUE</span>
                <strong>Header spacing drift</strong>
              </div>
              <div className="preview-row">
                <span>AI PRIORITY</span>
                <strong>Align hero grid + button dimensions</strong>
              </div>
            </div>
            <p className="preview-footnote">
              Reviews are rate-limited per user for predictable usage.
            </p>
          </aside>
        </section>

        <section className="flow-section">
          <header>
            <p className="eyebrow">How It Works</p>
            <h2>Three steps to design parity</h2>
          </header>
          <div className="flow-grid">
            {flowSteps.map((step, index) => (
              <article key={step.title} className="flow-card">
                <p className="flow-index">0{index + 1}</p>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <section className="signedin-banner">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>Run a fresh comparison</h2>
            <p>
              Upload a design and URL, then inspect slider, side-by-side, or heatmap
              views before requesting AI review.
            </p>
          </div>
        </section>

        <EvaluatorApp />
      </SignedIn>
    </main>
  );
}
