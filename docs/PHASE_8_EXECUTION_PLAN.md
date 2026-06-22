# QuickGO Phase 8 Execution Plan

Date: 2026-06-22
Phase: Partner App Rider Mode
Source of truth: `PRD.md`

## Phase 7 Lock Confirmation

Phase 7 is confirmed locked from `docs/IMPLEMENTATION_STATUS.md` and `docs/PHASE_7_LOCK_AUDIT_REPORT.md`.

- Phase 7 lock readiness verdict: `PHASE 7 LOCK READY`
- Phase 7 completion: `100%`
- Phase 8 code changes were not started during Phase 7.
- Phase 8 may proceed only within the locked MVP scope.

## Objective

Implement Rider Mode inside the existing QuickGO Partner App and supporting backend/admin visibility needed for the MVP delivery loop:

Customer order -> vendor acceptance -> manual admin rider assignment -> rider pickup -> rider delivery -> COD/UPI-on-delivery collection -> admin visibility and audit.

## In Scope

- Rider login/access through the existing Partner App OTP/auth flow.
- Rider profile view/edit for basic operational fields.
- Rider KYC document self-service visibility/submission.
- Rider online/offline availability toggle.
- Assigned orders list and assigned-order detail.
- Rider accept/reject assigned order flow.
- Pickup confirmation flow.
- Delivery confirmation flow.
- Proof-of-delivery reference/status flow.
- Rider order history.
- Rider action audit logs.
- Admin visibility for rider operations.
- Basic notification/event hooks for assignment, pickup, and delivery events.

## Explicitly Out of Scope

- Live rider tracking.
- Auto-dispatch.
- Route optimization.
- Rider wallet.
- Payout settlement expansion.
- Payment reconciliation expansion.
- Gamification.
- Referral system.
- Phase 9 work.
- Any blocked MVP feature listed in `PRD.md`.

## Current Implementation Baseline

Already present:

- Partner App OTP login and role detection.
- Rider dashboard.
- Online/offline toggle.
- Assigned orders list.
- Pickup confirmation.
- Delivery confirmation.
- Payment collection.
- Delivery issue reporting.
- Backend role guard for rider APIs.
- Manual admin rider assignment.
- Notification hooks for rider assigned, picked up, and delivered.
- Admin audit log infrastructure.
- Admin-managed rider KYC documents.

Known gaps to close in Phase 8:

- Rider profile view/edit endpoint and Partner App surface.
- Rider self-service KYC document list/submission.
- Rider accept/reject assigned order action.
- Proof-of-delivery submission/status linked to assigned rider/order.
- Rider order history endpoint and Partner App surface.
- Explicit rider action audit entries for accept/reject/profile/KYC/proof flows.
- Admin rider operations visibility for recent rider actions/proofs.
- Tests and documentation for the completed Rider Mode surface.

## Architecture Approach

- Keep the existing NestJS modular monolith.
- Keep the existing internal event-driven architecture.
- Add only narrow rider/admin API endpoints required by the Phase 8 scope.
- Preserve order status transitions through the existing order state machine.
- Use RBAC plus assigned-rider ownership checks for every rider order action.
- Prefer existing Prisma models. Add a small migration only if required for proof/assignment status metadata.
- Keep Partner App UI simple and operations-first.
- Do not introduce new dependencies unless validation proves one is strictly required.

## Likely Files To Change

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/.../migration.sql`
- `backend/src/modules/riders/rider.dto.ts`
- `backend/src/modules/riders/riders.controller.ts`
- `backend/src/modules/riders/riders.service.ts`
- `backend/src/modules/admin/admin.controller.ts`
- `backend/src/modules/admin/admin.service.ts`
- `backend/src/modules/internal-events/domain-event.types.ts`
- `backend/src/modules/audit/audit-event.handler.ts`
- `backend/test/support/in-memory-prisma.ts`
- `backend/test/quickgo-flow.e2e-spec.ts`
- `docs/openapi.quickgo.mvp.v1.json`
- `mobile/partner_app/lib/src/providers.dart`
- `mobile/partner_app/lib/src/screens/rider_mode_screen.dart`
- `mobile/partner_app/test/widget_test.dart`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/PHASE_8_COMPLETION_REPORT.md`
- `docs/PHASE_8_LOCK_AUDIT_REPORT.md`

## Dependencies

- Existing JWT/OTP auth flow.
- Existing rider RBAC role.
- Existing admin manual dispatch.
- Existing Prisma/PostgreSQL schema and migration flow.
- Existing in-process domain event bus.
- Existing notification event handlers.
- Existing audit log table.
- Existing Partner App Riverpod/Dio shared API stack.

## Assumptions

- The existing Partner App login is sufficient for rider access when the authenticated user has the `RIDER` role.
- Rider KYC file upload storage was hardened in Phase 7; Phase 8 can submit/manage document references without adding a new file-picker dependency unless already available.
- Proof of delivery for MVP can be a URL/reference plus note/status and does not require live camera capture.
- Admin visibility may be provided through backend/admin data surfaces and, where practical, a compact admin panel view without expanding operations scope.
- Payment collection and reconciliation remain Phase 7/locked flows and will not be expanded.

## Risks

- Order accept/reject must not create invalid lifecycle transitions or imply auto-dispatch.
- Proof-of-delivery storage must avoid accepting arbitrary unsafe payloads.
- Mobile build may require local Flutter/Android SDK state outside code changes.
- Admin visibility must remain read-only unless an existing admin force action is used.
- Any schema migration must be additive and safe for existing Phase 1-7 data.

## Validation Plan

Required after implementation:

- `npm --workspace backend run prisma:generate`
- `npx prisma validate --schema backend/prisma/schema.prisma`
- `npm --workspace backend run lint`
- `npm --workspace backend run build`
- `npm --workspace backend run test`
- `npm --workspace backend run test:e2e`
- `npm run check`
- `npm --workspace web/admin_panel run lint` if admin panel touched
- `npm --workspace web/admin_panel run test` if admin panel touched
- `npm --workspace web/admin_panel run typecheck` if admin panel touched
- `npm --workspace web/admin_panel run build` if admin panel touched
- Partner App Flutter analyze/test/build if Partner App is touched.
- `npm audit --omit=dev --audit-level=high`

## Lock Criteria

Phase 8 can be marked complete only when:

- Rider Mode works end-to-end for assigned rider operations.
- Rider actions are permission-protected and scoped to assigned orders.
- Admin can view rider/order activity.
- Critical rider workflows have tests.
- Documentation and API references are updated honestly.
- Validation passes or any external-environment failures are clearly documented.
- No Phase 9 or blocked MVP functionality is introduced.
