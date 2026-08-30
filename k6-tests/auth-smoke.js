import http from 'k6/http';
import { check, sleep } from 'k6';

// 1. Resolve and validate BASE_URL
const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

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

// Store verified auth paths separately
const sendOtpPath = '/api/v1/auth/send-otp';
const verifyOtpPath = '/api/v1/auth/verify-otp';

// Workload Scenario: 1 VU running 10 shared iterations, max duration 30s
export const options = {
  scenarios: {
    auth_smoke: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 10,
      maxDuration: '30s',
    },
  },
  thresholds: {
    // Failure rate must be less than 1%
    http_req_failed: ['rate<0.01'],
    // 95% of requests must complete within 500ms
    http_req_duration: ['p(95)<500'],
    // All checks must pass
    checks: ['rate==1'],
  },
};

export default function () {
  const params = {
    timeout: 5000, // 5 seconds request timeout
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'auth-smoke' },
  };

  // 1. POST send-otp
  const sendUrl = `${cleanBaseUrl}${sendOtpPath}`;
  const sendPayload = JSON.stringify({
    phone: '+919000000001',
    purpose: 'LOGIN',
  });
  const sendRes = http.post(sendUrl, sendPayload, params);
  validateSendOtpResponse(sendRes);

  // 2. POST verify-otp
  const verifyUrl = `${cleanBaseUrl}${verifyOtpPath}`;
  const verifyPayload = JSON.stringify({
    phone: '+919000000001',
    otp: '123456',
  });
  const verifyRes = http.post(verifyUrl, verifyPayload, params);
  validateVerifyOtpResponse(verifyRes);

  // Pacing delay (1s) between iterations
  sleep(1);
}

function validateSendOtpResponse(response) {
  let isJson = false;
  let jsonParsed = null;
  try {
    jsonParsed = JSON.parse(response.body);
    isJson = true;
  } catch (e) {
    // Ignored
  }

  const contentType = response.headers['Content-Type'] || response.headers['content-type'] || '';
  const isHtml = response.body && response.body.trim().toLowerCase().startsWith('<!doctype html>');

  check(response, {
    '[send-otp] status is 200/201': (r) => r.status === 200 || r.status === 201,
    '[send-otp] is JSON content-type': () => contentType.indexOf('application/json') !== -1,
    '[send-otp] is not HTML': () => !isHtml,
    '[send-otp] success indicator is true': () => isJson && jsonParsed && jsonParsed.success === true,
    '[send-otp] envelope fields are correct': () => isJson && jsonParsed && ('data' in jsonParsed) && ('message' in jsonParsed),
    '[send-otp] has no parsing failures': () => isJson,
    '[send-otp] response duration below threshold': (r) => r.timings.duration < 500,
    '[send-otp] has no server errors': (r) => r.status < 500,
  });
}

function validateVerifyOtpResponse(response) {
  let isJson = false;
  let jsonParsed = null;
  try {
    jsonParsed = JSON.parse(response.body);
    isJson = true;
  } catch (e) {
    // Ignored
  }

  const contentType = response.headers['Content-Type'] || response.headers['content-type'] || '';
  const isHtml = response.body && response.body.trim().toLowerCase().startsWith('<!doctype html>');

  check(response, {
    '[verify-otp] status is 200/201': (r) => r.status === 200 || r.status === 201,
    '[verify-otp] is JSON content-type': () => contentType.indexOf('application/json') !== -1,
    '[verify-otp] is not HTML': () => !isHtml,
    '[verify-otp] success indicator is true': () => isJson && jsonParsed && jsonParsed.success === true,
    '[verify-otp] envelope fields are correct': () => isJson && jsonParsed && ('data' in jsonParsed) && ('message' in jsonParsed),
    '[verify-otp] contains access_token': () => isJson && jsonParsed && jsonParsed.data && !!jsonParsed.data.access_token,
    '[verify-otp] contains refresh_token': () => isJson && jsonParsed && jsonParsed.data && !!jsonParsed.data.refresh_token,
    '[verify-otp] has no parsing failures': () => isJson,
    '[verify-otp] response duration below threshold': (r) => r.timings.duration < 500,
    '[verify-otp] has no server errors': (r) => r.status < 500,
  });
}
