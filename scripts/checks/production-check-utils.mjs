import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const DIST_DIR = 'dist';
export const CONTENT_DIR = 'content';
export const INVARIANTS_PATH = 'content/site-output-invariants.json';

export function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

export function collectFiles(dirPath) {
  if (!existsSync(dirPath)) {
    return [];
  }

  return readdirSync(dirPath).flatMap((entry) => {
    const entryPath = path.join(dirPath, entry);

    return statSync(entryPath).isDirectory()
      ? collectFiles(entryPath)
      : [entryPath];
  });
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

export function startErrorCollection() {
  globalThis.__productionCheckErrors = [];
}

export function fail(message) {
  if (Array.isArray(globalThis.__productionCheckErrors)) {
    globalThis.__productionCheckErrors.push(message);
    return;
  }

  throw new Error(message);
}

export function finishErrorCollection(label) {
  const errors = globalThis.__productionCheckErrors ?? [];
  globalThis.__productionCheckErrors = undefined;

  if (errors.length > 0) {
    throw new Error(`${label} failed with ${errors.length} error(s):\n- ${errors.join('\n- ')}`);
  }
}

export function readInvariants() {
  return readJson(INVARIANTS_PATH);
}

export function htmlFileToLocation(filePath, canonicalHost) {
  const relativePath = toPosix(path.relative(DIST_DIR, filePath));

  if (relativePath === 'index.html') {
    return `${canonicalHost}/`;
  }

  if (!relativePath.endsWith('/index.html')) {
    return null;
  }

  const routePath = relativePath.slice(0, -'index.html'.length);

  return `${canonicalHost}/${routePath}`;
}

export function sitemapLocationToDistFile(location, canonicalHost) {
  if (!location.startsWith(canonicalHost)) {
    fail(`sitemap.xml location must start with ${canonicalHost}: ${location}`);
  }

  const routePath = location.slice(canonicalHost.length).replace(/\/$/, '');
  const relativeRoutePath = routePath === ''
    ? 'index.html'
    : `${routePath.slice(1)}/index.html`;

  return path.join(DIST_DIR, relativeRoutePath);
}

export function readSitemapLocations(invariants) {
  const sitemapPath = path.join(DIST_DIR, 'sitemap.xml');
  const sitemap = readText(sitemapPath);
  const canonicalHost = invariants.sitemap.requireCanonicalHost;

  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].trim());

  if (locations.length === 0) {
    fail('dist/sitemap.xml must contain at least one <loc>');
  }

  for (const location of locations) {
    if (!location.startsWith(canonicalHost)) {
      fail(`sitemap.xml location must start with ${canonicalHost}: ${location}`);
    }
  }

  return new Set(locations);
}

export function isExcluded(relativePath, excludedFiles) {
  return new Set(excludedFiles ?? []).has(relativePath);
}
