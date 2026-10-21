import { getEmDashCollection, getEmDashEntry } from 'emdash';
import type { PageEntry, PostEntry, ProductEntry } from './cms';

/**
 * Reads one Pages entry by slug (for example "home", "about", "contact").
 *
 * EmDash reports a missing entry as `entry: null` rather than an error, so an
 * unpublished page falls back to `null` and the caller decides what to render.
 */
export async function getPage(slug: string) {
  const { entry, error, cacheHint } = await getEmDashEntry('pages', slug);

  if (error) {
    // Surface the failure in the terminal but keep the page rendering — the
    // static fallback is better than a 500 for a content problem.
    console.error(`[cms] Could not load the "${slug}" page:`, error);
  }

  return { entry: entry as PageEntry | null, cacheHint };
}

/** Applies EmDash's cache hint when Astro's route cache is enabled. */
export function applyCacheHint(hint: unknown) {
  const cache = (Astro as unknown as { cache?: { enabled?: boolean; set?: (h: unknown) => void } }).cache;
  if (cache?.enabled && cache.set && hint) cache.set(hint);
}

/**
 * Published products in seed order. Anonymous queries already exclude drafts.
 */
export async function getProducts(productType?: string) {
  const { entries, error, cacheHint } = await getEmDashCollection(
    'products',
    productType ? { where: { product_type: productType } } : undefined
  );

  if (error) console.error('[cms] Could not load products:', error);

  return { products: entries as unknown as ProductEntry[], cacheHint };
}

/**
 * One product entry by slug (for example "cross-shaft-power-presses").
 */
export async function getProduct(slug: string) {
  const { entry, error, cacheHint } = await getEmDashEntry('products', slug);

  if (error) {
    console.error(`[cms] Could not load the "${slug}" product:`, error);
  }

  return { entry: entry as ProductEntry | null, cacheHint };
}

/**
 * Published posts, newest first. Anonymous queries already exclude drafts.
 */
export async function getPosts(limit?: number) {
  const { entries, error, cacheHint } = await getEmDashCollection('posts', {
    orderBy: { published_at: 'desc' },
    ...(limit ? { limit } : {}),
  });

  if (error) console.error('[cms] Could not load posts:', error);

  return { posts: entries as unknown as PostEntry[], cacheHint };
}
