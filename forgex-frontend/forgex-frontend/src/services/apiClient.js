import axios from 'axios';
import { clearSession, getToken } from '../utils/session';

export const UNAUTHORIZED_EVENT = 'forgex:unauthorized';

const apiClient = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, ''),
  // Render's free tier sleeps after 15 minutes and can take up to a minute to wake.
  timeout: 60000,
  withCredentials: true, // backend also sets the JWT cookie; harmless with Bearer
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let sessionCheck = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    if (status === 401 && !url.includes('/api/auth/signin')) {
      if (url.includes('/api/auth/user')) {
        // The session check itself failed: the token really is gone.
        clearSession();
        window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
      } else {
        // A backend error can surface as 401 through Spring's /error forward.
        // Confirm with the server before ending the session; parallel requests
        // share one check.
        sessionCheck ??= apiClient
          .get('/api/auth/user')
          .then(() => true)
          .catch((e) => e.response?.status !== 401)
          .finally(() => {
            setTimeout(() => { sessionCheck = null; }, 0);
          });

        const stillValid = await sessionCheck;
        if (!stillValid) {
          clearSession();
          window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
        }
      }
    }
    return Promise.reject(error);
  },
);

// Some backend endpoints currently answer with 302 FOUND instead of 200 OK
// (ProductController keyword/category/gender). The body is still the result,
// so accept 302 for those calls only.
export const accept302 = { validateStatus: (s) => (s >= 200 && s < 300) || s === 302 };

export default apiClient;
