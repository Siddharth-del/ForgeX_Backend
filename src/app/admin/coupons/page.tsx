import type { Metadata } from "next";
import { AdminCoupons } from "@/components/admin/admin-coupons";

export const metadata: Metadata = { title: "Coupons" };

export default function Page() {
  return <AdminCoupons />;
}
