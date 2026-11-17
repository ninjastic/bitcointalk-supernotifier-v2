import axios, {
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import iconv from 'iconv-lite';
import UserAgent from 'user-agents';

const INTERVAL_MS = 1000;

export const api = axios.create({
  baseURL: 'https://bitcointalk.org',
  timeout: 10_000,
  headers: {
    Cookie: process.env.BITCOINTALK_COOKIE || '',
    'User-Agent': new UserAgent().toString(),
    'Cache-Control': 'no-cache',
  },
  responseType: 'arraybuffer',
  responseEncoding: 'binary',
});

const requestAdapter = axios.getAdapter(api.defaults.adapter);
type QueuedRequest = {
  config: InternalAxiosRequestConfig;
  waiters: Array<{
    config: InternalAxiosRequestConfig;
    resolve: (response: AxiosResponse) => void;
    reject: (error: unknown) => void;
  }>;
};
const requestQueue: QueuedRequest[] = [];
let requestInFlight = false;
let lastRequestAt = 0;
let requestTimer: ReturnType<typeof setTimeout> | undefined;

const dispatchNextRequest = () => {
  if (requestInFlight || requestQueue.length === 0) return;

  const delay = Math.max(0, lastRequestAt + INTERVAL_MS - Date.now());
  if (delay > 0) {
    requestTimer ??= setTimeout(() => {
      requestTimer = undefined;
      dispatchNextRequest();
    }, delay);
    return;
  }

  const request = requestQueue.shift()!;
  requestInFlight = true;
  lastRequestAt = Date.now();

  Promise.resolve()
    .then(() => requestAdapter(request.config))
    .then(
      (response) =>
        request.waiters.forEach((waiter) => waiter.resolve({ ...response, config: waiter.config })),
      (error) => request.waiters.forEach((waiter) => waiter.reject(error)),
    )
    .finally(() => {
      requestInFlight = false;
      dispatchNextRequest();
    });
};

const isRecentPostsRequest = (config: InternalAxiosRequestConfig) =>
  config.url === 'index.php?action=recent';

const queuedAdapter: AxiosAdapter = (config) =>
  new Promise((resolve, reject) => {
    if (isRecentPostsRequest(config)) {
      const queuedRecentRequest = requestQueue.find(({ config: queuedConfig }) =>
        isRecentPostsRequest(queuedConfig),
      );
      if (queuedRecentRequest) {
        queuedRecentRequest.waiters.push({ config, resolve, reject });
        return;
      }
    }

    const request = { config, waiters: [{ config, resolve, reject }] };
    if (isRecentPostsRequest(config)) requestQueue.unshift(request);
    else requestQueue.push(request);
    dispatchNextRequest();
  });

api.defaults.adapter = queuedAdapter;

export const uptimeApi = axios.create({
  baseURL: 'https://betteruptime.com/api/v1',
});

api.interceptors.response.use((response) => {
  response.data = iconv.decode(response.data, 'WINDOWS-1252');
  return response;
});

export default api;
