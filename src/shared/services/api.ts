import axios from 'axios';
import { add, isBefore } from 'date-fns';
import iconv from 'iconv-lite';
import UserAgent from 'user-agents';

const MAX_REQUESTS_COUNT = 1;
const INTERVAL_MS = 1000;
let PENDING_REQUESTS = 0;
let WAITING = false;
let LAST_REQUEST = null;

export const api = axios.create({
  baseURL: 'https://bitcointalk.org',
  timeout: 10_000,
  headers: {
    'Cookie': process.env.BITCOINTALK_COOKIE || '',
    'User-Agent': new UserAgent().toString(),
    'Cache-Control': 'no-cache',
  },
  responseType: 'arraybuffer',
  responseEncoding: 'binary',
});

export const uptimeApi = axios.create({
  baseURL: 'https://betteruptime.com/api/v1',
});

api.interceptors.request.use(
  config =>
    new Promise((resolve) => {
      const interval = setInterval(() => {
        const NEXT_ALLOWED_REQUEST = add(LAST_REQUEST, {
          seconds: INTERVAL_MS / 1000,
        });

        if (config.url === 'index.php?action=recent' && isBefore(NEXT_ALLOWED_REQUEST, LAST_REQUEST)) {
          WAITING = true;
          PENDING_REQUESTS += 1;
          LAST_REQUEST = new Date();

          clearInterval(interval);
          resolve(config);
        }
        else if (PENDING_REQUESTS < MAX_REQUESTS_COUNT && !WAITING) {
          PENDING_REQUESTS += 1;
          LAST_REQUEST = new Date();

          clearInterval(interval);
          resolve(config);
        }
      }, INTERVAL_MS);
    }),
);

api.interceptors.response.use(
  (response) => {
    PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1);

    if (response.config.url === 'index.php?action=recent') {
      WAITING = false;
    }

    response.data = iconv.decode(response.data, 'WINDOWS-1252');
    return Promise.resolve(response);
  },
  (error) => {
    PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1);

    WAITING = false;

    return Promise.reject(error);
  },
);

export default api;
