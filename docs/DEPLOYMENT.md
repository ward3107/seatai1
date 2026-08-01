# SeatAI Deployment Guide

This guide covers deploying SeatAI to production.

---

## Table of Contents

- [Overview](#overview)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Vercel Deployment](#vercel-deployment)
- [Netlify Deployment](#netlify-deployment)
- [Cloudflare Pages](#cloudflare-pages)
- [Static Hosting](#static-hosting)
- [Environment Variables](#environment-variables)
- [LTI 1.3 Endpoints](#lti-13-endpoints)
- [Troubleshooting](#troubleshooting)

---

## Overview

SeatAI is a **Vite + React single-page app**. The optimizer is pure TypeScript (no WASM, no native code) and runs in a Web Worker in the browser. Deploying is just deploying static files.

- Requires no server-side runtime for the core app
- Works offline after first load (PWA + IndexedDB)
- Optional serverless functions live in `web/api/` for LTI 1.3 roster sync (Vercel/Node runtime)

---

## Pre-Deployment Checklist

### Build verification

```bash
cd web
npm install
npm run build
```

Expected output tree in `web/dist/`:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
├── manifest.webmanifest
└── sw.js
```

### Local smoke test

```bash
cd web
npm run preview
# Visit http://localhost:4173
```

Verify:

- [ ] Page loads without console errors
- [ ] Can add/edit students
- [ ] Optimization runs and returns a plan
- [ ] Export (CSV / PDF / print) works
- [ ] Data survives a reload (IndexedDB persistence)
- [ ] Responsive on a mobile viewport

### Quality gates

```bash
cd web
npm test -- --run   # Vitest, no watch
npm run lint        # ESLint
npx tsc --noEmit    # Typecheck
```

All three should pass before deploy.

---

## Vercel Deployment

Vercel is the recommended host — the repo ships with a `vercel.json` at `web/vercel.json` (CSP headers, SPA rewrites, cache policy) and the serverless API in `web/api/` runs on Vercel's Node runtime with no extra config.

### Repository layout for Vercel

Point Vercel at the **`web/`** directory as the project root. Vite is auto-detected.

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Root directory | `web` |
| Build command | `npm run build` (auto-detected) |
| Output directory | `dist` (auto-detected) |
| Install command | `npm install` (auto-detected) |
| Node version | 20.x (default) |

No `vercel-build.sh`, no custom install command, no WASM build step.

### CLI deploy

```bash
npm i -g vercel
cd web
vercel login
vercel            # preview
vercel --prod     # production
```

### GitHub integration

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Set **Root Directory** to `web`.
3. Add environment variables (see below) if you're enabling Google Classroom import or LTI 1.3.
4. Deploy. Pushes to `main` go to production; other branches get preview URLs.

### Custom domain

Project Settings → Domains → add domain → follow DNS instructions.

---

## Netlify Deployment

Works fine for the SPA. Netlify **cannot** run the `web/api/` serverless functions as-written — those are Vercel-flavoured Node handlers. If you need LTI, either use Vercel or port `web/api/` to Netlify Functions.

### Site settings

| Setting | Value |
|---|---|
| Base directory | `web` |
| Build command | `npm run build` |
| Publish directory | `web/dist` |

### CLI deploy

```bash
npm i -g netlify-cli
cd web
npm install
npm run build
netlify deploy --prod --dir=dist
```

### Optional `netlify.toml` at repo root

```toml
[build]
  base    = "web"
  command = "npm run build"
  publish = "web/dist"

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

---

## Cloudflare Pages

SPA works out of the box. LTI serverless functions would need to be reimplemented as Cloudflare Workers.

### Dashboard settings

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm install && npm run build` |
| Build output directory | `dist` |
| Root directory | `web` |

### Direct upload

```bash
cd web
npm install
npm run build
npm i -g wrangler
wrangler pages publish dist --project-name=seatai
```

---

## Static Hosting

SeatAI can be served from any static host once you've built it locally.

### GitHub Pages

Only serves static files — no LTI. If SeatAI will live at a subpath (e.g. `/seatai/`), set `VITE_BASE_URL=/seatai/` before building.

```bash
cd web
npm install
npm run build
# Deploy web/dist/ to your gh-pages branch (or docs/ folder).
```

### AWS S3 + CloudFront

```bash
cd web
npm install
npm run build

aws s3 sync dist/ s3://your-bucket-name --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

Configure CloudFront to serve `index.html` on 403/404 responses so client-side routes work.

### Traditional hosting (cPanel etc.)

1. Run `npm run build` locally.
2. Upload the contents of `web/dist/` to the web root.
3. Make sure your host serves `.js` as `application/javascript` and returns `index.html` for unknown paths (SPA fallback).

---

## Environment Variables

All variables are documented in `web/.env.example`. The core app needs **zero** environment variables to run. The list below is the full set of optional integrations.

| Variable | Purpose | Required when |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google Classroom import (implicit token flow) | You want the Google Classroom import button visible |
| `LTI_PLATFORMS` | JSON array of trusted LMS platforms | You're enabling LTI 1.3 launch |
| `LTI_PRIVATE_KEY` | RSA private key (PKCS8 PEM) used to sign client assertions | You're enabling LTI 1.3 launch |
| `LTI_KID` | Key id advertised at `/api/lti/jwks` | You're enabling LTI 1.3 (default `seatai-lti`) |
| `LTI_TOOL_URL` | Public base URL of the deployed tool | Optional; inferred from request host if unset |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV / Upstash Redis REST endpoint | Recommended when LTI is on — makes rate limiting and single-use nonce global across serverless instances |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Alt KV endpoint | Same as above; `KV_REST_API_*` takes precedence |

Set them in your host's environment-variables UI (Vercel: Project Settings → Environment Variables; Netlify: Site settings → Build & deploy → Environment). For local dev, copy `web/.env.example` to `web/.env.local`.

Never commit real `.env` files. `.env.local` is git-ignored.

---

## LTI 1.3 Endpoints

If you configure the LTI variables above, the deployed app exposes:

| Endpoint | Purpose |
|---|---|
| `POST /api/lti/login` | LMS-initiated OIDC login |
| `POST /api/lti/launch` | ID-token launch handler → hands off roster to the SPA |
| `GET /api/lti/jwks` | Public JWKS used by the LMS to verify our client assertions |

Generate the RSA keypair once:

```bash
openssl genpkey -algorithm RSA -pkcs8 -out key.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in key.pem -out key.pub
```

Set `LTI_PRIVATE_KEY` to the contents of `key.pem` (paste as-is; escape newlines as `\n` if your host requires a single-line value). Register the tool with each LMS using your JWKS URL (`https://<your-domain>/api/lti/jwks`).

---

## Troubleshooting

### Build fails on the host

- Confirm the root directory is set to `web/` — building from the repo root will not work.
- Ensure Node 20.x is the runtime (Vercel default).
- Delete the host's build cache and retry once — a partial cache from an earlier WASM-based revision can wedge.

### Blank page after deploy

- Check the browser console for CSP violations. `web/vercel.json` sets a strict CSP; any host that doesn't apply those headers may need equivalent config.
- Check the SPA fallback: unknown paths must return `index.html`.

### IndexedDB data disappears

- Private/incognito mode wipes IndexedDB on tab close.
- Some browsers evict site data under storage pressure — user should occasionally use the app's Export/Backup feature.

### LTI launch fails

- `LTI_PLATFORMS` JSON must be valid; a single bad quote silently disables all launches.
- The public JWKS must match the private key; regenerate both together if in doubt.
- Without `KV_REST_API_*`, rate limiting and nonce-replay protection are per serverless instance (best-effort). For production, wire a KV store.

---

## Post-Deployment

- [ ] First paint < 3 seconds
- [ ] Optimization completes on a 30-student sample class in < 5 s
- [ ] Export produces a valid CSV / PDF
- [ ] Works on the main browsers you support (Chrome, Firefox, Safari)
- [ ] Mobile layout is usable at 375 px width

### Updates

```bash
git push        # auto-deploys on Vercel/Netlify/Cloudflare
```

Or, for a manual CLI deploy:

```bash
cd web
npm run build
vercel --prod   # or netlify deploy --prod --dir=dist
```
