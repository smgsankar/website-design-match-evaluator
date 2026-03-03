# Website Design Match Evaluator

A full-stack Next.js (TypeScript) app that compares a user-provided design image against a live website URL, then provides pixel-diff metrics and AI review suggestions to make the website match the design.

## What This Tool Does

- Authenticated workflow using Clerk
- Upload a design image (reference)
- Capture website screenshot from URL (implementation)
- Auto-detect capture dimensions from design image size
- Compare with 3 view modes:
  - Slider
  - Side-by-side
  - Heatmap
- Persist preferred view mode in browser `localStorage`
- Generate AI review with prioritized implementation fixes
- Enforce per-user AI review rate limits: **5 requests/hour**

## Important Image Mapping

This app follows this mapping everywhere (UI, API, AI prompt):

- `referenceImage`: the uploaded design image (source of truth)
- `websiteImage`: the screenshot captured from the provided URL (implementation to change)
- `diffImage`: heatmap showing mismatch regions

AI suggestions are expected to modify the **website implementation** to match the **reference design**.

## Tech Stack

- Next.js App Router + TypeScript
- Clerk (`@clerk/nextjs`) for auth
- Playwright / Playwright Core + Chromium for screenshot capture
- Sharp + Pixelmatch for image normalization and diffing
- OpenAI SDK for AI review generation
- Upstash Redis + Upstash Ratelimit for per-user quotas
- Vitest + jsdom for tests

## Project Layout

- `src/app/` - App Router pages and API route handlers
- `src/components/` - UI components
- `src/lib/` - core services (capture, diff, AI review, validation, rate limit)
- `src/types/` - shared TypeScript types
- `src/middleware.ts` - Clerk route protection middleware

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Fill required environment variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `OPENAI_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

4. Optional local-only localhost capture:

```bash
ALLOW_LOCALHOST_CAPTURE=true
```

5. Start dev server:

```bash
npm run dev
```

6. Open `http://localhost:3000`

## Environment Variables

See `.env.example` for full list.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk client-side auth config |
| `CLERK_SECRET_KEY` | Yes | Clerk server-side auth verification |
| `OPENAI_API_KEY` | Yes | AI review API calls |
| `OPENAI_MODEL` | No | Model override (default: `gpt-4.1-mini`) |
| `OPENAI_BASE_URL` | No | Optional proxy/gateway base URL |
| `UPSTASH_REDIS_REST_URL` | Yes | Redis endpoint for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Redis auth token |
| `ALLOW_LOCALHOST_CAPTURE` | No | Allow `localhost`/`127.0.0.1`/`::1` URL capture when `true` |
| `LOCALHOST_CAPTURE_SCALE_FACTOR` | No | Optional localhost-only viewport scaling override (for HiDPI design exports, e.g. `2`) |

## Scripts

- `npm run dev` - Start local dev server
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - ESLint checks
- `npm run test` - Vitest (CI mode)
- `npm run test:watch` - Vitest watch mode

## API Reference

All APIs require authenticated users.

### `POST /api/compare`

Compares uploaded reference image with captured website screenshot.

Request (`multipart/form-data`):

- `designImage` (file)
- `websiteUrl` (string)

Response (`200`):

```json
{
  "comparisonId": "uuid",
  "referenceImage": "data:image/png;base64,...",
  "websiteImage": "data:image/png;base64,...",
  "diffImage": "data:image/png;base64,...",
  "metrics": {
    "mismatchPercent": 12.34,
    "mismatchPixels": 123456,
    "totalPixels": 1000000
  },
  "viewport": {
    "name": "detected",
    "label": "Design image",
    "width": 1440,
    "height": 900
  }
}
```

### `POST /api/review`

Runs AI review using the comparison images and metrics.

Request (`application/json`):

```json
{
  "comparisonId": "uuid",
  "websiteUrl": "https://example.com",
  "viewport": { "name": "detected", "width": 1440, "height": 900 },
  "metrics": { "mismatchPercent": 12.34, "mismatchPixels": 123456, "totalPixels": 1000000 },
  "referenceImage": "data:image/png;base64,...",
  "websiteImage": "data:image/png;base64,...",
  "diffImage": "data:image/png;base64,..."
}
```

Response (`200`):

```json
{
  "rateLimit": {
    "limit": 5,
    "remaining": 4,
    "resetAt": "2026-03-03T10:00:00.000Z"
  },
  "review": {
    "summary": "...",
    "findings": [],
    "recommendedChanges": [],
    "priorityOrder": []
  }
}
```

### `GET /api/rate-limit`

Returns current user's AI quota status.

## Error Handling

Server routes return structured error responses with request trace IDs:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "AI review limit reached for this hour.",
    "hint": "Wait for the quota reset time, then try again.",
    "requestId": "uuid"
  }
}
```

The client surfaces user-friendly messages and includes `requestId` when available.

## Security Notes

- URL validation blocks private/internal destinations by default
- `ALLOW_LOCALHOST_CAPTURE=true` only allows loopback hosts, intended for local development
- Auth required for all protected routes and APIs
- AI review quota is enforced per authenticated user

## Deployment (Vercel)

1. Create Vercel project from this repo
2. Add all required env vars in Vercel settings
3. Provision Upstash Redis (Vercel Marketplace or existing Upstash project)
4. Deploy

Recommended production settings:

- Keep `ALLOW_LOCALHOST_CAPTURE` unset or `false`
- Keep Node.js runtime for API routes (already configured)

## Known Notes

- Next.js 16 logs a deprecation warning for `middleware` naming; code currently uses `src/middleware.ts` and still works.
- If auth pages fail to load, verify Clerk keys and restart the dev server.
