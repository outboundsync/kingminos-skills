// OutboundSync product keys do not belong in this pack. KingMinos live keys
// (`km_…`) and webhook signing secrets (`kmwhsec_…`) are never committed.
// Documented placeholders (`osapi_...`, `kmwhsec_…`, `Bearer <token>`,
// `KINGMINOS_API_KEY=...`) stay allowed.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const SECRET = /\b(?:(osapi|oswhsec|kmwhsec)_[A-Za-z0-9]{12,}|(km)_[A-Za-z0-9_-]{16,})/;
const SECRET_KIND = {
  osapi: 'OutboundSync API key',
  oswhsec: 'OutboundSync webhook signing secret',
  kmwhsec: 'KingMinos webhook signing secret',
  km: 'KingMinos token',
};
const PASTED_BEARER = /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{16,}/i;
const PASTED_ENV = /KINGMINOS_API_KEY\s*=\s*['"]?[A-Za-z0-9._-]{12,}/;
const SKIP_DIR = new Set(['node_modules', '.git', '.lycheecache']);
const SKIP_FILE = /\.(png|jpe?g|gif|webp|woff2?|ttf|eot|ico|zip|gz|lock)$/i;
const SKIP_PLACEHOLDER_FIXTURE = /(?:^|\/)(?:scripts\/validate\/fixtures\/|test\/)/;

function listRepoTextFiles(root) {
  const out = [];
  const walk = (rel = '') => {
    const abs = rel ? path.join(root, rel) : root;
    let entries;
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIP_DIR.has(entry.name)) walk(child);
      } else if (entry.isFile() && !SKIP_FILE.test(entry.name) && !SKIP_PLACEHOLDER_FIXTURE.test(child)) {
        out.push(child);
      }
    }
  };
  walk();
  return out.sort();
}

/** Git-tracked text when the root is a repo; otherwise every text file on disk. */
export function listSecretScanFiles(model) {
  try {
    const tracked = execFileSync('git', ['-C', model.root, 'ls-files', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\0')
      .filter(Boolean)
      .filter((file) => !SKIP_FILE.test(file) && !SKIP_PLACEHOLDER_FIXTURE.test(file));
    if (tracked.length > 0) return tracked;
  } catch {
    // Fixture repos often have no git metadata.
  }
  return listRepoTextFiles(model.root);
}

export default {
  id: 'secrets',
  docRef: 'SECURITY.md#api-keys-and-secrets',
  description: 'No KingMinos or OutboundSync API keys or webhook signing secrets are committed.',
  check(model) {
    const out = [];
    for (const file of listSecretScanFiles(model)) {
      const content = model.text(file);
      if (content === null) continue;
      content.split('\n').forEach((line, index) => {
        const match = line.match(SECRET);
        if (match) {
          const token = match[0];
          const kind = SECRET_KIND[match[1] ?? match[2]];
          out.push({ file, line: index + 1, msg: `possible committed ${kind} (${token.slice(0, 10)}…); remove and rotate it` });
        }
        if (PASTED_BEARER.test(line) && !/Bearer <|\.\.\.|…|your[_-]?key|KINGMINOS_API_KEY/i.test(line)) {
          out.push({ file, line: index + 1, msg: 'possible committed Bearer token; use a placeholder' });
        }
        if (PASTED_ENV.test(line) && !/\.\.\.|…|\$\{/.test(line)) {
          out.push({ file, line: index + 1, msg: 'possible committed KINGMINOS_API_KEY value; leave the example empty' });
        }
      });
    }
    return out;
  },
};
