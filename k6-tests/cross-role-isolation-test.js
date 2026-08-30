import http from 'k6/http';
import { check, sleep, fail } from 'k6';

// 1. Resolve environment variables and defaults
const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const testCustomerPhone = __ENV.TEST_CUSTOMER_PHONE || '+919000000001';
const testVendorOnlyPhone = __ENV.TEST_VENDOR_ONLY_PHONE || '+917033475409';
const testRiderOnlyPhone = __ENV.TEST_RIDER_ONLY_PHONE || '+918888888888';
const testAdminPhone = __ENV.TEST_ADMIN_PHONE || '+918084901376';
const testDualVendorPhone = __ENV.TEST_DUAL_VENDOR_PHONE || '+917033475401';
const testDualRiderPhone = __ENV.TEST_DUAL_RIDER_PHONE || '+917033475402';
const testOtp = __ENV.TEST_OTP || '123456';

// Safety hostname check
function getHostname(url) {
  let withoutProtocol = url;
  if (url.indexOf('://') !== -1) {
    withoutProtocol = url.split('://')[1];
  }
  const hostPort = withoutProtocol.split('/')[0];
  return hostPort.split(':')[0];
}

const allowedHostnames = ['localhost', '127.0.0.1'];
const hostname = getHostname(baseUrl);
if (!allowedHostnames.includes(hostname)) {
  throw new Error(`SAFETY BLOCKER: BASE_URL host "${hostname}" is non-local.`);
}

// Normalize base URL
let cleanBaseUrl = baseUrl.trim();
if (cleanBaseUrl.endsWith('/')) {
  cleanBaseUrl = cleanBaseUrl.slice(0, -1);
}

// Configuration options
export const options = {
  scenarios: {
    isolation_check: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 5,
      maxDuration: '1m',
    },
  },
  thresholds: {
    checks: ['rate==1'],
  },
};

// Helper: authenticate a specific phone and return access token
function authenticate(phone, otp) {
  const authUrl = `${cleanBaseUrl}/api/v1/auth/verify-otp`;
  const payload = JSON.stringify({ phone, otp });
  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: 5000,
  };

  const response = http.post(authUrl, payload, params);

  let isJson = false;
  let jsonParsed = null;
  try {
    jsonParsed = JSON.parse(response.body);
    isJson = true;
  } catch (e) {}

  const success = check(response, {
    [`[auth_${phone}] status is 200/201`]: (r) => r.status === 200 || r.status === 201,
    [`[auth_${phone}] is JSON`]: () => isJson,
    [`[auth_${phone}] returns access token`]: () => isJson && jsonParsed && jsonParsed.data && !!jsonParsed.data.access_token,
  });

  if (!success) {
    fail(`Authentication failed for ${phone}`);
  }

  return jsonParsed.data.access_token;
}

// 2. setup() executes exactly once to retrieve tokens for all test personas
export function setup() {
  const customerToken = authenticate(testCustomerPhone, testOtp);
  const vendorOnlyToken = authenticate(testVendorOnlyPhone, testOtp);
  const riderOnlyToken = authenticate(testRiderOnlyPhone, testOtp);
  const adminToken = authenticate(testAdminPhone, testOtp);
  const dualVendorToken = authenticate(testDualVendorPhone, testOtp);
  const dualRiderToken = authenticate(testDualRiderPhone, testOtp);

  return {
    customer: customerToken,
    vendorOnly: vendorOnlyToken,
    riderOnly: riderOnlyToken,
    admin: adminToken,
    dualVendor: dualVendorToken,
    dualRider: dualRiderToken,
  };
}

