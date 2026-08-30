import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// 1. Resolve environment variables and defaults
const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const testPhone = __ENV.TEST_PHONE;
const testOtp = __ENV.TEST_OTP;

const warmupVus = parseInt(__ENV.WARMUP_VUS || '2', 10);
const warmupDuration = __ENV.WARMUP_DURATION || '30s';
const measuredVus = parseInt(__ENV.MEASURED_VUS || '5', 10);
const measuredDuration = __ENV.MEASURED_DURATION || '4m';
const pacingSeconds = parseInt(__ENV.PACING_SECONDS || '12', 10);

// Helper to extract hostname
function getHostname(url) {
  let withoutProtocol = url;
  if (url.indexOf('://') !== -1) {
    withoutProtocol = url.split('://')[1];
  }
  const hostPort = withoutProtocol.split('/')[0];
  return hostPort.split(':')[0];
}

// Global safety hostname check
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

// Custom Measured Stage Metrics
const customerProfileLatency = new Trend('customer_profile_latency');
const customerAddressesLatency = new Trend('customer_addresses_latency');
const customerProfileFailures = new Rate('customer_profile_failures');
const customerAddressesFailures = new Rate('customer_addresses_failures');
const measuredRequests = new Counter('measured_requests');
const warmupRequests = new Counter('warmup_requests');
const authSetupRequests = new Counter('auth_setup_requests');

// Multi-scenario configuration
export const options = {
  scenarios: {
    warmup: {
      executor: 'constant-vus',
      exec: 'runWarmup',
      vus: warmupVus,
      duration: warmupDuration,
    },
    measured: {
      executor: 'constant-vus',
      exec: 'runMeasured',
      vus: measuredVus,
      duration: measuredDuration,
      gracefulStop: '10s',
      startTime: warmupDuration,
    },
  },
  thresholds: {
    // Global constraints
    checks: ['rate==1'],
    http_req_failed: ['rate<0.01'],
    // Custom metrics duration limits
    customer_profile_latency: ['p(95)<500', 'p(99)<750'],
    customer_addresses_latency: ['p(95)<500', 'p(99)<750'],
    // Failure rate limits
    customer_profile_failures: ['rate==0'],
    customer_addresses_failures: ['rate==0'],
  },
};

// 2. Authentication setup - Executes exactly once
export function setup() {
  const setupHostname = getHostname(cleanBaseUrl);
  if (!allowedHostnames.includes(setupHostname)) {
    fail('SAFETY BLOCKER: setup BASE_URL is non-local.');
  }

  if (!testPhone) {
    fail('SAFETY BLOCKER: TEST_PHONE environment variable is missing.');
  }
  if (!testOtp) {
    fail('SAFETY BLOCKER: TEST_OTP environment variable is missing.');
  }

  authSetupRequests.add(1);

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
    '[setup_auth] status is 200/201': (r) => r.status === 200 || r.status === 201,
    '[setup_auth] is JSON': () => isJson,
    '[setup_auth] success indicator is true': () => isJson && jsonParsed && jsonParsed.success === true,
    '[setup_auth] returns access token': () => isJson && jsonParsed && jsonParsed.data && !!jsonParsed.data.access_token,
    '[setup_auth] user has CUSTOMER role': () => {
      if (!isJson || !jsonParsed || !jsonParsed.data || !jsonParsed.data.user) return false;
      const roles = jsonParsed.data.user.roles;
      if (typeof roles === 'string') return roles === 'CUSTOMER';
      if (Array.isArray(roles)) return roles.includes('CUSTOMER');
      return false;
    },
  });

  if (!authOk) {
    fail('Authentication setup failed. Verify server status and credentials.');
  }

  return {
    accessToken: jsonParsed.data.access_token,
  };
}

