# PlanE Vercel Demo
Deploy `production/` to Vercel and open `/demo`. The demo route is zero-config and does not require PostgreSQL, Prisma, Abra credentials or external providers. It is intentionally isolated from the production data layer.

In this VendimiaTech checkout the uploaded project root is the repository root, not a `production/` subdirectory. `/demo` is not implemented yet: there is no `app/demo` route and no in-memory store. Do not treat a Vercel deploy of this tree as a working demo until that route exists. See `docs/DEMO.md`.
