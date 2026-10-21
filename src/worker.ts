import emdashScheduled from '@emdash-cms/cloudflare/worker';

/**
 * Only the scheduled handler is contributed — Astro's Cloudflare adapter
 * supplies `fetch`. `nodejs_compat` in wrangler.jsonc populates process.env so
 * EmDash reads its secrets normally.
 */
export default {
  scheduled: emdashScheduled.scheduled,
};
