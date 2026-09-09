#!/usr/bin/env node
/** Build a reviewable public tree. --push preserves the existing main history. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { exportPublic, root } from './export-public.mjs';
import { publicEntries, verifyPublicAssets, scanEntries } from './policy.mjs';
import dotenv from 'dotenv';

const args = process.argv.slice(2);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (args.includes('--dry-run')) {
  const entries = [...publicEntries(root), ...verifyPublicAssets(root, pkg.version)];
  scanEntries(root, entries);
  console.log(`Public policy passed: ${entries.length} files; no remote changes`);
} else {
  const out = args.indexOf('--output');
  const result = exportPublic(out >= 0 ? args[out + 1] : undefined);
  console.log(JSON.stringify(result, null, 2));
  if (args.includes('--push')) {
    const file = path.join(root, '.env');
    const env = { ...(fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {}), ...process.env };
    const repo = env.PUBLIC_REPO;
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || '')) throw new Error('Set PUBLIC_REPO=owner/repository');
    if (repo === env.GITHUB_REPO) throw new Error('PUBLIC_REPO must differ from the full source repository');
    const helper = '!f(){ echo "username=x"; echo "password=$GIT_TOKEN"; }; f';
    const auth = env.GITHUB_TOKEN ? ['-c', 'credential.helper=', '-c', `credential.helper=${helper}`] : [];
    const git = (argv) => execFileSync('git', [...auth, ...argv], {
      cwd: result.target, stdio: 'inherit', env: { ...process.env, GIT_TOKEN: env.GITHUB_TOKEN || '', GIT_TERMINAL_PROMPT: '0' },
    });
    git(['init', '-q']);
    git(['remote', 'add', 'origin', `https://github.com/${repo}.git`]);
    git(['fetch', '--depth=1', 'origin', 'main']);
    git(['reset', '--soft', 'FETCH_HEAD']);
    if (env.GIT_USER_NAME) git(['config', 'user.name', env.GIT_USER_NAME]);
    if (env.GIT_USER_EMAIL) git(['config', 'user.email', env.GIT_USER_EMAIL]);
    git(['add', '-A']);
    git(['commit', '-m', `Release v${pkg.version}`]);
    git(['push', 'origin', 'HEAD:main']);
  }
}
