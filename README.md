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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
