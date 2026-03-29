# SeatAI Deployment Guide

This guide covers deploying SeatAI to production platforms.

---

## Table of Contents

- [Overview](#overview)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Vercel Deployment](#vercel-deployment)
- [Netlify Deployment](#netlify-deployment)
- [Cloudflare Pages](#cloudflare-pages)
- [Static Hosting](#static-hosting)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Overview

SeatAI is a **static single-page application** that can be deployed to any static hosting service. The app:

- ✅ Requires no server-side runtime
- ✅ Works offline after initial load
- ✅ All data stored locally in browser (IndexedDB)
- ✅ No API keys or external services required

---

## Pre-Deployment Checklist

Before deploying, ensure:

### Build Verification

```bash
# 1. Build WASM in release mode
cd core
wasm-pack build --target web --out-dir ../web/src/wasm --release

# 2. Build frontend
cd ../web
npm run build

# 3. Verify output
ls -la dist/
```

Expected output in `web/dist/`:
```
dist/
├── index.html           # Main HTML
├── assets/
│   ├── index-[hash].js  # Bundled JavaScript
│   └── index-[hash].css # Bundled CSS
└── wasm/
    └── seatai_core_bg.wasm  # Compiled WASM
```

### Size Checks

| File                    | Target | Max    |
|-------------------------|--------|--------|
| WASM bundle             | < 200KB| 300KB  |
| JavaScript bundle       | < 500KB| 1MB    |
| Total initial transfer  | < 1MB  | 2MB    |

Check sizes:
```bash
cd web/dist
du -h wasm/seatai_core_bg.wasm
du -h assets/index-*.js
```

### Testing

Test the production build locally:

```bash
cd web
npm run build
npm run preview
# Visit http://localhost:4173
```

Verify:
- [ ] Page loads without errors
- [ ] WASM initializes correctly
- [ ] Can add/edit students
- [ ] Optimization runs successfully
- [ ] Export functions work (PDF/image)
- [ ] IndexedDB persistence works
- [ ] Responsive on mobile viewport

---

## Vercel Deployment

Vercel is the recommended hosting platform for SeatAI.

### Quick Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# From the web directory
cd web

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Automatic Deployment (GitHub Integration)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `web/` folder as root directory

2. **Configure Build Settings**

   Vercel should auto-detect these settings:

   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "installCommand": "cd ../core && wasm-pack build --target web --out-dir ../web/src/wasm --release && cd ../web && npm install"
   }
   ```

3. **Add Build Script** (optional)

   Create `vercel-build.sh` in the project root:

   ```bash
   #!/bin/bash
   set -e
   echo "Building WASM..."
   cd core && wasm-pack build --target web --out-dir ../web/src/wasm --release
   echo "Building frontend..."
   cd ../web && npm run build
   echo "Build complete!"
   ```

   Update `package.json`:
   ```json
   {
     "scripts": {
       "vercel-build": "bash vercel-build.sh"
     }
   }
   ```

4. **Deploy**

   - Push to main branch → auto-deploys to production
   - Push to other branches → auto-deploys to preview URL

### Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

### Environment Variables

No environment variables required for basic deployment.

### Performance Optimization

Vercel automatically:
- Minifies JavaScript/CSS
- Compresses assets (gzip/brotli)
- Provides CDN edge caching
- Handles WASM MIME types correctly

---

## Netlify Deployment

Netlify is an alternative to Vercel with similar features.

### Quick Deploy

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build the project
cd core && wasm-pack build --target web --out-dir ../web/src/wasm --release
cd ../web && npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### Automatic Deployment

1. **Connect Repository**
   - Go to [netlify.com](https://netlify.com)
   - "Add new site" → "Import an existing project"
   - Connect your GitHub repository

2. **Configure Build Settings**

   ```
   Build command: cd ../core && wasm-pack build --target web --out-dir ../web/src/wasm --release && cd ../web && npm run build
   Publish directory: web/dist
   ```

3. **Add netlify.toml** (optional)

   Create `netlify.toml` in project root:

   ```toml
   [build]
     command = "bash ./netlify-build.sh"
     publish = "web/dist"

   [[headers]]
     for = "/*.wasm"
     [headers.values]
       Content-Type = "application/wasm"
       Cache-Control = "public, max-age=31536000, immutable"
   ```

   Create `netlify-build.sh`:
   ```bash
   #!/bin/bash
   set -e
   cd core && wasm-pack build --target web --out-dir ../web/src/wasm --release
   cd ../web && npm run build
   ```

---

## Cloudflare Pages

Cloudflare Pages offers global edge deployment.

### Deploy via Git

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Pages → Create a project → Connect to Git
3. Configure:

   ```
   Build command: cd ../core && wasm-pack build --target web --out-dir ../web/src/wasm --release && cd ../web && npm run build
   Build output directory: web/dist
   ```

4. Root directory: `/` (project root)
5. Click "Save and Deploy"

### Direct Upload

```bash
# Build
cd core && wasm-pack build --target web --out-dir ../web/src/wasm --release
cd ../web && npm run build

# Install Wrangler CLI
npm i -g wrangler

# Deploy
wrangler pages publish dist --project-name=seatai
```

---

## Static Hosting

SeatAI can be deployed to any static file host.

### GitHub Pages

```bash
# Build
cd core && wasm-pack build --target web --out-dir ../web/src/wasm --release
cd ../web && npm run build

# Copy to docs/ or gh-pages branch
cp -r dist/* ../docs/
git add docs/
git commit -m "Deploy to GitHub Pages"
git push
```

### AWS S3 + CloudFront

```bash
# Build
cd core && wasm-pack build --target web --out-dir ../web/src/wasm --release
cd ../web && npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### Traditional Hosting (cPanel, etc.)

1. Build the project: `npm run build`
2. Upload contents of `dist/` to your web server
3. Ensure MIME types are configured:
   - `.wasm` → `application/wasm`
   - `.js` → `application/javascript`

---

## Environment Variables

SeatAI doesn't require environment variables for basic functionality.

### Optional Variables

Future versions may support:

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_API_URL` | Backend sync URL | undefined |
| `VITE_ANALYTICS_ID` | Analytics tracking | undefined |
| `VITE_SENTRY_DSN` | Error tracking | undefined |

### Adding Environment Variables

**Vercel:**
Project Settings → Environment Variables

**Netlify:**
Site Settings → Build & deploy → Environment

**.env file** (development only):
```bash
# web/.env.local
VITE_API_URL=https://api.example.com
```

---

## Troubleshooting

### WASM Won't Load

**Symptoms:** Console error "WebAssembly instantiation failed"

**Solutions:**
1. Check MIME type is `application/wasm`
2. Ensure WASM file is served with CORS headers
3. Verify WASM is built for correct target (`--target web`)

**Nginx config:**
```nginx
location ~* \.wasm$ {
    application/wasm;
    add_header Cache-Control "public, max-age=31536000";
}
```

### Build Fails on Deploy

**Symptoms:** Build step fails during deployment

**Solutions:**
1. Ensure Rust toolchain is available (if not, build WASM locally first)
2. Pre-build WASM locally and commit to repo (not recommended, but works)
3. Use build script that builds WASM first

### IndexedDB Issues

**Symptoms:** Data doesn't persist after refresh

**Solutions:**
1. Check browser supports IndexedDB
2. Verify no private/incognito mode
3. Check browser storage quota

### Performance Issues

**Symptoms:** Slow page load or optimization

**Solutions:**
1. Check WASM bundle size (< 200KB recommended)
2. Enable compression (gzip/brotli)
3. Use web workers for optimization
4. Reduce student count or generations for faster results

### Mobile Display Issues

**Symptoms:** Layout broken on mobile

**Solutions:**
1. Verify viewport meta tag exists
2. Test responsive classes in Tailwind
3. Check touch targets are large enough

---

## Post-Deployment

### Monitoring

Check these after deployment:

- [ ] Page loads in < 3 seconds
- [ ] No console errors
- [ ] WASM initializes successfully
- [ ] Can create new project
- [ ] Optimization works
- [ ] Export functions work
- [ ] Works on mobile devices
- [ ] Works in different browsers (Chrome, Firefox, Safari)

### Analytics (Optional)

Add analytics for usage tracking:

**Vercel Analytics:**
```bash
npm install @vercel/analytics
```

**Plausible (privacy-friendly):**
Add script to `index.html`

### Updates

To deploy updates:

1. Update code
2. Build WASM: `cd core && wasm-pack build --target web --out-dir ../web/src/wasm --release`
3. Build frontend: `cd web && npm run build`
4. Deploy: `vercel --prod` (or git push for auto-deploy)

---

## Security Considerations

Since SeatAI is client-side only:

- ✅ No server-side vulnerabilities
- ✅ No SQL injection risk
- ✅ No XSS from server (static files)
- ⚠️ Validate user input before processing
- ⚠️ Be careful with import data (sanitize CSV inputs)

---

*Last updated: 2026-03-29*
