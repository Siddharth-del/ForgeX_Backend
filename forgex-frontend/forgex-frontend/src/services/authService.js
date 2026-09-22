import apiClient from './apiClient';
import { mapUser } from './mappers';

// Endpoints: AuthController (/api/auth/**)

export async function login({ email, password }) {
  const { data } = await apiClient.post('/api/auth/signin', { email: email.trim().toLowerCase(), password });
  return { token: data.jwtToken, user: mapUser(data) };
}

/** SignupRequest: username (3–20), email (≤50), password (6–40). Role is always USER. */
export async function register({ username, email, password }) {
  const { data } = await apiClient.post('/api/auth/signup', {
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password,
  });
  return data; // { message }
}

export async function getCurrentUser() {
  const { data } = await apiClient.get('/api/auth/user');
  return mapUser(data);
}

export async function logout() {
  await apiClient.post('/api/auth/signout');
}
