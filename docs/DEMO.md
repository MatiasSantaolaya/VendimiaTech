# Demo

`/demo` works with no PostgreSQL, no Abra credentials, and no other API keys. It is the same domain math the production services are meant to use, running on an in-memory fixture.

## How to open it

```bash
npm install
npm run dev
```

Go to `http://localhost:3000/demo`. You land on `/events/vendimia-tech-2027/control-center` as Ana Organizer. Use the "Ver como" bar to switch persona. The bar is shown when `plane_demo=1` or when `DATABASE_URL` is unset.

Login form: any persona email below, password `vendimia-demo`.

## Fixture

Vendimia Tech 2027 is a demo fixture. Dates, the venue name "Nave Demo", sponsors, speakers, prices, and the budget are not official landing-page facts. `metadata.dateSource` is `demo-fixture`.

| Field | Fixture value |
| --- | --- |
| Slug | `vendimia-tech-2027` |
| Status | `PLANNING` |
| Timezone | `America/Argentina/Mendoza` |
| City / country | Mendoza, Argentina |
| Start / end | 2027-03-04T13:00:00Z / 2027-03-06T23:00:00Z |
| Capacity / objective | 400 / 350 |
| Budget | 400_000_000 cents (ARS 4.000.000) |
| Tickets sold | 135 (100 general, 25 student, 10 VIP) |
| Currency display | cents / 100, label ARS |

A second organization, Bodega Sur Eventos (`cata-bodega-sur`, `evt_bodega`), exists only to prove cross-tenant denial.

## Personas

| View as | Email | Lands on |
| --- | --- | --- |
| Organizador | ana.organizer@vendimiatech.demo | control-center |
| Staff | diego.staff@vendimiatech.demo | operations (`staff-portal`) |
| Sponsor | elena.sponsor@vendimiatech.demo | commercial (`sponsor-portal`). Facundo shares sponsor `spo_andes`. |
| Speaker | gracia.speaker@vendimiatech.demo | content (`speaker-portal`) |
| Vendor | hugo.vendor@vendimiatech.demo | operations (`vendor-portal`) |
| Asistente | ines.attendee@vendimiatech.demo | experience (`attendee-portal`) |

`usr_snoop` (`rio@sponsors.demo`) is an attendee with the Río sponsor contact email and no sponsor entity access.

Invitation token `demo-invite-token` (email `nuevo.staff@vendimiatech.demo`, role `STAFF`, expires 2027-03-01). Magic token `demo-magic-ines` is stored for the uploaded attendee-session helper. The demo UI does not redeem it.

## What the Playwright test did

`e2e/demo.spec.ts` (2 passed):

- `/demo` shows the command center, health score, and ticket KPI.
- Planificación creates "Tarea e2e" and marks it Hecha.
- Operaciones resolves "Falla de audio" to Resuelto.
- View-as reaches sponsor, speaker, vendor, staff, and attendee portals.
- Integraciones probe shows an Abra / configuration message.
- Analytics panel renders.
- PlanE AI "Entradas" answer matches `/135|entrada/i`.
- Asistente opening finance sees `data-testid=denied`.
- `GET /api/events/evt_bodega` with the demo session returns 403.

## Process-local state

The fixture lives on `globalThis` inside one Node process. A second server process does not see tasks you created. Restarting `next dev` resets the graph to the seed. That is why E2E uses the Playwright webServer instead of a separate database.
