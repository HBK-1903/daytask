# Violet Focus API Worker

This Worker is the private API and scheduled Web Push sender for Violet Focus. It is a separate Cloudflare Worker deployment from the Vite frontend in Pages.

## Cloudflare setup (after the code is pushed)

### 1. Use the existing D1 database

`wrangler.jsonc` already references the existing `hbkdaytask` database and `hbkd1` binding. Do not create another database or run `wrangler d1 create`. From this directory, authenticate Wrangler and apply any pending migrations only after reviewing the target database and receiving approval for the live change:

```bash
npx wrangler login
npx wrangler d1 migrations apply hbkdaytask --remote
```

Do not use the demo database from Cloudflare's `d1-get-started` template. If the existing database ID must be verified, check the Cloudflare dashboard before applying migrations.

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

Use a long, unique `APP_PASSWORD` and a random `SESSION_SECRET` of at least 32 characters. `APP_PASSWORD` is required once to create the single personal account; after setup, sign in with the account email and password. The account password is salted and hashed in D1. The account's 256-bit recovery code is shown once, stored only as a salted hash, and rotated after recovery. The email is an unverified login identifier: no email is sent. Keep `APP_PASSWORD` private; it is not embedded in the frontend.

### 3. Deploy

```bash
npm install
npx wrangler deploy
```

The API will be available at the Worker's `workers.dev` URL. A Cron Trigger is configured to run every minute and dispatch due reminders. Workers Builds can deploy this folder from the same GitHub repository: connect `HBK-1903/daytask`, set **Root directory** to `/worker`, leave **Build command** empty, use **Deploy command** `npx wrangler deploy`, and keep `main` as the production branch. Enable preview builds only after pushing a branch with the Worker configuration.

## API

- `GET /api/health` — health check
- `POST /api/auth/register` — one-time personal account setup with email, account password, and `APP_PASSWORD` setup key; returns a seven-day session and a one-time recovery code
- `POST /api/auth/login` — sign in with email and account password
- `POST /api/auth/recover` — reset the account password with the offline recovery code; rotates the code and revokes old sessions
- `POST /api/auth/session` — legacy `APP_PASSWORD` session exchange before an account is created; disabled after account setup
- `GET /api/push/public-key` — public VAPID key for browser subscription
- `POST /api/push/subscribe` / `DELETE /api/push/subscribe` — save/remove a push subscription (authenticated)
- `POST /api/push/test` — send an explicitly requested test push to active subscriptions (authenticated)
- `POST /api/reminders/action` — apply a one-use HMAC-capability action from a notification (complete, snooze 10 minutes, dismiss); no account token is embedded in the notification
- `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:id` — reminder task API (authenticated)

The API requires an exact allowed origin and authenticated sessions for private routes. CORS is not a substitute for authentication. Push delivery is best-effort; browser and operating-system behavior can delay or suppress notifications.

Additional routes:

- `GET /api/sync` and `PUT /api/sync` — retrieve/store one encrypted personal backup envelope (authenticated). The browser encrypts with PBKDF2-SHA-256 and AES-GCM before upload; D1 stores only `salt`, `iv`, and ciphertext. The sync passphrase is never sent to this Worker. Each explicit upload replaces the previous cloud envelope; there is no record-level merge or automatic/background sync.
- `GET /api/reminders/settings` and `PUT /api/reminders/settings` — store quiet-hour, wording, and lock-screen privacy choices (authenticated). Quiet hours use `Europe/Istanbul`.

Migration `0002_sync_and_reminder_settings.sql` adds the encrypted vault and reminder settings tables; migration `0003_personal_account_auth.sql` adds the one-account credential and rate-limit tables; migration `0004_reminder_action_capabilities.sql` adds one-use push-action capabilities. All pending migrations must be applied to the existing `hbkdaytask` database before their routes can work. Do not apply these remotely until the target database is reviewed and the owner explicitly approves the live migration:

```bash
npx wrangler d1 migrations apply hbkdaytask --remote
```

The encrypted backup vault receives data only after the user opens Settings, authenticates, enters a separate sync passphrase, and explicitly chooses upload or download. Separately, enabling push reminders sends task IDs, titles, categories, due times, durations, and statuses to the Worker over HTTPS so its Cron trigger can schedule delivery. With lock-screen privacy enabled, task titles/categories are replaced with generic values before D1 storage; the Worker still receives the request fields in memory. Do not deploy the Worker or apply a remote migration without reviewing the target database and exact `APP_ORIGIN` first.

## Local development

Create `.dev.vars` in this folder (never commit it) with `APP_PASSWORD`, `SESSION_SECRET`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY`. Use `npm run dev` and Wrangler's local D1 database for local work. Run `npm run typecheck` and `npm test` from `worker/` before pushing. See `.gitignore` for local-secret exclusions.
