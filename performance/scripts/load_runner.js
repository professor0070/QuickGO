import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { verifySafety } from './safety.js';
import { login } from './auth.js';
import { browseCatalog } from './catalog.js';
import { createOrderFlow } from './orders.js';
import { browseAndCreateSupport } from './support.js';

// Load static configuration settings
const CONFIG = JSON.parse(open('../config/staging.json'));
const BASE_URL = __ENV.API_BASE_URL || CONFIG.api_base_url || 'http://localhost:3000/api/v1';
const OTP_CODE = __ENV.MOCK_OTP_CODE || CONFIG.mock_otp_code || '123456';
const SERVICE_ZONE_ID = __ENV.SERVICE_ZONE_ID || CONFIG.service_zone_id || '00000000-0000-4000-8000-000000000001';
const RUN_ID = __ENV.LOADTEST_RUN_ID;

// 1. Run safety checks during script compile / startup
verifySafety(BASE_URL, RUN_ID);

// Re-use token across iterations for each VU context
let cachedToken = null;

export default function () {
  // 2. Extra runtime safety checks to fail-closed
  verifySafety(BASE_URL, RUN_ID);

  const vuId = __VU;
  // Map VU index to user ranges seeded in database (+919000000001 onwards)
  const phone = `+919000000${String(vuId).padStart(3, '0')}`;

  // Log in VU if token not cached
  if (!cachedToken) {
    try {
      cachedToken = login(BASE_URL, phone, OTP_CODE);
    } catch (e) {
      fail(`VU ${vuId} login failed: ${e.message}`);
    }
  }

  const headers = {
    'Authorization': `Bearer ${cachedToken}`,
    'Content-Type': 'application/json'
  };

  // Roll traffic distribution check
  const roll = Math.random();

  if (roll < 0.25) {
    // A. 25% public read: categories list
    const res = http.get(`${BASE_URL}/catalog/categories`);
    check(res, { 'get categories status is 200': (r) => r.status === 200 });

  } else if (roll < 0.50) {
    // B. 25% public read: vendors list
    const res = http.get(`${BASE_URL}/catalog/vendors?category=RESTAURANT_FOOD&service_zone_id=${SERVICE_ZONE_ID}`);
    check(res, { 'get vendors status is 200': (r) => r.status === 200 });

  } else if (roll < 0.65) {
    // C. 15% public read: list products (first vendor details)
    const res = http.get(`${BASE_URL}/catalog/products?vendor_id=00000000-0000-4000-9000-000000000001`);
    check(res, { 'get products status is 200': (r) => r.status === 200 });

  } else if (roll < 0.75) {
    // D. 10% auth read: order history / status list
    const res = http.get(`${BASE_URL}/orders?page=1&limit=10`, { headers });
    check(res, { 'list orders status is 200': (r) => r.status === 200 });

  } else if (roll < 0.85) {
    // E. 10% auth read: notifications list / unread count or support tickets
    if (Math.random() < 0.5) {
      const res = http.get(`${BASE_URL}/notifications/unread-count`, { headers });
      check(res, { 'unread count status is 200': (r) => r.status === 200 });
    } else {
      try {
        browseAndCreateSupport(BASE_URL, cachedToken, RUN_ID);
      } catch (e) {
        // checks are captured inside browseAndCreateSupport
      }
    }

  } else if (roll < 0.90) {
    // F. 5% auth write/read: session profile refresh
    const res = http.get(`${BASE_URL}/auth/me`, { headers });
    check(res, { 'auth/me status is 200': (r) => r.status === 200 });

  } else if (roll < 0.97) {
    // G. 7% auth write: Cart operations (add/clear item)
    try {
      const catalog = browseCatalog(BASE_URL, SERVICE_ZONE_ID);
      if (catalog.products && catalog.products.length > 0) {
        const prod = catalog.products[0];
        const addPayload = JSON.stringify({
          vendor_id: catalog.selectedVendor.id,
          product_id: prod.id,
          quantity: 1
        });
        const addRes = http.post(`${BASE_URL}/cart/items`, addPayload, { headers });
        check(addRes, { 'cart item added': (r) => r.status === 200 || r.status === 201 });
      }
    } catch (e) {
      // Ignored
    }

  } else {
    // H. 3% critical write: Order placement
    try {
      createOrderFlow(BASE_URL, cachedToken, SERVICE_ZONE_ID, RUN_ID);
    } catch (e) {
      // checks are handled inside createOrderFlow
    }
  }

  // Pacing delay (1-2 seconds think-time)
  sleep(1 + Math.random());
}
