import { projectPaths } from './project-config.mjs';
import {
  collectFiles,
  fileExists,
  relativeFrom,
} from './project-file-utils.mjs';
import {
  fileRecord,
  readTextResource,
} from './project-resource-readers.mjs';
import {
  extractHtmlPageData,
  htmlRelativePathToRoute,
} from './project-html-data.mjs';

const distDir = projectPaths.distDir;

export function readDistData() {
  const allFilePaths = collectFiles(distDir);
  const sitemap = readTextResource(distDir, projectPaths.distSitemap);

  const htmlFiles = allFilePaths
    .filter((filePath) => filePath.endsWith('.html'))
    .map((filePath) => {
      const textResource = readTextResource(distDir, filePath);
      const html = textResource.text ?? '';
      const relativePath = relativeFrom(distDir, filePath);

      return {
        filePath,
        relativePath,
        route: htmlRelativePathToRoute(relativePath),
        exists: textResource.exists,
        html,
        error: textResource.error,
        pageData: html ? extractHtmlPageData(html) : null,
      };
    });

  return {
    rootDir: distDir,
    exists: fileExists(distDir),
    files: allFilePaths.map((filePath) => fileRecord(distDir, filePath)),
    htmlFiles,
    xmlFiles: allFilePaths
      .filter((filePath) => filePath.endsWith('.xml'))
      .map((filePath) => fileRecord(distDir, filePath)),
    sitemap: {
      ...sitemap,
      locations: sitemap.text
        ? [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim())
        : [],
    },
  };
}
