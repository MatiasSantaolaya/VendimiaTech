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

The PlanE project root lives at the root of this git checkout, not under `production/` or a Desktop folder. The `cd production` steps above are the upstream instructions for a nested folder that is not in this checkout.

As of the current tree there is no `app/` directory, no `lib/prisma.ts`, no `lib/auth.ts`, no migration, and no seed file. `/demo` is not a route yet. `npm run db:seed` and `npm run db:seed:demo` point at files that are not created. Read `START-HERE.md` and `docs/KNOWN-LIMITATIONS.md` before running commands. `package.json` still lists `lint`, `typecheck`, `test`, `test:e2e`, `e2e`, `build`, and `worker` for when those entry points exist.
