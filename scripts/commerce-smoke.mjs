const baseUrl = String(process.env.LOAD_TEST_BASE_URL || process.argv[2] || "").replace(/\/$/, "");
const requestedConcurrency = Number(process.env.LOAD_TEST_CONCURRENCY || process.argv[3] || 15);
const concurrency = Math.max(1, Math.min(Number.isFinite(requestedConcurrency) ? Math.round(requestedConcurrency) : 15, 50));
const rounds = Math.max(1, Math.min(Number(process.env.LOAD_TEST_ROUNDS || 4), 10));

if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
  console.error("Usage: LOAD_TEST_BASE_URL=https://example.com node scripts/commerce-smoke.mjs");
  process.exit(1);
}

const endpoints = [
  "/api/products?homepage=true",
  "/api/products?slug=google-fitbit-air",
];

async function hit(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { "User-Agent": "ORVIX-Commerce-Smoke/1.0" },
      signal: controller.signal,
      cache: "no-store",
    });
    await response.arrayBuffer();
    return {
      path,
      ok: response.ok,
      status: response.status,
      ms: performance.now() - started,
    };
  } catch (error) {
    return {
      path,
      ok: false,
      status: 0,
      ms: performance.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

const results = [];
for (let round = 0; round < rounds; round += 1) {
  const batch = Array.from({ length: concurrency }, (_, index) =>
    hit(endpoints[index % endpoints.length])
  );
  results.push(...(await Promise.all(batch)));
}

const sorted = results.map((result) => result.ms).sort((a, b) => a - b);
const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))] || 0;
const failures = results.filter((result) => !result.ok);
const statuses = results.reduce((map, result) => {
  map[result.status] = (map[result.status] || 0) + 1;
  return map;
}, {});

console.log(JSON.stringify({
  baseUrl,
  concurrency,
  rounds,
  requests: results.length,
  successful: results.length - failures.length,
  failed: failures.length,
  failureRate: Number((failures.length / Math.max(results.length, 1)).toFixed(4)),
  latencyMs: {
    p50: Math.round(percentile(0.5)),
    p95: Math.round(percentile(0.95)),
    p99: Math.round(percentile(0.99)),
    max: Math.round(sorted[sorted.length - 1] || 0),
  },
  statuses,
  sampleFailures: failures.slice(0, 5),
}, null, 2));

const failureRate = failures.length / Math.max(results.length, 1);
if (failureRate > 0.05 || percentile(0.95) > 3000) {
  console.error("Commerce smoke test did not meet the reliability threshold.");
  process.exit(2);
}
