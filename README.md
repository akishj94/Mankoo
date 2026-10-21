# Mankoo Power Presses

Astro 7 site for Mankoo India, with [EmDash](https://emdashcms.com) as the CMS.

## Requirements

- Node.js 22.16 or newer (EmDash's minimum; the project declares `>=22.12`)
- npm

## Getting started

```sh
npm install
npm run dev
```

The site is at <http://localhost:4321> and the CMS at
<http://localhost:4321/_emdash/admin>.

On the first visit the admin redirects to a setup wizard. Complete it and the
content model from `seed/seed.json` is applied — the **Posts** and **Pages**
collections.

**EmDash has no passwords** — you sign in with a passkey (Windows Hello /
Touch ID). See **[docs/FIRST_LOGIN.md](./docs/FIRST_LOGIN.md)** for the
step-by-step first login, including the one-time database reset you will need.

> Development mode also prints a *dev bypass* link that signs you in without
> registering a passkey. Use it only locally.

### First run

`data.db` and `uploads/` are created automatically and are git-ignored. To start
over, delete both and reload the admin panel.

To regenerate the encryption key:

```sh
npx emdash secrets generate --write .env
```

**Keep `.env` out of version control and back it up separately.** Losing
`EMDASH_ENCRYPTION_KEY` makes every encrypted plugin secret unreadable.

---

## How content is organised

| Route | Source |
| --- | --- |
| `/` | Pages entry, slug `home` |
| `/blog` | Posts collection, newest first, 12 per page (`?page=N`) |
| `/blog/[slug]` | Single post, Portable Text body |
| `/about`, `/contact`, `/machines`, `/machines/type-a`, `/machines/type-b` | Pages entry, slug matching the path |

Every page is server-rendered and read from the CMS at request time, so a
published change is live on the next reload. Nothing is baked in at build time.

### Blocks

A **Pages** entry stores its layout as an ordered list of blocks. Each block
type maps to one existing section component, so a page composed in the admin is
styled by exactly the same Tailwind classes as the hand-written version:

| Block | Renders |
| --- | --- |
| `hero` | Full-bleed background image or video and headline (the play/pause control only renders with a clip) |
| `split_grid` | `sections/SplitGrid.astro` |
| `capabilities` | `sections/ImageCrossfade.astro` |
| `machine_slider` | `sections/ProductCarousel.astro` — eyebrow + heading with hand-picked products (by slug, in order; falls back to the newest products) |
| `featured_product` | `sections/ProductSpotlight.astro` |
| `reasons` | Numbered reasons band |
| `testimonial` | `sections/Testimonial.astro` |
| `latest_posts` | `sections/PostGrid.astro`, fed by the newest 3 posts |
| `featured_posts` | `sections/FeaturedPosts.astro` — eyebrow + heading with up to 4 hand-picked posts (by slug, in order; falls back to the newest 4) in the same card styling as `latest_posts` |
| `rich_text` | Heading plus Portable Text |
| `page_intro` | `sections/PageIntro.astro` — eyebrow, heading and intro copy |
| `team_grid` | `sections/TeamGrid.astro` — 4-column leadership grid with link tile |

Block types are declared in `seed/seed.json`; renderers live in
`src/components/blocks/` and are mapped in `src/components/PageBlocks.astro`.

### Component naming

- `src/components/blocks/<slug>.astro` — the CMS adapter for one block type,
  named after the block's slug. It turns CMS values into section props.
- `src/components/sections/<name>.astro` — a presentational band, named for the
  layout it draws (a crossfade, a carousel, a grid) rather than for the page it
  happens to appear on.

### Page intros

`sections/PageIntro.astro` opens a page: an accent eyebrow and heading on the
left, intro copy on the right across a wide gap that only opens up on desktop.
It is driven from the CMS like every other band, as the `page_intro` block in a
**Pages** entry's layout. Nothing about it is hardcoded — the block carries:

- **Eyebrow** — small accent label above the heading (optional)
- **Heading** — the large heading (required)
- **Intro copy** — paragraphs on the right; a blank line starts a new paragraph

Give a page a `page_intro` block first and the band renders at the top of that
page. Leave the eyebrow empty to render no eyebrow at all; the same block works
for any page.

`headingLevel` defaults to `h1` when the section is used directly in a
template; pass `h2` when dropping it further down a page that already has a
heading.

The contact page adds a second row under its intro — headquarters address,
email and phone numbers — read from the `site_details` collection and drawn by
`sections/SiteDetails.astro`.

### Images

The hero's background takes either medium: a clip via the `file` field
limited to `video/*`, or a still photo via the `image` field (the clip wins
when both are set, and the play/pause control only renders with a clip).
Every other band takes an optional image: when none is set,
`src/components/SmartImage.astro` renders a neutral block instead of a
broken frame, and the split grid keeps its two placeholder frames so the
layout never collapses. Only the testimonial and news bands ship
placeholder artwork — the rest wait on real photography.

### Header and footer

| What | Edit it in |
| --- | --- |
| Header navigation | Menus → `primary` (items with children become the dropdown) |
| Footer link columns | Menus → `footer-company`, `footer-machines`, `footer-connect` |
| Social profiles | Settings → Social |
| Email, address, phones, copyright, legal links, WhatsApp | The `site_details` collection |
| Site title, logo, favicon, tagline | Settings → General |

Each source falls back to the value the site shipped with, so a half-configured
CMS still renders a complete header and footer.

### Images

`src/components/SmartImage.astro` accepts either source:

- an import from `src/assets` — still optimised by `astro:assets` (WebP + srcset)
- a media value picked in the CMS — rendered through `emdash/ui`

Existing components take both, so nothing about the current styling changed.

### Reusable media

`src/components/Media.astro` is the shared frame for a single piece of
media: pass an `image`, a `video`, or both — the video wins when set (never
both at once). With a clip it renders the hero's play/pause control
(progress ring, play/pause icons, reduced-motion handling, autostart refusal
fallback); `src/lib/animations.js` wires every `[data-video-player]` on the
page, so any number of players coexist. `ratio` stays a code-defined prop (for
example `"4/5"`, `"16/9"`, `"1/1"`) applied as an inline `aspect-ratio` style —
it is not a CMS field, so editors can swap media but never break proportions:

```astro
<MediaImage src={member.photo} alt={member.name} ratio="4/5" />
<MediaVideo src={value.video} ratio="16/9" />
<Media image={member.photo} video={member.clip} alt={member.name} ratio="4/5" label="intro clip" />
```

The blog listing uses `<Media>` for its 16/9 cards (image only there); the
hero keeps its own full-bleed background but shares the same toggle logic.

### Fallbacks

Every page falls back to the content it had before the CMS was connected
(`src/lib/fallbacks.ts`, plus per-page defaults). A fresh install therefore
renders the complete original site, and each section switches to CMS content as
soon as an editor fills it in. To reset a page, unpublish its entry.

---

## Commands

| Command | Action |
| :-- | :-- |
| `npm run dev` | Dev server with the CMS at `/_emdash/admin` |
| `npm run build` | Production build (Node adapter) |
| `npm run preview` | Preview the production build |
| `npm run build:cloudflare` | Build for Cloudflare Workers |
| `npm run deploy` | Build for Cloudflare and deploy with Wrangler |
| `npx emdash seed seed/seed.json --validate` | Validate the content model |
| `npx emdash seed seed/seed.json` | Apply content entries to the local database |

---

## Deploying

Cloudflare Workers (D1 + R2) is the production target — see
[DEPLOYMENT.md](./DEPLOYMENT.md).
