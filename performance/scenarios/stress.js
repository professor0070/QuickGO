import runner from '../scripts/load_runner.js';

export const options = {
  vus: 100,
  duration: '10m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    http_req_duration: ['p(99)<2000'],
  },
};

export default runner;
