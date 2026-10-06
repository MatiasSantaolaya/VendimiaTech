# Demo

`VERCEL-DEMO.md` says `/demo` works with no Postgres, Prisma, Abra, or other providers. That route is not in the repository. There is no in-memory store, no Vendimia Tech dataset, and no view-as control.

`PublicEventPage.tsx` can render a public event if a caller passes `event`, `page`, `agenda`, and `stages`. No caller exists.

`lib/ticketing/mock.ts` can stand in for Abra sync during a future demo. It is not wired.

`lib/domain/brain.ts` can answer from a context object without an API key. It is not wired, so it does not answer from live or fixture data.

Demo passwords, magic links, and fixture dates are not defined because the fixture does not exist. Do not invent them in the UI until a seed file lands.

Brand facts that are safe to use when a fixture is added: the product name PlanE, the event name Vendimia Tech 2027, and Mendoza, Argentina. The landing repository `MatiasSantaolaya/vendimia-tech` returned 404 from this environment, so dates, venue, sponsors, and prices must be labeled as fixtures, not as official event facts.
