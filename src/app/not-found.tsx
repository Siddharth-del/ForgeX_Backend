import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grain relative flex min-h-dvh flex-col bg-ink text-bone">
      <div className="container-x flex h-20 items-center">
        <Logo className="text-bone" />
      </div>
      <main id="main" className="container-x flex flex-1 flex-col justify-center pb-24">
        <p className="eyebrow text-smoke">404</p>
        <h1 className="display mt-4 text-[clamp(3.5rem,10vw,8rem)]">
          This scent <em className="italic">faded.</em>
        </h1>
        <p className="mt-6 max-w-md text-[17px] text-bone/70">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/shop" variant="light" arrow>
            Shop fragrances
          </ButtonLink>
          <Link href="/" className="inline-flex h-12 items-center px-4 text-xs uppercase tracking-[0.08em] text-bone/80 hover:text-bone">
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
