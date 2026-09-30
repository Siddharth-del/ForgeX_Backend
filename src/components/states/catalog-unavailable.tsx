"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "../ui/button";

/** Shown when the server couldn't reach the product API. Retry re-renders the route. */
export function CatalogUnavailable() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <section className="container-x py-24 text-center" role="alert">
      <p className="eyebrow text-ember">Collection unavailable</p>
      <p className="display mx-auto mt-4 max-w-xl text-4xl">We couldn&apos;t load the fragrances just now.</p>
      <p className="mx-auto mt-4 max-w-md text-[15px] text-stone">
        The store is having trouble reaching our catalogue. Please try again in a moment.
      </p>
      <Button variant="outline" size="sm" className="mt-8" loading={pending} onClick={() => start(() => router.refresh())}>
        Try again
      </Button>
    </section>
  );
}
