import { fail } from 'k6';

// Safety checks to prevent running against production or invalid configurations
export function verifySafety(baseUrl, runId) {
  const env = __ENV.LOAD_TEST_ENV;
  const allow = __ENV.ALLOW_LOAD_TEST;
  
  if (env !== 'staging') {
    fail('SAFETY BLOCKER: LOAD_TEST_ENV must be set to "staging". Actual: ' + (env || 'undefined'));
  }

  if (allow !== 'true') {
    fail('SAFETY BLOCKER: ALLOW_LOAD_TEST must be set to "true". Actual: ' + (allow || 'undefined'));
  }

  if (!runId) {
    fail('SAFETY BLOCKER: LOADTEST_RUN_ID must be supplied in environment variables.');
  }

  // Parse hostname from target URL
  let hostname = '';
  try {
    // Basic extraction to avoid URL dependency
    const parts = baseUrl.split('://');
    const hostPort = parts[1] ? parts[1].split('/')[0] : parts[0].split('/')[0];
    hostname = hostPort.split(':')[0];
  } catch (e) {
    fail('SAFETY BLOCKER: Failed to parse hostname from URL: ' + baseUrl);
  }

  // Strict staging hostname allowlist
  const allowlist = ['localhost', '127.0.0.1', '0.0.0.0'];
  if (!allowlist.includes(hostname)) {
    fail('SAFETY BLOCKER: Hostname "' + hostname + '" is not in the approved staging allowlist: ' + JSON.stringify(allowlist));
  }

  // Anti-production host signature checks
  const lowerHost = hostname.toLowerCase();
  const prodSignatures = ['prod', 'production', 'api.quickgo', 'quickgo.example', 'amazonaws', 'supabase', 'elephantsql'];
  for (let i = 0; i < prodSignatures.length; i++) {
    if (lowerHost.indexOf(prodSignatures[i]) !== -1) {
      fail('SAFETY BLOCKER: Prohibited production-like signature detected in hostname: ' + prodSignatures[i]);
    }
  }
}
