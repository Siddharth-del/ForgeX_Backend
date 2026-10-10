import { useEffect } from "react";
import { isRouteErrorResponse, useRevalidator, useRouteError } from "react-router";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePageMeta } from "@/hooks/usePageMeta";
import NotFoundPage from "@/pages/NotFoundPage";
import { ApiError } from "@/lib/api/client";
import { invalidateCatalog } from "@/lib/catalog";

/** Route error boundary: 404s render the not-found page, anything else offers a retry. */
export default function ErrorPage() {
  const error = useRouteError();
  const revalidator = useRevalidator();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  useEffect(() => {
    if (!notFound) console.error(error);
  }, [error, notFound]);

  if (notFound) return <NotFoundPage />;
  const detail = error instanceof ApiError ? error.message : undefined;
  return (
    <ErrorState
      detail={detail}
      onRetry={() => {
        invalidateCatalog();
        void revalidator.revalidate();
      }}
    />
  );
}

function ErrorState({ onRetry, detail }: { onRetry: () => void; detail?: string }) {
  usePageMeta("Something went wrong");
  return (
    <div className="container-site py-section">
      <EmptyState
        title="Something went wrong"
        body={detail ? `${detail} Try again, or head back home.` : "We couldn't load this page. Try again, or head back to the collection."}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={onRetry}>Try again</Button>
            <ButtonLink href="/" variant="outline">
              Return home
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