// 3. Execution function
export default function (tokens) {
  if (!tokens || !tokens.customer || !tokens.vendorOnly || !tokens.riderOnly || !tokens.admin || !tokens.dualVendor || !tokens.dualRider) {
    fail('Missing user tokens in setup data.');
  }

  const matrix = [
    // --- Permutation 1: Anonymous (No token) ---
    { token: null, url: '/api/v1/customer/profile', expectedStatus: 401, name: 'anon_customer_profile' },
    { token: null, url: '/api/v1/vendor/dashboard', expectedStatus: 401, name: 'anon_vendor_dashboard' },
    { token: null, url: '/api/v1/rider/dashboard', expectedStatus: 401, name: 'anon_rider_dashboard' },
    { token: null, url: '/api/v1/admin/dashboard', expectedStatus: 401, name: 'anon_admin_dashboard' },

    // --- Permutation 2: CUSTOMER-only token ---
    { token: tokens.customer, url: '/api/v1/customer/profile', expectedStatus: 200, name: 'customer_customer_profile' },
    { token: tokens.customer, url: '/api/v1/vendor/dashboard', expectedStatus: 403, name: 'customer_vendor_dashboard' },
    { token: tokens.customer, url: '/api/v1/rider/dashboard', expectedStatus: 403, name: 'customer_rider_dashboard' },
    { token: tokens.customer, url: '/api/v1/admin/dashboard', expectedStatus: 403, name: 'customer_admin_dashboard' },

    // --- Permutation 3: VENDOR-only token ---
    { token: tokens.vendorOnly, url: '/api/v1/customer/profile', expectedStatus: 403, name: 'vendor_only_customer_profile' },
    { token: tokens.vendorOnly, url: '/api/v1/vendor/dashboard', expectedStatus: 200, name: 'vendor_only_vendor_dashboard' },
    { token: tokens.vendorOnly, url: '/api/v1/rider/dashboard', expectedStatus: 403, name: 'vendor_only_rider_dashboard' },
    { token: tokens.vendorOnly, url: '/api/v1/admin/dashboard', expectedStatus: 403, name: 'vendor_only_admin_dashboard' },

    // --- Permutation 4: RIDER-only token ---
    { token: tokens.riderOnly, url: '/api/v1/customer/profile', expectedStatus: 403, name: 'rider_only_customer_profile' },
    { token: tokens.riderOnly, url: '/api/v1/vendor/dashboard', expectedStatus: 403, name: 'rider_only_vendor_dashboard' },
    { token: tokens.riderOnly, url: '/api/v1/rider/dashboard', expectedStatus: 200, name: 'rider_only_rider_dashboard' },
    { token: tokens.riderOnly, url: '/api/v1/admin/dashboard', expectedStatus: 403, name: 'rider_only_admin_dashboard' },

    // --- Permutation 5: ADMIN-only token ---
    { token: tokens.admin, url: '/api/v1/customer/profile', expectedStatus: 403, name: 'admin_customer_profile' },
    { token: tokens.admin, url: '/api/v1/vendor/dashboard', expectedStatus: 403, name: 'admin_vendor_dashboard' },
    { token: tokens.admin, url: '/api/v1/rider/dashboard', expectedStatus: 403, name: 'admin_rider_dashboard' },
    { token: tokens.admin, url: '/api/v1/admin/dashboard', expectedStatus: 200, name: 'admin_admin_dashboard' },

    // --- Permutation 6: Customer + Vendor DUAL role ---
    { token: tokens.dualVendor, url: '/api/v1/customer/profile', expectedStatus: 200, name: 'dual_vendor_customer_profile' },
    { token: tokens.dualVendor, url: '/api/v1/vendor/dashboard', expectedStatus: 200, name: 'dual_vendor_vendor_dashboard' },
    { token: tokens.dualVendor, url: '/api/v1/rider/dashboard', expectedStatus: 403, name: 'dual_vendor_rider_dashboard' },
    { token: tokens.dualVendor, url: '/api/v1/admin/dashboard', expectedStatus: 403, name: 'dual_vendor_admin_dashboard' },

    // --- Permutation 7: Customer + Rider DUAL role ---
    { token: tokens.dualRider, url: '/api/v1/customer/profile', expectedStatus: 200, name: 'dual_rider_customer_profile' },
    { token: tokens.dualRider, url: '/api/v1/vendor/dashboard', expectedStatus: 403, name: 'dual_rider_vendor_dashboard' },
    { token: tokens.dualRider, url: '/api/v1/rider/dashboard', expectedStatus: 200, name: 'dual_rider_rider_dashboard' },
    { token: tokens.dualRider, url: '/api/v1/admin/dashboard', expectedStatus: 403, name: 'dual_rider_admin_dashboard' },
  ];

  matrix.forEach((testCase) => {
    const params = {
      timeout: 5000,
      headers: {},
    };

    if (testCase.token) {
      params.headers['Authorization'] = `Bearer ${testCase.token}`;
    }

    const response = http.get(`${cleanBaseUrl}${testCase.url}`, params);

    check(response, {
      [`[${testCase.name}] status matches expected ${testCase.expectedStatus}`]: (r) => r.status === testCase.expectedStatus,
    });
  });

  sleep(1);
}
