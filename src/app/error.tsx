"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="container-x flex min-h-[80vh] flex-col justify-center py-24">
      <p className="eyebrow text-ember">Something went wrong</p>
      <h1 className="display mt-4 text-6xl sm:text-7xl">We hit a snag.</h1>
      <p className="mt-5 max-w-md text-[15px] text-stone">
        Please try again. If it keeps happening, come back in a few minutes.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="outline">
          Go home
        </ButtonLink>
      </div>
    </main>
  );
}
