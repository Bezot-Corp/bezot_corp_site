import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(scriptsDir, '..');
export const contentDir = path.join(rootDir, 'content');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function resolveContentPath(relativePath) {
  return path.join(contentDir, relativePath);
}

function readPages(pagesSection) {
  if (pagesSection.status !== 'enabled') {
    return [];
  }

  const pagesIndexPath = resolveContentPath(pagesSection.indexPath);
  const pagesDir = path.dirname(pagesIndexPath);
  const pagesIndex = readJson(pagesIndexPath);

  return pagesIndex.pageIds.map((pageId) => {
    const pageDir = path.join(pagesDir, pageId);
    const pageIndex = readJson(path.join(pageDir, 'index.json'));

    const locales = Object.fromEntries(
      Object.entries(pageIndex.locales ?? {}).map(([locale, localeIndex]) => {
        const localeContent = readJson(path.join(pageDir, `${locale}.json`));

        return [
          locale,
          {
            ...localeIndex,
            ...localeContent,
          },
        ];
      }),
    );

    return {
      id: pageId,
      locales,
    };
  });
}

function readBlogPosts(blogSection) {
  if (blogSection.status !== 'enabled') {
    return [];
  }

  const blogIndexPath = resolveContentPath(blogSection.indexPath);
  const blogDir = path.dirname(blogIndexPath);
  const blogIndex = readJson(blogIndexPath);

  if (blogIndex.status !== 'enabled') {
    return [];
  }

  return blogIndex.postPaths.map((postPath) => readJson(path.join(blogDir, postPath)));
}

export function readContentIndexes() {
  const contentIndex = readJson(resolveContentPath('index.json'));

  return {
    site: readJson(resolveContentPath('website-metadata.json')),
    redirects: readJson(resolveContentPath('redirects.json')),
    gone: readJson(resolveContentPath('gone-routes.json')),
    pages: readPages(contentIndex.sections.pages),
    posts: readBlogPosts(contentIndex.sections.blog),
  };
}
