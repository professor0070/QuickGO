# QuickGO Staging Load-Test Framework (Version 4.0)

This directory contains a safe, isolated staging load-testing framework designed to perform capacity analysis against QuickGO staging environments without affecting production assets, databases, or third-party integrations (FCM, SMS, Razorpay).

## Directory Structure

```txt
performance/
  README.md                 # Main framework documentation
  config/
    staging.json            # Active configuration parameters
    staging.example.json    # Template staging configuration
  scripts/
    safety.js               # Runtime verification checks
    auth.js                 # k6 auth login helper
    catalog.js              # k6 catalog browsing flows
    orders.js               # k6 cart and order flow
    support.js              # k6 support ticket flows
    load_runner.js          # Core coordinator combining scenarios
    seed-staging.ts         # Database manager for synthetic VUs
  scenarios/
    smoke.js                # Stage 1: 5 VUs, 2 minutes
    baseline.js             # Stage 2: 10 VUs, 5 minutes
    normal.js               # Stage 3: 20 VUs, 10 minutes
    peak.js                 # Stage 4: 50 VUs, 10 minutes
    stress.js               # Stage 5: 100 VUs, 10 minutes
    soak.js                 # Stage 6: 20 VUs, 30 minutes
  results/
    .gitkeep                # Test report placeholder
```

---

## 1. Safety Safeguards

The framework implements strict, fail-closed mechanisms:

1. **Environment Variables Gate:** Execution halts immediately unless the following values are set in the runtime environment:
   - `LOAD_TEST_ENV=staging`
   - `ALLOW_LOAD_TEST=true`
   - `OTP_PROVIDER=mock`
   - `LOADTEST_RUN_ID=<run_identifier>` (a unique identifier for tracking records, e.g. `run_01`)
2. **Database Allowlist:** The database seeding utility scans `DATABASE_URL` and checks the database host. Only allowlisted hosts (`localhost`, `127.0.0.1`, `database`, `172.17.0.1`, `172.18.0.1`) are permitted. Production keywords trigger instant termination.
3. **Endpoint Allowlist:** `safety.js` checks the target hostname in k6. Only `localhost`, `127.0.0.1`, and `0.0.0.0` are permitted target domains.
4. **Third-Party Mocking:** Bypasses real payments (Razorpay sandbox mode) and SMS providers (`OTP_PROVIDER=mock`).

---

## 2. Running Database Seeding & Cleanups

Always execute these tasks from the `backend` workspace or repository root.

### Set Environment Variables (PowerShell example)
```powershell
$env:LOAD_TEST_ENV="staging"
$env:ALLOW_LOAD_TEST="true"
$env:OTP_PROVIDER="mock"
$env:LOADTEST_RUN_ID="run_01"
$env:DATABASE_URL="postgresql://postgres:Admin12_secret_password_here@localhost:5432/quickgo_production?sslmode=disable"
```

### Preflight Seeding (Dry Run)
Check how many rows would be created:
```bash
npx tsx performance/scripts/seed-staging.ts seed --dry-run
```

### Execute Seeding
```bash
npx tsx performance/scripts/seed-staging.ts seed
```

### Preflight Cleanup (Dry Run)
Inspect rows targeted for removal mapping to `LOADTEST_RUN_ID`:
```bash
npx tsx performance/scripts/seed-staging.ts cleanup --dry-run
```

### Execute Cleanup
```bash
npx tsx performance/scripts/seed-staging.ts cleanup
```

---

## 3. Running Scenarios

Ensure k6 is installed locally. Specify the required environment flags.

### Stage 1 - Smoke Test (5 VUs, 2m)
```bash
k6 run -e LOAD_TEST_ENV=staging -e ALLOW_LOAD_TEST=true -e LOADTEST_RUN_ID=run_01 performance/scenarios/smoke.js
```

### Stage 2 - Baseline Test (10 VUs, 5m)
```bash
k6 run -e LOAD_TEST_ENV=staging -e ALLOW_LOAD_TEST=true -e LOADTEST_RUN_ID=run_01 performance/scenarios/baseline.js
```

### Stage 3 - Normal Test (20 VUs, 10m)
```bash
k6 run -e LOAD_TEST_ENV=staging -e ALLOW_LOAD_TEST=true -e LOADTEST_RUN_ID=run_01 performance/scenarios/normal.js
```

### Stage 4 - Expected Peak (50 VUs, 10m)
```bash
k6 run -e LOAD_TEST_ENV=staging -e ALLOW_LOAD_TEST=true -e LOADTEST_RUN_ID=run_01 performance/scenarios/peak.js
```

### Stage 5 - Initial Stress (100 VUs, 10m)
```bash
k6 run -e LOAD_TEST_ENV=staging -e ALLOW_LOAD_TEST=true -e LOADTEST_RUN_ID=run_01 performance/scenarios/stress.js
```

### Stage 6 - Soak Test (20 VUs, 30m)
```bash
k6 run -e LOAD_TEST_ENV=staging -e ALLOW_LOAD_TEST=true -e LOADTEST_RUN_ID=run_01 performance/scenarios/soak.js
```
