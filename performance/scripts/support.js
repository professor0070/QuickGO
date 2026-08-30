import http from 'k6/http';
import { check, fail } from 'k6';

// Reusable support tickets flow
export function browseAndCreateSupport(baseUrl, token, runId) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 1. List support tickets
  const listRes = http.get(`${baseUrl}/support/tickets`, { headers });
  const listOk = check(listRes, {
    'support/tickets status is 200': (r) => r.status === 200,
    'support/tickets returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    }
  });

  if (!listOk) {
    fail(`Failed to list support tickets. Status: ${listRes.status}, Body: ${listRes.body}`);
  }

  // 2. Create support ticket
  const ticketPayload = JSON.stringify({
    subject: `LOADTEST_Support_Subject_${runId}`,
    description: `LOADTEST support ticket generated automatically during run ${runId}`,
    priority: 'LOW'
  });

  const createRes = http.post(`${baseUrl}/support/tickets`, ticketPayload, { headers });
  const createOk = check(createRes, {
    'support/tickets creation status is 200/201': (r) => r.status === 200 || r.status === 201,
    'support/tickets creation has ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && !!body.data.id;
      } catch (e) {
        return false;
      }
    }
  });

  if (!createOk) {
    fail(`Failed to create support ticket. Status: ${createRes.status}, Body: ${createRes.body}`);
  }

  const ticketId = JSON.parse(createRes.body).data.id;

  // 3. Get ticket detail
  const detailRes = http.get(`${baseUrl}/support/tickets/${ticketId}`, { headers });
  check(detailRes, {
    'support/tickets/:id status is 200': (r) => r.status === 200,
    'support/tickets/:id subject matches': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data.subject.indexOf(runId) !== -1;
      } catch (e) {
        return false;
      }
    }
  });
}
