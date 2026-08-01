import path from 'node:path';
import {
  DIST_DIR,
  collectFiles,
  countMatches,
  extractAttribute,
  extractTags,
  fail,
  finishErrorCollection,
  isExcluded,
  readInvariants,
  readText,
  startErrorCollection,
  toPosix,
} from '../production-check-utils.mjs';

export function assertHtmlStructure(filePath, html, invariants) {
  const htmlRules = invariants.html;

  if (htmlRules.requireHtmlLang && !/<html\s+[^>]*lang=["'][^"']+["'][^>]*>/i.test(html)) {
    fail(`${toPosix(filePath)} must include html lang`);
  }

  if (htmlRules.requireSingleH1 && countMatches(html, /<h1(\s|>)/gi) !== 1) {
    fail(`${toPosix(filePath)} must include exactly one <h1>`);
  }

  for (const tag of extractTags(html, 'a')) {
    const href = extractAttribute(tag, 'href');

    if (!href) {
      fail(`${toPosix(filePath)} link must include href: ${tag}`);
    }
  }
}

function runHtmlStructureChecks() {
  startErrorCollection();

  const invariants = readInvariants();
  const htmlFiles = collectFiles(DIST_DIR).filter((filePath) => filePath.endsWith('.html'));

  if (htmlFiles.length === 0) {
    fail('HTML structure checks require HTML files');
  }

  for (const filePath of htmlFiles) {
    const relativePath = toPosix(path.relative(DIST_DIR, filePath));

    if (isExcluded(relativePath, invariants.html.excludeFiles)) {
      continue;
    }

    assertHtmlStructure(filePath, readText(filePath), invariants);
  }

  finishErrorCollection('HTML structure checks');

  console.log(`HTML structure checks passed:
- HTML outputs include required structural markers
- h1 structure is checked
- links include href attributes`);
}

runHtmlStructureChecks();
