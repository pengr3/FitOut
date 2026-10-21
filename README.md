This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testing

**One-time setup.** With Docker up (`npm run db:up`), provision the suite's own database:

```bash
npm run db:test:setup
```

This creates `fitout_test` next to the dev `fitout` database, installs `postgis` and `btree_gist`
into its `public` schema, and replays the migrations into it. It is idempotent — running it again
changes nothing and exits 0. Run it once per machine, and again after a migration that the test
database has not seen.

**Running the suite.**

```bash
npx vitest run     # or: npm test
```

**`npx vitest run` targets `fitout_test` and never dev.** `tests/setup.ts` assigns `DATABASE_URL`
unconditionally, so a `DATABASE_URL` in your shell (or in `.env.local`) steers what the test URL is
*derived from* but no longer steers where the suite writes. Isolation is two layers:

1. **Database** — the whole suite runs against `fitout_test`. This is what contains writes made
   through the app's module-level db handle (`src/lib/db/index.ts`), which is bound to `public` and
   does not go through the per-file helper. Before this existed, those writes landed in dev.
2. **Schema** — each test *file* still gets its own `test_<pid>_<worker>_<n>` schema inside that
   database, so parallel workers never share state.

Each run truncates `fitout_test`'s `public` schema at the start and prints a
`[test-db] LEAKED WRITES` report at the end naming anything that escaped layer 2. A couple of
`notify` / `guest-email` audit rows there are expected and contained — see
`tests/global-setup.ts`.

**Overriding the target.** Set `TEST_DATABASE_URL` to point the suite at some other Postgres. The
database name **must end in `_test`**: the suite `TRUNCATE`s the target's `public` schema on every
run and refuses to start against any other name (`tests/helpers/test-db-url.ts`). Leaving it unset
is the normal path.

This affects Vitest only. `npm run db:migrate`, `npm run db:seed`, `npm run dev` and the Playwright
e2e specs (`npm run test:e2e`) all still read `DATABASE_URL` and still target the **dev** database —
Playwright boots the real app via `npm run dev`, so seeding anywhere else would seed one database
while the app read another. Note that `drizzle-kit` reads `process.env.DATABASE_URL` directly and
loads no env file of its own, so `npm run db:migrate` still needs the variable present in the shell.

## Event-driven background work

`BACKGROUND_EXECUTION_MODE=events` replaces the payment, checkout retirement, request expiry,
reminder, verification, payout reconciliation and settlement scans with record-specific work.
Database triggers write an identifier-only outbox in the same transaction as each domain change.
Requests and signed webhooks publish after commit; checkout also requires scheduler acceptance before
exposing a payment URL. Inngest sleeps until each persisted deadline and rechecks current state when it
wakes. A changed deadline cancels its previous timers. Publishing is at least once; existing database
claims and payment idempotency remain the authority for effects.

There is one daily recovery audit at 08:00 Manila. It repairs pending delivery, restarts overdue failed
workers, checks stuck payout claims and retains settlement-return detection. The Contact control monitor
also becomes daily, with new persisted incidents delivered immediately. The existing Friday payout
windows and daily operator digest keep their business schedules. Targeted recovery checks continue only
while an actual payment, verification or payout needs recovery.

When the database explicitly reports exhausted compute/quota capacity, worker and audit steps wait
one hour before retrying. Pending work remains persisted; unrelated transient errors retain normal
retries. Cancelled timers skip their follow-up dispatcher when they wake.

Bookings can be 90 days ahead. Distant work stays in the outbox until it is within 27 days, below
Inngest Free's 30-day workflow duration. The daily audit publishes work as it enters that window.

Roll out in this order:

1. Apply `0039_background_tasks` to the isolated Preview database using `npm run db:migrate` and its
   direct connection. It creates the outbox, triggers and an existing-record backfill without changing
   booking or financial state. Migrations are operator-run, never part of the Vercel build.
2. Set Preview's mode to `events`, deploy this same commit to customer and Ops previews, and sync
   `/api/inngest` and `/api/contact-alerts/inngest` in an isolated Inngest environment. Use sandbox
   provider credentials. Prove a request/approval, checkout/payment callback, expiry, cancellation,
   verification and notification, including duplicate deliveries and a changed deadline.
3. After those proofs, apply the same migration to Production, enable `events` on both projects,
   rebuild/deploy, and sync both registered Inngest receivers to the tested release. An older immutable
   receiver retains its old schedules even when the app's current deployment changes.
4. Confirm the automatic five-minute scans are absent, new records publish outbox events, pending
   deadlines are queued and compute sleeps between activity. Existing queued runs may finish;
   database guards still protect against repeats.

The default remains `polling` until that rollout is verified. To roll back scheduling, rebuild with
`polling` and sync both receivers again. Retain the additive schema and outbox; dropping it would lose
pending work. An exhausted database quota must be restored or reach its renewal before hosted proofs
and Production migration can run; changing the scheduler does not restore consumed allowance.

For local regression coverage, provision the isolated test database and run
`npx vitest run tests/background`. These tests include real Postgres transactions, rollback,
concurrent publishing, changed deadlines and worker recovery, with external services mocked.

## Persistent preview sandbox

Copy `.env.preview.example` to `.env.preview.local` and configure only the isolated Preview branch,
independent auth/worker credentials, test-mode PayMongo webhooks and tester email recipients.
`npm run preview:check -- --database` checks configuration and read-only connectivity; it does not
replace provider or browser proofs. `npm run preview:seed` is a dry run; append `-- --apply` to create
synthetic host, player and staff identities plus instant, request and draft listings. Existing passwords,
listing edits and bookings are preserved. The seed password is supplied privately through
`PREVIEW_SEED_PASSWORD` and is never printed. Sign in as `host@preview.fitout.invalid`,
`booker@preview.fitout.invalid` or `staff@preview.fitout.invalid` to test the ordinary application flows.

Production database targets and live PayMongo keys are refused by the Preview boundary. Preview email
is sent only to exact addresses in `PREVIEW_EMAIL_RECIPIENTS`; the seed accounts cannot receive mail.
The seeded host's review/payout eligibility is synthetic and does not prove vendor onboarding or a
real transfer. Keep payout dispatch on hold and complete sandbox-provider proofs separately.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
