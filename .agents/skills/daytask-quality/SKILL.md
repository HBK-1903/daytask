---
name: daytask-quality
description: Apply Daytask's product invariants and evidence-based frontend, test, and review workflow whenever changing this repository, especially user-facing planning behavior.
---

# Daytask Quality Workflow

## Before editing

- Inspect the current branch, working tree, relevant implementation, test coverage, and docs.
- Identify the user-visible behavior that should change and the persisted data fields it touches.
- Keep the established Violet Focus design language; remove unnecessary UI rather than adding decorative controls.

## Implement

- Make one small vertical slice at a time: behavior, focused test, UI if needed, documentation if behavior changed.
- Preserve local data. Do not silently move tasks, fabricate dates, or start synchronization.
- Keep planning dates/times distinct from deadlines. Treat inbox tasks as unscheduled.
- For recurring tasks, test date boundaries, month/year transitions, and deadline offsets; never generate missed occurrences retroactively.
- Use semantic controls with useful accessible labels, visible keyboard focus, touch-friendly targets, and reduced-motion support.

## Verify

- Add a regression test before or alongside a bug fix. Cover invalid input and boundary conditions where applicable.
- Run the relevant project build and tests. For broad changes run frontend build/tests, Worker typecheck/tests, and `git diff --check`.
- Inspect the final diff for data migration/backup compatibility, dead controls, misleading copy, and unrelated churn.
- For UI changes, verify the app in a browser at mobile and desktop widths when browser tooling is available. If unavailable, state that limitation instead of claiming visual verification.
- Report exactly what changed, what passed, what was not verified, and any deployment or migration that was not performed.

## Stop conditions

- Do not use credentials or secrets from chat or files in tests.
- Do not deploy, migrate remote data, alter account/security policy, or force-push without explicit authorization.
- If a requested change would discard, overwrite, or automatically reschedule user data, stop and ask first.
