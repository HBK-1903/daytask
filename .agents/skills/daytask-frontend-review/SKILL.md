---
name: daytask-frontend-review
description: Review or change Daytask's React UI, responsive behavior, interaction design, accessibility, and visual hierarchy while preserving its established product identity.
---

# Daytask Frontend Review

Inspired by the public workflow themes in [Anthropic's frontend-design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design) and [Addy Osmani's agent-skills catalog](https://github.com/addyosmani/agent-skills). This is an original Daytask-specific workflow, not a vendored copy.

## Review sequence

1. Identify the screen's primary user task and current product conventions in `DESIGN.md`, `AGENTS.md`, and adjacent components.
2. Inspect rendered structure and responsive CSS before proposing a redesign. Preserve the Violet Focus hierarchy, readable task content, Turkish wording, and familiar controls.
3. Check for dead buttons, duplicate actions, decorative noise, ambiguous dates, hidden task state, and information that belongs in a secondary view.
4. Check keyboard order, accessible names, visible focus, touch target sizing, contrast, reduced motion, long Turkish strings, and layouts around 390px and desktop widths.
5. Make the smallest targeted improvement. Prefer removing confusing/unused UI over introducing new components or dependencies.
6. Build and run relevant tests. If browser/screenshot tooling is unavailable, state that actual visual verification was not performed.

## Daytask-specific acceptance checks

- Home makes the next useful action and today's plan easy to scan.
- Inbox items are not styled or described as scheduled.
- Planned work time and due date remain distinct.
- Any move or reschedule remains an explicit user choice.
- Empty, loading, error, completed, and offline states do not imply an action succeeded when it did not.
