import path from 'node:path';
import { githubSlug } from '../markdown.mjs';

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const REPO_BLOB = /^https:\/\/github\.com\/outboundsync\/kingminos-skills\/blob\/main\/([^#]+)(?:#(.*))?$/i;
const GITHUB_LINE_REF = /^L\d+(?:-L\d+)?$/i;

export function anchorsFor(scan) {
  const seen = new Map();
  const anchors = new Set();
  for (const heading of scan.headings) {
    const slug = githubSlug(heading.text);
    const count = seen.get(slug) ?? 0;
    anchors.add(count === 0 ? slug : `${slug}-${count}`);
    seen.set(slug, count + 1);
  }
  return anchors;
}

function decodePath(rawPath) {
  try {
    return { decoded: decodeURI(rawPath) };
  } catch (err) {
    return { error: err };
  }
}

/** Relative links in a file, resolved to repo-relative paths. */
export function relativeLinks(model, file) {
  const scan = model.scan(file);
  return scan.links
    .filter(({ target }) => !EXTERNAL.test(target))
    .map(({ target, line }) => {
      const [rawPath, fragment = ''] = target.split('#');
      const decodedPath = decodePath(rawPath);
      if (decodedPath.error) return { target, line, resolved: null, fragment, decodeError: true };
      const resolved = rawPath ? path.posix.normalize(path.posix.join(path.posix.dirname(file), decodedPath.decoded)) : file;
      return { target, line, resolved, fragment };
    });
}

/** Absolute links into this repo's `blob/main` tree, mapped back to local files. */
export function localRepoBlobLinks(model, file) {
  const scan = model.scan(file);
  return scan.links.flatMap(({ target, line }) => {
    const match = target.match(REPO_BLOB);
    if (!match) return [];
    const decodedPath = decodePath(match[1]);
    if (decodedPath.error) return [{ target, line, resolved: null, fragment: match[2] ?? '', decodeError: true }];
    return [{ target, line, resolved: decodedPath.decoded, fragment: match[2] ?? '' }];
  });
}

function checkResolvedLink(model, file, link, out) {
  if (link.decodeError) {
    out.push({ file, line: link.line, msg: `malformed percent-encoding in link '${link.target}'` });
    return;
  }
  if (link.resolved.startsWith('..')) {
    out.push({ file, line: link.line, msg: `link '${link.target}' points outside the repository` });
    return;
  }
  if (!model.exists(link.resolved)) {
    out.push({ file, line: link.line, msg: `broken link '${link.target}' (no such file or folder)` });
    return;
  }
  if (link.fragment && link.resolved.endsWith('.md') && !GITHUB_LINE_REF.test(link.fragment)) {
    const anchors = anchorsFor(model.scan(link.resolved));
    if (!anchors.has(link.fragment.toLowerCase())) {
      out.push({ file, line: link.line, msg: `link '${link.target}' has no matching heading anchor '#${link.fragment}'` });
    }
  }
}

export default {
  id: 'links',
  docRef: 'CONTRIBUTING.md',
  description: 'Relative Markdown links (and this-repo blob/main URLs) resolve to an existing file or folder, and #anchors match a heading.',
  check(model) {
    const out = [];
    for (const file of model.markdownFiles()) {
      for (const link of relativeLinks(model, file)) checkResolvedLink(model, file, link, out);
      for (const link of localRepoBlobLinks(model, file)) checkResolvedLink(model, file, link, out);
    }
    return out;
  },
};
