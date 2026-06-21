# QuickGO Backend Architecture

QuickGO uses a modular monolith with internal event-driven workflows.

## Architecture Rule

- The backend is one NestJS deployable for MVP.
- Business capability boundaries stay as Nest modules: auth, users, customers, vendors, riders, service zones, catalog, carts, orders, delivery, payments, reconciliation, settlements, support, compliance, audit, admin, reports, app versions, and feature flags.
- Cross-module side effects are triggered through internal domain events rather than direct module-to-module calls.
- The MVP event bus is in-process and synchronous enough for founder-operated launch simplicity.
- Redis, queues, or an outbox worker may be added later behind the same domain event contracts when operational load requires it.

## Internal Event Bus

The event bus lives in `backend/src/modules/internal-events/`.

Current event families:

- `auth.*` for OTP request/verification.
- `order.*` for placement and cancellation.
- `vendor.*` for order acceptance, rejection, preparation, and ready-for-pickup.
- `delivery.*` for rider assignment, pickup, and delivery.
- `payment.*` for collection and reconciliation.
- `support.*` for support ticket creation.
- `compliance.*` for privacy request workflows.

Every event includes:

- `id`
- `name`
- `payload`
- `occurredAt`
- `metadata.source`

## MVP Side-Effect Pattern

API controllers/services perform the primary state change, then publish a domain event. Event handlers are responsible for follow-up work such as:

- Push notifications.
- Audit logging.
- SLA checks.
- Admin dashboard refresh signals.
- Payment reconciliation alerts.
- Support/compliance queue updates.

Implemented MVP handler boundaries:

- `AuditEventHandler` records the audit-writing boundary for operational events.
- `NotificationEventHandler` records where FCM/in-app notification sending attaches.
- `OrderSlaEventHandler` tracks order lifecycle moments used by SLA monitoring.
- `ReconciliationEventHandler` tracks payment collection and reconciliation follow-up.

For MVP, handlers run in the same process. If QuickGO later needs background processing, the event bus can publish to an outbox table or queue without changing public APIs.
