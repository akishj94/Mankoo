// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import emdash, { local } from 'emdash/astro';
import { sqlite } from 'emdash/db';
import { d1, r2 } from '@emdash-cms/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// One switch picks the whole target. Local development and the Node production
// build use SQLite plus a local uploads directory; setting EMDASH_CLOUDFLARE
// switches the adapter, the database and the media backend together so the two
// environments cannot drift apart.
//
//   npm run dev                         -> Node + SQLite + ./uploads
//   EMDASH_CLOUDFLARE=true npm run build -> Workers + D1 + R2
//
// DEPLOYMENT.md walks through the Cloudflare setup (bindings, secrets, first
// deploy).
const useCloudflare = process.env.EMDASH_CLOUDFLARE === 'true';

// EmDash serves the admin panel and reads content at request time, so the site
// has to be server-rendered. Prerendering is left off globally; individual
// pages can opt back in with `export const prerender = true` if ever needed.
export default defineConfig({
  output: 'server',
  adapter: useCloudflare ? cloudflare() : node({ mode: 'standalone' }),
  integrations: [
    // EmDash's admin panel is a React app, so the React integration has to be
    // registered even though the public site uses no React components.
    react(),
    emdash({
      // Binding names must match wrangler.jsonc.
      database: useCloudflare ? d1({ binding: 'DB' }) : sqlite({ url: 'file:./data.db' }),
      storage: useCloudflare
        ? r2({ binding: 'MEDIA' })
        : local({ directory: './uploads', baseUrl: '/_emdash/api/media/file' }),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
