/**
 * ForgeX auth endpoints (AuthController + ForgotPassword in the Spring Boot backend).
 *
 *   POST /api/auth/signin            { email, password }            -> UserInfoResponse (with jwtToken)
 *   POST /api/auth/signup            { username, email, password }  -> { message }
 *   GET  /api/auth/user              (Bearer token)                 -> UserInfoResponse
 *   POST /api/auth/signout                                          -> { message }
 *   POST /api/auth/forgot/password?email=                           -> text
 *   POST /api/auth/verify-otp?email=&otp=                           -> text ("OTP Validate" | 400 "Invalid OTP")
 *   POST /api/auth/reset-password?email=&otp=  { password, confirmPassword } -> text (400 without a verified code)
 */
import { api } from "@/lib/api/client";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  roles: string[];
}

export interface UserInfoResponse extends AuthUser {
  jwtToken: string | null;
}

const normaliseEmail = (email: string) => email.trim().toLowerCase();

export const authApi = {
  signIn: (email: string, password: string) =>
    api<UserInfoResponse>("/api/auth/signin", { method: "POST", auth: false, body: { email: normaliseEmail(email), password } }),

  signUp: (username: string, email: string, password: string) =>
    api<{ message: string }>("/api/auth/signup", { method: "POST", auth: false, body: { username: username.trim(), email: normaliseEmail(email), password } }),

  currentUser: () => api<UserInfoResponse>("/api/auth/user", { timeoutMs: 20_000 }),

  signOut: () => api<{ message: string }>("/api/auth/signout", { method: "POST", timeoutMs: 10_000 }),

  requestPasswordReset: (email: string) =>
    api<string>("/api/auth/forgot/password", { method: "POST", auth: false, query: { email: normaliseEmail(email) } }),

  verifyOtp: (email: string, otp: string) =>
    api<string>("/api/auth/verify-otp", { method: "POST", auth: false, query: { email: normaliseEmail(email), otp: otp.trim() } }),

  /** `otp`: the code verified in the previous step; the backend requires it again before changing the password. */
  resetPassword: (email: string, otp: string, password: string, confirmPassword: string) =>
    api<string>("/api/auth/reset-password", { method: "POST", auth: false, query: { email: normaliseEmail(email), otp: otp.trim() }, body: { password, confirmPassword } }),
};

