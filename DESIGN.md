# Violet Focus Design System

This is the product-specific visual source of truth for Violet Focus. It uses a structured `DESIGN.md` approach inspired by [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md), but the visual language below is original to this project; do not copy another brand's design wholesale.

## 1. Product mood

**Lavender clarity with disciplined focus.** Violet Focus should feel calm enough to open every day, but decisive enough to move the user into action. The interface is supportive, never shaming. The app may use a stricter voice in user-selected reminders; the interface itself remains composed.

## 2. Visual theme and atmosphere

The current visual refresh is **Aurora Glass**: Violet Focus's own lavender-first, layered glass treatment. `src/polish.css` applies the current refinement layer over the base styles; keep it aligned with these tokens and the phone-first rules below.

- Light-first, lavender-tinted canvas with subtle ambient color—not a flat white productivity template.
- Frosted-glass treatment is a surface accent for navigation and selected cards, never a reason to lower text contrast.
- Violet identifies focus, primary actions, and the selected navigation state.
- Mint, peach, and blue are restrained semantic accents for success/health, creative/personal, and secondary information. Keep category accents within the violet family unless a status needs clearer meaning.
- Avoid dense decoration, large gradients behind body text, excessive blur, or motion that competes with the active task.

## 3. Color tokens

| Token | Value | Role |
|---|---|---|
| `--canvas` | `#f4efff` | Main lavender page canvas |
| `--surface` | `rgba(255,255,255,.72)` | Cards and raised panels |
| `--surface-glass` | `rgba(255,255,255,.56)` | Sidebar / translucent chrome |
| `--ink` | `#33284e` | Main text |
| `--ink-soft` | `#55476f` | Secondary headings and labels |
| `--muted` | `#9389a8` | Secondary text; never use for essential small text without contrast checking |
| `--violet` | `#7551d5` | Primary action and focus accent |
| `--violet-dark` | `#5739b6` | High-emphasis violet interaction |
| `--lavender` | `#eee6ff` | Selected, informational, and soft-card background |
| `--line` | `#eee9f6` | Delicate borders and separators |
| `--mint` | `#d7f2e7` | Positive / health accent |
| `--peach` | `#ffe8d9` | Creative / warm accent |
| `--blue` | `#dfeaff` | Secondary / learning accent |

Check actual foreground/background combinations for WCAG AA. Do not assume translucent surfaces preserve contrast over every backdrop.

## 4. Typography

- Interface/body: **DM Sans**, with a system sans-serif fallback.
- Display and key headings: **Manrope**, with a system sans-serif fallback.
- Use compact uppercase eyebrows only for metadata; primary task names and actions must use normal case and readable sizes.
- Prefer clear hierarchy and short line lengths. Avoid tiny labels for anything the user must act on.

## 5. Layout and responsive behavior

### Desktop / tablet

- Persistent sidebar for primary navigation and areas.
- Main workspace uses a clear hierarchy: current action first, schedule second, progress/supporting context alongside it.
- Use a consistent spacing rhythm based on 4px increments; keep related controls grouped.

### Phone, especially iPhone SE (2nd generation)

- Treat a 375px-wide viewport as a first-class layout, not a squeezed desktop page.
- Replace the sidebar as primary navigation with a fixed five-item bottom bar: **Şimdi, Takvim, Rutinler, Öğrenme, Analiz**.
- Add safe-area padding using `env(safe-area-inset-*)`; content must remain scrollable above the bottom navigation and home indicator.
- Show one main task at a time; stack secondary panels vertically and avoid multi-column dashboards at narrow widths.
- Maintain touch targets of at least 44px where practical. Keep forms legible and prevent iOS input zoom by using 16px or larger input text.
- Dialogs must fit the available dynamic viewport, scroll internally when needed, and remain usable with the on-screen keyboard.

## 6. Components and interaction states

- **Primary action:** solid violet fill, high contrast, one clear verb.
- **Secondary action:** translucent/outlined treatment; never make completion or snooze hard to find.
- **Current task card:** strongest visual hierarchy on the home screen. Show task, time, duration, and actions without requiring a scroll on common phone sizes.
- **Cards:** soft 13–19px radius, light border, restrained shadow; glass blur only where it improves grouping.
- **Category color:** subtle violet-family accents plus a clear label/icon; color is never the only signal.
- Define hover, focus-visible, pressed, disabled, loading, empty, overdue, completed, and error states. On touch devices, do not rely on hover.
- Respect `prefers-reduced-motion`; use small feedback transitions only.

## 7. Charts and data density

- Keep the “what should I do right now?” home view focused; place historical detail in Insights.
- Use color, axes/labels, and concise descriptions together. Provide text summaries for charts and never encode status by color alone.
- Do not render precise-looking analytics from seeded/demo data as if it were the user's real history. Starter examples must be visibly labeled and removable; the current implementation does this with the sample-data banner.
- Task completion, habit check-ins, and focus sessions are distinct facts. A task's planned duration is never presented as actual time; focus duration comes only from timer sessions explicitly saved by the user.
- Avoid charts that imply causal or comparative conclusions without enough observations. Show clear empty states when there is not enough user data.

## 8. PWA and platform behavior

- Keep the app installable and useful in standalone display mode; include a suitable manifest and iOS Home Screen icon.
- Use HTTPS for deployment and test Home Screen installation in Safari on iPhone.
- Communicate notification permission clearly and request it in response to an explicit user action.
- Push delivery is best-effort and platform-dependent; never present it as a guaranteed alarm.

## 9. Do / avoid

**Do:** keep the current task immediately obvious; use generous tap spacing; prefer consistent reusable tokens; preserve readable text on frosted surfaces; show transparent, honest system states.

**Avoid:** copying a third-party logo/brand identity; low-contrast lavender microcopy; tiny controls; a desktop sidebar as the only phone navigation; shame-based progress visuals; fake analytics; excessive glass blur or animation.