// Helper: Response Validation Checks
function runValidation(response, endpointName, isProfile) {
  let isJson = false;
  let jsonParsed = null;
  try {
    jsonParsed = JSON.parse(response.body);
    isJson = true;
  } catch (e) {}

  const contentType = response.headers['Content-Type'] || response.headers['content-type'] || '';
  const isHtml = response.body && response.body.trim().toLowerCase().startsWith('<!doctype html>');
  const containsStackTrace = response.body && (
    response.body.includes('Stack trace') || 
    response.body.includes('stackTrace') || 
    response.body.includes('exception') || 
    response.body.includes('Exception')
  );

  const checksObj = {
    [`[${endpointName}] status is 200`]: (r) => r.status === 200,
    [`[${endpointName}] Content-Type is JSON`]: () => contentType.indexOf('application/json') !== -1,
    [`[${endpointName}] valid JSON parsed`]: () => isJson,
    [`[${endpointName}] is not HTML`]: () => !isHtml,
    [`[${endpointName}] success indicator is true`]: () => isJson && jsonParsed && jsonParsed.success === true,
    [`[${endpointName}] envelope data/message keys exist`]: () => isJson && jsonParsed && ('data' in jsonParsed) && ('message' in jsonParsed),
    [`[${endpointName}] no 401/403 auth errors`]: (r) => r.status !== 401 && r.status !== 403,
    [`[${endpointName}] no 5xx server errors`]: (r) => r.status < 500,
    [`[${endpointName}] no stack traces`]: () => !containsStackTrace,
    [`[${endpointName}] response duration below limit`]: (r) => r.timings.duration < 500,
  };

  if (isProfile) {
    checksObj[`[${endpointName}] contains profile keys`] = () => isJson && jsonParsed && jsonParsed.data && ('id' in jsonParsed.data) && ('userId' in jsonParsed.data) && ('status' in jsonParsed.data);
  } else {
    checksObj[`[${endpointName}] data is an array`] = () => isJson && jsonParsed && Array.isArray(jsonParsed.data);
  }

  const success = check(response, checksObj);

  if (!success && response.body) {
    console.warn(`Validation failed on ${endpointName}. Body: ${response.body.substring(0, 200)}`);
  }

  return success;
}

// 3. Warm-up scenario loop
export function runWarmup(data) {
  if (!data || !data.accessToken) {
    fail('Missing token in warmup stage.');
  }

  const authParams = {
    timeout: 5000,
    headers: {
      'Authorization': `Bearer ${data.accessToken}`,
    },
  };

  warmupRequests.add(2);

  // GET /api/v1/customer/profile
  const profileRes = http.get(
    `${cleanBaseUrl}/api/v1/customer/profile`,
    Object.assign({}, authParams, { tags: { name: 'warmup_profile' } })
  );
  runValidation(profileRes, 'warmup_profile', true);

  // GET /api/v1/customer/addresses
  const addressesRes = http.get(
    `${cleanBaseUrl}/api/v1/customer/addresses`,
    Object.assign({}, authParams, { tags: { name: 'warmup_addresses' } })
  );
  runValidation(addressesRes, 'warmup_addresses', false);

  sleep(pacingSeconds);
}

// 4. Measured scenario loop
export function runMeasured(data) {
  if (!data || !data.accessToken) {
    fail('Missing token in measured stage.');
  }

  const authParams = {
    timeout: 5000,
    headers: {
      'Authorization': `Bearer ${data.accessToken}`,
    },
  };

  measuredRequests.add(2);

  // GET /api/v1/customer/profile
  const profileRes = http.get(
    `${cleanBaseUrl}/api/v1/customer/profile`,
    Object.assign({}, authParams, { tags: { name: 'customer_profile' } })
  );
  const profileOk = runValidation(profileRes, 'customer_profile', true);
  customerProfileLatency.add(profileRes.timings.duration);
  customerProfileFailures.add(profileOk ? 0 : 1);

  // GET /api/v1/customer/addresses
  const addressesRes = http.get(
    `${cleanBaseUrl}/api/v1/customer/addresses`,
    Object.assign({}, authParams, { tags: { name: 'customer_addresses' } })
  );
  const addressesOk = runValidation(addressesRes, 'customer_addresses', false);
  customerAddressesLatency.add(addressesRes.timings.duration);
  customerAddressesFailures.add(addressesOk ? 0 : 1);

  sleep(pacingSeconds);
}
