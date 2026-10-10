import Link from "@/components/ui/Link";
import { AdminPage } from "@/components/admin/AdminUI";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function AdminNotFound() {
  usePageMeta("Not found · Admin", undefined, { noindex: true });
  return (
    <AdminPage eyebrow="Admin" title="Page not found">
      <p className="text-[0.9rem] text-ink-muted">That admin page doesn&rsquo;t exist.</p>
      <Link href="/admin" className="label mt-6 inline-block underline underline-offset-4">
        Back to the dashboard
      </Link>
    </AdminPage>
  );
}
