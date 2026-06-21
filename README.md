# QuickGO MVP

QuickGO is a locked production MVP for one-city, one-service-zone local delivery with:

- Android-first customer app.
- Combined partner app for vendor and rider modes.
- Admin operations panel.
- NestJS modular monolith backend.
- PostgreSQL + Prisma.
- Manual dispatch, COD/UPI on delivery, reconciliation, support, compliance, and validation dashboard.

The implementation source of truth is the imported documentation pack:

- `PRD.md`
- `docs/00_DOCUMENT_INDEX.md`
- `docs/03_DATABASE_SCHEMA.md`
- `docs/04_SYSTEM_DESIGN.md`
- `docs/05_API_SPEC.md`
- app/admin/test/deployment/ops docs under `docs/`

## Repository Layout

```txt
quickgo/
  PRD.md
  docs/
  backend/
  mobile/
    customer_app/
    partner_app/
    packages/
  web/
    admin_panel/
```

## MVP Exclusions

Do not add railway/train food, PNR collection, online payment gateway, wallet, subscriptions, loyalty, referrals, auto-dispatch, live rider tracking, multi-vendor cart, or iOS public launch to MVP surfaces.

Run the local blocklist check before release:

```bash
npm run check:blocklist
```

