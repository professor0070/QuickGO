<!--
QuickGO Documentation Pack
Source of Truth: QuickGO PRD.md — FINAL LOCKED PRODUCTION MVP v1.2 — 15-Pass Build Freeze Approved
Generated: 2026-06-19
Role Order: Customer → Vendor/Shopkeeper → Rider → Admin/Founder → Backend/System
MVP Lock: Customer App + Partner App + Admin Web Panel + Backend API + Manual Dispatch + COD/UPI on Delivery + Payment Reconciliation + Compliance-Ready Vendor/Rider Onboarding + Support Workflow + Validation Dashboard
-->

# 10_DEPLOYMENT_GUIDE.md

**Document Status:** Production MVP Deployment Guide  
**Scope:** Backend API, Admin Web Panel, Customer App, Partner App, database, storage, push notifications.

---

## 1. Deployment Principle

QuickGO MVP must use simple, maintainable deployment:

- One backend service
- One PostgreSQL database
- One admin web panel
- Two Android apps
- Firebase push notifications
- Cloud image/document storage

Do not overengineer with microservices or Kubernetes in MVP.

---

## 2. Environments

Required environments:

1. Local
2. Staging
3. Production

Rules:

- Never test risky changes directly in production.
- Staging must use separate database and Firebase project if possible.
- Production secrets must never be committed.

---

## 3. Recommended Hosting

| Component | MVP Hosting |
|---|---|
| Backend API | Render/Fly.io/similar managed PaaS |
| PostgreSQL | Managed PostgreSQL |
| Admin Panel | Vercel |
| Images/docs | Cloudinary or S3-compatible storage |
| Push | Firebase Cloud Messaging |
| Error logging | Sentry/Firebase Crashlytics if possible |

---

## 4. Repository Structure

```txt
quickgo/
  PRD.md
  docs/
    00_DOCUMENT_INDEX.md
    02_LEGAL_COMPLIANCE_CHECKLIST.md
    03_DATABASE_SCHEMA.md
    04_SYSTEM_DESIGN.md
    05_API_SPEC.md
    06_ADMIN_PANEL_PRD.md
    07_CUSTOMER_APP_PRD.md
    08_PARTNER_APP_PRD.md
    09_TEST_CASES.md
    10_DEPLOYMENT_GUIDE.md
    11_OPERATIONS_SOP.md
  backend/
  mobile/
    customer_app/
    partner_app/
    packages/
  web/
    admin_panel/
```

---

## 5. Backend Deployment

### 5.1 Backend Requirements

- Node.js LTS
- NestJS app
- PostgreSQL connection
- Prisma migrations
- Environment variables
- CORS configured
- Rate limiting enabled
- Logging enabled

### 5.2 Environment Variables

```env
NODE_ENV=production
PORT=3000
APP_VERSION=0.1.0
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
OTP_PROVIDER=mock
MOCK_OTP_CODE=...
FCM_SERVER_KEY_OR_SERVICE_ACCOUNT=...
CLOUD_STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
ADMIN_APP_URL=https://admin.quickgo.example
CUSTOMER_APP_DEEPLINK=quickgo://
FRESH_PRICE_MAX_AGE_HOURS=24
ORDER_CREATION_ENABLED=true
COD_ON_DELIVERY_ENABLED=true
UPI_ON_DELIVERY_ENABLED=true
CUSTOMER_APP_FORCE_UPDATE=false
PARTNER_APP_FORCE_UPDATE=false
SUPPORT_INTAKE_ENABLED=true
SERVICE_ZONE_LOCK_ENABLED=true
MAINTENANCE_MODE=false
VENDOR_ORDER_ACCEPTANCE_ENABLED=true
RIDER_ASSIGNMENT_ENABLED=true
PAYMENT_RECONCILIATION_ENABLED=true
```

Deployment hardening rules:

- `NODE_ENV=staging` and `NODE_ENV=production` fail startup when database, JWT, Cloudinary, FCM, or admin-origin settings are missing.
- JWT secrets must not use local placeholders and must be at least 32 characters in deployed environments.
- `OTP_PROVIDER=mock` is the only enabled OTP mode for the controlled MVP baseline. Non-mock SMS provider modes fail closed until a real SMS vendor, legal/commercial approval, credentials, and gateway adapter are added.
- Runtime flags are backend-owned; mobile apps and admin panel must read system endpoints instead of hardcoding serviceability or operations state.

