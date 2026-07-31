import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptsDir, '..');
const contentDir = path.join(rootDir, 'content');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function assertFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
}

function assertStatus(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(`${label} has invalid status "${value}". Expected: ${allowed.join(', ')}`);
  }
}

const contentIndexPath = path.join(contentDir, 'index.json');
assertFile(contentIndexPath);

const contentIndex = readJson(contentIndexPath);

const pagesSection = contentIndex.sections?.pages;
const blogSection = contentIndex.sections?.blog;

if (!pagesSection) throw new Error('Missing sections.pages in content/index.json');
if (!blogSection) throw new Error('Missing sections.blog in content/index.json');

assertStatus(pagesSection.status, ['enabled', 'disabled'], 'sections.pages');
assertStatus(blogSection.status, ['enabled', 'disabled'], 'sections.blog');

const pagesIndexPath = path.join(contentDir, pagesSection.indexPath);
assertFile(pagesIndexPath);

const pagesIndex = readJson(pagesIndexPath);
const pagesDir = path.dirname(pagesIndexPath);

if (!Array.isArray(pagesIndex.pageIds)) {
  throw new Error('content/pages/index.json must define pageIds as an array');
}

for (const pageId of pagesIndex.pageIds) {
  const pageDir = path.join(pagesDir, pageId);
  const pageIndexPath = path.join(pageDir, 'index.json');

  assertFile(pageIndexPath);

  const pageIndex = readJson(pageIndexPath);
  const locales = pageIndex.locales ?? {};

  for (const [locale, localeIndex] of Object.entries(locales)) {
    assertStatus(localeIndex.status, ['published', 'draft'], `page "${pageId}" locale "${locale}"`);

    if (!localeIndex.updatedAt) {
      throw new Error(`Missing updatedAt for page "${pageId}" locale "${locale}"`);
    }

    assertFile(path.join(pageDir, `${locale}.json`));
  }
}

const blogIndexPath = path.join(contentDir, blogSection.indexPath);
assertFile(blogIndexPath);

const blogIndex = readJson(blogIndexPath);
const blogDir = path.dirname(blogIndexPath);

assertStatus(blogIndex.status, ['enabled', 'disabled'], 'blog index');

if (blogIndex.entryPageId !== blogSection.entryPageId) {
  throw new Error(`Blog entryPageId mismatch between content/index.json and content/blog/index.json`);
}

if (!Array.isArray(blogIndex.postPaths)) {
  throw new Error('content/blog/index.json must define postPaths as an array');
}

for (const postPath of blogIndex.postPaths) {
  assertFile(path.join(blogDir, postPath));
}

console.log('Content indexes are valid');
