# Deploying to Cloudflare Workers

The site runs locally on the Node adapter with SQLite. This guide covers moving
it to Cloudflare Workers with **D1** for the database and **R2** for media.

Nothing here needs to change to keep developing locally — the Cloudflare setup is
an alternate config selected at build time.

---

## What you have today

| Concern | Local / Node | Cloudflare Workers |
| --- | --- | --- |
| Adapter | `@astrojs/node` | `@astrojs/cloudflare` |
| Database | SQLite (`data.db`) | D1 (`DB` binding) |
| Media | `./uploads` on disk | R2 (`MEDIA` binding) |
| Secrets | `.env` | `wrangler secret put` |

---

## 1. Install and authenticate Wrangler

```sh
npm install -D wrangler
npx wrangler login
```

`@emdash-cms/cloudflare` is already a dependency — it provides the `d1()`,
`r2()` and `sandbox()` adapters.

---

## 2. Create the resources

Let Wrangler create them and write the IDs back into `wrangler.jsonc`:

```sh
npx wrangler d1 create mankoo-content --binding DB --update-config
npx wrangler r2 bucket create mankoo-media --binding MEDIA --update-config
```

Replace the placeholder `database_id` in `wrangler.jsonc` with the UUID Wrangler
prints. Keep the binding names `DB` and `MEDIA` — they must match the config
below or the Worker will fail with `D1 binding not found`.

---

## 3. Point the build at Cloudflare

`astro.config.mjs` reads `CLOUDFLARE_ENV`-style switches via one variable. Set
`EMDASH_CLOUDFLARE=true` for the production build:

```js
import cloudflare from '@astrojs/cloudflare';
import { d1, r2 } from '@emdash-cms/cloudflare';

const useCloudflare = process.env.EMDASH_CLOUDFLARE === 'true';

export default defineConfig({
  output: 'server',
  adapter: useCloudflare ? cloudflare() : node({ mode: 'standalone' }),
  integrations: [
    react(),
    emdash({
      database: useCloudflare ? d1({ binding: 'DB' }) : sqlite({ url: 'file:./data.db' }),
      storage: useCloudflare
        ? r2({ binding: 'MEDIA' })
        : local({ directory: './uploads', baseUrl: '/_emdash/api/media/file' }),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
```

The page code needs no changes — `getEmDashCollection()` and
`getEmDashEntry()` are adapter-agnostic.

---

## 4. Store the encryption key

```sh
npx wrangler secret put EMDASH_ENCRYPTION_KEY
```

Paste the value from your local `.env`. **Keep a separate copy.** Losing this
key makes every encrypted plugin secret unreadable, and it is *not* in your D1
backups.

Also set the public origin so passkey sign-in works from the deployed domain:

```sh
npx wrangler secret put EMDASH_SITE_URL   # https://your-domain.com
```

---

## 5. Build and deploy

`astro.config.mjs` already switches on `EMDASH_CLOUDFLARE`:

```sh
npm run build:cloudflare
npx wrangler deploy
```

EmDash applies its core migrations on the first request after deploy.

The Worker entry point (`src/worker.ts`) contributes only the `scheduled`
handler — Astro's Cloudflare adapter supplies `fetch`. The
`"crons": ["* * * * *"]` trigger in `wrangler.jsonc` is what drives it.

---

## 6. Complete setup

Open `https://your-domain.com/_emdash/admin` and finish the setup wizard. It
creates the administrator account, applies `seed/seed.json` (the `posts` and
`pages` collections), and lets you register a passkey.

---

## Migrations

Every `astro build` emits a validated, secret-free `.emdash/migrations.json`. It
is committed (see `.gitignore`) so CI can apply migrations ahead of the deploy.

By default EmDash applies pending core migrations at runtime on first request.
To apply them explicitly instead:

```sh
npx emdash migrate --remote
```

EmDash also publishes a `.emdash/migrations.json` target per database dialect,
so `npx emdash migrate` picks the right executor from the D1 target here.

---

## Scheduled publishing

`wrangler.jsonc` declares a cron trigger:

```jsonc
"triggers": { "crons": ["* * * * *"] }
```

This powers drafts scheduled with a future publish date. Confirm it fires with:

```sh
npx wrangler tail
```

---

## Preview environments

Named environments do **not** inherit bindings, so create separate resources:

```sh
npx wrangler d1 create mankoo-content-preview --binding DB --env preview --update-config
npx wrangler r2 bucket create mankoo-media-preview --binding MEDIA --env preview --update-config
npx wrangler secret put EMDASH_ENCRYPTION_KEY --env preview
```

Then repeat every binding the preview Worker uses under `"env": { "preview": { … } }`
in `wrangler.jsonc`. Never point a preview binding at the production database.

---

## Backups

A D1 backup contains content, users and settings — but **not** media binaries.
Export the R2 bucket separately:

```sh
npx wrangler r2 bucket export mankoo-media --output ./media-backup.tar
```

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `D1 binding not found` | Binding name in `wrangler.jsonc` ≠ `d1({ binding: … })` |
| `R2 binding not found` | Bucket name mismatch, or bucket not created |
| Admin stuck on "Loading EmDash…" | `react()` missing from the integrations array |
| Deploys fine, edits do not appear | A page is prerendered — remove `export const prerender` |
| Schema errors at runtime | Run `npx wrangler tail` and capture the underlying message |
