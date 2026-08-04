import { rmSync } from 'node:fs';
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

run('node', ['scripts/pipelines/generate-pipeline.mjs']);
run('tsc', ['-b']);
run('vite', ['build']);
run('vite', [
  'build',
  '--ssr',
  'src/entry-server.tsx',
  '--outDir',
  'dist/server',
  '--emptyOutDir',
  'false',
]);
run('node', ['scripts/prerender.mjs']);
rmSync('dist/server', { force: true, recursive: true });
