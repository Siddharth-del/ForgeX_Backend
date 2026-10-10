import { useRevalidator } from "react-router";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { invalidateCatalog } from "@/lib/catalog";

/** Shown in place of product sections when the backend can't be reached; never falls back to fake products. */
export function CatalogUnavailable({ message, tone = "dark" }: { message?: string; tone?: "light" | "dark" }) {
  const revalidator = useRevalidator();
  const busy = revalidator.state === "loading";
  return (
    <EmptyState
      tone={tone}
      title="The collection is unavailable"
      body={`${message ?? "We couldn't load our fragrances."} Please try again in a moment.`}
      action={
        <Button
          variant={tone === "light" ? "light" : "primary"}
          disabled={busy}
          onClick={() => {
            invalidateCatalog();
            void revalidator.revalidate();
          }}
        >
          {busy ? "Trying again" : "Try again"}
        </Button>
      }
    />
  );
}

/** Shown when the backend answers but has no active products yet. */
export function CatalogEmpty({ tone = "dark" }: { tone?: "light" | "dark" }) {
  return (
    <EmptyState
      tone={tone}
      title="The collection is being prepared"
      body="Our fragrances will appear here shortly. In the meantime, read about how they are made."
      action={
        <ButtonLink href="/journal" variant={tone === "light" ? "light" : "outline"} arrow>
          Read the journal
        </ButtonLink>
      }
    />
  );
}
