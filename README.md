# PlanE — Event Operating System

PlanE is a multi-tenant event operating system for organizers, teams, sponsors, speakers, vendors and attendees. The event is the system-of-record and every actor works against the same Event Graph.

## Product surface

- Organizer workspace: planning, dependencies, finance, sponsors, speakers, vendors, marketing, operations, analytics, reports.
- Command Center: action center, event health, critical path, incidents, activity feed and event graph.
- Multi-actor portals: organizer, staff, sponsor, speaker and vendor.
- Attendee Experience: passwordless access, profile, agenda, networking, matchmaking, session registration/check-in, polls, surveys and gamification points.
- Public event website: event information, agenda, venue, networking CTA and embedded Abra Tickets checkout.
- Ticketing integrations: provider-neutral adapter plus Abra Tickets contract, signed webhooks and reconciliation-ready sync.
- Production foundations: database sessions, invitation onboarding, audit log, notifications, job queue skeleton, email/storage/payment/AI adapters, security headers, health endpoint, migration and E2E scaffold.

## Stack

Next.js App Router, TypeScript, PostgreSQL and Prisma.

## Local production app

```bash
cd production
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

The included `20261006_product_completion` migration is incremental and assumes the pre-existing PlanE baseline schema has already been migrated.

## Abra Tickets

PlanE does not duplicate ticket sales or access control. The public event page can embed Abra Tickets checkout using the event's Abra identifier/slug. API synchronization remains behind a provider adapter so PlanE can consume an organizer-approved Abra API/webhook contract without hard-coding undocumented routes.

## Production dependencies still externalized

Managed PostgreSQL, transactional email, object storage, queue scheduling, monitoring/error tracking, domain/TLS/secrets and the final Abra API/webhook credentials are deployment concerns, not hard-coded into the application.

## This repository

The PlanE project root lives at the root of this git checkout, not under `production/` or a Desktop folder. The `cd production` steps above are the upstream instructions for a nested folder that is not in this checkout. The migration name `20261006_product_completion` is also an upstream instruction. This checkout has `prisma/migrations/20261006153000_init`, generated from an empty database. It was applied here to local PostgreSQL 16.

`/demo` is implemented and was exercised by Playwright without PostgreSQL. `lib/prisma.ts`, `lib/auth.ts`, `prisma/seed.ts`, and `prisma/seed-demo.ts` exist. The demo seed upserts identity, events, tasks, incidents, sponsors, finance, tickets, program sessions, vendors, speakers, and run-of-show rows. `/demo` still uses the memory store. If `DATABASE_URL` is set and the request is not demo mode, pages and `/api` use Prisma. That path was run once against local Postgres: login did not set `plane_demo=1`, and one task was created and read back. Read `START-HERE.md` and `docs/KNOWN-LIMITATIONS.md`.

On 2026-10-06 this branch passed `npm run typecheck`, `npm run lint` (`eslint .`, because Next.js 16 removed `next lint`), `npm test` (8 files, 21 tests), `npm run build` (Next.js 16.3.8), and `npm run test:e2e` (3 tests). `vercel --prod` was not run. Prisma is pinned to 6.19.3 so `prisma generate` still exists. The Docker build result is in `docs/DEPLOYMENT.md`.
