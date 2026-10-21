import type { Block } from './cms';

/**
 * No stock imagery ships with the site: when the CMS has no content the bands
 * render empty. Add copy and images in the backend and they appear on the
 * next request.
 */

/** Copy for the capability crossfade. Images come from the CMS. */
export const homeCapabilities: {
  title: string;
  description: string;
}[] = [];

export const homeReasons: { title: string }[] = [];

/**
 * Placeholder members for the leadership band. Empty until an editor fills in
 * the `team_grid` block — when the backend is empty the grid renders empty.
 */
export const teamFallbackMembers: { name: string; role: string }[] = [];

/** Full-bleed background for the featured product band. */
export const homeFeaturedImage = undefined;

/** Photo and client mark for the testimonial band. */
export const homeTestimonialImage = undefined;
export const homeTestimonialLogo = undefined;

// No placeholder cards: when there are no posts the news band renders empty.
export const homeFallbackPosts: {
  href: string;
  image: undefined;
  imageAlt: string;
  category: string;
  readTime: string;
  title: string;
  _key: string;
}[] = [];

/**
 * No fallback layout: when a page has no CMS entry it renders empty.
 */
export const homeFallback: Block<Record<string, unknown>>[] = [];

/** No placeholder copy: pages without a CMS entry render empty. */
export function placeholderLayout(
  _heading: string,
  _paragraph: string
): Block<Record<string, unknown>>[] {
  return [];
}
