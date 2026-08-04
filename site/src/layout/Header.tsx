import { Link, useLocation } from 'react-router-dom';
import { defaultLocale, isLocale, type Locale } from '../i18n/locales';
import { getPagePath, resolveRoute } from '../site';

function getActiveLocale(pathname: string): Locale {
  const firstSegment = pathname.split('/').filter(Boolean)[0];

  return isLocale(firstSegment) ? firstSegment : defaultLocale;
}

function getAlternatePath(pathname: string, targetLocale: Locale) {
  const route = resolveRoute(pathname);

  if (route.kind === 'page') {
    return route.seo.alternates.find((alternate) => alternate.locale === targetLocale)?.path ?? getPagePath('home', targetLocale);
  }

  return getPagePath('home', targetLocale);
}

export function Header() {
  const location = useLocation();
  const locale = getActiveLocale(location.pathname);
  const isFrench = locale === 'fr-fr';

  const homePath = getPagePath('home', locale);
  const projectsPath = getPagePath('projects', locale);
  const blogPath = getPagePath('blog', locale);
  const contactPath = getPagePath('contact', locale);

  const frPath = getAlternatePath(location.pathname, 'fr-fr') ?? '/fr-fr/';
  const enPath = getAlternatePath(location.pathname, 'en-us') ?? '/en-us/';

  return (
    <header className="site-header">
      {homePath && (
        <Link to={homePath} className="brand">
          Bezot Corp
        </Link>
      )}

      <nav aria-label={isFrench ? 'Navigation principale' : 'Main navigation'}>
        {homePath && <Link to={homePath}>{isFrench ? 'Accueil' : 'Home'}</Link>}
        {projectsPath && <Link to={projectsPath}>{isFrench ? 'Projets' : 'Projects'}</Link>}
        {blogPath && <Link to={blogPath}>Blog</Link>}
        {contactPath && <Link to={contactPath}>Contact</Link>}
      </nav>

      <div className="locale-switch" aria-label={isFrench ? 'Changer de langue' : 'Change language'}>
        <Link to={frPath} lang="fr" aria-current={locale === 'fr-fr' ? 'page' : undefined}>
          FR
        </Link>
        <Link to={enPath} lang="en" aria-current={locale === 'en-us' ? 'page' : undefined}>
          EN
        </Link>
      </div>
    </header>
  );
}
