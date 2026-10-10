/**
 * Administrative endpoints. Every call carries the admin's token and the backend enforces
 * ROLE_ADMIN on /api/admin/** (security/WebSecurityConfig.java); the admin UI never assumes access.
 */
import { api, saveBlob } from "@/lib/api/client";
import type { CouponDTO, CouponInput, OrderDTO, OrderStatus, ProductDTO, ProductInput } from "@/lib/api/types";
import { requireId } from "@/lib/ids";

export const adminProductApi = {
  create: (p: ProductInput) => api<ProductDTO>("/api/admin/products", { method: "POST", body: p }),
  /** Full replacement of the editable fields (name, slug, description, enums, prices, stock, active). */
  update: async (id: number, p: ProductInput) => api<ProductDTO>(`/api/admin/products/${requireId(id, "product")}`, { method: "PUT", body: p }),
  /** Multipart field "image"; the backend stores it on Cloudinary and saves the secure URL. */
  uploadImage: async (id: number, file: Blob, filename: string) => {
    const form = new FormData();
    form.append("image", file, filename);
    return api<ProductDTO>(`/api/admin/products/${requireId(id, "product")}/image`, { method: "PUT", body: form, timeoutMs: 120_000 });
  },
  /** ROLE_ADMIN. 409 when the product is in past orders (hide it instead). */
  remove: async (id: number) => api<string>(`/api/admin/products/${requireId(id, "product")}`, { method: "DELETE" }),
};

export const adminOrderApi = {
  all: () => api<OrderDTO[]>("/api/admin/orders"),
  setStatus: async (id: number, status: OrderStatus) => api<OrderDTO>(`/api/admin/orders/${requireId(id, "order")}/status`, { method: "PATCH", query: { status } }),
  downloadInvoice: async (id: number) => saveBlob(await api<Blob>(`/api/admin/orders/${requireId(id, "order")}/invoice`, { responseType: "blob" }), `ForgeX-invoice-${id}.pdf`),
};

export const adminCouponApi = {
  all: () => api<CouponDTO[]>("/api/admin/coupons"),
  create: (c: CouponInput) => api<CouponDTO>("/api/admin/coupons", { method: "POST", body: c }),
  /** The code itself can't be changed after creation. */
  update: async (id: number, c: CouponInput) => api<CouponDTO>(`/api/admin/coupons/${requireId(id, "coupon")}`, { method: "PUT", body: c }),
  /** Soft delete: sets active=false. */
  deactivate: async (id: number) => api<void>(`/api/admin/coupons/${requireId(id, "coupon")}`, { method: "DELETE" }),
};
