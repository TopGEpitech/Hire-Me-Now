// k6 load test. CI runs it against the production build.
//   k6 run -e BASE_URL=http://localhost:3000 load/k6-smoke.js
import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      stages: [
        { duration: "10s", target: 20 },
        { duration: "20s", target: 20 },
        { duration: "5s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
    checks: ["rate>0.99"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  check(http.get(`${BASE}/api/health`), { "health 200": (r) => r.status === 200 });
  check(http.get(`${BASE}/api/me`), { "me 200": (r) => r.status === 200 });
  check(http.get(`${BASE}/api/route?from=pallet`), { "route 200": (r) => r.status === 200 });
  // a visitor asking for private data must keep getting a 403 under load too
  // 403 is the right answer here, so tell k6 it's not a failed request
  const denied = http.get(`${BASE}/api/contact`, { responseCallback: http.expectedStatuses(403) });
  check(denied, { "contact 403": (r) => r.status === 403 });
  check(http.get(`${BASE}/`), { "home 200": (r) => r.status === 200 });
}
