# PlanE Vercel Demo
Deploy `production/` to Vercel and open `/demo`. The demo route is zero-config and does not require PostgreSQL, Prisma, Abra credentials or external providers. It is intentionally isolated from the production data layer.

In this VendimiaTech checkout the uploaded project root is the repository root, not a `production/` subdirectory. `/demo` is `app/demo/route.ts` plus the in-memory store. Playwright passed against it locally. A Vercel project was not created and `vercel --prod` was not run. Production data still does not back those pages: see `docs/DEMO.md` and `docs/KNOWN-LIMITATIONS.md`.
