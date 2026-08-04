import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readContentIndexes, rootDir } from './read-content-indexes.mjs';

const generatedDir = path.join(rootDir, 'src', 'generated');
const outputPath = path.join(generatedDir, 'site.ts');

const source = readContentIndexes();

mkdirSync(generatedDir, { recursive: true });

const output = `// This file is generated. Do not edit manually.

export const site = ${JSON.stringify(source.site, null, 2)} as const;

export const redirects = ${JSON.stringify(source.redirects, null, 2)} as const;

export const gone = ${JSON.stringify(source.gone, null, 2)} as const;

export const pages = ${JSON.stringify(source.pages, null, 2)} as const;

export const posts = ${JSON.stringify(source.posts, null, 2)} as const;

export type GeneratedSite = typeof site;
export type GeneratedPage = (typeof pages)[number];
export type GeneratedPost = (typeof posts)[number];
export type GeneratedLocale = (typeof site.locales)[number];
export type GeneratedEntry = GeneratedPage | GeneratedPost;
export type GeneratedBlock =
  GeneratedEntry["locales"][GeneratedLocale]["blocks"][number];
`;

writeFileSync(outputPath, output);
console.log('Generated src/generated/site.ts');
