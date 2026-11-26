---
name: daytask-regression-testing
description: Design and run focused regression tests for Daytask UI/domain changes, especially task dates, recurrence, local data, session state, and reminder behavior.
---

# Daytask Regression Testing

This project-specific skill adapts test-first and evidence-based review practices from [dustinng04/agent-skills](https://github.com/dustinng04/agent-skills/tree/main/skills/test-driven-development) and [code-review-and-quality](https://github.com/dustinng04/agent-skills/tree/main/skills/code-review-and-quality). It does not copy their prompts or require a particular coding-agent runtime.

## Before implementation

- Find the affected domain helper, UI path, existing test, persistence/backup shape, and caller behavior.
- Write the smallest test that captures the expected behavior or bug. Include a boundary case when dates, sessions, recurrence, or user data are involved.
- Avoid brittle tests coupled to incidental markup when a domain-level assertion can prove the rule.

## Required Daytask cases when relevant

- Date-free quick capture stays in Inbox; explicit date/time is planned as entered.
- Moving a planned day never silently moves other tasks. A deadline does not overwrite the planned date/time.
- Recurrence skips missed instances, preserves monthly anchors, and carries any schedule-to-deadline offset across calendar boundaries.
- Completion only creates the intended next occurrence and does not reset unrelated fields or user data.
- Backup import/export and local persistence retain newly added optional fields and tolerate older backups.
- Auth/session and encrypted-sync flows preserve local tasks on expiry, logout, and failed network calls.
- Notification actions are bound to the intended task and errors do not report false success.

## Verification

Run the narrow test first, then as appropriate:

```sh
npm run build
npm test
npm --prefix worker run typecheck
npm --prefix worker run test
git diff --check
```

For a meaningful regression test, consider whether a plausible one-line behavior mutation would make it fail. Report what ran and what did not; never infer browser verification from a successful build.
