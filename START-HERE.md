# Start here

PlanE (`plane-event-os` `5.0.0-rc.1`) is the event operating system in this repository. The uploaded project root is the git root. There is no `production/` directory and no Desktop `PlanE` folder.

## What is in the tree

- Stack contract: `package.json`, `tsconfig.json`, `vercel.json`, `Dockerfile`, `docker-compose.yml`, `.env.example`.
- Uploaded UI that is not mounted on a route: `components/ModuleShell.tsx`, `components/PublicEventPage.tsx`, `components/QuickCreate.tsx`, `components/RegisterSW.tsx`.
- Uploaded server modules that import `lib/prisma` and `lib/auth`. Those two files are not in the tree, so `lib/services/*` does not compile yet.
- Provider adapters: `lib/ai/provider.ts`, `lib/email/provider.ts`, `lib/payment/provider.ts`, `lib/storage/provider.ts`, `lib/ticketing/abra.ts`.
- Pure domain helpers (not called by any route): `lib/domain/*`, `lib/ticketing/mock.ts`, `lib/rate-limit.ts`, `lib/monitoring.ts`.
- `prisma/schema.prisma` only. No `prisma/migrations`, no `prisma/seed.ts`, no `prisma/seed-demo.ts`.
- `public/sw.js` and `scripts/worker.mjs`.
- `next.config.ts` defines security headers. There is no `app/` directory, so Next.js has nothing to serve.

## What you cannot do yet

`npm run dev` has no pages. `/demo`, `/login`, `/api/*`, and `/events/[slug]/*` are not implemented. `npm test` has no test files. `npm run db:seed` and `npm run db:seed:demo` point at files that do not exist. Nothing in this checkout has been installed, typechecked, or built.

## Read next

- `docs/ARCHITECTURE.md` — file map and the breaks between files.
- `docs/KNOWN-LIMITATIONS.md` — gaps, including Abra and demo.
- `docs/DEPLOYMENT.md` — env vars and the Docker/Vercel files as they are.
- `README.md` — original PlanE product description. Treat the command blocks as the upstream instructions, not as proof this checkout runs.
