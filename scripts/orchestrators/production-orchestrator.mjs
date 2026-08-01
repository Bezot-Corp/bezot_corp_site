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

run('eslint', ['.']);
run('node', ['scripts/pipelines/build-pipeline.mjs']);
run('node', ['scripts/checks/production-dist-checks.mjs']);
run('node', ['scripts/checks/production-seo-checks.mjs']);
run('node', ['scripts/checks/production-html-checks.mjs']);
