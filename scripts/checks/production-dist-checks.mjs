import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  CONTENT_DIR,
  DIST_DIR,
  collectFiles,
  fail,
  finishErrorCollection,
  htmlFileToLocation,
  isExcluded,
  readInvariants,
  readJson,
  readSitemapLocations,
  readText,
  sitemapLocationToDistFile,
  startErrorCollection,
  toPosix,
} from './production-check-utils.mjs';

function assertFile(relativePath) {
  const filePath = path.join(DIST_DIR, relativePath);

  if (!existsSync(filePath)) {
    fail(`Missing required production file: ${toPosix(filePath)}`);
  }
}

function assertForbiddenPathMissing(relativePath) {
  const filePath = path.join(DIST_DIR, relativePath);

  if (existsSync(filePath)) {
    fail(`Forbidden production path exists: ${toPosix(filePath)}`);
  }
}

function assertNotIncludes(value, forbidden, label) {
  if (value.includes(forbidden)) {
    fail(`${label} must not include: ${forbidden}`);
  }
}

function assertSitemapTargetsExist(locations, invariants) {
  for (const location of locations) {
    const targetFile = sitemapLocationToDistFile(
      location,
      invariants.sitemap.requireCanonicalHost,
    );

    if (!existsSync(targetFile)) {
      fail(
        `sitemap.xml points to a missing HTML file: ${location} -> ${toPosix(targetFile)}`,
      );
    }
  }
}

function assertHtmlFilesAreListedInSitemap(htmlFiles, locations, invariants) {
  const excludedFiles = invariants.sitemap.excludeFiles ?? [];

  for (const filePath of htmlFiles) {
    const relativePath = toPosix(path.relative(DIST_DIR, filePath));

    if (isExcluded(relativePath, excludedFiles)) {
      continue;
    }

    const location = htmlFileToLocation(
      filePath,
      invariants.sitemap.requireCanonicalHost,
    );

    if (location && !locations.has(location)) {
      fail(`HTML file is missing from sitemap.xml: ${toPosix(filePath)} -> ${location}`);
    }
  }
}

function routeOutputPath(locale, slug) {
  if (!slug) {
    return path.join(DIST_DIR, locale, 'index.html');
  }

  return path.join(DIST_DIR, locale, slug, 'index.html');
}

function assertPagesMatchContentIndexes() {
  const contentIndex = readJson(path.join(CONTENT_DIR, 'index.json'));
  const pagesSection = contentIndex.sections?.pages;

  if (!pagesSection || pagesSection.status !== 'enabled') {
    return;
  }

  const pagesIndex = readJson(path.join(CONTENT_DIR, pagesSection.indexPath));
  const pageIds = pagesIndex.pageIds ?? [];
  for (const pageId of pageIds) {
    const pageIndexPath = path.join(CONTENT_DIR, 'pages', pageId, 'index.json');
    const pageIndex = readJson(pageIndexPath);
    const localeEntries = Object.entries(pageIndex.locales ?? {});

    if (localeEntries.length === 0) {
      fail(`${toPosix(pageIndexPath)} must declare at least one locale`);
    }

    const publishedLocales = localeEntries
      .filter(([, localeConfig]) => localeConfig.status === 'published')
      .map(([locale]) => locale);

    if (publishedLocales.length === 0) {
      fail(
        `${toPosix(pageIndexPath)} must declare at least one published locale or be removed from pages/index.json`,
      );
    }

    for (const [locale, localeConfig] of localeEntries) {
      const outputPath = routeOutputPath(locale, localeConfig.slug);
      const outputExists = existsSync(outputPath);

      if (localeConfig.status === 'published' && !outputExists) {
        fail(`Published page is missing from dist: ${pageId}/${locale} -> ${toPosix(outputPath)}`);
      }

      if (localeConfig.status !== 'published' && outputExists) {
        fail(`Non-published page exists in dist: ${pageId}/${locale} -> ${toPosix(outputPath)}`);
      }
    }
  }
}

