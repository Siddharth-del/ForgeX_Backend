import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function NotFoundPage() {
  usePageMeta("Page not found");

  return (
    <div className="container-site py-section">
      <EmptyState
        title="This page has evaporated"
        body="The page you were looking for has moved or no longer exists."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/" arrow>
              Return home
            </ButtonLink>
            <ButtonLink href="/collections/all" variant="outline">
              Shop all
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
