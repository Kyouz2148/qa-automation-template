export const profiles = {
  smoke: {
    vus: 2,
    duration: '10s',
    thresholds: {
      http_req_failed: ['rate<0.01'],
      http_req_duration: ['p(95)<250'],
      checks: ['rate>0.99'],
    },
  },
  load: {
    stages: [
      { duration: '10s', target: 10 },
      { duration: '25s', target: 25 },
      { duration: '10s', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.01'],
      http_req_duration: ['p(95)<300', 'p(99)<600'],
      checks: ['rate>0.99'],
    },
  },
  stress: {
    stages: [
      { duration: '10s', target: 20 },
      { duration: '20s', target: 50 },
      { duration: '20s', target: 80 },
      { duration: '10s', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.05'],
      http_req_duration: ['p(95)<500'],
      checks: ['rate>0.95'],
    },
  },
  spike: {
    stages: [
      { duration: '5s', target: 5 },
      { duration: '10s', target: 100 },
      { duration: '15s', target: 100 },
      { duration: '10s', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.05'],
      http_req_duration: ['p(95)<700'],
    },
  },
};

export function getProfileOptions(profileName) {
  const selected = profiles[profileName] || profiles.load;
  return {
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
    ...selected,
  };
}
