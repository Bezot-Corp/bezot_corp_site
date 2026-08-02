import { fileURLToPath } from 'node:url';

import { projectRootDir } from './project-config.mjs';
import { readContentData } from './project-content-data.mjs';
import { readDistData } from './project-dist-data.mjs';

const scriptPath = fileURLToPath(import.meta.url);

export function readProjectStructuredData() {
  return {
    rootDir: projectRootDir,
    content: readContentData(),
    dist: readDistData(),
  };
}

if (process.argv[1] === scriptPath) {
  const { printProjectStructuredDataReport } = await import('./project-structured-data-report.mjs');

  printProjectStructuredDataReport(readProjectStructuredData());
}
