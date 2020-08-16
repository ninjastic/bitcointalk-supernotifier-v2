import axios from 'axios';
import iconv from 'iconv-lite';

const api = axios.create({
  baseURL: 'https://bitcointalk.org',
  timeout: 5000,
  headers: {
    Cookie: process.env.BITCOINTALK_COOKIE,
  },
  responseType: 'arraybuffer',
});

api.interceptors.response.use(response => {
  const utf8String = iconv.decode(response.data, 'ISO-8859-1');

  response.data = utf8String;

  return response;
});

export default api;
