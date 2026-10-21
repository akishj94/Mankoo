import { getEmDashCollection, getMenu, getSiteSettings } from 'emdash';
import { text, type CmsImage } from './cms';

export interface MenuLink {
  label: string;
  url: string;
  external: boolean;
  children: MenuLink[];
}

export interface LinkColumn {
  title: string;
  links: MenuLink[];
}

export interface SiteDetails {
  email: string;
  address: string;
  phones: { display: string; number: string }[];
  copyright: string;
  legalLinks: { label: string; url: string }[];
  whatsappNumber: string;
  whatsappMessage: string;
  /** Optional backend image for the desktop dropdown panel; unset renders links only. */
  menuImage: CmsImage;
  menuImageAlt: string;
}

export interface SiteData {
  primary: MenuLink[];
  columns: LinkColumn[];
  social: { label: string; url: string }[];
  details: SiteDetails;
}

const FALLBACK = {
  email: '',
  address: '',
  phones: [] as { display: string; number: string }[],
  copyright: '',
  legalLinks: [] as { label: string; url: string }[],
  // Empty until the CMS provides one; `whatsappLink()` substitutes the
  // placeholder number/message the original header used, so the icon stays
  // visible either way.
  whatsappNumber: '',
  whatsappMessage: '',
  columns: [] as { title: string; links: { label: string; url: string }[] }[],
};

const FOOTER_MENUS = ['footer-company', 'footer-machines', 'footer-connect'];

/** Settings > Social stores a handle or page path; the service URL is ours. */
const SOCIAL = [
  { key: 'facebook', label: 'Facebook', base: 'https://www.facebook.com/' },
  { key: 'twitter', label: 'X', base: 'https://x.com/' },
  { key: 'instagram', label: 'Instagram', base: 'https://www.instagram.com/' },
  { key: 'linkedin', label: 'LinkedIn', base: 'https://www.linkedin.com/in/' },
  { key: 'youtube', label: 'YouTube', base: 'https://www.youtube.com/@' },
];

const isExternal = (url: string) => /^https?:\/\//i.test(url);

function toLinks(items: unknown): MenuLink[] {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const i = item as { label?: string; url?: string; children?: unknown };
      const label = text(i?.label);
      const url = text(i?.url);
      if (!label || !url) return null;
      return {
        label,
        url,
        external: isExternal(url),
        children: toLinks(i.children),
      };
    })
    .filter(Boolean) as MenuLink[];
}

async function loadMenu(name: string): Promise<MenuLink[]> {
  try {
    return toLinks((await getMenu(name))?.items);
  } catch (err) {
    console.error(`[cms] Could not load the "${name}" menu:`, err);
    return [];
  }
}
async function loadDetails(): Promise<SiteDetails> {
  let data: Record<string, unknown> = {};

  try {
    const { entries } = await getEmDashCollection('site_details', { limit: 1 });
    data = (entries[0] as { data?: Record<string, unknown> } | undefined)?.data ?? {};
  } catch (err) {
    console.error('[cms] Could not load site details:', err);
  }

  const phones = (Array.isArray(data.phones) ? data.phones : [])
    .map((row) => {
      const r = row as { display?: string; number?: string };
      const display = text(r?.display);
      if (!display) return null;
      return { display, number: text(r?.number) || display.replace(/[^\d+]/g, '') };
    })
    .filter(Boolean) as SiteDetails['phones'];

  const legalLinks = (Array.isArray(data.legal_links) ? data.legal_links : [])
    .map((row) => {
      const r = row as { label?: string; url?: string };
      const label = text(r?.label);
      const url = text(r?.url);
      return label && url ? { label, url } : null;
    })
    .filter(Boolean) as SiteDetails['legalLinks'];

  return {
    email: text(data.email),
    address: text(data.address),
    phones,
    copyright: text(data.copyright),
    legalLinks,
    // No fallback here on purpose: clearing the field must disable the link, so
    // an empty value has to survive `text()` rather than being replaced.
    whatsappNumber: text(data.whatsapp_number).replace(/[^\d+]/g, ''),
    whatsappMessage: text(data.whatsapp_message),
    menuImage: (data.menu_image ?? null) as CmsImage,
    menuImageAlt: text(data.menu_image_alt),
  };
}

/**
 * Address, email and phone numbers from the `site_details` collection — the
 * contact page renders them as the row beneath its page intro.
 */
export function getSiteDetails(): Promise<SiteDetails> {
  return loadDetails();
}

/**
 * The wa.me deep link for the header button. Always returns a URL — when the
 * CMS has no number configured it falls back to the placeholder number and
 * message the original header used, so the icon stays visible.
 */
export function whatsappLink(details: SiteDetails): string {
  const number = details.whatsappNumber || '00000000000';
  const message =
    details.whatsappMessage || 'Hello Mankoo, I would like to know more about your machines.';
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${number}${query}`;
}

/**
 * Everything the header and footer render. Empty when the CMS has nothing —
 * no fallback links or copy are injected.
 */
export async function getSiteData(): Promise<SiteData> {
  const [primary, columnMenus, settings, details] = await Promise.all([
    loadMenu('primary'),
    Promise.all(FOOTER_MENUS.map(loadMenu)),
    getSiteSettings().catch((err) => {
      console.error('[cms] Could not load site settings:', err);
      return undefined;
    }),
    loadDetails(),
  ]);

  const handles = settings?.social ?? {};
  const social = SOCIAL.flatMap(({ key, label, base }) => {
    const raw = text(handles[key as keyof typeof handles]);
    if (!raw) return [];
    return [{ label, url: isExternal(raw) ? raw : `${base}${raw.replace(/^@/, '')}` }];
  });

  const columns: LinkColumn[] = FOOTER_MENUS.map((name, i) => {
    const links = columnMenus[i];
    const title = FALLBACK.columns[i]?.title || name;
    return { title, links };
  });

  const primaryLinks = primary;

  return { primary: primaryLinks, columns, social, details };
}