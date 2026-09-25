import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
const stage = new URL('../dist/bundle/', import.meta.url);
rmSync(stage, {recursive: true, force: true});
mkdirSync(stage, {recursive: true});
for (const name of ['server', 'artifacts', 'examples', 'package.json', 'package-lock.json', 'manifest.json', 'provenance.json', 'README.md', 'CITATION.cff', 'LICENSE', 'LICENSE-SCOPE.md']) {
  const source = new URL('../' + name, import.meta.url);
  if (existsSync(source)) cpSync(source, new URL(name, stage), {recursive: true});
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npm, ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {cwd: fileURLToPath(stage), stdio: 'inherit'});
const bundle = `commerce-evidence-toolkit-${JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version}.mcpb`;
execFileSync(process.execPath, [root + 'node_modules/@anthropic-ai/mcpb/dist/cli/cli.js', 'pack', fileURLToPath(stage), root + 'dist/' + bundle], {cwd: root, stdio: 'inherit'});
const hash = createHash('sha256').update(readFileSync(new URL('../dist/' + bundle, import.meta.url))).digest('hex');
writeFileSync(new URL('../dist/SHA256SUMS', import.meta.url), `${hash}  ${bundle}\n`);
console.log(`Bundle SHA-256: ${hash}`);
