/**
 * Administrative endpoints. Every call carries the admin's token and the backend enforces
 * ROLE_ADMIN on /api/admin/** (security/WebSecurityConfig.java); the admin UI never assumes access.
 */
import { api, saveBlob } from "@/lib/api/client";
import type { CouponDTO, CouponInput, OrderDTO, OrderStatus, ProductDTO, ProductInput } from "@/lib/api/types";

export const adminProductApi = {
  create: (p: ProductInput) => api<ProductDTO>("/api/admin/products", { method: "POST", body: p }),
  /** Full replacement of the editable fields (name, slug, description, enums, prices, stock, active). */
  update: (id: number, p: ProductInput) => api<ProductDTO>(`/api/admin/products/${id}`, { method: "PUT", body: p }),
  /** Multipart field "image"; the backend stores it on Cloudinary and saves the secure URL. */
  uploadImage: (id: number, file: Blob, filename: string) => {
    const form = new FormData();
    form.append("image", file, filename);
    return api<ProductDTO>(`/api/admin/products/${id}/image`, { method: "PUT", body: form, timeoutMs: 120_000 });
  },
  /** NB: the backend maps delete under /api/public (no role check there); we still send the admin token. */
  remove: (id: number) => api<string>(`/api/public/products/${id}`, { method: "DELETE" }),
};

export const adminOrderApi = {
  all: () => api<OrderDTO[]>("/api/admin/orders"),
  setStatus: (id: number, status: OrderStatus) => api<OrderDTO>(`/api/admin/orders/${id}/status`, { method: "PATCH", query: { status } }),
  downloadInvoice: async (id: number) => saveBlob(await api<Blob>(`/api/admin/orders/${id}/invoice`, { responseType: "blob" }), `ForgeX-invoice-${id}.pdf`),
};

export const adminCouponApi = {
  all: () => api<CouponDTO[]>("/api/admin/coupons"),
  create: (c: CouponInput) => api<CouponDTO>("/api/admin/coupons", { method: "POST", body: c }),
  /** The code itself can't be changed after creation. */
  update: (id: number, c: CouponInput) => api<CouponDTO>(`/api/admin/coupons/${id}`, { method: "PUT", body: c }),
  /** Soft delete: sets active=false. */
  deactivate: (id: number) => api<void>(`/api/admin/coupons/${id}`, { method: "DELETE" }),
};
