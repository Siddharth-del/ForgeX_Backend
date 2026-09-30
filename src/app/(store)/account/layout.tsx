import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/guards";
import { AccountHeader } from "@/components/account/account-header";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-x pb-24 pt-28 md:pt-36">
      <RequireAuth>
        <AccountHeader />
        <div className="pt-10">{children}</div>
      </RequireAuth>
    </div>
  );
}
