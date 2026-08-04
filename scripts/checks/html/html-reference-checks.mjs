import {
  existsSync } from 'node:fs';
import path from 'node:path';
import {
  extractAttribute,
  extractTags,
} from '../../project-html-data.mjs';
import {
  collectFiles,
  toPosix,
} from '../../project-file-utils.mjs';
import {
  DIST_DIR,
  fail,
  finishErrorCollection,
  internalHrefToDistPath,
  isExcluded,
  isExternalHref,
  readInvariants,
  readText,
  startErrorCollection,
} from '../production-check-utils.mjs';

export function assertHtmlReference(filePath, html, invariants) {
  const htmlRules = invariants.html;

  if (!htmlRules.requireInternalLinksToExist) {
    return;
  }

  for (const tag of extractTags(html, 'a')) {
    const href = extractAttribute(tag, 'href');

    if (!href || !href.startsWith('/') || isExternalHref(href)) {
      continue;
    }

    const targetPath = internalHrefToDistPath(href);

    if (targetPath && !existsSync(targetPath)) {
      fail(`${toPosix(filePath)} internal link points to missing dist target: ${href} -> ${toPosix(targetPath)}`);
    }
  }
}

function runHtmlReferenceChecks() {
  startErrorCollection();

  const invariants = readInvariants();
  const htmlFiles = collectFiles(DIST_DIR).filter((filePath) => filePath.endsWith('.html'));

  if (htmlFiles.length === 0) {
    fail('HTML reference checks require HTML files');
  }

  for (const filePath of htmlFiles) {
    const relativePath = toPosix(path.relative(DIST_DIR, filePath));

    if (isExcluded(relativePath, invariants.html.excludeFiles)) {
      continue;
    }

    assertHtmlReference(filePath, readText(filePath), invariants);
  }

  finishErrorCollection('HTML reference checks');

  console.log(`HTML reference checks passed:
- internal links point to existing dist targets`);
}

runHtmlReferenceChecks();
