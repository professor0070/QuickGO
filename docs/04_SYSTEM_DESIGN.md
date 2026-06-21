<!--
QuickGO Documentation Pack
Source of Truth: QuickGO PRD.md — FINAL LOCKED PRODUCTION MVP v1.2 — 15-Pass Build Freeze Approved
Generated: 2026-06-19
Role Order: Customer → Vendor/Shopkeeper → Rider → Admin/Founder → Backend/System
MVP Lock: Customer App + Partner App + Admin Web Panel + Backend API + Manual Dispatch + COD/UPI on Delivery + Payment Reconciliation + Compliance-Ready Vendor/Rider Onboarding + Support Workflow + Validation Dashboard
-->

# 04_SYSTEM_DESIGN.md

**Document Status:** Production MVP System Design  
**Architecture Decision:** Modular monolith backend + two Flutter apps + one admin web panel.  
**Scale Target:** Smooth MVP in one city with a design path toward 1M users later, without overengineering day one.

---

## 1. Design Goals

QuickGO system must safely run a controlled market playground:

- One city first
- One service zone first
- Manual dispatch
- COD/UPI on delivery
- Vendor/rider onboarding
- Payment reconciliation
- Support workflow
- Validation dashboard
- Low maintenance for solo founder
- Usable on low-end Android phones and slow networks

---

## 2. Architecture Overview

```txt
Customer App (Flutter)
        ↓
Backend API (NestJS Modular Monolith)
        ↓
PostgreSQL + Cloud Storage + Firebase FCM
        ↑
Partner App (Flutter: Vendor Mode + Rider Mode)
        ↑
Admin Web Panel (Next.js)
```

### 2.1 Application Components

| Component | Technology | Purpose |
|---|---|---|
| Customer App | Flutter | Customer order flow |
| Partner App | Flutter | Vendor Mode + Rider Mode |
| Admin Web Panel | Next.js + Tailwind | Operations control room |
| Backend API | NestJS/Node.js | Business logic |
| Database | PostgreSQL | Source of truth |
| ORM | Prisma | Type-safe data layer |
| Push | Firebase Cloud Messaging | Order alerts |
| Storage | Cloudinary/S3-compatible | Product images/docs |
| Cache/Queue | Redis later | Not required day one unless needed |

---

## 3. Why Modular Monolith

Use modular monolith first because:

- Solo founder can maintain it.
- Deployment is simpler.
- Database transactions are easier.
- Manual operations need speed, not microservice complexity.
- Future extraction is possible after product-market proof.

Modules should be cleanly separated so future services can be extracted.

---

## 4. Backend Module Structure

```txt
backend/src/
  app.module.ts
  common/
    guards/
    decorators/
    filters/
    interceptors/
    validators/
  config/
  auth/
  users/
  customers/
  vendors/
  riders/
  service-zones/
  categories/
  products/
  carts/
  orders/
  delivery/
  payments/
  reconciliation/
  settlements/
  notifications/
  support/
  compliance/
  audit/
  admin/
  reports/
  app-versions/
  feature-flags/
```

---

## 5. Mobile App Structure

```txt
mobile/
  customer_app/
  partner_app/
  packages/
    shared_ui/
    shared_models/
    shared_api/
    shared_auth/
    shared_notifications/
```

### 5.1 Customer App

Core screens:

- Splash/update check
- OTP login
- Address selection
- Serviceability result
- Home/categories
- Vendor list
- Product list
- Cart
- Order confirmation
- Order tracking/status
- Support ticket

### 5.2 Partner App

Common screens:

- Splash/update check
- OTP login
- Role detection
- Profile
- Notifications

Vendor Mode:

- Shop status
- New orders
- Preparing/packing
- Ready for pickup
- Products/availability
- Earnings estimate

Rider Mode:

- Online/offline
- Assigned orders
- Pickup/drop details
- Call buttons
- Picked/delivered
- Payment collected
- Issue report

---

## 6. Admin Web Panel Structure

```txt
admin_panel/
  dashboard/
  orders/
  vendors/
  riders/
  products/
  payments/
  reconciliation/
  settlements/
  support/
  compliance/
  reports/
  audit-logs/
  settings/
```

Admin panel is the MVP control tower. It must be stable before public beta.

---

## 7. Core Order Flow

```txt
1. Customer places order
2. Backend validates service zone, vendor status, product availability, price freshness
3. Backend creates immutable order snapshots
4. Vendor receives push + in-app alert
5. Vendor accepts/rejects
6. Admin manually assigns rider
7. Rider receives assigned order
8. Rider picks up
9. Rider delivers
10. Rider/vendor/admin records payment collection
11. Admin/system reconciles payment
12. Order becomes completed
13. Metrics update
```

---

## 8. Order State Machine

Allowed success path:

```txt
PLACED
→ VENDOR_ACCEPTED
→ PREPARING_OR_PACKING
→ READY_FOR_PICKUP
→ RIDER_ASSIGNED
→ PICKED_UP
→ DELIVERED
→ PAYMENT_COLLECTED
→ COMPLETED
```

Failure states:

```txt
CUSTOMER_CANCELLED
VENDOR_REJECTED
ADMIN_CANCELLED
RIDER_FAILED
PAYMENT_PENDING
REFUND_PENDING
REFUNDED
```

State transition rules:

- Customer can cancel only before vendor acceptance.
- Vendor can reject only before acceptance.
- Admin can cancel with reason.
- Rider cannot self-assign order.
- Rider can update only assigned orders.
- Payment collection must be confirmed before completed.

---

## 9. Payment and Reconciliation Design

MVP payment methods:

