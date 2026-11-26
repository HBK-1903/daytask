# Daytask agent guidance

Daytask is a Turkish, local-first task planner with optional explicitly initiated encrypted sync. Preserve existing user data, Turkish UI, mobile usability (including iPhone 13), and user control over scheduling. Never automatically move unfinished tasks or initiate cloud transfer.

## Workflow

1. Read the relevant implementation, tests, and product documentation before editing. Check `git status` and keep work on the current branch.
2. Make the smallest coherent change that solves the user-facing problem. Keep scheduling time distinct from optional deadlines; do not invent behavior for missing dates.
3. For behavior changes, add or update focused tests. Prefer testing boundary cases and regressions, not only happy paths.
4. Run `npm run build`, `npm test`, `npm --prefix worker run typecheck`, `npm --prefix worker run test`, and `git diff --check` when relevant. Do not claim checks that were not run.
5. For UI changes, preserve the existing visual language, check accessible names and keyboard focus, respect reduced motion, and check compact and wide layouts. Report if browser-level visual verification was not available.
6. Review the final diff for data loss, unintended rescheduling, stale docs, dead controls, duplicate styles, and misleading success messages before committing.

## Product invariants

- Local task data remains available independently from account login and is not deleted on logout or session expiry.
- Offline use is allowed only under the existing session rules; encrypted cloud synchronization is explicit opt-in.
- Unfinished tasks are never rescheduled automatically. Any move requires a clear preview and user confirmation.
- Repeating tasks create a future occurrence only on explicit completion; missed occurrences are not backfilled.
- Planning date/time and deadline are separate concepts. A task without a date belongs in the inbox, not an invented time slot.
