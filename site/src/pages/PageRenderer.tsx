import { Link, useLocation } from 'react-router-dom';
import { isPostEntry, resolveRoute } from '../site';
import { NotFoundPage } from './NotFoundPage';
import { PageTemplate } from '../templates/PageTemplate';

function RootLanguagePage() {
  return (
    <main>
      <h1>Bezot Corp</h1>
      <p>Choose your language.</p>

      <nav aria-label="Language selection">
        <Link to="/fr-fr/">Français</Link>
        {' | '}
        <Link to="/en-us/">English</Link>
      </nav>
    </main>
  );
}

export function PageRenderer() {
  const location = useLocation();
  const match = resolveRoute(location.pathname);

  if (match.kind === 'root') {
    return <RootLanguagePage />;
  }

  if (match.kind !== 'page') {
    return <NotFoundPage locale={match.locale} />;
  }

  const blocks = isPostEntry(match.entry)
    ? [
        match.content.blocks[0],
        {
          type: 'post_meta',
          props: {
            author: match.entry.author,
            publishedAt: match.entry.publishedAt,
            updatedAt: match.entry.updatedAt,
            locale: match.locale,
          },
        },
        ...match.content.blocks.slice(1),
      ].filter(Boolean)
    : match.content.blocks;

  return <PageTemplate page={{ ...match.content, blocks }} seo={match.seo} />;
}
