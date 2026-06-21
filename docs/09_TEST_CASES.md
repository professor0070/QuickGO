<!--
QuickGO Documentation Pack
Source of Truth: QuickGO PRD.md — FINAL LOCKED PRODUCTION MVP v1.2 — 15-Pass Build Freeze Approved
Generated: 2026-06-19
Role Order: Customer → Vendor/Shopkeeper → Rider → Admin/Founder → Backend/System
MVP Lock: Customer App + Partner App + Admin Web Panel + Backend API + Manual Dispatch + COD/UPI on Delivery + Payment Reconciliation + Compliance-Ready Vendor/Rider Onboarding + Support Workflow + Validation Dashboard
-->

# 09_TEST_CASES.md

**Document Status:** Production MVP QA and Test Cases  
**Goal:** Verify QuickGO can safely process real market playground orders.

---

## 1. Testing Strategy

Test in layers:

1. Unit tests
2. API tests
3. Integration tests
4. Mobile app manual tests
5. Admin panel tests
6. End-to-end order flow tests
7. Payment reconciliation tests
8. Security/permission tests
9. Slow-network tests
10. Production release smoke tests

---

## 2. Severity Levels

| Severity | Meaning | Release Rule |
|---|---|---|
| S0 | Data loss, payment loss, security breach, order impossible | Block release |
| S1 | Core order/vendor/rider/admin flow broken | Block release |
| S2 | Major feature issue with workaround | Fix before public launch |
| S3 | Minor UI/edge issue | Can fix after launch |

---

## 3. P0 End-to-End Tests

### TC-E2E-001: Successful COD Order

Steps:

1. Customer logs in.
2. Adds serviceable address.
3. Selects vendor/product.
4. Adds item to cart.
5. Places COD order.
6. Vendor accepts.
7. Admin assigns rider.
8. Rider marks picked up.
9. Rider marks delivered.
10. Rider records cash collected.
11. Admin reconciles payment.
12. Order completes.

Expected:

- Correct statuses at each step.
- Customer, vendor, rider, admin all see correct data.
- Payment reconciled.
- Order snapshot remains unchanged.

### TC-E2E-002: Successful UPI on Delivery Order

Same as above, but payment method UPI on delivery and collection reference recorded.

---

## 4. Customer App Test Cases

| ID | Test | Expected |
|---|---|---|
| TC-CUST-001 | OTP login with valid phone | Login success |
| TC-CUST-002 | Invalid OTP | Error shown |
| TC-CUST-003 | Add address inside service zone | Address saved, serviceable |
| TC-CUST-004 | Add address outside zone | Service unavailable |
| TC-CUST-005 | Browse categories | Four MVP categories shown only |
| TC-CUST-006 | No Train Food card | Train Food not visible |
| TC-CUST-007 | Add product to cart | Item added |
| TC-CUST-008 | Add product from different vendor | Single-vendor cart rule enforced |
| TC-CUST-009 | Place order with stale price | Checkout blocked/refresh required |
| TC-CUST-010 | Cancel before vendor accepts | Order cancelled |
| TC-CUST-011 | Cancel after vendor accepts | Blocked/admin required |
| TC-CUST-012 | Create support ticket | Ticket created |

---

## 5. Vendor Mode Test Cases

| ID | Test | Expected |
|---|---|---|
| TC-VEN-001 | Vendor login | Vendor Mode opens |
| TC-VEN-002 | Toggle shop open | Vendor visible to customers |
| TC-VEN-003 | Toggle shop closed | Vendor blocked from new orders |
| TC-VEN-004 | New order alert | Push + in-app alert shown |
| TC-VEN-005 | Accept order | Status VENDOR_ACCEPTED |
| TC-VEN-006 | Reject order | Status VENDOR_REJECTED, customer notified |
| TC-VEN-007 | Mark preparing | Status PREPARING_OR_PACKING |
| TC-VEN-008 | Mark ready | Status READY_FOR_PICKUP |
| TC-VEN-009 | Toggle product unavailable | Product hidden/disabled |
| TC-VEN-010 | Update fresh item price | New price history created |
| TC-VEN-011 | Access another vendor order | Forbidden |

---

## 6. Rider Mode Test Cases

| ID | Test | Expected |
|---|---|---|
| TC-RID-001 | Rider login | Rider Mode opens |
| TC-RID-002 | Go online | Online status active |
| TC-RID-003 | View assigned order | Assigned order visible |
| TC-RID-004 | View unassigned order | Forbidden |
| TC-RID-005 | Mark picked up | Status PICKED_UP |
| TC-RID-006 | Mark delivered | Status DELIVERED |
| TC-RID-007 | Mark payment collected COD | Collection record created |
| TC-RID-008 | Mark payment collected UPI | Reference/proof saved |
| TC-RID-009 | Report issue | Support/event created |
| TC-RID-010 | Customer PII after completion | Hidden/masked as designed |

