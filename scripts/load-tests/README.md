# Load Testing

k6 scripts for load testing InstantMed before launch.

## Prerequisites

```bash
brew install k6
```

## Scripts

| Script | What it tests | Target |
|--------|--------------|--------|
| `happy-path.js` | Full patient journey: homepage → service hub → intake flow → health API | p95 < 2s, 50 VUs |
| `api-endpoints.js` | API routes under load: health, availability, queue, certificates | p95 < 500ms, 100 VUs |
| `webhook-storm.js` | Simulated Stripe webhook burst (idempotency + dead letter queue) | 0 duplicates, 0 500s |

## Usage

```bash
# Against staging/preview
k6 run scripts/load-tests/happy-path.js --env BASE_URL=https://preview.instantmed.com.au

# Against local dev
k6 run scripts/load-tests/happy-path.js --env BASE_URL=http://localhost:3000

# With custom VU count
k6 run scripts/load-tests/api-endpoints.js --env BASE_URL=https://preview.instantmed.com.au --vus 100 --duration 5m
```

## Interpreting Results

- **http_req_duration p95 < 2s**: Acceptable for page loads
- **http_req_duration p95 < 500ms**: Target for API endpoints
- **http_req_failed < 1%**: Error rate threshold
- **checks pass rate > 99%**: Response validation
