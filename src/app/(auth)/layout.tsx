import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/layout/logo";
import { BottleArt } from "@/components/product/bottle-art";
import { GuestOnly } from "@/components/auth/guards";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 min-h-dvh lg:grid-cols-2">
      {/* Brand stage (desktop) */}
      <aside className="grain relative hidden overflow-hidden bg-ink text-bone lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo className="relative z-10 text-bone" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "radial-gradient(50% 45% at 50% 50%, rgba(243,239,232,0.12), transparent 70%)" }}
        />
        <div className="relative z-10 mx-auto h-[48vh] w-[60%] max-w-[340px]">
          <BottleArt category="ATTAR" family="AMBER" dark />
        </div>
        <p className="display relative z-10 max-w-sm text-4xl leading-tight">
          A fragrance is the last thing you put on, and the first thing <em className="italic">they remember.</em>
        </p>
      </aside>

      <main id="main" className="flex flex-col bg-paper">
        <div className="flex h-16 items-center justify-between px-6 lg:hidden">
          <Logo />
          <Link href="/shop" className="eyebrow inline-flex h-11 items-center text-stone">
            Shop
          </Link>
        </div>
        <div className="hidden justify-end p-8 lg:flex">
          <Link href="/" className="eyebrow link-draw text-stone hover:text-ink">
            Back to store
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-[420px]">
            <Suspense>
              <GuestOnly>{children}</GuestOnly>
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
