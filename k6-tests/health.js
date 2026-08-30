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

// Store verified health path separately
const healthPath = '/api/v1/system/health';
const url = `${cleanBaseUrl}${healthPath}`;

// Workload Scenario: 1 VU running 10 shared iterations, max duration 30s
export const options = {
  scenarios: {
    health_smoke: {
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
    tags: { name: 'health' },
  };

  const response = http.get(url, params);

  // Parse JSON response once to avoid duplicate JSON.parse calls in checks
  let isJson = false;
  let jsonParsed = null;
  try {
    jsonParsed = JSON.parse(response.body);
    isJson = true;
  } catch (e) {
    // Left empty on purpose; isJson check handles failure
  }

  const contentType = response.headers['Content-Type'] || response.headers['content-type'] || '';

  // Validate HTTP response status and body content
  check(response, {
    'status is 200': (r) => r.status === 200,
    'content type is JSON': () => contentType.indexOf('application/json') !== -1,
    'success is true': () => isJson && jsonParsed && jsonParsed.success === true,
    'health status is ok': () => isJson && jsonParsed && jsonParsed.data && jsonParsed.data.status === 'ok',
    'service name is correct': () => isJson && jsonParsed && jsonParsed.data && jsonParsed.data.service === 'quickgo-backend',
  });

  // Pacing delay (1s) between iterations
  sleep(1);
}

