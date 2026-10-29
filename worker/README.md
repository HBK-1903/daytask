# Violet Focus API Worker

This Worker is the private API and scheduled Web Push sender for Violet Focus. It is a separate Cloudflare Worker deployment from the Vite frontend in Pages.

## Cloudflare setup (after the code is pushed)

### 1. Create the D1 database

From this directory, authenticate Wrangler and create the database:

```bash
npx wrangler login
npx wrangler d1 create hbkdaytask
```

The database ID supplied for this project is already set in `wrangler.jsonc` (do not use the demo database from Cloudflare's `d1-get-started` template). If you create a replacement database later, update `d1_databases[0].database_id`. Then apply the migration:

```bash
npx wrangler d1 migrations apply hbkdaytask --remote
```

### 2. Configure Worker values and secrets

Set `APP_ORIGIN` to the exact Pages origin, for example `https://your-project.pages.dev`. Set `VAPID_SUBJECT` to a contact address, such as `mailto:you@example.com`.

Generate a VAPID key pair once (keep the private key private):

```bash
npx web-push generate-vapid-keys
```

Set the public key as `VAPID_PUBLIC_KEY` in `wrangler.jsonc`; set the subject in `VAPID_SUBJECT`. Store secrets interactively so they never go into Git:

```bash
npx wrangler secret put APP_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put VAPID_PRIVATE_KEY
```

Use a long, unique app password and a random `SESSION_SECRET` of at least 32 characters. The app password is exchanged for a short-lived signed session; it is not a static token embedded in the frontend.

### 3. Deploy

```bash
npm install
npx wrangler deploy
```

The API will be available at the Worker's `workers.dev` URL. A Cron Trigger is configured to run every minute and dispatch due reminders. Workers Builds can deploy this folder from the same GitHub repository: connect `HBK-1903/daytask`, set **Root directory** to `/worker`, leave **Build command** empty, use **Deploy command** `npx wrangler deploy`, and keep `main` as the production branch. Enable preview builds only after pushing a branch with the Worker configuration.

## API

- `GET /api/health` — health check
- `POST /api/auth/session` — exchange `{ "password": "..." }` for a seven-day bearer session
- `GET /api/push/public-key` — public VAPID key for browser subscription
- `POST /api/push/subscribe` / `DELETE /api/push/subscribe` — save/remove a push subscription (authenticated)
- `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:id` — reminder task API (authenticated)

The API requires an exact allowed origin and authenticated sessions for private routes. CORS is not a substitute for authentication. Push delivery is best-effort; browser and operating-system behavior can delay or suppress notifications.

## Local development

Create `.dev.vars` in this folder (never commit it) with `APP_PASSWORD`, `SESSION_SECRET`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY`. Use `npm run dev` and Wrangler's local D1 database for local work. See `.gitignore` for local-secret exclusions.
