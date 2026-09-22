import axios from 'axios';
import { clearSession, getToken } from '../utils/session';

export const UNAUTHORIZED_EVENT = 'forgex:unauthorized';

const apiClient = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, ''),
  timeout: 15000,
  withCredentials: true, // backend also sets the JWT cookie; harmless with Bearer
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    // A 401 outside sign-in means the session is gone or expired.
    if (status === 401 && !url.includes('/api/auth/signin')) {
      clearSession();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

// Some backend endpoints currently answer with 302 FOUND instead of 200 OK
// (ProductController keyword/category/gender). The body is still the result,
// so accept 302 for those calls only.
export const accept302 = { validateStatus: (s) => (s >= 200 && s < 300) || s === 302 };

export default apiClient;
