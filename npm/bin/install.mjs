#!/usr/bin/env node
// Copies the bundled skills into <dir> (default ./.claude/skills). No network, no config changes.
import { cpSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills');
const dest = resolve(process.argv[2] ?? '.claude/skills');
if (!existsSync(src)) {
  console.error('skills/ missing from package');
  process.exit(1);
}
cpSync(src, dest, { recursive: true });
console.log(`KingMinos skills installed to ${dest}`);
