/** Shared types and helpers for translating CMS data into component props. */

/** A CMS media value. `SmartImage` narrows this further at render time. */
export type CmsImage = string | { src?: string; id?: string; alt?: string } | null | undefined;

export interface Block<T> {
  _type: string;
  _version: number;
  _key: string;
  [field: string]: unknown;
}

export interface PageEntry {
  data: {
    title?: string;
    slug?: string;
    description?: string;
    layout?: Block<Record<string, unknown>>[];
  };
}

export interface PostEntry {
  id: string;
  data: {
    title?: string;
    slug?: string;
    excerpt?: string;
    cover_image?: CmsImage;
    cover_alt?: string;
    category?: string;
    read_time?: string;
    published_at?: string;
  };
}

export interface ProductEntry {
  id: string;
  data: {
    title?: string;
    slug?: string;
    excerpt?: string;
    cover_image?: CmsImage;
    cover_alt?: string;
    content?: unknown;
  };
}

type Repeater = Record<string, unknown>[] | undefined | null;

/** Reads a string field, falling back when the editor left it empty. */
export function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

export function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Resolves a CMS media value to a plain URL.
 *
 * `file` fields arrive as `{ src?, url?, mimeType? }`, but `image` fields and
 * hand-authored values can be a bare URL string, so both shapes are accepted.
 *
 * NOTE: a freshly-picked local upload is stored as `{ id, meta: { storageKey },
 * ... }` with NO `src`/`url` — EmDash strips `src` for the local provider on
 * save (see `normalizeMediaValue`) and its own `<Media>` component rebuilds
 * the URL at render time via `meta.storageKey || id`. Mirror that fallback
 * here so a `<video>` fed by `mediaUrl()` actually gets a `src`:
 * `/_emdash/api/media/file/{storageKey|id}` (the internal proxy looks up a
 * bare id). Returns '' when there is nothing to point at, which lets callers
 * fall back.
 */
export function mediaUrl(value: unknown): string {
  if (typeof value === 'string') return value.trim();

  const media = value as {
    src?: string;
    url?: string;
    id?: string;
    meta?: Record<string, unknown>;
  } | null
    | undefined;
  const direct = media?.src?.trim() || media?.url?.trim();
  if (direct) return direct;

  const storageKey = media?.meta?.storageKey;
  if (typeof storageKey === 'string' && storageKey.trim()) {
    return `/_emdash/api/media/file/${storageKey.trim()}`;
  }

  const id = typeof media?.id === 'string' ? media.id.trim() : '';
  if (id) return `/_emdash/api/media/file/${id}`;

  return '';
}

/** The MIME type EmDash recorded for a media value, e.g. for a `<source type>`. */
export function mediaType(value: unknown, fallback = ''): string {
  const mime = (value as { mimeType?: string } | null | undefined)?.mimeType;
  return typeof mime === 'string' && mime.trim() ? mime.trim() : fallback;
}

/** Section copy used when the CMS has not supplied a value. Empty by design: when the backend leaves a field empty it renders empty. */
export const DEFAULTS = {
  heroEyebrow: '',
  heroTitle: '',
  heroCtaLabel: '',
  heroCtaHref: '',
  /** Optional clip; an editor-supplied file in the CMS takes over. */
  heroVideo: '',
  heroVideoType: '',

  sliderEyebrow: '',
  sliderTitle: '',
  sliderViewAllHref: '',
  sliderViewAllLabel: '',

  capabilityEyebrow: '',
  capabilityTitle: '',
  capabilityInterval: 6,

  featuredEyebrow: '',
  featuredTitle: '',
  featuredDescription: '',
  featuredCtaHref: '',
  featuredCtaLabel: '',

  reasonsTitle: '',

  teamEyebrow: '',
  teamTitle: '',
  teamLinkLabel: '',

  newsTitle: '',
  newsViewAllHref: '',
  newsViewAllLabel: '',

  splitLead: '',
  splitSupporting: '',
  splitCtaHref: '',
  splitCtaLabel: '',
} as const;

/** `stats` is a repeater of { value, label }; the section wants { value, lines }. */
export function toStats(items: Repeater) {
  const stats = (items ?? [])
    .map((item) => ({
      value: text(item.value),
      // One entry per forced line, e.g. ['Years in', 'power', 'presses'].
      lines: text(item.label)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    }))
    .filter((stat) => stat.value && stat.lines.length > 0);

  return stats;
}

export function toNewsPost(post: PostEntry) {
  return {
    href: `/blog/${post.id}`,
    image: (post.data.cover_image ?? null) as CmsImage,
    imageAlt: text(post.data.cover_alt, text(post.data.title)),
    category: text(post.data.category),
    readTime: text(post.data.read_time),
    title: text(post.data.title),
  };
}
