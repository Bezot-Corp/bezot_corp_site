import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { getPrerenderRoutes, resolveRoute } from './site';

export { getPrerenderRoutes };

export function render(url: string) {
  const route = resolveRoute(url);
  const appHtml = renderToString(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  );

  return {
    appHtml,
    seo: route.seo,
    status: route.kind === 'page' || route.kind === 'root' ? 200 : 404,
  };
}
