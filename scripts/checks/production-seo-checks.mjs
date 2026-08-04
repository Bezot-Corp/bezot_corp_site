import path from 'node:path';
import {
  extractAttribute,
} from '../project-html-data.mjs';
import {
  collectFiles,
  toPosix,
} from '../project-file-utils.mjs';
import {
  DIST_DIR,
  fail,
  finishErrorCollection,
  htmlFileToLocation,
  isExcluded,
  readInvariants,
  readText,
  startErrorCollection,
} from './production-check-utils.mjs';

function extractTagContent(html, regex) {
  const match = html.match(regex);

  return match?.[1]?.trim() ?? '';
}


function extractMetaContentByName(html, name) {
  const metaTags = html.match(/<meta\s+[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    if (extractAttribute(tag, 'name').toLowerCase() === name.toLowerCase()) {
      return extractAttribute(tag, 'content');
    }
  }

  return '';
}

function extractCanonical(html) {
  const linkTags = html.match(/<link\s+[^>]*>/gi) ?? [];

  for (const tag of linkTags) {
    if (extractAttribute(tag, 'rel').toLowerCase() === 'canonical') {
      return extractAttribute(tag, 'href');
    }
  }

  return '';
}

function normalizeUrl(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function countMatches(html, regex) {
  return html.match(regex)?.length ?? 0;
}

function hasNoindex(html) {
  const robots = extractMetaContentByName(html, 'robots');

  return robots
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .includes('noindex');
}

function assertSeo(filePath, html, invariants) {
  const seo = invariants.seo;
  const canonicalHost = invariants.sitemap.requireCanonicalHost;

  const title = extractTagContent(html, /<title[^>]*>([^<]+)<\/title>/i);
  const description = extractMetaContentByName(html, 'description');
  const canonical = extractCanonical(html);
  const expectedCanonical = htmlFileToLocation(filePath, canonicalHost);

  if (seo.requireTitle && !title) {
    fail(`${toPosix(filePath)} must include a non-empty <title>`);
  }

  if (seo.requireMetaDescription && !description) {
    fail(`${toPosix(filePath)} must include a non-empty meta description`);
  }

  if (seo.requireCanonical && !canonical) {
    fail(`${toPosix(filePath)} must include a non-empty canonical link`);
  }

  if (
    seo.requireCanonicalMatchesRoute &&
    expectedCanonical &&
    normalizeUrl(canonical) !== normalizeUrl(expectedCanonical)
  ) {
    fail(
      `${toPosix(filePath)} canonical must match its route: ${canonical} !== ${expectedCanonical}`,
    );
  }

  if (seo.requireHtmlLang && !/<html\s+[^>]*lang=["'][^"']+["'][^>]*>/i.test(html)) {
    fail(`${toPosix(filePath)} must include html lang`);
  }

  if (seo.requireSingleH1 && countMatches(html, /<h1(\s|>)/gi) !== 1) {
    fail(`${toPosix(filePath)} must include exactly one <h1>`);
  }

  if (seo.forbidNoindexOnPublishedPages && hasNoindex(html)) {
    fail(`${toPosix(filePath)} must not include noindex`);
  }
}

function runProductionSeoChecks() {
  startErrorCollection();

  const invariants = readInvariants();
  const files = collectFiles(DIST_DIR);
  const htmlFiles = files.filter((filePath) => filePath.endsWith('.html'));

  if (htmlFiles.length === 0) {
    fail('Production SEO checks require HTML files');
  }

  for (const filePath of htmlFiles) {
    const relativePath = toPosix(path.relative(DIST_DIR, filePath));

    if (isExcluded(relativePath, invariants.seo.excludeFiles)) {
      continue;
    }

    assertSeo(filePath, readText(filePath), invariants);
  }

  finishErrorCollection('Production SEO checks');

  console.log(`Production SEO checks passed:
- HTML outputs respect configured SEO requirements
- title, meta description and canonical are checked
- canonical URLs match generated routes`);
}

runProductionSeoChecks();
