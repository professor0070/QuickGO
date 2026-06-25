# TESTING BACKLOG

This backlog details minor enhancements, non-critical bugs (P3/P4), and future verification steps that are scheduled post-MVP launch. These items do not block production deployment as all critical P0/P1/P2 gates have passed.

---

## 1. Non-Blockers & Enhancements (P3)
* **Live GPS Tracking (Post-MVP feature):** 
  * *Description:* Integration of live location sharing on a Mapbox/Google Maps screen. Currently excluded in PRD.
  * *Status:* Blocked until Phase 14 / future phase integration.
* **Auto-Dispatch Algorithms (P3):**
  * *Description:* Automatic assignment of orders to nearest active riders instead of the current MVP manual dispatch panel.
  * *Status:* Planned for post-launch enhancement.
* **Multi-Vendor Cart Support (P3):**
  * *Description:* Allow customers to add items from multiple vendors to the same cart.
  * *Status:* Excluded under single-vendor MVP lock.

---

## 2. Testing Improvements (P4)
* **Razorpay Live Gateway Dry Runs (P4):**
  * *Description:* Test transaction execution with live payment keys on staging before full commercial release.
  * *Status:* Pending production credential setup.
* **Push Notification FCM Service Account Optimization (P4):**
  * *Description:* Switch from simulated FCM mode to actual FCM server credential handshakes in local development mocks.
  * *Status:* Backlogged until staging server deployment.
* **Widget & Integration Test Coverage Expansion (P4):**
  * *Description:* Increase unit test coverage of UI screen flows to >80%.
  * *Status:* Scheduled for next development sprint.
