---
name: my-skill
description: >-
  Draft and audit <thing> for KingMinos callers. Use when the user asks to "<trigger phrase>",
  "<trigger phrase>", or "<trigger phrase>". No KingMinos API key.
license: MIT
metadata:
  author: outboundsync
  version: "1.0.0"
---

# My skill

<One or two sentences: what this skill does and when it hands off to another skill.>

**Note:** These instructions reflect KingMinos by OutboundSync best practices shared freely and without warranty of outcomes — see [DISCLAIMER.md](https://github.com/outboundsync/kingminos-skills/blob/main/DISCLAIMER.md).

## Workflow

1. <Step>
2. <Step — link any rubric you add under `references/`>

## Output contract

GitHub-flavored markdown only. Render only this shape; no prose outside it. Marks: `✓` pass · `✗` blocker · `·` advisory.

### Shape

````markdown
## <Verdict — e.g. Ready | Needs work | Unverified>

```text
Score  ████████████████░░░░  78/100 · <band>
```

### <Card>
`<context line>`

- ✓ <pass line>
- ✗ <blocker line>
- · <advisory line>

### Next
1. <shortest action tied to a ✗ above>
````