function postSlugFromPath(postPath) {
  return path.basename(postPath, '.json');
}

function postDateFromPath(postPath) {
  const parts = toPosix(postPath).split('/');

  return parts.length >= 3 ? parts[1] : null;
}

function candidatePostOutputPaths(locale, postPath, post, localeConfig) {
  const slug = localeConfig.slug ?? post.slug ?? post.id ?? postSlugFromPath(postPath);

  return [
    routeOutputPath(locale, slug),
  ];
}

function assertBlogPostsMatchContentIndexes() {
  const contentIndex = readJson(path.join(CONTENT_DIR, 'index.json'));
  const blogSection = contentIndex.sections?.blog;

  if (!blogSection || blogSection.status !== 'enabled') {
    return;
  }

  const blogIndex = readJson(path.join(CONTENT_DIR, blogSection.indexPath));
  const postPaths = blogIndex.postPaths ?? [];

  for (const postPath of postPaths) {
    const absolutePostPath = path.join(CONTENT_DIR, 'blog', postPath);
    const post = readJson(absolutePostPath);
    const localeEntries = Object.entries(post.locales ?? {});

    for (const [locale, localeConfig] of localeEntries) {
      const status = localeConfig.status ?? post.status;
      const isPublished = status === 'published';
      const candidates = candidatePostOutputPaths(locale, postPath, post, localeConfig);
      const existingCandidates = candidates.filter((candidatePath) => existsSync(candidatePath));

      if (isPublished && existingCandidates.length === 0) {
        fail(
          `Published blog post is missing from dist: ${postPath}/${locale} -> expected one of ${candidates.map(toPosix).join(', ')}`,
        );
      }

      if (!isPublished && existingCandidates.length > 0) {
        fail(
          `Non-published blog post exists in dist: ${postPath}/${locale} -> ${existingCandidates.map(toPosix).join(', ')}`,
        );
      }
    }
  }
}

function runProductionDistChecks() {
  startErrorCollection();

  const invariants = readInvariants();

  if (!existsSync(DIST_DIR)) {
    fail('Missing production directory: dist');
  }

  for (const requiredFile of invariants.dist.requiredFiles) {
    assertFile(requiredFile);
  }

  for (const forbiddenPath of invariants.dist.forbiddenPaths) {
    assertForbiddenPathMissing(forbiddenPath);
  }

  const files = collectFiles(DIST_DIR);

  const publicTextFiles = files.filter((filePath) =>
    ['.html', '.xml', '.txt'].includes(path.extname(filePath)) ||
    path.basename(filePath) === '.htaccess',
  );

  for (const filePath of publicTextFiles) {
    const content = readText(filePath);

    for (const forbiddenText of invariants.dist.forbiddenPublicText) {
      assertNotIncludes(content, forbiddenText, toPosix(filePath));
    }
  }

  const htmlFiles = files.filter((filePath) => filePath.endsWith('.html'));

  if (htmlFiles.length === 0) {
    fail('Production dist must contain HTML files');
  }

  const sitemapLocations = readSitemapLocations(invariants);

  if (invariants.sitemap.requireLocTargetsToExistInDist) {
    assertSitemapTargetsExist(sitemapLocations, invariants);
  }

  if (invariants.sitemap.requireHtmlFilesToBeListed) {
    assertHtmlFilesAreListedInSitemap(htmlFiles, sitemapLocations, invariants);
  }

  assertPagesMatchContentIndexes();
  assertBlogPostsMatchContentIndexes();

  finishErrorCollection('Production dist checks');

  console.log(`Production dist checks passed:
- required production files exist
- forbidden production paths are absent
- public text outputs do not contain forbidden text
- HTML outputs exist
- sitemap locations target existing dist HTML files
- public HTML files are listed in sitemap
- page outputs match content page indexes
- blog post outputs match content blog indexes`);
}

runProductionDistChecks();
