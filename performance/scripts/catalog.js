import http from 'k6/http';
import { check, fail } from 'k6';

// Reusable catalog browsing flow
export function browseCatalog(baseUrl, serviceZoneId) {
  // 1. List categories
  const catRes = http.get(`${baseUrl}/catalog/categories`);
  const catOk = check(catRes, {
    'catalog/categories status is 200': (r) => r.status === 200,
    'catalog/categories returns categories array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    }
  });

  if (!catOk) {
    fail(`Failed to list categories. Status: ${catRes.status}, Body: ${catRes.body}`);
  }

  const categories = JSON.parse(catRes.body).data;
  const categoryCode = categories.length > 0 ? categories[0].code : 'RESTAURANT_FOOD';

  // 2. List vendors in service zone
  const vendorsUrl = `${baseUrl}/catalog/vendors?category=${categoryCode}&service_zone_id=${serviceZoneId}`;
  const venRes = http.get(vendorsUrl);
  const venOk = check(venRes, {
    'catalog/vendors status is 200': (r) => r.status === 200,
    'catalog/vendors returns vendors list': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    }
  });

  if (!venOk) {
    fail(`Failed to list vendors. Url: ${vendorsUrl}, Status: ${venRes.status}, Body: ${venRes.body}`);
  }

  const vendors = JSON.parse(venRes.body).data;
  if (vendors.length === 0) {
    return { vendors: [], products: [] };
  }

  // 3. Select first vendor and get details
  const vendor = vendors[0];
  const detailRes = http.get(`${baseUrl}/catalog/vendors/${vendor.id}`);
  check(detailRes, {
    'catalog/vendors/:id status is 200': (r) => r.status === 200,
    'catalog/vendors/:id success is true': (r) => {
      try {
        return JSON.parse(r.body).success === true;
      } catch (e) {
        return false;
      }
    }
  });

  // 4. List products for vendor
  const prodRes = http.get(`${baseUrl}/catalog/products?vendor_id=${vendor.id}&limit=20`);
  const prodOk = check(prodRes, {
    'catalog/products status is 200': (r) => r.status === 200,
    'catalog/products returns list': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    }
  });

  if (!prodOk) {
    fail(`Failed to list products. Status: ${prodRes.status}, Body: ${prodRes.body}`);
  }

  const products = JSON.parse(prodRes.body).data;

  return {
    vendors,
    selectedVendor: vendor,
    products
  };
}

// Standalone execution options
export const options = {
  vus: 5,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<400'],
  },
};

export default function () {
  const baseUrl = __ENV.API_BASE_URL || 'http://localhost:3000/api/v1';
  const serviceZoneId = __ENV.SERVICE_ZONE_ID || '00000000-0000-4000-8000-000000000001';

  // Enforce safety rules
  if (__ENV.LOAD_TEST_ENV !== 'staging' || __ENV.ALLOW_LOAD_TEST !== 'true') {
    fail('ABORTING: Staging load test flags not set (LOAD_TEST_ENV=staging and ALLOW_LOAD_TEST=true required)');
  }

  browseCatalog(baseUrl, serviceZoneId);
}
