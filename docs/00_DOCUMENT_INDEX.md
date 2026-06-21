<!--
QuickGO Documentation Pack
Source of Truth: QuickGO PRD.md — FINAL LOCKED PRODUCTION MVP v1.2 — 15-Pass Build Freeze Approved
Generated: 2026-06-19
Role Order: Customer → Vendor/Shopkeeper → Rider → Admin/Founder → Backend/System
MVP Lock: Customer App + Partner App + Admin Web Panel + Backend API + Manual Dispatch + COD/UPI on Delivery + Payment Reconciliation + Compliance-Ready Vendor/Rider Onboarding + Support Workflow + Validation Dashboard
-->

# QuickGO Document Index

**Status:** FINAL LOCKED PRODUCTION MVP DOCUMENT PACK  
**Use this file first.** It defines the reading order and scope lock for every document in this pack.

---

## 1. Locked Source of Truth

All documents in this pack are derived from:

> `PRD.md — FINAL LOCKED PRODUCTION MVP v1.2 — 15-Pass Build Freeze Approved`

This pack must not override the locked PRD. If any conflict appears, follow the PRD first and raise a change request.

---

## 2. Required Reading Order

Read and implement in this sequence:

1. `PRD.md` — final product scope and build lock
2. `02_LEGAL_COMPLIANCE_CHECKLIST.md` — launch/legal gates
3. `03_DATABASE_SCHEMA.md` — database model and persistence rules
4. `04_SYSTEM_DESIGN.md` — architecture and non-functional requirements
5. `05_API_SPEC.md` — backend API contract
6. `06_ADMIN_PANEL_PRD.md` — admin/operator product requirements
7. `07_CUSTOMER_APP_PRD.md` — customer Android app requirements
8. `08_PARTNER_APP_PRD.md` — vendor/rider partner app requirements
9. `09_TEST_CASES.md` — QA test plan and acceptance tests
10. `10_DEPLOYMENT_GUIDE.md` — deployment, environment, release, rollback
11. `11_OPERATIONS_SOP.md` — daily operations, support, reconciliation, incidents

---

## 3. Final MVP Scope Lock

Build only:

- QuickGO Customer App
- QuickGO Partner App with Vendor Mode and Rider Mode
- QuickGO Admin Web Panel
- Backend API
- PostgreSQL database
- Firebase push notifications
- Cloud image storage
- Manual dispatch
- COD / UPI on delivery
- Payment reconciliation
- Vendor/rider onboarding
- Support workflow
- Validation dashboard

---

## 4. Explicitly Blocked From MVP

Do not build in this production MVP:

- Railway/train food ordering
- Railway/train food waitlist/lead form/card
- PNR, train number, coach, seat, berth, platform, journey-date fields
- Agri exchange
- QuickGO Delivery OS
- iOS public launch
- Separate vendor app and separate rider app
- Subscription
- Live rider tracking
- Auto-dispatch algorithm
- Wallet
- Loyalty/referral
- Multi-vendor cart
- Dark store / warehouse inventory
- Full kirana system
- AI recommendations

---

## 5. Change Control

Any new requirement must be classified:

| Priority | Meaning | MVP Entry Rule |
|---|---|---|
| P0 | Required for order placement, acceptance, delivery, reconciliation, security, or legal safety | Allowed |
| P1 | Required for launch reliability or support | Allowed only if not delaying core launch |
| P2 | Useful but not required | Blocked until after MVP |
| Future | Future roadmap | Blocked |

No developer, AI IDE, or team member should add Future features without a separate PRD.

---

## 6. Cross-Document Consistency Rules

Every file must preserve:

- Role order: Customer → Vendor → Rider → Admin → Backend/System
- Payment model: COD/UPI on delivery only
- Dispatch model: Manual dispatch only
- App model: Customer App + Partner App, not three separate apps
- Launch model: One city, one service zone, controlled market playground
- Compliance boundary: CA/lawyer review required before full commercial public launch

---

## Final Perfect Cross-Document Alignment Lock v1.9

This document was comprehensively rechecked against `PRD.md — FINAL LOCKED PRODUCTION MVP v1.2 — 15-Pass Build Freeze Approved`. It must remain aligned with the locked Production MVP scope.

### Source-of-Truth Rule

If this document conflicts with `PRD.md`, the PRD wins and this document must be corrected before development continues.

### Locked MVP Scope

This document supports only:

- Customer App
- Partner App with Vendor Mode and Rider Mode
- Admin Web Panel
- Backend API
- Manual Dispatch
- COD / UPI on Delivery
- Payment Reconciliation
- Compliance-ready Vendor/Rider Onboarding
- Support Workflow
- Validation Dashboard

### Blocked From MVP

This document must not create, imply, or prepare hidden implementation paths for:

- Railway/train food ordering, waitlist, lead form, PNR, train number, coach, seat, berth, platform delivery, or journey-date fields
- Agri exchange
- QuickGO Delivery OS
- Subscription
- Live tracking
- Auto-dispatch
- Wallet
- Referral or loyalty system
- Dark store or warehouse management
- Full kirana module
- Online payment gateway production flow
- iOS public launch
- Separate Vendor App
- Separate Rider App
- AI recommendation

### Cross-Document Workflow Lock

All workflows must remain traceable across PRD → system design → database schema → API spec → app/admin PRDs → test cases → deployment guide → operations SOP.

### Payment/Reconciliation Lock

Payment handling must remain COD/UPI on delivery only in MVP and must preserve `collector_type`, `collector_id`, `amount_collected`, payment status, reconciliation status, vendor payout, and rider payout records.

### Final Status

Status: **Aligned and locked for QuickGO Production MVP document pack v1.6.**