### 5.3 Deployment Steps

1. Push backend code to GitHub.
2. Create backend service on hosting provider.
3. Add environment variables.
4. Connect managed PostgreSQL.
5. Run migrations.
6. Seed roles, admin, categories, feature flags.
7. Deploy staging.
8. Run smoke tests.
9. Deploy production.

### 5.4 Migration Rule

Before production migration:

- Backup database.
- Review migration SQL.
- Test migration on staging.
- Apply during low-traffic period.
- Verify app after migration.

---

## 6. Database Deployment

Required:

- Managed PostgreSQL
- Daily backups
- Restricted access
- SSL connection
- Migration history

Initial seed:

- Roles
- Super admin
- Service zone
- Categories
- Feature flags
- Legal document placeholders

Backup:

- Daily automated backup
- Manual pre-release backup
- Restore test before public launch

---

## 7. Admin Panel Deployment

### 7.1 Environment Variables

```env
NEXT_PUBLIC_API_BASE_URL=https://api.quickgo.example/api/v1
NEXT_PUBLIC_APP_ENV=production
ADMIN_SESSION_TIMEOUT_MINUTES=30
```

### 7.2 Deploy Steps

1. Connect admin repo/folder to Vercel.
2. Add environment variables.
3. Deploy staging preview.
4. Test admin login.
5. Test orders/vendors/riders/payments/support.
6. Promote to production.

---

## 8. Firebase Setup

Projects:

- Staging Firebase project
- Production Firebase project

Required:

- Android app registered for Customer App
- Android app registered for Partner App
- FCM configured
- Service account stored securely in backend
- Crashlytics optional but recommended

Test:

- Customer receives order status push
- Vendor receives new order push
- Rider receives assignment push

---

## 9. Cloud Storage Setup

Storage for:

- Product images
- Vendor compliance docs
- Rider KYC docs
- Support proof images later
- Delivery proof images later

Rules:

- Public product images allowed.
- Compliance/KYC documents must be protected/private.
- Use signed URLs or backend-proxy access for private files.

---

## 10. Mobile Build and Release

### 10.1 Customer App

Build:

```bash
flutter build apk --release
flutter build appbundle --release
```

### 10.2 Partner App

Build similarly.

### 10.3 Android Release Gate

Before Play Store production:

- App icon/name ready
- Privacy policy URL
- Data safety form
- Closed testing plan
- 12 testers / 14 continuous days may be required for new personal developer accounts
- Crash-free smoke test

---

## 11. Production Go-Live Gate

Do not go live until:

- Backend production deployed
- Admin production deployed
- Database backup enabled
- Super admin login verified
- Service zone active
- Vendors onboarded and active
- Riders onboarded and active
- Products approved
- FSSAI/compliance status reviewed
- Customer app tested on real phone
- Partner app tested on real phone
- Push notifications tested
- Payment collection/reconciliation tested
- Support workflow tested
- Daily closing report tested
- Feature flags confirm blocked features off

---

## 12. Rollback Plan

If production release fails:

1. Disable new orders if needed.
2. Keep existing order operations running manually.
3. Roll back backend to previous stable version.
4. Roll back admin panel deployment.
5. Force app update only if critical.
6. Export affected orders/payment records.
7. Create incident report.
8. Communicate to vendors/riders/customers if needed.

---

## 13. Incident Severity

| Severity | Example | Action |
|---|---|---|
| SEV-0 | Payment/order data loss, security breach | Stop new orders, immediate fix |
| SEV-1 | Order flow broken | Pause launch/rollback |
| SEV-2 | Vendor/rider issue with workaround | Fix same day |
| SEV-3 | Minor UI/reporting issue | Fix in next patch |

---

## 14. Monitoring Checklist

Monitor:

- API errors
- App crashes
- OTP failures
- Push notification failures
- Database errors
- Stuck orders
- Payment pending orders
- Support ticket volume
- Vendor response time
- Rider assignment time

---

## 15. Production Smoke Test

After deployment:

1. Admin login
2. Customer login
3. Partner login as vendor
4. Partner login as rider
5. Browse products
6. Place test order
7. Vendor accept
8. Admin assign rider
9. Rider deliver
10. Payment collected
11. Admin reconcile
12. Daily report updates
13. Audit log exists

---

## 16. Final Deployment Lock

Deployment must support the locked MVP only. Do not deploy hidden routes or flags for train food, auto-dispatch, wallet, subscription, or live tracking.
