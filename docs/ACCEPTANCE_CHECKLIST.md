# QuickGO MVP Acceptance Checklist

- Customer can log in with OTP, accept legal documents, manage profile and addresses, and see serviceability.
- Out-of-zone customers see "Coming soon in your area" and cannot place orders.
- Customer can browse categories, vendors, products, maintain a single-vendor cart, place COD/UPI-on-delivery orders, track status, cancel before vendor acceptance, and create support tickets.
- Vendor can open/close shop, receive order alerts, accept/reject, mark preparing/packing, mark ready for pickup, update availability, and update approved product prices.
- Rider can go online/offline, see assigned orders, open pickup/drop details, call parties, open maps, mark picked up, mark delivered, mark payment collected, and report issues.
- Admin can onboard vendors/riders, manage products/service zones, monitor orders, manually assign/reassign riders, reconcile payments, manage support/compliance, review reports, and inspect audit logs.
- Critical mutations use idempotency keys and write audit history where operationally required.
- Production launch uses separate staging and production environments, managed PostgreSQL, Render backend, Vercel admin, Cloudinary storage, FCM, and private secrets.

