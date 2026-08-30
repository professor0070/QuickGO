import http from 'k6/http';
import { check, sleep, fail } from 'k6';

// 1. Resolve environment variables and defaults
const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const testCustomerPhone = __ENV.TEST_CUSTOMER_PHONE || '+919000000001';
const testVendorOnlyPhone = __ENV.TEST_VENDOR_ONLY_PHONE || '+917033475409';
const testRiderOnlyPhone = __ENV.TEST_RIDER_ONLY_PHONE || '+918888888888';
const testAdminPhone = __ENV.TEST_ADMIN_PHONE || '+918084901376';
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
    admin_auth_check: {
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

  return {
    customer: customerToken,
    vendorOnly: vendorOnlyToken,
    riderOnly: riderOnlyToken,
    admin: adminToken,
  };
}

// 3. Execution function
export default function (tokens) {
  if (!tokens || !tokens.customer || !tokens.vendorOnly || !tokens.riderOnly || !tokens.admin) {
    fail('Missing user tokens in setup data.');
  }

  const endpoints = [
    '/api/v1/admin/dashboard',
    '/api/v1/admin/users',
    '/api/v1/admin/vendors',
    '/api/v1/admin/riders',
    '/api/v1/admin/orders',
    '/api/v1/admin/reconciliation/summary',
    '/api/v1/admin/payouts',
    '/api/v1/admin/audit-logs'
  ];

  const personas = [
    { token: null, label: 'anon', expectedStatus: 401 },
    { token: tokens.customer, label: 'customer', expectedStatus: 403 },
    { token: tokens.vendorOnly, label: 'vendor', expectedStatus: 403 },
    { token: tokens.riderOnly, label: 'rider', expectedStatus: 403 },
    { token: tokens.admin, label: 'admin', expectedStatus: 200 }
  ];

  // Execute nested matrix validation
  personas.forEach((persona) => {
    endpoints.forEach((route) => {
      const routeSlug = route.replace('/api/v1/admin/', '').replace('/', '_');
      const testName = `${persona.label}_to_${routeSlug}`;

      const params = {
        timeout: 5000,
        headers: {},
      };

      if (persona.token) {
        params.headers['Authorization'] = `Bearer ${persona.token}`;
      }

      const response = http.get(`${cleanBaseUrl}${route}`, params);

      check(response, {
        [`[${testName}] status matches expected ${persona.expectedStatus}`]: (r) => r.status === persona.expectedStatus,
      });
    });
  });

  sleep(1);
}
