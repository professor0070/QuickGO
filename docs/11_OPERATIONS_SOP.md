<!--
QuickGO Documentation Pack
Source of Truth: QuickGO PRD.md — FINAL LOCKED PRODUCTION MVP v1.2 — 15-Pass Build Freeze Approved
Generated: 2026-06-19
Role Order: Customer → Vendor/Shopkeeper → Rider → Admin/Founder → Backend/System
MVP Lock: Customer App + Partner App + Admin Web Panel + Backend API + Manual Dispatch + COD/UPI on Delivery + Payment Reconciliation + Compliance-Ready Vendor/Rider Onboarding + Support Workflow + Validation Dashboard
-->

# 11_OPERATIONS_SOP.md

**Document Status:** Production MVP Operations SOP  
**Purpose:** Daily founder/operator playbook for QuickGO market playground.

---

## 1. Operations Goal

QuickGO MVP succeeds only if real orders complete reliably:

> Customer orders → vendor accepts → admin assigns rider → rider delivers → payment reconciles → complaint handled → customer repeats.

Operations discipline is more important than advanced features in MVP.

---

## 2. Launch Model

Start with:

- One city
- One service zone, approx. 3 km
- 10–15 vendors
- 2–4 riders
- 50–200 beta customers
- COD/UPI on delivery
- Manual dispatch
- Daily founder audit

---

## 3. Daily Operations SOP

### 3.1 Morning Setup

Before accepting orders:

1. Check backend/admin app is working.
2. Check Customer App and Partner App login.
3. Confirm service zone active.
4. Confirm vendors are open/closed correctly.
5. Ask fresh vendors to update prices.
6. Verify stale fresh prices are blocked/updated.
7. Confirm riders available and online.
8. Check support phone/WhatsApp active.
9. Review pending payments from previous day.
10. Review unresolved support tickets.

### 3.2 Live Order Monitoring

During operating hours:

1. Watch new orders.
2. Ensure vendor accepts quickly.
3. Call vendor if no response.
4. Assign rider manually after vendor accepts/ready.
5. Monitor pickup and delivery status.
6. Track payment collection.
7. Handle stuck orders immediately.
8. Log issues in support/audit.

### 3.3 End-of-Day Closing

At day end:

1. Ensure all orders are completed/cancelled/resolved.
2. Reconcile COD/UPI collections.
3. Check short/over collections.
4. Generate vendor payable summary.
5. Generate rider payout summary.
6. Review complaints.
7. Review cancellations.
8. Record daily closing report.
9. Note operational learnings.
10. Prepare next day vendor/rider plan.

---

## 4. Vendor Onboarding SOP

Steps:

1. Visit/call vendor.
2. Explain QuickGO MVP model.
3. Collect owner name, phone, shop name, address.
4. Collect FSSAI details where applicable.
5. Agree commission percentage.
6. Collect UPI/bank/payout detail if needed.
7. Add top 10–20 products only.
8. Set opening hours.
9. Train vendor on Partner App.
10. Test new order alert.
11. Activate vendor only after compliance review.

Vendor training:

- Keep shop status updated.
- Accept/reject quickly.
- Update fresh prices daily.
- Mark ready only when packed.
- Do not substitute silently.
- Handle quality responsibly.

---

## 5. Rider Onboarding SOP

Steps:

1. Collect name and phone.
2. Verify local area familiarity.
3. Collect KYC/ID proof as per policy.
4. Record vehicle type.
5. Explain payout and collection rules.
6. Train on Partner App Rider Mode.
7. Train on pickup/drop status updates.
8. Train on COD/UPI collection.
9. Train on delivery proof/PIN if enabled.
10. Activate rider.

Rider rules:

- Do not mark picked before pickup.
- Do not mark delivered before delivery.
- Collect correct payment.
- Report issue immediately.
- Do not misuse customer phone/address.

---

## 6. Order Handling SOP

### 6.1 New Order

1. Admin sees order `PLACED`.
2. Vendor receives alert.
3. Vendor accepts or rejects.
4. If no vendor response, admin calls vendor.
5. If vendor rejects, customer notified and order cancelled.

### 6.2 Vendor Accepted

1. Vendor prepares/packs.
2. Admin watches readiness.
3. Admin assigns rider manually.

### 6.3 Rider Assignment

1. Choose available rider.
2. Assign in admin panel.
3. Rider receives notification.
4. Admin calls rider if needed.

### 6.4 Pickup and Delivery

