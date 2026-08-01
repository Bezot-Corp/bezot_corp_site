import path from 'node:path';
import {
  DIST_DIR,
  collectFiles,
  extractAttribute,
  extractTags,
  fail,
  finishErrorCollection,
  hasAccessibleText,
  hasAttribute,
  isExcluded,
  readInvariants,
  readText,
  startErrorCollection,
  toPosix,
} from '../production-check-utils.mjs';

export function assertHtmlAccessibility(filePath, html, invariants) {
  const htmlRules = invariants.html;

  if (htmlRules.requireImageAlt) {
    for (const imgTag of extractTags(html, 'img')) {
      if (!hasAttribute(imgTag, 'alt')) {
        fail(`${toPosix(filePath)} image must include alt: ${imgTag}`);
      }
    }
  }

  if (htmlRules.forbidEmptyAriaLabel) {
    const ariaLabelTags = html.match(/<[^>]+\saria-label=["'][^"']*["'][^>]*>/gi) ?? [];

    for (const tag of ariaLabelTags) {
      if (!extractAttribute(tag, 'aria-label')) {
        fail(`${toPosix(filePath)} must not include empty aria-label: ${tag}`);
      }
    }
  }

  if (htmlRules.forbidFocusableAriaHidden) {
    const ariaHiddenTags = html.match(/<[^>]+\saria-hidden=["']true["'][^>]*>/gi) ?? [];

    for (const tag of ariaHiddenTags) {
      const isFocusable =
        /<a\s/i.test(tag) ||
        /<button\s/i.test(tag) ||
        /<input\s/i.test(tag) ||
        /<select\s/i.test(tag) ||
        /<textarea\s/i.test(tag) ||
        /tabindex=["']?0["']?/i.test(tag);

      if (isFocusable) {
        fail(`${toPosix(filePath)} must not hide focusable element with aria-hidden=true: ${tag}`);
      }
    }
  }

  for (const tag of extractTags(html, 'a')) {
    if (!hasAccessibleText(tag, html, 'a')) {
      fail(`${toPosix(filePath)} link must include accessible text: ${tag}`);
    }
  }

  for (const tag of extractTags(html, 'button')) {
    if (!hasAccessibleText(tag, html, 'button')) {
      fail(`${toPosix(filePath)} button must include accessible text: ${tag}`);
    }
  }
}

function runHtmlAccessibilityChecks() {
  startErrorCollection();

  const invariants = readInvariants();
  const htmlFiles = collectFiles(DIST_DIR).filter((filePath) => filePath.endsWith('.html'));

  if (htmlFiles.length === 0) {
    fail('HTML accessibility checks require HTML files');
  }

  for (const filePath of htmlFiles) {
    const relativePath = toPosix(path.relative(DIST_DIR, filePath));

    if (isExcluded(relativePath, invariants.html.excludeFiles)) {
      continue;
    }

    assertHtmlAccessibility(filePath, readText(filePath), invariants);
  }

  finishErrorCollection('HTML accessibility checks');

  console.log(`HTML accessibility checks passed:
- image alt attributes are checked
- aria-label and aria-hidden misuse are checked
- links and buttons expose accessible text`);
}

runHtmlAccessibilityChecks();
