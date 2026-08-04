import { pages, posts, site } from '../generated/site';
import { defaultLocale, isLocale, locales, type Locale } from './i18n/locales';

export const siteUrl = site.baseUrl;
export const siteName = site.name;
export const defaultOgImage = site.defaultOgImage;

export type SitePage = (typeof pages)[number];
export type SitePost = (typeof posts)[number];
export type SiteEntry = SitePage | SitePost;
export type SiteEntryContent = SiteEntry['locales'][Locale];

export type SeoAlternate = {
  locale: Locale;
  path: string;
};

export type SeoMetadata = {
  title: string;
  description?: string;
  robots: string;
  lang: string;
  canonicalPath?: string;
  alternates: SeoAlternate[];
  ogTitle: string;
  ogDescription?: string;
  ogImage: string;
};

export type RouteMatch =
  | {
      kind: 'root';
      locale: Locale;
      path: '/';
      seo: SeoMetadata;
    }
  | {
      kind: 'page';
      locale: Locale;
      path: string;
      entry: SiteEntry;
      content: SiteEntryContent;
      seo: SeoMetadata;
    }
  | {
      kind: 'not-found';
      locale: Locale;
      path: string;
      seo: SeoMetadata;
    };

function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

function getLang(locale: Locale) {
  return locale.split('-')[0];
}

function getEntries(): SiteEntry[] {
  return [...pages, ...posts];
}

export function isPostEntry(entry: SiteEntry): entry is SitePost {
  return posts.some((post) => post.id === entry.id);
}

export function getEntryStatus(entry: SiteEntry, locale: Locale) {
  return isPostEntry(entry) ? entry.status : entry.locales[locale].status;
}

export function getEntryUpdatedAt(entry: SiteEntry, locale: Locale) {
  return isPostEntry(entry) ? entry.updatedAt : entry.locales[locale].updatedAt;
}

export function isEntryPublished(entry: SiteEntry, locale: Locale) {
  return getEntryStatus(entry, locale) === 'published';
}

export function getPathForLocaleAndSlug(locale: Locale, slug: string) {
  return normalizePathname(slug ? `/${locale}/${slug}` : `/${locale}`);
}

export function getCanonicalPath(path: string) {
  return normalizePathname(path);
}

export function findEntryByLocaleAndSlug(locale: Locale, slug = '') {
  const normalizedSlug = slug.replace(/^\/+|\/+$/g, '');

  const entry = getEntries().find(
    (item) => isEntryPublished(item, locale) && item.locales[locale].slug === normalizedSlug,
  );

  if (!entry) {
    return null;
  }

  return {
    entry,
    content: entry.locales[locale],
  };
}

export function getEntrySeo(entry: SiteEntry, locale: Locale): SeoMetadata {
  const content = entry.locales[locale];

  const alternates = locales
    .filter((entryLocale) => isEntryPublished(entry, entryLocale))
    .map((entryLocale) => ({
      locale: entryLocale,
      path: getPathForLocaleAndSlug(entryLocale, entry.locales[entryLocale].slug),
    }));

  return {
    title: content.seo.title,
    description: content.seo.description,
    robots: isEntryPublished(entry, locale) ? 'index, follow' : 'noindex, nofollow',
    lang: getLang(locale),
    canonicalPath: getPathForLocaleAndSlug(locale, content.slug),
    alternates,
    ogTitle: content.seo.ogTitle,
    ogDescription: content.seo.ogDescription,
    ogImage: content.seo.ogImage || defaultOgImage,
  };
}

export function getRootSeo(): SeoMetadata {
  return {
    title: siteName,
    description: 'Choose your language to visit Bezot Corp.',
    robots: 'index, follow',
    lang: 'fr',
    canonicalPath: '/',
    alternates: locales.map((locale) => ({
      locale,
      path: getPathForLocaleAndSlug(locale, ''),
    })),
    ogTitle: siteName,
    ogDescription: 'Choose your language to visit Bezot Corp.',
    ogImage: defaultOgImage,
  };
}

export function getNotFoundSeo(locale: Locale): SeoMetadata {
  const title = locale === 'fr-fr' ? `Page introuvable - ${siteName}` : `Page not found - ${siteName}`;

  const description =
    locale === 'fr-fr'
      ? 'Cette URL ne correspond à aucune page publiée.'
      : 'This URL does not match any published page.';

  return {
    title,
    description,
    robots: 'noindex, nofollow',
    lang: getLang(locale),
    alternates: [],
    ogTitle: title,
    ogDescription: description,
    ogImage: defaultOgImage,
  };
}

export function resolveRoute(pathname: string): RouteMatch {
  const normalizedPath = normalizePathname(pathname);
  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return {
      kind: 'root',
      locale: defaultLocale,
      path: '/',
      seo: getRootSeo(),
    };
  }

  const [localeSegment, ...slugSegments] = segments;

  if (!isLocale(localeSegment)) {
    return {
      kind: 'not-found',
      locale: defaultLocale,
      path: normalizedPath,
      seo: getNotFoundSeo(defaultLocale),
    };
  }

  const locale = localeSegment;
  const slug = slugSegments.join('/');
  const entryMatch = findEntryByLocaleAndSlug(locale, slug);

  if (!entryMatch) {
    return {
      kind: 'not-found',
      locale,
      path: normalizedPath,
      seo: getNotFoundSeo(locale),
    };
  }

  const path = getPathForLocaleAndSlug(locale, entryMatch.content.slug);

  return {
    kind: 'page',
    locale,
    path,
    entry: entryMatch.entry,
    content: entryMatch.content,
    seo: getEntrySeo(entryMatch.entry, locale),
  };
}

export function getPagePath(pageId: SitePage['id'], locale: Locale) {
  const page = pages.find((entry) => entry.id === pageId && isEntryPublished(entry, locale));

  if (!page) {
    return null;
  }

  return getPathForLocaleAndSlug(locale, page.locales[locale].slug);
}

export function getPostPath(postId: SitePost['id'], locale: Locale) {
  const post = posts.find((entry) => entry.id === postId && isEntryPublished(entry, locale));

  if (!post) {
    return null;
  }

  return getPathForLocaleAndSlug(locale, post.locales[locale].slug);
}

export function getPublishedPosts() {
  return posts.filter((post) => post.status === 'published');
}

export function getPrerenderRoutes() {
  return [
    {
      path: '/',
      seo: getRootSeo(),
    },
    ...getEntries().flatMap((entry) =>
      locales
        .filter((locale) => isEntryPublished(entry, locale))
        .map((locale) => ({
          path: getPathForLocaleAndSlug(locale, entry.locales[locale].slug),
          seo: getEntrySeo(entry, locale),
        })),
    ),
  ];
}