1. Rider reaches vendor.
2. Rider marks picked up.
3. Rider reaches customer.
4. Rider collects payment if needed.
5. Rider marks delivered.
6. Rider marks payment collected.

### 6.5 Completion

1. Admin verifies collection.
2. Payment reconciled.
3. Order completed.

---

## 7. Fresh Category SOP

For vegetables/fruits/dairy:

1. Vendor updates price daily.
2. Admin checks stale prices.
3. Stale prices are blocked/refreshed.
4. If exact weight unavailable, vendor confirms fulfilled quantity.
5. If item unavailable, vendor/admin contacts customer for substitution/partial fulfilment.
6. No silent substitution.
7. Quality complaints are logged.

---

## 8. Payment Reconciliation SOP

### 8.1 Payment Collector Types

- Rider
- Vendor
- QuickGO Admin
- QuickGO QR

### 8.2 Reconciliation Steps

1. Check order amount due.
2. Check collector and amount collected.
3. Verify cash/UPI proof if needed.
4. Mark exact/short/over/disputed.
5. Update vendor payout.
6. Update rider payout/cash due.
7. Close daily report.

### 8.3 Short Collection

If amount short:

1. Mark `SHORT_COLLECTED`.
2. Ask rider/vendor/customer for clarification.
3. Adjust payout if required.
4. Record admin note.

### 8.4 Over Collection

If over collected:

1. Mark `OVER_COLLECTED`.
2. Decide refund/adjustment.
3. Record proof.

---

## 9. Support SOP

### 9.1 Ticket Creation

Tickets can come from:

- Customer app
- Rider report issue
- Vendor call
- Admin manual entry

### 9.2 Priority

| Priority | Example | Action |
|---|---|---|
| Critical | Food safety, payment fraud, rider/customer safety | Immediate |
| High | Live order stuck, missing item, wrong item | Same day |
| Medium | Late delivery complaint | Resolve soon |
| Low | General feedback | Normal queue |

### 9.3 SLA

- Acknowledge within 48 hours.
- Resolve within one month.
- Live order issues handled same day.

---

## 10. Incident SOP

Create incident report for:

- Food safety complaint
- Payment fraud/dispute
- False delivery
- Customer/rider safety issue
- App/backend outage
- Data/privacy issue
- Vendor repeated non-compliance

Incident steps:

1. Record incident.
2. Classify severity.
3. Pause affected vendor/rider/order if needed.
4. Preserve evidence.
5. Communicate to affected party.
6. Resolve and record action.
7. Review prevention.

---

## 11. Vendor Pause Rules

Pause vendor if:

- FSSAI/compliance expired or rejected
- Repeated order rejection
- Repeated stale prices
- Serious food safety complaint
- Fraud/misleading listing
- Bad quality complaints repeated

---

## 12. Rider Pause Rules

Pause rider if:

- False delivery
- Payment shortfall unexplained
- Repeated late delivery
- Misconduct complaint
- Customer/vendor harassment
- App misuse

---

## 13. First 100 Orders Rule

For first 100 orders:

- Founder/admin manually monitors every order.
- Call vendor for slow response.
- Call rider for slow movement.
- Verify payment collection.
- Record every issue.
- Avoid scaling marketing until operations stable.

---

## 14. Validation Metrics SOP

Track daily:

- Total orders
- Successful orders
- Cancelled orders
- Repeat customers
- Vendor acceptance rate
- Vendor response time
- Rider assignment time
- Average delivery time
- Payment pending
- Refund/adjustment
- Complaints
- Net margin per order

Success signal:

- 100+ successful orders
- 30%+ repeat customers
- 70%+ vendor acceptance rate
- Average delivery under 90 minutes
- Cancellation under 15%
- Price mismatch under 5%
- Break-even or near break-even delivery economics

---

## 15. Pause/Kill Conditions

Pause marketing if:

- Orders frequently stuck
- Payment reconciliation failing
- Vendor acceptance low
- Rider availability insufficient
- Complaints high
- Food safety issue unresolved
- App crash rate high

Do not expand city/category until stable.

---

## 16. Weekly Review SOP

Every week review:

- Vendor performance
- Rider performance
- Category demand
- Delivery economics
- Support issues
- Repeat customers
- Product pricing issues
- App bugs
- Compliance pending list

Decide:

- Continue same scope
- Improve operations
- Add vendors
- Add riders
- Pause weak vendors
- Fix app/backend issues

---

## 17. Final Operations Lock

QuickGO MVP operations must remain controlled. Do not chase expansion, train food, agri exchange, subscription, or live tracking until the first city order loop is proven.
