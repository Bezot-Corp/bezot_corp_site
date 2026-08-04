import { Link, useLocation } from 'react-router-dom';
import { defaultLocale, isLocale, type Locale } from '../i18n/locales';
import { getPathForLocaleAndSlug, getPublishedPosts } from '../site';

type Props = {
  props?: Record<string, unknown>;
};

function getActiveLocale(pathname: string): Locale {
  const firstSegment = pathname.split('/').filter(Boolean)[0];

  return isLocale(firstSegment) ? firstSegment : defaultLocale;
}

function getNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function getBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

export function PostListBlock({ props }: Props) {
  const location = useLocation();
  const locale = getActiveLocale(location.pathname);

  const limit = getNumber(props?.limit, 10);
  const page = getNumber(props?.page, 1);
  const showDescription = getBoolean(props?.showDescription, true);
  const showAuthor = getBoolean(props?.showAuthor, true);
  const showDate = getBoolean(props?.showDate, true);

  const posts = getPublishedPosts()
    .filter((post) => post.locales[locale])
    .slice()
    .sort((a, b) => String(b.publishedAt ?? '').localeCompare(String(a.publishedAt ?? '')));

  const start = (page - 1) * limit;
  const visiblePosts = posts.slice(start, start + limit);
  const totalPages = Math.max(1, Math.ceil(posts.length / limit));

  if (visiblePosts.length === 0) {
    return (
      <section aria-label={locale === 'fr-fr' ? 'Articles' : 'Posts'}>
        <p>{locale === 'fr-fr' ? 'Aucun article publié pour le moment.' : 'No posts published yet.'}</p>
      </section>
    );
  }

  return (
    <section aria-label={locale === 'fr-fr' ? 'Articles' : 'Posts'}>
      {visiblePosts.map((post) => {
        const content = post.locales[locale];
        const path = getPathForLocaleAndSlug(locale, content.slug);
        const title = content.seo.ogTitle;
        const description = content.seo.description;

        return (
          <article key={post.id}>
            <h2>
              <Link to={path}>{title}</Link>
            </h2>

            {showDescription && description && <p>{description}</p>}

            {(showAuthor || showDate) && (
              <p>
                <small>
                  {showAuthor && post.author}
                  {showAuthor && showDate && post.publishedAt && ' · '}
                  {showDate && post.publishedAt && (
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
                  )}
                </small>
              </p>
            )}
          </article>
        );
      })}

      {totalPages > 1 && (
        <nav aria-label={locale === 'fr-fr' ? 'Pagination des articles' : 'Posts pagination'}>
          <p>
            {locale === 'fr-fr' ? 'Page' : 'Page'} {page} / {totalPages}
          </p>
        </nav>
      )}
    </section>
  );
}
