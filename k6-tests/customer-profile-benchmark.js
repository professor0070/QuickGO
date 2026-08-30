import http from 'k6/http';
import { check, sleep, fail } from 'k6';

// 1. Resolve environment variables
const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

// BASE_URL safety validation
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
  throw new Error(`SAFETY BLOCKER: BASE_URL host "${hostname}" is non-local or not allowed.`);
}

// Normalize trailing slashes of base URL
let cleanBaseUrl = baseUrl.trim();
if (cleanBaseUrl.endsWith('/')) {
  cleanBaseUrl = cleanBaseUrl.slice(0, -1);
}

// Scenarios and thresholds configuration
export const options = {
  scenarios: {
    customer_profile_benchmark: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      gracefulStop: '5s',
    },
  },
  thresholds: {
    // Failure rate must be less than 1%
    http_req_failed: ['rate<0.01'],
    // 95% of requests must complete within 500ms
    http_req_duration: ['p(95)<500'],
    // All checks must pass
    checks: ['rate==1'],
    // Endpoint specific thresholds
    'http_req_duration{name:customer_profile}': ['p(95)<500'],
    'http_req_duration{name:customer_addresses}': ['p(95)<500'],
  },
};

// 2. Authentication in setup() - Runs exactly once
export function setup() {
  const testPhone = __ENV.TEST_PHONE;
  const testOtp = __ENV.TEST_OTP;

  // Pre-test input validation
  if (!testPhone) {
    fail('SAFETY BLOCKER: TEST_PHONE environment variable is missing.');
  }
  if (!testOtp) {
    fail('SAFETY BLOCKER: TEST_OTP environment variable is missing.');
  }

  // BASE_URL check in setup
  const setupHostname = getHostname(cleanBaseUrl);
  if (!allowedHostnames.includes(setupHostname)) {
    fail('SAFETY BLOCKER: setup BASE_URL is non-local.');
  }

  const authUrl = `${cleanBaseUrl}/api/v1/auth/verify-otp`;
  const authPayload = JSON.stringify({
    phone: testPhone,
    otp: testOtp,
  });

  const params = {
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(authUrl, authPayload, params);

  let isJson = false;
  let jsonParsed = null;
  try {
    jsonParsed = JSON.parse(response.body);
    isJson = true;
  } catch (e) {}

  const authOk = check(response, {
    '[setup_auth] verify-otp status is 200/201': (r) => r.status === 200 || r.status === 201,
    '[setup_auth] response is JSON': () => isJson,
    '[setup_auth] success indicator is true': () => isJson && jsonParsed && jsonParsed.success === true,
    '[setup_auth] returns access token': () => isJson && jsonParsed && jsonParsed.data && !!jsonParsed.data.access_token,
    '[setup_auth] user role is CUSTOMER': () => {
      if (!isJson || !jsonParsed || !jsonParsed.data || !jsonParsed.data.user) return false;
      const roles = jsonParsed.data.user.roles;
      if (typeof roles === 'string') return roles === 'CUSTOMER';
      if (Array.isArray(roles)) return roles.includes('CUSTOMER');
      return false;
    },
  });

  if (!authOk) {
    fail('Authentication setup failed. Verify phone, OTP code, or server state.');
  }

  return {
    accessToken: jsonParsed.data.access_token,
  };
}

// 3. Measured Workload Stage
export default function (data) {
  if (!data || !data.accessToken) {
    fail('Missing authentication token from setup stage.');
  }

  const authParams = {
    timeout: 5000,
    headers: {
      'Authorization': `Bearer ${data.accessToken}`,
    },
  };

  // GET /api/v1/customer/profile
  const profileUrl = `${cleanBaseUrl}/api/v1/customer/profile`;
  const profileRes = http.get(profileUrl, Object.assign({}, authParams, { tags: { name: 'customer_profile' } }));
  validateProfileResponse(profileRes);

  // GET /api/v1/customer/addresses
  const addressesUrl = `${cleanBaseUrl}/api/v1/customer/addresses`;
  const addressesRes = http.get(addressesUrl, Object.assign({}, authParams, { tags: { name: 'customer_addresses' } }));
  validateAddressesResponse(addressesRes);

  // Pacing delay (35s) between iterations to stay within rate-limiting bounds (60 req/min)
  sleep(35);
}

function validateProfileResponse(response) {
  let isJson = false;
  let jsonParsed = null;
  try {
    jsonParsed = JSON.parse(response.body);
    isJson = true;
  } catch (e) {}

  const contentType = response.headers['Content-Type'] || response.headers['content-type'] || '';
  const isHtml = response.body && response.body.trim().toLowerCase().startsWith('<!doctype html>');

  check(response, {
    '[customer_profile] status is 200': (r) => r.status === 200,
    '[customer_profile] is JSON content-type': () => contentType.indexOf('application/json') !== -1,
    '[customer_profile] is not HTML': () => !isHtml,
    '[customer_profile] success indicator is true': () => isJson && jsonParsed && jsonParsed.success === true,
    '[customer_profile] envelope fields are correct': () => isJson && jsonParsed && ('data' in jsonParsed) && ('message' in jsonParsed),
    '[customer_profile] has no parsing failures': () => isJson,
    '[customer_profile] response duration below threshold': (r) => r.timings.duration < 500,
    '[customer_profile] has no server errors': (r) => r.status < 500,
    '[customer_profile] has no auth errors': (r) => r.status !== 401 && r.status !== 403,
    '[customer_profile] structure contains profile keys': () => isJson && jsonParsed && jsonParsed.data && ('id' in jsonParsed.data) && ('userId' in jsonParsed.data) && ('status' in jsonParsed.data) && ('user' in jsonParsed.data),
  });
}

function validateAddressesResponse(response) {
  let isJson = false;
  let jsonParsed = null;
  try {
    jsonParsed = JSON.parse(response.body);
    isJson = true;
  } catch (e) {}

  const contentType = response.headers['Content-Type'] || response.headers['content-type'] || '';
  const isHtml = response.body && response.body.trim().toLowerCase().startsWith('<!doctype html>');

  check(response, {
    '[customer_addresses] status is 200': (r) => r.status === 200,
    '[customer_addresses] is JSON content-type': () => contentType.indexOf('application/json') !== -1,
    '[customer_addresses] is not HTML': () => !isHtml,
    '[customer_addresses] success indicator is true': () => isJson && jsonParsed && jsonParsed.success === true,
    '[customer_addresses] envelope fields are correct': () => isJson && jsonParsed && ('data' in jsonParsed) && ('message' in jsonParsed),
    '[customer_addresses] has no parsing failures': () => isJson,
    '[customer_addresses] response duration below threshold': (r) => r.timings.duration < 500,
    '[customer_addresses] has no server errors': (r) => r.status < 500,
    '[customer_addresses] has no auth errors': (r) => r.status !== 401 && r.status !== 403,
    '[customer_addresses] returns array structure': () => isJson && jsonParsed && Array.isArray(jsonParsed.data),
  });
}
