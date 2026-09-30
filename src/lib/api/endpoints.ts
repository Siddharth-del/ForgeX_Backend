/**
 * Typed wrappers for every Spring Boot endpoint the storefront uses.
 * URLs and payloads match the controllers exactly; nothing here is invented.
 */
import { api } from "./client";
import type {
  Address,
  Cart,
  CheckoutRequest,
  CheckoutResponse,
  Coupon,
  Order,
  OrderStatus,
  PaymentVerifyRequest,
  PriceBreakdown,
  Product,
  ProductInput,
  ProductPage,
  User,
} from "../types";

/* ---------------------------------- Auth --------------------------------- */
export const authApi = {
  /** AuthController.getUserDetails — 401 when signed out */
  me: () => api<User>("/api/auth/user", { cache: "no-store" }),
  signIn: (email: string, password: string) =>
    api<User>("/api/auth/signin", { method: "POST", body: { email: email.trim().toLowerCase(), password } }),
  signUp: (username: string, email: string, password: string) =>
    api<{ message: string }>("/api/auth/signup", {
      method: "POST",
      body: { username: username.trim(), email: email.trim().toLowerCase(), password },
    }),
  signOut: () => api<{ message: string }>("/api/auth/signout", { method: "POST" }),

  // ForgotPassword controller — email/otp travel as query params, as the backend expects
  requestOtp: (email: string) =>
    api<string>("/api/auth/forgot/password", { method: "POST", query: { email: email.trim().toLowerCase() } }),
  verifyOtp: (email: string, otp: string) =>
    api<string>("/api/auth/verify-otp", { method: "POST", query: { email: email.trim().toLowerCase(), otp } }),
  resetPassword: (email: string, password: string, confirmPassword: string) =>
    api<string>("/api/auth/reset-password", {
      method: "POST",
      query: { email: email.trim().toLowerCase() },
      body: { password, confirmPassword },
    }),
};

/* -------------------------------- Products ------------------------------- */
export interface PageQuery {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const productsApi = {
  list: (q: PageQuery = {}, init?: { next?: { revalidate?: number; tags?: string[] } }) =>
    api<ProductPage>("/api/public/products", { query: { ...q }, ...init }),
  search: (keyword: string, q: PageQuery = {}) =>
    api<ProductPage>(`/api/public/products/keyword/${encodeURIComponent(keyword)}`, { query: { ...q } }),

  // Admin
  create: (p: ProductInput) => api<Product>("/api/admin/products", { method: "POST", body: p }),
  update: (id: number, p: ProductInput) => api<Product>(`/api/admin/products/${id}`, { method: "PUT", body: p }),
  uploadImage: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return api<Product>(`/api/admin/products/${id}/image`, { method: "PUT", body: fd });
  },
  /** Lives under /api/public on the backend but is now admin-only in WebSecurityConfig */
  remove: (id: number) => api<string>(`/api/public/products/${id}`, { method: "DELETE" }),
};

/* ---------------------------------- Cart --------------------------------- */
export const cartApi = {
  get: () => api<Cart>("/api/carts/users/cart", { cache: "no-store" }),
  add: (productId: number, quantity: number) =>
    api<Cart>(`/api/carts/products/${productId}/quantity/${quantity}`, { method: "POST" }),
  /** operation "add" → +1, "delete" → −1 (removes the line at 0) */
  step: (productId: number, operation: "add" | "delete") =>
    api<Cart>(`/api/cart/products/${productId}/quantity/${operation}`, { method: "PUT" }),
  remove: (cartId: number, productId: number) =>
    api<string>(`/api/carts/${cartId}/product/${productId}`, { method: "DELETE" }),
};

/* -------------------------------- Addresses ------------------------------ */
export const addressApi = {
  mine: () => api<Address[]>("/api/users/addresses", { cache: "no-store" }),
  create: (a: Address) => api<Address>("/api/addresses", { method: "POST", body: a }),
  update: (id: number, a: Address) => api<Address>(`/api/addresses/${id}`, { method: "PUT", body: a }),
  remove: (id: number) => api<string>(`/api/addresses/${id}`, { method: "DELETE" }),
};

/* -------------------------------- Checkout ------------------------------- */
export const checkoutApi = {
  preview: (coupon?: string) =>
    api<PriceBreakdown>("/api/checkout/preview", { query: { coupon: coupon?.trim() || undefined }, cache: "no-store" }),
  place: (req: CheckoutRequest) => api<CheckoutResponse>("/api/checkout", { method: "POST", body: req }),
  verify: (req: PaymentVerifyRequest) =>
    api<CheckoutResponse>("/api/payments/verify", { method: "POST", body: req }),
};

/* --------------------------------- Orders -------------------------------- */
export const ordersApi = {
  mine: () => api<Order[]>("/api/orders", { cache: "no-store" }),
  one: (id: number) => api<Order>(`/api/orders/${id}`, { cache: "no-store" }),
  invoicePath: (id: number) => `/api/orders/${id}/invoice`,

  // Admin
  all: () => api<Order[]>("/api/admin/orders", { cache: "no-store" }),
  setStatus: (id: number, status: OrderStatus) =>
    api<Order>(`/api/admin/orders/${id}/status`, { method: "PATCH", query: { status } }),
  adminInvoicePath: (id: number) => `/api/admin/orders/${id}/invoice`,
};

/* --------------------------------- Coupons ------------------------------- */
export const couponsApi = {
  all: () => api<Coupon[]>("/api/admin/coupons", { cache: "no-store" }),
  create: (c: Coupon) => api<Coupon>("/api/admin/coupons", { method: "POST", body: c }),
  update: (id: number, c: Coupon) => api<Coupon>(`/api/admin/coupons/${id}`, { method: "PUT", body: c }),
  deactivate: (id: number) => api<null>(`/api/admin/coupons/${id}`, { method: "DELETE" }),
};
