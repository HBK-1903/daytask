# Violet Focus — Project Agent Guide

This file brings a small, project-specific selection of specialist perspectives from [Agency Agents](https://github.com/msitarzewski/agency-agents) into this repository. It is an adapted working guide, not a vendored copy of the upstream agent files. Upstream agent references are linked below; see that repository for its license and full prompts.

## Product context

Violet Focus is a personal-first planning PWA for organizing a user's day, routines, learning, and hobbies. Its home screen answers **“What should I do right now?”** before showing the rest of the day.

Agreed product decisions:

- Visual identity: **Violet Focus**, a lavender-grounded, translucent violet / frosted-glass theme.
- The interface should be calm and legible; transparency must never compromise contrast or task readability.
- Ship with editable starter categories (Learning, Health, Work/Study, Hobbies, Personal, Home); let the user add custom categories and choose their own names, colors, and icons. Keep category styling within Violet Focus's violet palette, using only subtle accent variations so the overall theme stays cohesive.
- Users can schedule tasks manually or provide goals for the app to suggest a schedule.
- Auto-scheduling is advisory: never silently rearrange a user's plan.
- If a task is missed, ask the user before rescheduling or changing other tasks.
- Use primary navigation: Now (the focused “what should I do right now?” home), Calendar, Habits, Learning, and Insights.
- Add dedicated habit and learning progress screens, alongside the focused “what now?” home screen.
- The Insights screen should offer rich, useful data across day/week/month: completion and consistency, planned vs. actual time, category distribution, postponements/missed tasks, habit adherence, study time, milestones, and trends. Avoid showing misleading metrics before enough data exists; let users control and export their personal data.
- Let the user define each habit's own cadence: daily, selected weekdays, or a weekly frequency target (for example, three times per week).
- Track learning progress in both dimensions: time spent in study sessions and completion of user-defined topics/milestones. Show them separately as complementary measures, not as interchangeable scores.
- Let users record study time either with an in-app start/pause/stop focus timer or by entering a session duration manually.
- Reminders should be very persistent by default: notify at task start, then repeat every 5 minutes until the user completes, snoozes, reschedules, or dismisses the task. Keep clear acknowledgement controls and user-defined quiet hours. Notification tone may be user-selected, including blunt/profane or adult/risqué copy; never make explicit copy the default, and provide discreet lock-screen text/privacy controls. Do not claim guaranteed delivery: browser/OS permissions and push delivery are outside the app's control.
- Initial deployment target: Cloudflare Pages; Cloudflare Workers/D1 may be considered when the product needs server-backed push scheduling or sync. Prefer the simplest implementation that meets the current need and free-tier constraints.

## Specialist perspectives

Use these perspectives as a lightweight review checklist; do not simulate a large team or add complexity without a concrete need.

### Product manager

Reference: [product-manager.md](https://github.com/msitarzewski/agency-agents/blob/main/product/product-manager.md)

- Keep the product focused on helping one person make and follow a realistic plan.
- Define the user problem and acceptance criteria before implementing a feature.
- Prioritize the smallest useful release; separate MVP requirements from later ideas.
- Treat user agency as a product requirement: schedule suggestions and missed-task recovery require user approval.

### UI designer

Reference: [design-ui-designer.md](https://github.com/msitarzewski/agency-agents/blob/main/design/design-ui-designer.md)

- Maintain a coherent Violet Focus design system: lavender surfaces, violet hierarchy, restrained glass effects, reusable tokens and components.
- Establish hierarchy so the current task is immediately obvious.
- Design mobile-first, responsive, keyboard-operable interfaces with WCAG AA contrast as a baseline.
- Include meaningful empty, loading, error, overdue, and completed states; use motion sparingly and respect reduced-motion preferences.

### Frontend / PWA developer

Reference: [engineering-frontend-developer.md](https://github.com/msitarzewski/agency-agents/blob/main/engineering/engineering-frontend-developer.md)

- Build semantic, accessible, responsive UI and keep interactions usable on touch screens.
- Treat offline behavior, installability, service-worker lifecycle, and notification permission UX as explicit product concerns.
- Make local behavior resilient and explain when a feature needs network access.
- Test the important flows and avoid adding dependencies unless they provide clear value.

### Backend and Cloudflare architect

Reference: [engineering-backend-architect.md](https://github.com/msitarzewski/agency-agents/blob/main/engineering/engineering-backend-architect.md)

- Start with a simple architecture; use Workers, D1, and Web Push only when needed.
- Protect push subscription data and secrets; never expose VAPID private keys or credentials to browser code.
- Make scheduled reminder processing idempotent, bounded, and respectful of user settings.
- Document free-tier assumptions and operational limitations; push notifications are best-effort, not guaranteed alarms.

### Behavioral reminders reviewer

Reference: [product-behavioral-nudge-engine.md](https://github.com/msitarzewski/agency-agents/blob/main/product/product-behavioral-nudge-engine.md)

- Make reminders persistent without removing user control: allow acknowledgement, snooze, reschedule, and notification preferences.
- Default behavior: repeat every 5 minutes after the task starts until the user completes, snoozes, reschedules, or dismisses it; pause during user-defined quiet hours.
- Avoid duplicate/runaway scheduling, shame, and manipulative copy. Keep an explicit way to acknowledge or silence a reminder.

## Working agreement

Before a substantial change, state which user problem it solves and how it will be verified. Keep product decisions consistent with the context above; if a decision is unclear, ask rather than silently changing the agreed behavior. Prefer small, testable changes and report platform/browser limitations honestly.
