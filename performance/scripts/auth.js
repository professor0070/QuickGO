import http from 'k6/http';
import { check, fail } from 'k6';

// Helper to log in a user and return their access token
export function login(baseUrl, phone, otpCode) {
  // 1. Send OTP
  const sendRes = http.post(
    `${baseUrl}/auth/send-otp`,
    JSON.stringify({ phone: phone, purpose: 'LOGIN' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const sendOk = check(sendRes, {
    'send-otp status is 200/201': (r) => r.status === 200 || r.status === 201,
    'send-otp success is true': (r) => {
      try {
        return JSON.parse(r.body).success === true;
      } catch (e) {
        return false;
      }
    }
  });

  if (!sendOk) {
    fail(`Failed to send OTP to ${phone}. Status: ${sendRes.status}, Body: ${sendRes.body}`);
  }

  // 2. Verify OTP
  const verifyRes = http.post(
    `${baseUrl}/auth/verify-otp`,
    JSON.stringify({ phone: phone, otp: otpCode }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const verifyOk = check(verifyRes, {
    'verify-otp status is 200/201': (r) => r.status === 200 || r.status === 201,
    'verify-otp returns access_token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!body.data.access_token;
      } catch (e) {
        return false;
      }
    }
  });

  if (!verifyOk) {
    fail(`Failed to verify OTP for ${phone}. Status: ${verifyRes.status}, Body: ${verifyRes.body}`);
  }

  const token = JSON.parse(verifyRes.body).data.access_token;
  return token;
}

// Standalone execution options
export const options = {
  vus: 5,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const baseUrl = __ENV.API_BASE_URL || 'http://localhost:3000/api/v1';
  const otpCode = __ENV.MOCK_OTP_CODE || '123456';
  
  // Enforce safety rules
  if (__ENV.LOAD_TEST_ENV !== 'staging' || __ENV.ALLOW_LOAD_TEST !== 'true') {
    fail('ABORTING: Staging load test flags not set (LOAD_TEST_ENV=staging and ALLOW_LOAD_TEST=true required)');
  }
  
  const vuIndex = __VU;
  const phone = `+919000000${String(vuIndex).padStart(3, '0')}`;
  
  const token = login(baseUrl, phone, otpCode);
  
  // Verify token works
  const meRes = http.get(`${baseUrl}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  check(meRes, {
    'auth/me status is 200': (r) => r.status === 200,
    'auth/me returns valid user info': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data.phone === phone;
      } catch (e) {
        return false;
      }
    }
  });
}
