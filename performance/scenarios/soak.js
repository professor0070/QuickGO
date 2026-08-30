import runner from '../scripts/load_runner.js';

export const options = {
  vus: 20,
  duration: '30m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    http_req_duration: ['p(99)<1000'],
  },
};

export default runner;