---

## 7. Admin Panel Test Cases

| ID | Test | Expected |
|---|---|---|
| TC-ADM-001 | Admin login | Dashboard opens |
| TC-ADM-002 | Create vendor | Vendor pending/created |
| TC-ADM-003 | Verify FSSAI doc | Status updates, audit log |
| TC-ADM-004 | Approve vendor | Vendor active |
| TC-ADM-005 | Create rider | Rider pending/created |
| TC-ADM-006 | Approve rider | Rider active |
| TC-ADM-007 | Add product | Product created |
| TC-ADM-008 | Approve product | Product visible |
| TC-ADM-009 | Assign rider | Status RIDER_ASSIGNED |
| TC-ADM-010 | Reassign rider | Reason required, audit log |
| TC-ADM-011 | Cancel order | Reason required, audit log |
| TC-ADM-012 | Reconcile payment | Status RECONCILED/COMPLETED |
| TC-ADM-013 | Generate daily closing | Report generated |

---

## 8. Fresh Category Test Cases

| ID | Test | Expected |
|---|---|---|
| TC-FRESH-001 | Price updated today | Product orderable |
| TC-FRESH-002 | Price stale | Product blocked/refresh required |
| TC-FRESH-003 | Variable fulfilled weight | Fulfilled quantity recorded |
| TC-FRESH-004 | Partial fulfilment | Adjustment/support workflow works |
| TC-FRESH-005 | Substitution requested | Confirmation required |
| TC-FRESH-006 | Bad quality complaint | Support ticket created |

---

## 9. Payment/Reconciliation Test Cases

| ID | Test | Expected |
|---|---|---|
| TC-PAY-001 | COD collected exact | Reconciled |
| TC-PAY-002 | COD short collected | SHORT_COLLECTED and admin review |
| TC-PAY-003 | UPI to vendor | Collector type VENDOR |
| TC-PAY-004 | UPI to rider | Collector type RIDER |
| TC-PAY-005 | UPI to QuickGO QR | Collector type QUICKGO_QR |
| TC-PAY-006 | Duplicate collection submit | Idempotency prevents duplicate |
| TC-PAY-007 | Payment not reconciled | Order not completed automatically |
| TC-PAY-008 | Refund/adjustment needed | Status REFUND_PENDING |

---

## 10. Security and Permission Test Cases

| ID | Test | Expected |
|---|---|---|
| TC-SEC-001 | Customer accesses another order | Forbidden |
| TC-SEC-002 | Vendor accesses another vendor order | Forbidden |
| TC-SEC-003 | Rider accesses unassigned order | Forbidden |
| TC-SEC-004 | Support role modifies payout | Forbidden |
| TC-SEC-005 | Invalid token | Unauthorized |
| TC-SEC-006 | Rate limit OTP | Limited |
| TC-SEC-007 | Admin action audit log | Audit created |
| TC-SEC-008 | PII masking | Sensitive data masked where required |

---

## 11. Slow Network / Low-End Device Tests

| ID | Test | Expected |
|---|---|---|
| TC-NET-001 | Slow product list | Loading/retry works |
| TC-NET-002 | Checkout network fail | Order not silently queued |
| TC-NET-003 | Duplicate checkout tap | One order only |
| TC-NET-004 | Vendor alert app background | Push received |
| TC-NET-005 | Rider update network fail | Retry and no corrupt status |
| TC-NET-006 | Admin dashboard large data | Pagination works |

---

## 12. Blocked Feature Tests

Ensure these do not exist:

- Train Food card
- Train waitlist
- PNR input
- Train number input
- Coach/seat/platform fields
- Subscription screen
- Wallet screen
- Referral screen
- Live tracking map
- Auto-dispatch settings
- Agri exchange page

---

## 13. Release Smoke Test

Before each release:

1. Customer OTP login
2. Partner OTP login
3. Admin login
4. Serviceability check
5. Product listing
6. Order placement
7. Vendor accept
8. Admin assign rider
9. Rider deliver
10. Payment collected
11. Admin reconciliation
12. Support ticket creation
13. Audit log verification
14. Feature flags checked
15. Crash/error logs checked

---

## 14. Launch Acceptance Gate

Do not launch unless:

- All P0 tests pass.
- All S0/S1 bugs fixed.
- Payment reconciliation tested.
- Vendor/rider onboarding tested.
- Support workflow tested.
- Daily closing tested.
- Feature exclusion tested.
- Play Store closed testing requirement planned.

---

## 15. Final QA Lock

This QA file validates only the locked MVP. Future features require separate test plans.
