import axios from 'axios';

const api = axios.create({
  baseURL: 'https://bitcointalk.org',
  timeout: 10000,
  headers: {
    Cookie: process.env.BITCOINTALK_COOKIE,
  },
  responseType: 'arraybuffer',
});

export default api;