- COD
- UPI on delivery

Collector types:

- Rider
- Vendor
- QuickGO Admin
- QuickGO QR

Flow:

```txt
Order total generated
↓
Customer pays on delivery
↓
Collector records collection
↓
Admin verifies/reconciles
↓
Vendor/rider payout calculated
↓
Daily closing report generated
```

System must record:

- amount due
- amount collected
- collector type
- collector ID
- payment method
- reference/proof
- short/over amount
- reconciliation status
- payout status

No full online payment gateway in MVP unless CA/legal review approves.

---

## 10. Fresh Category Design

Fresh vegetables/fruits/dairy need special rules:

- Daily price update required.
- Price last updated time visible.
- Stale price blocks ordering or shows admin/vendor confirmation requirement.
- Variable weight requires final fulfilled quantity.
- Substitution needs customer/admin confirmation.
- Partial fulfilment must be recorded.
- Quality complaint can trigger support ticket and vendor review.

---

## 11. Serviceability Design

MVP supports:

- One city
- One active service zone
- Approx. 3 km operating radius
- Admin-managed zone activation

Flow:

```txt
Customer chooses address
↓
Backend checks service zone
↓
If inside zone: show vendors
If outside zone: show Coming Soon
```

No unsupported area orders should be accepted.

---

## 12. Notification Design

Required push notifications:

- New order to vendor
- Vendor accepted/rejected to customer
- Rider assigned to customer
- New delivery assigned to rider
- Picked up to customer
- Delivered to customer/admin
- Payment pending to admin

Vendor new-order alert must include:

- Push notification
- In-app alert
- Sound/vibration
- Auto-refresh order list

Fallback: Admin call/WhatsApp if vendor does not respond.

---

## 13. Auth and Security Design

Authentication:

- OTP/mobile login
- JWT/session tokens
- Refresh strategy
- Device session logging

Authorization:

- RBAC required
- Role detection in Partner App
- Vendor can access only own orders/products
- Rider can access only assigned orders
- Customer can access only own orders
- Admin access segmented by ADMIN/SUPPORT/SUPER_ADMIN

Security controls:

- Rate limiting
- Input validation
- Idempotency keys for order creation and sensitive updates
- PII masking
- Secure file storage
- Environment variables
- No hardcoded secrets
- Admin session timeout
- Audit logs

---

## 14. Non-Functional Requirements

### 14.1 Performance

MVP target:

- App launch usable on low-end Android devices.
- Main list screens load within acceptable time on 4G/slow networks.
- Product images compressed.
- Pagination used for orders/products.
- Admin dashboard should not load all records at once.

### 14.2 Reliability

- Order creation must be transactional.
- Duplicate order creation must be prevented.
- Payment collection updates must be auditable.
- Notifications can fail but order should remain visible in app.
- Admin can manually recover stuck orders.

### 14.3 Slow Network

- Show loading states.
- Show retry buttons.
- Do not silently create offline orders.
- Failed order creation must clearly fail.
- Partner app should refresh status safely.

### 14.4 Maintainability

- Modular backend modules.
- Shared Flutter packages for auth/API/models/UI.
- Consistent DTO validation.
- Single source of role/status constants.
- Feature flags for blocked modules.

---

## 15. Scalability Path

### MVP

- One backend service
- One database
- Manual dispatch
- One city

### Growth Phase

- Add Redis for caching/queues
- Add background jobs
- Add read replicas if needed
- Add CDN/image optimization
- Improve analytics
- Add auto-dispatch only after manual data is strong

### Scale Phase

- Multi-city service zones
- Event-driven modules
- Microservices only if team/traffic justify

---

## 16. Observability

Required from MVP:

- Backend error logging
- Admin audit logs
- Order status history
- Payment reconciliation logs
- App crash reporting
- Daily closing reports
- Incident reports

Recommended tools:

- Sentry or similar error tracking
- Render/Fly logs initially
- PostgreSQL monitoring
- Firebase crash reporting for mobile if possible

---

## 17. Deployment Architecture

Initial staging/prod:

```txt
Vercel: Admin Panel
Render/Fly.io: Backend API
Managed PostgreSQL: Database
Cloudinary/S3: Images/docs
Firebase: Push notifications
```

Environment separation:

- Local
- Staging
- Production

No direct production DB changes without migration review.

---

## 18. Backup and Recovery

Minimum:

- Daily database backup
- Pre-release backup
- Backup restore test before public launch
- Export daily order/reconciliation report

Recovery targets for MVP:

- Restore within same day if small beta
- No unrecoverable order/payment loss

---

## 19. Feature Flags

MVP-safe operational flags only:

```txt
ORDER_CREATION_ENABLED=true
COD_ON_DELIVERY_ENABLED=true
UPI_ON_DELIVERY_ENABLED=true
CUSTOMER_APP_FORCE_UPDATE=false
PARTNER_APP_FORCE_UPDATE=false
SUPPORT_INTAKE_ENABLED=true
SERVICE_ZONE_LOCK_ENABLED=true
MAINTENANCE_MODE=false
```

Blocked future modules must not be represented as hidden feature flags, disabled modules, placeholder toggles, or inactive database/code paths in the MVP. Do not add train-food, PNR, auto-dispatch, live tracking, online payment gateway, wallet, subscription, referral, kirana, agri, warehouse, dark-store, or QuickGO Delivery OS flags until a future PRD explicitly unlocks them.

---

## 20. Final System Design Lock

This system design is production-MVP ready. Build only the locked market playground scope. Do not add microservices, live tracking, online payment, train food, agri, subscription, or auto-dispatch until a future PRD approves it.
