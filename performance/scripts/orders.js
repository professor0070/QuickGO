import http from 'k6/http';
import { check, fail } from 'k6';
import { browseCatalog } from './catalog.js';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function createOrderFlow(baseUrl, token, serviceZoneId, runId) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Request-Id': generateUUID()
  };

  // 1. Get addresses
  const addrRes = http.get(`${baseUrl}/customer/addresses`, { headers });
  const addrOk = check(addrRes, {
    'customer/addresses status is 200': (r) => r.status === 200,
    'customer/addresses has items': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data) && body.data.length > 0;
      } catch (e) {
        return false;
      }
    }
  });

  if (!addrOk) {
    fail(`Failed to find customer address. Status: ${addrRes.status}, Body: ${addrRes.body}`);
  }

  const addresses = JSON.parse(addrRes.body).data;
  const addressId = addresses[0].id;

  // 2. Browse catalog to find a product
  const catalog = browseCatalog(baseUrl, serviceZoneId);
  if (!catalog.selectedVendor || catalog.products.length === 0) {
    fail('No vendor or products available in service zone.');
  }

  const vendorId = catalog.selectedVendor.id;
  const product = catalog.products[0];

  // 3. Clear cart
  const clearRes = http.del(`${baseUrl}/cart`, null, { headers });
  check(clearRes, { 'clear cart status is 200': (r) => r.status === 200 });

  // 4. Add item to cart
  const cartItemPayload = JSON.stringify({
    vendor_id: vendorId,
    product_id: product.id,
    quantity: 1
  });

  const cartRes = http.post(`${baseUrl}/cart/items`, cartItemPayload, { headers });
  const cartOk = check(cartRes, {
    'cart/items status is 200/201': (r) => r.status === 200 || r.status === 201,
    'cart/items success is true': (r) => {
      try {
        return JSON.parse(r.body).success === true;
      } catch (e) {
        return false;
      }
    }
  });

  if (!cartOk) {
    fail(`Failed to add item to cart. Status: ${cartRes.status}, Body: ${cartRes.body}`);
  }

  // 5. Get active cart
  const activeCartRes = http.get(`${baseUrl}/cart`, { headers });
  const activeCartOk = check(activeCartRes, {
    'cart active status is 200': (r) => r.status === 200,
    'cart has active id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && !!body.data.id;
      } catch (e) {
        return false;
      }
    }
  });

  if (!activeCartOk) {
    fail(`Failed to fetch active cart. Status: ${activeCartRes.status}, Body: ${activeCartRes.body}`);
  }

  const cartId = JSON.parse(activeCartRes.body).data.id;

  // 6. Create Order
  const orderHeaders = Object.assign({}, headers, {
    'Idempotency-Key': generateUUID()
  });

  const orderPayload = JSON.stringify({
    cart_id: cartId,
    address_id: addressId,
    payment_method: 'COD',
    customer_note: `LOADTEST_Order_${runId}`
  });

  const orderRes = http.post(`${baseUrl}/orders`, orderPayload, { headers: orderHeaders });
  const orderOk = check(orderRes, {
    'orders creation status is 200/201': (r) => r.status === 200 || r.status === 201,
    'orders response has order_id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && !!body.data.order_id;
      } catch (e) {
        return false;
      }
    }
  });

  if (!orderOk) {
    fail(`Failed to place order. Status: ${orderRes.status}, Body: ${orderRes.body}`);
  }

  const orderId = JSON.parse(orderRes.body).data.order_id;

  // 7. Get order detail
  const detailRes = http.get(`${baseUrl}/orders/${orderId}`, { headers });
  check(detailRes, {
    'orders/:id status is 200': (r) => r.status === 200,
    'orders/:id status matches PLACED': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data.status === 'PLACED';
      } catch (e) {
        return false;
      }
    }
  });

  return orderId;
}
