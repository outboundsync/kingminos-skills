import { stripInlineCode } from '../markdown.mjs';

const LINKEDIN_COMPANY = /linkedin\.com\/company\//i;
const PLACEHOLDER_IN_URL = /\{|%7B|acme-example|<slug>/i;
const BARE_LINKEDIN = /https?:\/\/(?:www\.)?linkedin\.com\/company\/[^\s<)\]`"']+/gi;
const AUTOLINK = /<((?:https?:)?\/\/[^>]+)>/g;

function lineInFence(scan, lineNo) {
  return scan.fences.some((f) => lineNo >= f.start && lineNo <= f.end);
}

function isPlaceholderLinkedIn(url) {
  return LINKEDIN_COMPANY.test(url) && PLACEHOLDER_IN_URL.test(url);
}

export default {
  id: 'placeholder-linkedin-links',
  docRef: 'CONTRIBUTING.md#external-links-lychee',
  description: 'Placeholder LinkedIn company URLs must be inline code, not Markdown links or bare/autolink URLs (Lychee will HTTP-fetch them).',
  check(model) {
    const out = [];
    for (const file of model.markdownFiles()) {
      const scan = model.scan(file);
      const reported = new Set();

      for (const { target, line } of scan.links) {
        if (lineInFence(scan, line)) continue;
        if (!isPlaceholderLinkedIn(target)) continue;
        const key = `${line}:${target}`;
        if (reported.has(key)) continue;
        reported.add(key);
        out.push({
          file,
          line,
          msg: 'placeholder LinkedIn company URL must not be a Markdown link — use a backtick code span (see CONTRIBUTING.md#external-links-lychee)',
        });
      }

      scan.lines.forEach((line, index) => {
        const lineNo = index + 1;
        if (lineInFence(scan, lineNo)) return;
        const stripped = stripInlineCode(line);

        for (const match of stripped.matchAll(AUTOLINK)) {
          const url = match[1].startsWith('//') ? `https:${match[1]}` : match[1];
          if (!isPlaceholderLinkedIn(url)) continue;
          const key = `${lineNo}:autolink`;
          if (reported.has(key)) continue;
          reported.add(key);
          out.push({
            file,
            line: lineNo,
            msg: 'placeholder LinkedIn company URL must not be an autolink — use a backtick code span',
          });
        }

        for (const match of stripped.matchAll(BARE_LINKEDIN)) {
          if (!PLACEHOLDER_IN_URL.test(match[0])) continue;
          const key = `${lineNo}:bare:${match[0]}`;
          if (reported.has(key)) continue;
          reported.add(key);
          out.push({
            file,
            line: lineNo,
            msg: 'placeholder LinkedIn company URL must not appear as a bare URL — wrap in backticks',
          });
        }
      });
    }
    return out;
  },
};
