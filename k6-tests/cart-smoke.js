import http from 'k6/http';
import { check, sleep, fail } from 'k6';

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

// Workload Scenario: 1 VU running 10 shared iterations, max duration 30s
export const options = {
  scenarios: {
    cart_smoke: {
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
  const commonParams = {
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const commonParamsNoBody = {
    timeout: 5000,
  };

  // 1. Authenticate to get token
  const verifyUrl = `${cleanBaseUrl}/api/v1/auth/verify-otp`;
  const verifyPayload = JSON.stringify({
    phone: '+919000000001',
    otp: '123456',
  });
  const verifyRes = http.post(verifyUrl, verifyPayload, commonParams);
  
  let isAuthJson = false;
  let authJson = null;
  try {
    authJson = JSON.parse(verifyRes.body);
    isAuthJson = true;
  } catch (e) {}

  const authOk = check(verifyRes, {
    '[auth] verify-otp is 200/201': (r) => r.status === 200 || r.status === 201,
    '[auth] returns access token': () => isAuthJson && authJson && authJson.success && !!authJson.data.access_token,
  });

  if (!authOk) {
    fail('Authentication failed in cart smoke test.');
  }

  const token = authJson.data.access_token;
  
  const authParams = {
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const authParamsNoBody = {
    timeout: 5000,
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  // 2. Fetch products to see if we can do full item add/update flow
  const prodRes = http.get(`${cleanBaseUrl}/api/v1/catalog/products`, commonParamsNoBody);
  let isProdJson = false;
  let prodJson = null;
  try {
    prodJson = JSON.parse(prodRes.body);
    isProdJson = true;
  } catch (e) {}

  check(prodRes, {
    '[catalog] products is 200': (r) => r.status === 200,
    '[catalog] returns product list': () => isProdJson && prodJson && prodJson.success && Array.isArray(prodJson.data),
  });

  const products = isProdJson && prodJson && prodJson.success ? prodJson.data : [];

  // 3. Clear cart initially
  const clearRes = http.del(`${cleanBaseUrl}/api/v1/cart`, null, authParamsNoBody);
  validateCartResponse(clearRes, 'clear_initial', 'Cart cleared');

  if (products.length > 0) {
    const product = products[0];

    // 4. Add item to cart
    const addPayload = JSON.stringify({
      product_id: product.id,
      quantity: 1,
    });
    const addRes = http.post(`${cleanBaseUrl}/api/v1/cart/items`, addPayload, authParams);
    const addedItem = validateCartResponse(addRes, 'add_item', 'Item added to cart');

    // 5. Get active cart to retrieve cart item ID
    const cartRes = http.get(`${cleanBaseUrl}/api/v1/cart`, authParamsNoBody);
    const cartParsed = validateCartResponse(cartRes, 'get_cart_populated', 'OK');

    let itemId = null;
    if (cartParsed && cartParsed.success && cartParsed.data && Array.isArray(cartParsed.data.items) && cartParsed.data.items.length > 0) {
      itemId = cartParsed.data.items[0].id;
    }

    // 6. Update item quantity if item ID found
    if (itemId) {
      const updatePayload = JSON.stringify({
        quantity: 2,
      });
      const updateRes = http.patch(`${cleanBaseUrl}/api/v1/cart/items/${itemId}`, updatePayload, authParams);
      validateCartResponse(updateRes, 'update_item', 'OK');
    }

    // 7. Clear cart at the end
    const clearFinalRes = http.del(`${cleanBaseUrl}/api/v1/cart`, null, authParamsNoBody);
    validateCartResponse(clearFinalRes, 'clear_final', 'Cart cleared');

  } else {
    // Fallback: Just fetch empty cart and clear it
    const cartRes = http.get(`${cleanBaseUrl}/api/v1/cart`, authParamsNoBody);
    validateCartResponse(cartRes, 'get_cart_empty', 'OK');

    const clearFinalRes = http.del(`${cleanBaseUrl}/api/v1/cart`, null, authParamsNoBody);
    validateCartResponse(clearFinalRes, 'clear_final_empty', 'Cart cleared');
  }

  // Pacing delay (1s) between iterations
  sleep(1);
}

function validateCartResponse(response, stageName, expectedMessage) {
  let isJson = false;
  let jsonParsed = null;
  try {
    jsonParsed = JSON.parse(response.body);
    isJson = true;
  } catch (e) {}

  const contentType = response.headers['Content-Type'] || response.headers['content-type'] || '';
  const isHtml = response.body && response.body.trim().toLowerCase().startsWith('<!doctype html>');

  check(response, {
    [`[cart_${stageName}] status is 200/201`]: (r) => r.status === 200 || r.status === 201,
    [`[cart_${stageName}] is JSON content-type`]: () => contentType.indexOf('application/json') !== -1,
    [`[cart_${stageName}] is not HTML`]: () => !isHtml,
    [`[cart_${stageName}] success indicator is true`]: () => isJson && jsonParsed && jsonParsed.success === true,
    [`[cart_${stageName}] envelope fields are correct`]: () => isJson && jsonParsed && ('data' in jsonParsed) && ('message' in jsonParsed),
    [`[cart_${stageName}] response message matches`]: () => isJson && jsonParsed && jsonParsed.message === expectedMessage,
    [`[cart_${stageName}] has no parsing failures`]: () => isJson,
    [`[cart_${stageName}] response duration below threshold`]: (r) => r.timings.duration < 500,
    [`[cart_${stageName}] has no server errors`]: (r) => r.status < 500,
  });

  return jsonParsed;
}

