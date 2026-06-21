<!--
QuickGO Documentation Pack
Source of Truth: QuickGO PRD.md — FINAL LOCKED PRODUCTION MVP v1.2 — 15-Pass Build Freeze Approved
Generated: 2026-06-19
Role Order: Customer → Vendor/Shopkeeper → Rider → Admin/Founder → Backend/System
MVP Lock: Customer App + Partner App + Admin Web Panel + Backend API + Manual Dispatch + COD/UPI on Delivery + Payment Reconciliation + Compliance-Ready Vendor/Rider Onboarding + Support Workflow + Validation Dashboard
-->

# 06_ADMIN_PANEL_PRD.md

**Document Status:** Production MVP Admin Panel PRD  
**Platform:** Web  
**Technology:** Next.js + Tailwind CSS recommended  
**Purpose:** Control tower for QuickGO market playground.

---

## 1. Admin Panel Goal

The Admin Web Panel allows founder/operator to control the complete MVP loop:

> vendor onboarding → product setup → order monitoring → manual rider assignment → payment reconciliation → support handling → compliance tracking → validation dashboard.

Admin panel is more important than advanced customer features in MVP because manual operations will decide whether the market works.

---

## 2. Admin Roles

| Role | Responsibility |
|---|---|
| SUPER_ADMIN | Full access, role management, settings |
| ADMIN | Operations, vendor/rider/product/order/payment/support |
| SUPPORT | Support tickets and limited order view |

---

## 3. Admin Navigation

Required menu:

1. Dashboard
2. Orders
3. Vendors
4. Products
5. Riders
6. Payments & Reconciliation
7. Settlements/Payouts
8. Support Tickets
9. Compliance
10. Service Zones
11. Reports
12. Audit Logs
13. Settings

Do not add train food, agri, subscription, wallet, or live tracking menu.

---

## 4. Dashboard Requirements

Dashboard cards:

- Today orders
- Pending vendor acceptance
- Orders ready for pickup
- Unassigned orders
- Active riders
- Open support tickets
- Payment pending
- Today delivery fee collected
- Today vendor commission
- Today rider payout estimate
- Cancellation count
- Average delivery time

Alert widgets:

- Stuck orders
- Vendor not responding
- Rider not assigned
- Payment not reconciled
- FSSAI expired/pending vendors
- High-priority complaints

---

## 5. Orders Module

### 5.1 Order List

Columns:

- Order number
- Customer
- Vendor
- Rider
- Status
- Payment status
- Total amount
- Created time
- SLA status
- Action

Filters:

- Status
- Vendor
- Rider
- Payment status
- Date range
- Service zone

### 5.2 Order Detail

Show:

- Order timeline
- Customer snapshot
- Vendor snapshot
- Delivery address snapshot
- Items snapshot
- Payment summary
- Collection records
- Rider assignment
- Support tickets
- Audit history

### 5.3 Admin Actions

- Assign rider
- Reassign rider
- Cancel order with reason
- Mark payment collected/reconciled
- Add internal note
- Create support ticket
- Force status only with reason and audit log

---

## 6. Vendor Management Module

### 6.1 Vendor List

Columns:

- Shop name
- Category
- Owner phone
- City/zone
- Open/closed
- Status
- FSSAI status
- Commission
- Today orders

### 6.2 Create Vendor

Fields:

- Shop name
- Owner name
- Owner phone
- Category
- Address
- Service zone
- Location pin
- Commission percentage
- Opening hours
- FSSAI number/document
- UPI/bank detail optional

### 6.3 Vendor Actions

- Approve
- Pause
- Activate
- Edit profile
- Upload compliance document
- Add product/menu
- View orders
- View settlement

### 6.4 Vendor Compliance Warning

Admin must see warnings for:

- FSSAI missing
- FSSAI expired
- Compliance rejected
- High complaints
- Frequent rejects

---

## 7. Product Management Module

### 7.1 Product List

Columns:

- Product name
- Vendor
- Category
- Unit
- Current price
- Price last updated
- Availability
- Approval status

### 7.2 Product Create/Edit

Fields:

- Name
- Description
- Category
- Unit
- Price
- Image
- Stock managed flag
- Availability
- Approval status

### 7.3 Fresh Price Control

