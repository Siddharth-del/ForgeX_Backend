import Link from "next/link";
import { CATEGORIES, FAMILIES, GENDERS, STORE_RULES } from "@/lib/constants";
import { formatPaise } from "@/lib/utils";
import { Logo } from "./logo";

const cols = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All fragrances" },
      ...CATEGORIES.map((c) => ({ href: `/shop?category=${c.value.toLowerCase()}`, label: c.plural })),
      ...GENDERS.map((g) => ({ href: `/shop?gender=${g.value.toLowerCase()}`, label: g.label })),
    ],
  },
  {
    title: "Families",
    links: FAMILIES.slice(0, 6).map((f) => ({ href: `/shop?family=${f.value.toLowerCase()}`, label: f.label })),
  },
  {
    title: "Help",
    links: [
      { href: "/account", label: "Your orders" },
      { href: "/account/addresses", label: "Addresses" },
      { href: "/forgot-password", label: "Reset password" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink text-bone">
      <div className="container-x grid grid-cols-1 gap-14 pb-10 pt-20 md:grid-cols-12 md:pt-28">
        <div className="md:col-span-4">
          <Logo className="text-[22px] text-bone" />
          <p className="mt-6 max-w-xs text-[15px] leading-relaxed text-smoke">
            Eau de parfum and alcohol-free attars. Every price shown against MRP, every order with a GST invoice.
          </p>
          <ul className="mt-8 space-y-2 text-[13px] text-smoke">
            <li>Free shipping over {formatPaise(STORE_RULES.freeShippingAbovePaise)}</li>
            <li>Cash on delivery available</li>
            <li>Secure payments via Razorpay</li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-8">
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="eyebrow text-smoke">{c.title}</h2>
              <ul className="mt-3">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="inline-flex min-h-11 items-center text-[15px] text-bone/85 hover:text-bone md:min-h-9">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Oversized wordmark — cropped by the bottom edge on purpose */}
      <div aria-hidden className="pointer-events-none select-none overflow-hidden">
        <p className="container-x -mb-[0.2em] whitespace-nowrap text-[23vw] font-semibold leading-none tracking-[0.06em] text-bone/[0.04]">
          FORGE<span className="text-ember/15">X</span>
        </p>
      </div>
      <div className="border-t border-line-dark">
        <div className="container-x flex flex-col gap-3 py-6 text-[12px] text-smoke sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ForgeX. All rights reserved.</p>
          <p>Prices in INR, inclusive of taxes.</p>
        </div>
      </div>
    </footer>
  );
}
