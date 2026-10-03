// OutboundSync product keys do not belong in this pack. KingMinos live keys
// are never committed. Documented placeholders (`osapi_...`, `Bearer <token>`) stay allowed.
const SECRET = /\b(osapi|oswhsec)_[A-Za-z0-9]{12,}/;
const PASTED_BEARER = /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{16,}/i;
const PASTED_ENV = /KINGMINOS_API_KEY\s*=\s*['\"]?[A-Za-z0-9._-]{12,}/;

export default {
  id: 'secrets',
  docRef: 'SECURITY.md#api-keys-and-secrets',
  description: 'No KingMinos or OutboundSync API keys are committed.',
  check(model) {
    const out = [];
    const files = [...model.docs, ...model.skills.flatMap((s) => s.files)];
    for (const file of files) {
      const content = model.text(file);
      if (content === null) continue;
      content.split('\n').forEach((line, index) => {
        const match = line.match(SECRET);
        if (match) out.push({ file, line: index + 1, msg: `possible committed ${match[1] === 'osapi' ? 'API key' : 'webhook signing secret'} (${match[0].slice(0, 10)}…); remove and rotate it` });
        if (PASTED_BEARER.test(line) && !/Bearer <|\.\.\.|…|your[_-]?key|KINGMINOS_API_KEY/i.test(line)) {
          out.push({ file, line: index + 1, msg: 'possible committed Bearer token; use a placeholder' });
        }
        if (PASTED_ENV.test(line) && !/\.\.\.|…|$\{/.test(line)) {
          out.push({ file, line: index + 1, msg: 'possible committed KINGMINOS_API_KEY value; leave the example empty' });
        }
      });
    }
    return out;
  },
};
