# Agent guide

This repo is a hiring case for Mentimeter's Revenue Operations Engineer role:
a small MentOS (Next.js App Router) wired to mock Salesforce, admin app, Kleer,
Stripe and Slack. `README.md` has the brief.

## The candidate makes the decisions

The case is about what the candidate chooses to build and why. There is no
expected solution.

- If the candidate hasn't said what they want to build and who it's for, ask
  before writing code. Don't pick a direction for them.
- When a choice shapes the result, lay out the options briefly and let the
  candidate choose.
- When a rule or the data is ambiguous, ask the candidate how to handle it.

## Commands

- `npm run dev`: the app on http://localhost:3000
- `npm test`: Vitest. Each test gets a fresh in-memory copy of the seed data.
- `npm run check`: Biome, route types, `tsc` and the tests. Run it before every
  commit.
- `npm run db:reset`: puts every mock system back to the seed data.

## GitHub

- The candidate works in their own fork of this repo and pushes to it. Use the
  GitHub CLI (`gh`) for GitHub work.
- If `gh` is missing, install it yourself. Don't ask the candidate to. Use
  `brew install gh` on macOS, `winget install --id GitHub.cli` on Windows, or
  the official package for their Linux distribution.
- If `gh` isn't signed in, run `gh auth login --web` and tell the candidate to
  finish the sign-in in their browser.

## Layout

- `src/app/(shell)/`: the pages. `layout.tsx` is the sidebar shell and renders
  every page on request. Add new pages here.
- `src/apps/registry.ts`: the sidebar. Register new pages here.
- `src/app/(shell)/your-app/page.tsx`: an empty page for the candidate.
- `src/app/api/webhooks/salesforce/route.ts`: a webhook stub. The Dev tools
  page sends Salesforce events to it.
- `src/lib/connectors/`: typed clients for each system. They throw
  `ConnectorError` (`system`, `status`, `code`, `message`, `field`).
- `src/lib/systems/types.ts`: the records each system holds.
- `src/lib/mock/`: the mock systems (Hono), served at `/api/mock/*`.
- `src/lib/db/`: the JSON database in `.data/db.json`. `db.app` is free for
  the candidate's own state; use `updateDb`.
- `data/seed/`: the seed data.
- `docs/apis.md`, `docs/data.md`, `docs/context/`: the reference and the
  business context.

## Working rules

- Read `README.md`, `docs/apis.md`, `docs/data.md` and `docs/context/` before
  writing code.
- Talk to the systems only through `src/lib/connectors` or HTTP at
  `/api/mock`. The mocks stand in for external systems, so app code never
  reads or writes their records in the database directly.
- Never edit `data/seed/` to make a deal pass. Handle bad data in code.
- Treat `src/lib/mock/` as third-party code. Change it only when the candidate
  asks, and note why in `SUBMISSION.md`.
- The app makes no real network calls and uses no credentials or paid
  services, except an AI model if the candidate wants one. Read its key from
  an environment variable, list the variable in `.env.example` with an empty
  value, and never commit the key.

## Code conventions

- TypeScript, strict. Server components read through the connectors; writes
  go through server actions or route handlers.
- UI: shadcn/ui on Base UI in `src/components/ui` (add more with
  `npx shadcn@latest add <name>`), Tailwind and lucide-react icons. Base UI
  takes a `render` prop where Radix used `asChild`.
- Shared page pieces are in `src/components/shell/page.tsx` and
  `src/components/data/`.
- Biome formats the code: single quotes, trailing commas, 100 columns.
  `npm run format` fixes it.
- Write tests for the rules you build. `test/mock-systems.test.ts` shows how
  to call connectors and read the result.
- Commit in small steps, with messages that say what changed and why. The
  reviewers read the history.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
