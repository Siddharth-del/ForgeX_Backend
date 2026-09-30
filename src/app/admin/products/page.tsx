import type { Metadata } from "next";
import { AdminProducts } from "@/components/admin/admin-products";

export const metadata: Metadata = { title: "Products" };

export default function Page() {
  return <AdminProducts />;
}
