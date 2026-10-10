/** Build Your Own Box definitions (controller/BundleController.java). Prices in paise. */
import { api } from "@/lib/api/client";
import type { BundleDTO, BundleInput } from "@/lib/api/types";
import { requireId } from "@/lib/ids";

/** The storefront's box (seeded by the backend's BundleSeeder). */
export const BOX_SLUG = "build-your-box";

export const bundleApi = {
  /** Boxes currently on sale. */
  active: () => api<BundleDTO[]>("/api/public/bundles", { auth: false }),
};

export const adminBundleApi = {
  all: () => api<BundleDTO[]>("/api/admin/bundles"),
  create: (b: BundleInput) => api<BundleDTO>("/api/admin/bundles", { method: "POST", body: b }),
  update: async (id: number, b: BundleInput) => api<BundleDTO>(`/api/admin/bundles/${requireId(id, "box")}`, { method: "PUT", body: b }),
};