For vegetables/fruits/dairy:

- Show price last updated time
- Flag stale prices
- Allow admin price update
- Keep price history

---

## 8. Rider Management Module

### 8.1 Rider List

Columns:

- Rider name
- Phone
- Zone
- Online/offline
- Status
- Assigned orders
- Today deliveries
- Payout estimate

### 8.2 Create Rider

Fields:

- Name
- Phone
- Address/area
- Vehicle type
- Vehicle number optional
- KYC documents
- UPI/bank detail
- Service zone

### 8.3 Rider Actions

- Approve
- Pause
- Activate
- Assign order
- View delivery history
- View payout
- Add note

---

## 9. Manual Dispatch Module

Manual dispatch can be inside Orders or separate screen.

Dispatch screen shows:

- Orders needing rider
- Available/online riders
- Rider current load
- Vendor pickup area
- Customer drop area
- Assign button

Rules:

- Admin assigns rider manually.
- Rider cannot self-assign.
- Reassignment requires reason.
- Assignment creates audit log.

---

## 10. Payments & Reconciliation Module

### 10.1 Pending Reconciliation List

Columns:

- Order number
- Amount due
- Amount collected
- Collector type
- Collector name
- Method
- Short/over amount
- Status

### 10.2 Collection Detail

Show:

- Payment method
- Collection proof/reference
- Rider/vendor/admin collector
- Customer amount due
- Amount collected
- Short/over difference
- Notes

### 10.3 Actions

- Confirm collection
- Mark short collected
- Mark over collected
- Mark disputed
- Add proof/reference
- Reconcile

---

## 11. Settlements/Payouts Module

Vendor settlement:

- Completed orders
- Gross item value
- Commission deducted
- Adjustments/refunds
- Payable amount

Rider settlement:

- Completed deliveries
- Payout per delivery
- Cash collected
- Cash due to QuickGO
- Net payout/collection due

Actions:

- Generate draft
- Approve
- Mark paid
- Mark disputed
- Export CSV

---

## 12. Support Tickets Module

Ticket list columns:

- Ticket number
- Order number
- Customer/vendor/rider
- Category
- Priority
- Status
- Created time
- SLA

Actions:

- Acknowledge
- Assign
- Add event/note
- Resolve
- Close
- Link order
- Mark food safety incident

SLA:

- acknowledge within 48 hours
- redress within one month
- live order critical issues handled same day

---

## 13. Compliance Module

Vendor compliance:

- FSSAI number
- Certificate upload
- Validity
- Status
- Verification notes

Rider compliance:

- KYC docs
- ID proof
- vehicle/license docs where applicable

Actions:

- Verify
- Reject
- Mark expired
- Pause vendor/rider

---

## 14. Service Zones Module

Fields:

- Zone name
- City
- State
- Center latitude/longitude
- Radius km
- Active/inactive
- Operating hours

Rule:

- Only active zones accept orders.
- MVP should start with one active zone.

---

## 15. Reports Module

Reports required:

- Daily closing report
- Validation dashboard
- Orders export
- Payments export
- Vendor performance
- Rider performance
- Support report
- Cancellation report
- Price mismatch report

---

## 16. Audit Logs Module

Show:

- Actor
- Role
- Action
- Entity
- Old value
- New value
- Timestamp
- IP/device info if available

Filter by:

- Actor
- Entity type
- Date range
- Action type

---

## 17. Settings Module

Settings:

- Delivery fee
- Commission defaults
- App version minimum
- Feature flags
- Support contact
- Legal document versions

Feature flags must keep blocked features off.

---

## 18. Admin Acceptance Criteria

Admin panel passes MVP if:

- Admin can onboard vendor and rider.
- Admin can approve products.
- Admin can see all live orders.
- Admin can assign/reassign rider manually.
- Admin can cancel with reason.
- Admin can mark payment collection and reconcile.
- Admin can generate daily closing report.
- Admin can manage support tickets.
- Admin can verify compliance documents.
- Audit logs are created for sensitive actions.

---

## 19. Final Admin Panel Lock

Admin panel must support operations, not fancy analytics. Any advanced analytics, auto-dispatch, live map, train food, subscription, or wallet screen is blocked from MVP.
