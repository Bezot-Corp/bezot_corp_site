import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  DIST_DIR,
  collectFiles,
  fail,
  finishErrorCollection,
  isExcluded,
  readInvariants,
  readText,
  startErrorCollection,
  toPosix,
} from './production-check-utils.mjs';

function extractTags(html, tagName) {
  return html.match(new RegExp(`<${tagName}(?:\\s|>)[^>]*>`, 'gi')) ?? [];
}

function extractAttribute(tag, attributeName) {
  const pattern = new RegExp(`${attributeName}=["']([^"']*)["']`, 'i');
  const match = tag.match(pattern);

  return match?.[1]?.trim() ?? '';
}

function hasAttribute(tag, attributeName) {
  return new RegExp(`\\s${attributeName}(\\s|=|>)`, 'i').test(tag);
}

function countMatches(html, regex) {
  return html.match(regex)?.length ?? 0;
}

function stripHashAndQuery(value) {
  return value.split('#')[0].split('?')[0];
}

function isExternalHref(href) {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//');
}

function isAssetHref(href) {
  return /\.[a-z0-9]+$/i.test(stripHashAndQuery(href));
}

function internalHrefToDistPath(href) {
  const cleanHref = stripHashAndQuery(href);

  if (!cleanHref || cleanHref === '/') {
    return path.join(DIST_DIR, 'index.html');
  }

  if (!cleanHref.startsWith('/')) {
    return null;
  }

  if (isAssetHref(cleanHref)) {
    return path.join(DIST_DIR, cleanHref.slice(1));
  }

  const routePath = cleanHref.endsWith('/') ? cleanHref : `${cleanHref}/`;

  return path.join(DIST_DIR, routePath.slice(1), 'index.html');
}

function hasAccessibleText(tag, html, tagName) {
  const ariaLabel = extractAttribute(tag, 'aria-label');
  const title = extractAttribute(tag, 'title');

  if (ariaLabel || title) {
    return true;
  }

  const tagStart = html.indexOf(tag);

  if (tagStart === -1) {
    return true;
  }

  const closeTag = `</${tagName}>`;
  const tagEnd = html.indexOf(closeTag, tagStart);

  if (tagEnd === -1) {
    return true;
  }

  const inner = html
    .slice(tagStart + tag.length, tagEnd)
    .replace(/<[^>]+>/g, '')
    .trim();

  return inner.length > 0;
}

function assertHtmlStructure(filePath, html, invariants) {
  const htmlRules = invariants.html;

  if (htmlRules.requireHtmlLang && !/<html\s+[^>]*lang=["'][^"']+["'][^>]*>/i.test(html)) {
    fail(`${toPosix(filePath)} must include html lang`);
  }

  if (htmlRules.requireSingleH1 && countMatches(html, /<h1(\s|>)/gi) !== 1) {
    fail(`${toPosix(filePath)} must include exactly one <h1>`);
  }

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

  const anchorTags = extractTags(html, 'a');

  for (const tag of anchorTags) {
    const href = extractAttribute(tag, 'href');

    if (!href) {
      fail(`${toPosix(filePath)} link must include href: ${tag}`);
      continue;
    }

    if (!hasAccessibleText(tag, html, 'a')) {
      fail(`${toPosix(filePath)} link must include accessible text: ${tag}`);
    }

    if (
      htmlRules.requireInternalLinksToExist &&
      href.startsWith('/') &&
      !isExternalHref(href)
    ) {
      const targetPath = internalHrefToDistPath(href);

      if (targetPath && !existsSync(targetPath)) {
        fail(`${toPosix(filePath)} internal link points to missing dist target: ${href} -> ${toPosix(targetPath)}`);
      }
    }
  }

  const buttonTags = extractTags(html, 'button');

  for (const tag of buttonTags) {
    if (!hasAccessibleText(tag, html, 'button')) {
      fail(`${toPosix(filePath)} button must include accessible text: ${tag}`);
    }
  }
}

function runProductionHtmlChecks() {
  startErrorCollection();

  const invariants = readInvariants();
  const files = collectFiles(DIST_DIR);
  const htmlFiles = files.filter((filePath) => filePath.endsWith('.html'));

  if (htmlFiles.length === 0) {
    fail('Production HTML checks require HTML files');
  }

  for (const filePath of htmlFiles) {
    const relativePath = toPosix(path.relative(DIST_DIR, filePath));

    if (isExcluded(relativePath, invariants.html.excludeFiles)) {
      continue;
    }

    assertHtmlStructure(filePath, readText(filePath), invariants);
  }

  finishErrorCollection('Production HTML checks');

  console.log(`Production HTML checks passed:
- HTML outputs include required structural markers
- h1 structure is checked
- image alt attributes are checked
- aria-label and aria-hidden misuse are checked
- links and buttons expose accessible text
- internal links point to existing dist targets`);
}

runProductionHtmlChecks();
