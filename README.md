# Violet Focus

Violet Focus is a personal-first planning PWA for daily tasks, habits, learning, and focus. Its home screen puts the next action first; planning suggestions never silently rearrange the user's schedule.

## Local development

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

Vite writes the deployable site to `dist/`.

## Cloudflare Pages

Connect this GitHub repository to Cloudflare Pages and use:

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`
- **Production branch:** `main`

The frontend currently stores task changes in this browser's local storage; habits, learning, and analytics are still seeded prototype data. A separate Worker/D1 backend scaffold now lives in `worker/` with authenticated API routes and a scheduled Web Push sender. It is not deployed or wired into the frontend yet: first create the app's D1 database, replace the Wrangler placeholders, configure secrets and the Pages origin, then connect the PWA to the API. Browser notification delivery is best-effort and depends on user permission, browser, and operating system.

## Current prototype

- Violet Focus lavender / violet glass visual system and responsive layout
- Main navigation: Now, Calendar, Habits, Learning, Insights
- Task completion, local task persistence, focus timer, task creation modal
- Habit interaction, learning and analytics views (currently seeded sample data)
- Installable PWA manifest and generated service worker
