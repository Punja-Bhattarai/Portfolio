# Punja Bhattarai — Portfolio (Next.js + TypeScript + Supabase)

A full-stack, production-grade personal portfolio with a **secure private photo
gallery**, **guest & shared-link access**, and a complete **admin dashboard**.

> Stack: **React 19 · TypeScript · Next.js 15 (App Router) · Tailwind CSS ·
> Framer Motion · Supabase (Postgres + Storage) · Vercel**

---

## ✨ Features

### Public site (`/`)
- Cinematic dark hero with animated name reveal, parallax profile card, scroll cue
- About (bio, education timeline, focus, interests, philosophy)
- Skills grid with honest self-assessed levels
- Projects showcase — cards + detailed modal (features, tech, GitHub/demo/video links)
- **Lab** section for experiments with status badges
- Public gallery — masonry layout, lazy loading, fullscreen lightbox
  (keyboard ← → Esc, zoom, fullscreen, mobile swipe)
- Contact form → stored securely in Postgres (honeypot + rate limiting)
- SEO: metadata, Open Graph, robots.txt; fully responsive; reduced-motion aware

### Private gallery (`/private-gallery`, `/share/<slug>`)
- Access verified **server-side only** (never client JS checks)
- Guest accounts (name + generated password) and shareable links
- Optional expiry dates, download permission vs view-only
- Instant revocation kills live sessions immediately
- Photos served through **short-lived signed URLs** from a **private** bucket

### Admin panel (`/admin`)
- `/admin/login` — secure login (bcrypt hashes, JWT httpOnly cookie, rate limited)
- `/admin/dashboard` — totals: photos, albums, public/private split, unread messages, active guest access
- `/admin/photos` — drag & drop multi-upload with progress, browser-side compression +
  thumbnail generation, search/filter, edit caption/album/visibility, delete
- `/admin/albums` — create/rename/delete albums, public/guest visibility
- `/admin/projects` — manage Projects **and** Lab entries
- `/admin/messages` — contact inbox (read/unread, delete)
- `/admin/access` — guest accounts & shared links (passwords revealed once, revoke/restore)
- `/admin/settings` — profile info, avatar upload, CV upload (PDF), social links,
  change password (signs out all other devices)

---

## 🗂 Project structure

```
├── app/
│   ├── page.tsx                  # public one-page portfolio
│   ├── private-gallery/page.tsx  # guest gate + gallery viewer
│   ├── share/[slug]/page.tsx     # shared-link entry
│   ├── admin/
│   │   ├── login/page.tsx        # standalone login
│   │   └── (panel)/              # guarded shell (sidebar) → dashboard,
│   │                             # photos, albums, projects, messages,
│   │                             # access, settings
│   └── api/                      # serverless API routes
│       ├── auth/{login,logout,session}
│       ├── contact
│       ├── content               # public content w/ DB overrides
│       ├── gallery/{public,access,session,logout,photos}
│       └── admin/{stats,photos,albums,projects,messages,access,settings,password}
├── components/site/              # Hero, Navbar, sections, Lightbox, …
├── components/admin/             # AdminShell, Modal, Field
├── lib/                          # supabase, auth (JWT/bcrypt), storage,
│                                 # validation (zod), ratelimit, api client,
│                                 # image-client (canvas compression)
├── data/content.ts               # ★ EDIT DEFAULT SITE CONTENT HERE ★
├── supabase/schema.sql           # full database schema + storage bucket
├── scripts/create-admin.mjs      # owner account bootstrap
├── public/images/                # placeholder art (replace freely)
└── public/cv/CV.pdf              # placeholder CV (replace freely)
```

---

## 🚀 Setup

### 1. Supabase (database + storage)
1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → paste the whole of [`supabase/schema.sql`](supabase/schema.sql) → Run.
   This creates all tables, enables RLS everywhere (deny-all for browser clients),
   and creates the **private** `portfolio-media` bucket.
3. Project Settings → API → copy the **Project URL** and **service_role key**
   (⚠️ secret — server only).

### 2. Environment variables
```bash
cp .env.example .env.local
```
Fill in:
| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **server-only secret** |
| `JWT_SECRET` | generate: `openssl rand -base64 48` | session signing |
| `ADMIN_SESSION_DAYS` | optional | default 7 |
| `NEXT_PUBLIC_SITE_URL` | your URL | canonical/OG metadata |

### 3. Create your owner account
```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-strong-password' npm run create-admin
```

### 4. Run locally
```bash
npm install
npm run dev          # http://localhost:3000
```
Admin: `http://localhost:3000/admin/login`

The site renders from `data/content.ts` defaults even before Supabase is
connected, so you can style first and connect later.

---

## ☁️ Deployment

### GitHub
```bash
git init && git add . && git commit -m "Portfolio v1"
git branch -M main
git remote add origin https://github.com/<you>/portfolio.git
git push -u origin main
```
`.env*` files are git-ignored — never commit secrets.

### Vercel
1. [vercel.com/new](https://vercel.com/new) → import the repo (framework auto-detected).
2. Add the environment variables above (Production + Preview).
3. Deploy. Set `NEXT_PUBLIC_SITE_URL` to your final domain.

---

## 🔐 Security model

- Passwords hashed with **bcrypt** (cost 12); plaintext never stored or logged.
- Sessions = **HS256 JWTs in httpOnly / SameSite=Lax / Secure cookies**;
  `token_version` invalidates all sessions on password change.
- Gallery sessions reference DB rows → **instant revocation**, hard expiry.
- **CSRF**: same-origin enforcement on every mutating request + SameSite cookies + JSON-only bodies.
- **Rate limiting**: login (5/min), contact (5/10min), gallery access (10/min), uploads (60/min) per instance IP.
- Uploads validated by **magic bytes** (not just MIME), size caps at both app and bucket level.
- Client compresses images before upload → stays under serverless body limits.
- **RLS enabled on every table with no anon policies** — browsers can talk to
  Postgres only through this app's server. Storage bucket is private with no policies;
  every read goes through signed URLs minted server-side after authorization.
- Zod validation on all inputs; errors sanitized (no internals leaked).
- Security headers via `next.config.mjs`.

**Honest limitation:** images displayed in a browser can always be screenshotted;
"view-only" prevents casual downloads, not determined capture.

---

## ✅ Security checklist (post-deploy)

- [ ] `JWT_SECRET` is a long random value (rotatable)
- [ ] Service-role key exists **only** in Vercel env vars — grep the repo/bundle to confirm
- [ ] `.env.local` committed? (`git status` must show nothing env-related)
- [ ] Created admin with a strong password; changed it once after first login
- [ ] Bucket `portfolio-media` shows **private**, zero storage policies
- [ ] Try opening a photo URL without a session → should 401
- [ ] Revoke a guest mid-session → their next request fails
- [ ] Expired link returns the "expired" state, not the gallery

---

## 🛠 Customization

- **Content**: `data/content.ts` (bio, timeline, skills, fallback projects/lab) or
  Admin → Settings for profile/socials/avatar/CV (DB overrides win when connected).
- **Real CV**: replace `public/cv/CV.pdf` or upload in Admin → Settings.
- **Profile photo**: Admin → Settings → Upload profile image.
- **Theme tokens**: `tailwind.config.ts` + `app/globals.css`.
