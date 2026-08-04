import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('pnpm', ['exec', 'eslint', '.']);
run('node', ['scripts/pipelines/build-pipeline.mjs']);
run('node', ['scripts/checks/production-dist-checks.mjs']);
run('node', ['scripts/checks/production-seo-checks.mjs']);
run('node', ['scripts/checks/html/html-structure-checks.mjs']);
run('node', ['scripts/checks/html/html-accessibility-checks.mjs']);
run('node', ['scripts/checks/html/html-reference-checks.mjs']);
