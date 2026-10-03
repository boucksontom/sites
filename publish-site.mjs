import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const cliArgs = new Set(process.argv.slice(2));
const isDryRun = cliArgs.has('--dry-run');
const wantsHelp = cliArgs.has('--help') || cliArgs.has('-h');

if (wantsHelp) {
  console.log(`Usage:
  node publish-site.mjs [--dry-run]

Variables d'environnement:
  SITES_PUBLISH_MESSAGE   Message du commit (défaut: "Publish site updates")
  SITES_PUBLISH_REMOTE    Remote Git (défaut: "origin")
`);
  process.exit(0);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  }).trim();
}

function collectLines(command, args) {
  const output = run(command, args);
  return output ? output.split('\n').map((line) => line.trim()).filter(Boolean) : [];
}

function fail(message) {
  console.error(`[publish] ${message}`);
  process.exit(1);
}

function quote(value) {
  return JSON.stringify(value);
}

const commitMessage = process.env.SITES_PUBLISH_MESSAGE || 'Publish site updates';
const remoteName = process.env.SITES_PUBLISH_REMOTE || 'origin';

run('node', ['catalog-runner.mjs', 'publish']);
run('git', ['add', 'catalog-data.js']);

const unstagedFiles = collectLines('git', ['diff', '--name-only']);
const untrackedFiles = collectLines('git', ['ls-files', '--others', '--exclude-standard']);
const stagedFiles = collectLines('git', ['diff', '--cached', '--name-only']);

if (unstagedFiles.length || untrackedFiles.length) {
  const pendingFiles = [...unstagedFiles, ...untrackedFiles];
  fail(`des modifications non indexées restent présentes : ${pendingFiles.join(', ')}. Faites vos git add avant publication.`);
}

if (!stagedFiles.length) {
  fail('aucune modification indexée à publier.');
}

const branchName = run('git', ['branch', '--show-current']);
if (!branchName) {
  fail('branche Git courante introuvable.');
}

if (isDryRun) {
  console.log('[publish] dry-run prêt.');
  console.log(`[publish] commit: ${quote(commitMessage)}`);
  console.log(`[publish] push: git push ${remoteName} ${branchName}`);
  console.log(`[publish] fichiers indexés: ${stagedFiles.join(', ')}`);
  process.exit(0);
}

run('git', ['commit', '-m', `${commitMessage}\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`], {
  stdio: 'inherit'
});
run('git', ['push', remoteName, branchName], { stdio: 'inherit' });

console.log(`[publish] publication terminée sur ${remoteName}/${branchName}.`);
