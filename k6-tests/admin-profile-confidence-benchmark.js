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
const adminDashboardLatency = new Trend('admin_dashboard_latency');
const adminAttentionQueueLatency = new Trend('admin_attention_queue_latency');
const adminDashboardFailures = new Rate('admin_dashboard_failures');
const adminAttentionQueueFailures = new Rate('admin_attention_queue_failures');
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
    admin_dashboard_latency: ['p(95)<500', 'p(99)<750'],
    admin_attention_queue_latency: ['p(95)<500', 'p(99)<750'],
    // Failure rate limits
    admin_dashboard_failures: ['rate==0'],
    admin_attention_queue_failures: ['rate==0'],
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
    '[setup_auth] user has ADMIN or SUPER_ADMIN role': () => {
      if (!isJson || !jsonParsed || !jsonParsed.data || !jsonParsed.data.user) return false;
      const roles = jsonParsed.data.user.roles;
      if (typeof roles === 'string') return roles.indexOf('ADMIN') !== -1 || roles.indexOf('SUPER_ADMIN') !== -1;
      if (Array.isArray(roles)) return roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
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
function runValidation(response, endpointName, isDashboard) {
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

  if (isDashboard) {
    checksObj[`[${endpointName}] contains dashboard keys`] = () => isJson && jsonParsed && jsonParsed.data && ('active_riders' in jsonParsed.data) && ('open_support_tickets' in jsonParsed.data);
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

  // GET /api/v1/admin/dashboard
  const dashRes = http.get(
    `${cleanBaseUrl}/api/v1/admin/dashboard`,
    Object.assign({}, authParams, { tags: { name: 'warmup_dashboard' } })
  );
  runValidation(dashRes, 'warmup_dashboard', true);

  // GET /api/v1/admin/attention-queue
  const queueRes = http.get(
    `${cleanBaseUrl}/api/v1/admin/attention-queue`,
    Object.assign({}, authParams, { tags: { name: 'warmup_attention_queue' } })
  );
  runValidation(queueRes, 'warmup_attention_queue', false);

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

  // GET /api/v1/admin/dashboard
  const dashRes = http.get(
    `${cleanBaseUrl}/api/v1/admin/dashboard`,
    Object.assign({}, authParams, { tags: { name: 'admin_dashboard' } })
  );
  const dashOk = runValidation(dashRes, 'admin_dashboard', true);
  adminDashboardLatency.add(dashRes.timings.duration);
  adminDashboardFailures.add(dashOk ? 0 : 1);

  // GET /api/v1/admin/attention-queue
  const queueRes = http.get(
    `${cleanBaseUrl}/api/v1/admin/attention-queue`,
    Object.assign({}, authParams, { tags: { name: 'admin_attention_queue' } })
  );
  const queueOk = runValidation(queueRes, 'admin_attention_queue', false);
  adminAttentionQueueLatency.add(queueRes.timings.duration);
  adminAttentionQueueFailures.add(queueOk ? 0 : 1);

  sleep(pacingSeconds);
}
