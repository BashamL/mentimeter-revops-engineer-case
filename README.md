# Mentimeter RevOps Engineer case

Thanks for taking on our case. This repo is a small version of MentOS, the
internal tool we build for sales and finance at Mentimeter. It's wired to mock
versions of Salesforce, our admin app, Kleer, Stripe and Slack, and everything
in it is fictional.

You get the app, a week of messy deals and every system's API. What you build
with them is up to you.

Plan for about 3 hours, and no more than 4. Build it with Claude Code, Cursor,
Codex or another AI tool. We expect that, and we count your time, not the
agent's.

An agent can write the code in minutes. Spend the rest of your time deciding
what to build, checking what it made against the data, and explaining your
choices.

## Background

Mentimeter builds a web-based service for audience engagement. More than 20
million people use it every month, and we have 170,000 customers, 3,500 of them
on enterprise contracts. About half of our sales revenue comes from
self-service and half from Enterprise Sales.

Enterprise Sales focuses on companies where Mentimeter has already spread
internally, so most demand is inbound. Four roles work with customers:

- Sales Development Representatives (SDR) handle inbound leads and outbound
  prospecting.
- Account Executives (AE) close new customers.
- Relationship Managers (RM) own the commercial relationship with existing
  customers: renewals and add-ons.
- Customer Success Managers (CSM) drive adoption and usage.

We sell value-based, qualify with MEDDPICC and measure results in ARR (annual
recurring revenue).

## The problem

When an Enterprise deal is marked Closed Won in Salesforce, the work isn't
over. A rep or someone in finance copies the deal by hand into the admin app to
set up the customer's subscription, then again into Kleer (invoice) or Stripe
(card) to bill the customer.

This takes time and goes wrong often: wrong license counts, missing PO numbers,
invoices without a VAT number, customers billed twice. Each mistake means
corrections, credit notes and a slower start for the customer. And reps can't
see what happened to their deal, so they ask in Slack.

## Your task

Build something in this app that makes the Closed Won hand-off better.

What you build, who it's for and how far you take it are your call. There's no
answer we're looking for. We want to see what you choose, how you deal with
real, messy data, and how you explain your choices. Whatever you build should
run on this week's deals.

The people involved don't agree on what good looks like
([`docs/context/voices.md`](docs/context/voices.md)). Decide who you're
building for, and what you're leaving out.

## What's in the box

- **A MentOS-style app** in Next.js, React, Tailwind and shadcn/ui, with pages
  for Salesforce deals and accounts, the admin app, Kleer, Stripe and Slack. An
  empty page called Your app is waiting for you.
- **Mock APIs for all five systems**, served at `/api/mock/...`. They act like
  the real ones, quirks included: each has its own field names and error
  format, Kleer works out VAT, Stripe takes idempotency keys and Slack answers
  `ok: false` instead of failing. [`docs/apis.md`](docs/apis.md) lists every
  endpoint.
- **Typed connectors** in [`src/lib/connectors/`](src/lib/connectors) to call
  them from your code.
- **A week of data**: 18 deals closed between 2 and 6 November, the accounts
  behind them, and history in every system. Salesforce published 21 events
  about them. [`docs/data.md`](docs/data.md) explains what's where.
- **Context** on how finance bills
  ([`docs/context/billing-policy.md`](docs/context/billing-policy.md)), who's
  who ([`docs/context/people.md`](docs/context/people.md)), and what reps and
  finance say about the process today
  ([`docs/context/voices.md`](docs/context/voices.md)).
- **Dev tools**: a page that sends Salesforce events to a webhook, shows every
  request to the mocks and resets everything.
- A local JSON database (`.data/db.json`), tests with Vitest, and an
  [`AGENTS.md`](AGENTS.md) your coding agent reads.

## Getting started

You need Node 22 or later and a GitHub account, and you'll probably need the
GitHub CLI (`gh`). No need to install it yourself. Ask your coding agent to fork
this repo and clone your fork, and it will install `gh` if it's missing. You
work in your fork from then on.

```bash
gh repo fork BashamL/mentimeter-revops-engineer-case --clone
cd mentimeter-revops-engineer-case
npm install
npm run dev
```

Open http://localhost:3000.

| Command            | What it does                                          |
| ------------------ | ----------------------------------------------------- |
| `npm run dev`      | Runs the app on localhost:3000                        |
| `npm test`         | Runs the tests                                        |
| `npm run check`    | Lint, type check and tests. Run it before you commit. |
| `npm run db:reset` | Puts every mock system back to the seed data          |
| `npm run build`    | Builds the app, to check it compiles                  |

## What to submit

1. **Your fork, with your commits.** Commit and push as you go. To share it, add `BashamL` (liam.basham@mentimeter.com) as a
   collaborator. We only need to read it. Or export the repo as a zip that
   includes the `.git` folder and send that.
2. **[`SUBMISSION.md`](SUBMISSION.md), filled in**: what you built and who
   it's for, the decisions behind it, what you chose not to build, what you'd
   do next, and how you worked with your AI tool.
3. **A short video** (Loom or similar, 10 minutes at most). Show what you
   built on this week's deals and walk us through the decisions behind it.
   Tell us one thing your AI tool got wrong or didn't think of, and how this
   would work for real.

We'll run your solution with `npm install` and `npm run dev`. If it needs
anything else, say so in `SUBMISSION.md`.

## What we look at

- **What you chose to build, and why.** Who is it for, would they use it, and
  what did you trade away?
- **Your build.** Does it work on this week's deals, including the messy
  parts?
- **Your design.** Is it easy to follow, and would it hold up beyond this
  week?
- **How you explain it.** Can you walk us through what you built and the
  choices behind it, clearly and simply?

If you're invited to the interview, you'll show us your solution and we'll go
deeper into your choices. We'll also discuss how it could fit into a bigger
picture, and finish with questions about your previous experience.

## FAQ

**Can I change the existing pages?** Yes. Change, replace or delete anything in
the app.

**Can I change the mocks or the data?** Treat the mocks like third-party APIs
you don't control. If one blocks something you need, change it and say why in
`SUBMISSION.md`. Leave the seed data as it is, since we run every submission on
the same week. You can add your own records in tests.

**Can I add packages, a database or background jobs?** Yes, as long as
`npm install` and `npm run dev` still run it on a laptop with no accounts or
API keys.

**Can my app call an AI model?** Yes, but we don't have API keys to give you.
Use your own while you build, and add the variable to `.env.example` with an
empty value. Don't commit your key. Since we don't have a smooth way to set you up with
a key, this is absolutely not something you have to incorporate

**Is there a right answer?** No :)

**What if a rule is unclear?** Decide, apply it consistently and write it down.
We're interested in how you reason about it.

**What if I run out of time?** Stop at 4 hours and write what you'd do next in
`SUBMISSION.md`. We know you don't have access to anything actually valuable in this repo, we just
want to see how you take on the challange. 

All companies, people, products and prices in this case are fictional and do
not reflect Mentimeter's real pricing or customers. If anything is unclear, ask
your Talent Partner.
