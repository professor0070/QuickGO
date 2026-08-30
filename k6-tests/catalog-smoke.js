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

// Store verified catalog/system paths separately
const healthPath = '/api/v1/system/health';
const versionPath = '/api/v1/system/version';
const flagsPath = '/api/v1/system/feature-flags';
const categoriesPath = '/api/v1/catalog/categories';
const vendorsPath = '/api/v1/catalog/vendors';
const productsPath = '/api/v1/catalog/products';

// Workload Scenario: 1 VU running 10 shared iterations, max duration 30s
export const options = {
  scenarios: {
    catalog_smoke: {
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
    tags: { name: 'catalog-smoke' },
  };

  // 1. Query system health
  const healthUrl = `${cleanBaseUrl}${healthPath}`;
  const healthRes = http.get(healthUrl, params);
  validateResponse(healthRes, 'system_health');

  // 2. Query system version
  const versionUrl = `${cleanBaseUrl}${versionPath}`;
  const versionRes = http.get(versionUrl, params);
  validateResponse(versionRes, 'system_version');

  // 3. Query system feature-flags
  const flagsUrl = `${cleanBaseUrl}${flagsPath}`;
  const flagsRes = http.get(flagsUrl, params);
  validateResponse(flagsRes, 'system_feature_flags');

  // 4. Query categories
  const catUrl = `${cleanBaseUrl}${categoriesPath}`;
  const catRes = http.get(catUrl, params);
  validateResponse(catRes, 'categories');

  // 5. Query vendors
  const venUrl = `${cleanBaseUrl}${vendorsPath}`;
  const venRes = http.get(venUrl, params);
  const venParsed = validateResponse(venRes, 'vendors');

  // Dynamic vendor details check: extract a vendor ID if available, otherwise fallback
  let selectedVendorId = '00000000-0000-4000-9000-000000000001';
  if (venParsed && venParsed.success && Array.isArray(venParsed.data) && venParsed.data.length > 0) {
    selectedVendorId = venParsed.data[0].id;
  }

  // 6. Query vendor details
  const detailUrl = `${cleanBaseUrl}/api/v1/catalog/vendors/${selectedVendorId}`;
  const detailRes = http.get(detailUrl, params);
  validateResponse(detailRes, 'vendor_details');

  // 7. Query products
  const prodUrl = `${cleanBaseUrl}${productsPath}`;
  const prodRes = http.get(prodUrl, params);
  validateResponse(prodRes, 'products');

  // Pacing delay (1s) between iterations
  sleep(1);
}

function validateResponse(response, endpointName) {
  // Safe parsing helper
  let isJson = false;
  let jsonParsed = null;
  try {
    jsonParsed = JSON.parse(response.body);
    isJson = true;
  } catch (e) {
    // Ignored on purpose
  }

  const contentType = response.headers['Content-Type'] || response.headers['content-type'] || '';
  const isHtml = response.body && response.body.trim().toLowerCase().startsWith('<!doctype html>');

  check(response, {
    [`[${endpointName}] status is 200`]: (r) => r.status === 200,
    [`[${endpointName}] is JSON content-type`]: () => contentType.indexOf('application/json') !== -1,
    [`[${endpointName}] is not HTML`]: () => !isHtml,
    [`[${endpointName}] success indicator is true`]: () => isJson && jsonParsed && jsonParsed.success === true,
    [`[${endpointName}] envelope fields are correct`]: () => isJson && jsonParsed && ('data' in jsonParsed) && ('message' in jsonParsed),
    [`[${endpointName}] has no parsing failures`]: () => isJson,
    [`[${endpointName}] response duration below threshold`]: (r) => r.timings.duration < 500,
    [`[${endpointName}] has no server errors`]: (r) => r.status < 500,
  });

  return jsonParsed;
}
