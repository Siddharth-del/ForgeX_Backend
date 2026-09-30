import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · ForgeX" }, robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth admin>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}
