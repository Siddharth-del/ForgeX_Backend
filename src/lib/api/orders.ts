/** Customer orders and invoices (controller/OrderController.java, controller/InvoiceController.java). */
import { api, saveBlob } from "@/lib/api/client";
import type { OrderDTO } from "@/lib/api/types";

export const orderApi = {
  mine: () => api<OrderDTO[]>("/api/orders"),
  get: (id: number) => api<OrderDTO>(`/api/orders/${id}`),
  downloadInvoice: async (id: number) => saveBlob(await api<Blob>(`/api/orders/${id}/invoice`, { responseType: "blob" }), `ForgeX-invoice-${id}.pdf`),
};
