import { AccountView } from "@/components/layout/AccountView";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function AccountPage() {
  usePageMeta("Account", undefined, { noindex: true });
  return <AccountView />;
}
