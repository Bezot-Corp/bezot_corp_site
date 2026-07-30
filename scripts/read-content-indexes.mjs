import { existsSync, readFileSync } from 'node:fs';
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

function assertEnabledStatus(value, label) {
  if (!['enabled', 'disabled'].includes(value)) {
    throw new Error(`${label} status must be "enabled" or "disabled".`);
  }
}

function assertNoDuplicateIndexFields(pageId, locale, localeContent) {
  const forbiddenFields = ['status', 'updatedAt'];

  for (const field of forbiddenFields) {
    if (Object.hasOwn(localeContent, field)) {
      throw new Error(
        `Page "${pageId}" locale "${locale}" must not define "${field}". Put it in content/pages/${pageId}/index.json.`,
      );
    }
  }
}

function readPages(pagesSection) {
  assertEnabledStatus(pagesSection.status, 'pages section');

  if (pagesSection.status === 'disabled') {
    return [];
  }

  const pagesIndexPath = resolveContentPath(pagesSection.indexPath);
  const pagesDir = path.dirname(pagesIndexPath);
  const pagesIndex = readJson(pagesIndexPath);

  return pagesIndex.pageIds.map((pageId) => {
    const pageDir = path.join(pagesDir, pageId);
    const pageIndexPath = path.join(pageDir, 'index.json');

    if (!existsSync(pageIndexPath)) {
      throw new Error(`Missing page index: ${pageIndexPath}`);
    }

    const pageIndex = readJson(pageIndexPath);

    const locales = Object.fromEntries(
      Object.entries(pageIndex.locales ?? {}).map(([locale, localeIndex]) => {
        const localePath = path.join(pageDir, `${locale}.json`);

        if (!existsSync(localePath)) {
          throw new Error(`Missing locale file for page "${pageId}" and locale "${locale}": ${localePath}`);
        }

        const localeContent = readJson(localePath);
        assertNoDuplicateIndexFields(pageId, locale, localeContent);

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
  assertEnabledStatus(blogSection.status, 'blog section');

  if (blogSection.status === 'disabled') {
    return [];
  }

  const blogIndexPath = resolveContentPath(blogSection.indexPath);
  const blogDir = path.dirname(blogIndexPath);
  const blogIndex = readJson(blogIndexPath);

  assertEnabledStatus(blogIndex.status, 'blog index');

  if (blogIndex.status === 'disabled') {
    return [];
  }

  return blogIndex.postPaths.map((postPath) => {
    const absolutePostPath = path.join(blogDir, postPath);

    if (!existsSync(absolutePostPath)) {
      throw new Error(`Missing blog post file: ${absolutePostPath}`);
    }

    return readJson(absolutePostPath);
  });
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
