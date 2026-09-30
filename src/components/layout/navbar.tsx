"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, Search, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useSession } from "@/hooks/use-auth";
import { useUI } from "../providers";
import { Logo } from "./logo";
import { Sheet } from "../ui/sheet";

const LINKS = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop?category=perfume", label: "Perfumes" },
  { href: "/shop?category=attar", label: "Attars" },
  { href: "/#families", label: "Families" },
];

/** Routes whose top section is a dark stage — the bar starts transparent with light text there. */
const DARK_TOP = new Set(["/"]);

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { count } = useCart();
  const { isSignedIn, isAdmin } = useSession();
  const { openCart } = useUI();
  const last = useRef(0);

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 24);
    // Hide when scrolling down past the fold, reveal on any upward scroll
    // Hide while scrolling down past the fold, reveal on any clear upward scroll.
    // Small jitters (momentum scrolling on phones) don't toggle it.
    if (y < 480 || menuOpen || searchOpen) setHidden(false);
    else if (y > last.current + 6) setHidden(true);
    else if (y < last.current - 6) setHidden(false);
    last.current = y;
  });

  // Let sticky sub-bars (e.g. shop filters) move up into the space the header frees
  useEffect(() => {
    document.documentElement.toggleAttribute("data-nav-hidden", hidden);
  }, [hidden]);

  // Close overlays on navigation (reset-during-render, no effect needed)
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  const overDark = DARK_TOP.has(pathname) && !scrolled && !searchOpen;

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "pt-safe fixed inset-x-0 top-0 z-50 transition-[background-color,color,border-color,backdrop-filter] duration-500",
          overDark
            ? "border-b border-transparent bg-transparent text-bone"
            : "border-b border-line/80 bg-paper/85 text-ink backdrop-blur-xl backdrop-saturate-150",
        )}
      >
        <nav aria-label="Main" className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 md:h-[72px]">
          {/* Left: menu (mobile) / links (desktop) */}
          <div className="flex min-w-0 items-center">
            <button
              type="button"
              className="-ml-2.5 inline-flex h-11 w-11 items-center justify-center lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Menu className="h-5 w-5" strokeWidth={1.25} />
            </button>
            <ul className="hidden items-center gap-8 lg:flex">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="eyebrow link-draw py-1">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Logo />

          {/* Right: search, account, bag */}
          <div className="-mr-2 flex min-w-0 items-center justify-end sm:gap-1 xl:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search"
              aria-expanded={searchOpen}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-current/10"
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.25} />
            </button>
            <Link
              href={isAdmin ? "/admin" : isSignedIn ? "/account" : "/login"}
              aria-label={isAdmin ? "Admin" : isSignedIn ? "Your account" : "Sign in"}
              className="hidden h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2.5 transition-colors hover:bg-current/10 sm:inline-flex"
            >
              <User className="h-[18px] w-[18px]" strokeWidth={1.25} />
              <span className="eyebrow hidden xl:inline">{isAdmin ? "Admin" : isSignedIn ? "Account" : "Sign in"}</span>
            </Link>
            <button
              type="button"
              onClick={() => (isSignedIn ? openCart() : router.push("/cart"))}
              aria-label={`Bag, ${count} item${count === 1 ? "" : "s"}`}
              className="relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2.5 transition-colors hover:bg-current/10"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.25} />
              <span className="eyebrow hidden xl:inline">Bag</span>
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    className="absolute right-0.5 top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ember px-1 text-[10px] font-semibold text-white xl:static"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </nav>

        <AnimatePresence>{searchOpen && <SearchBar onClose={() => setSearchOpen(false)} />}</AnimatePresence>
      </motion.header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} signedIn={isSignedIn} admin={isAdmin} />
    </>
  );
}

function SearchBar({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
    onClose();
  };
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden border-t border-line bg-paper text-ink"
    >
      <form role="search" onSubmit={submit} className="container-x flex items-center gap-4 py-5">
        <Search className="h-5 w-5 shrink-0 text-stone" strokeWidth={1.25} aria-hidden />
        <label htmlFor="site-search" className="sr-only">
          Search fragrances
        </label>
        <input
          id="site-search"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          placeholder="Search by name, note or family"
          className="display h-12 w-full min-w-0 bg-transparent text-2xl outline-none placeholder:text-smoke sm:text-3xl"
        />
        <button type="submit" className="eyebrow inline-flex h-11 shrink-0 items-center px-1">
          Search
        </button>
      </form>
    </motion.div>
  );
}

function MobileMenu({
  open,
  onClose,
  signedIn,
  admin,
}: {
  open: boolean;
  onClose: () => void;
  signedIn: boolean;
  admin: boolean;
}) {
  const links = [
    ...LINKS,
    signedIn ? { href: "/account", label: "Your account" } : { href: "/login", label: "Sign in" },
    ...(admin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  return (
    <Sheet open={open} onClose={onClose} side="left" title="Menu" dark>
      <div className="flex h-full flex-col px-6 pb-10 pt-6">
        <Logo onClick={onClose} className="self-start text-bone" />
        <ul className="mt-16 space-y-1">
          {links.map((l, i) => (
            <motion.li
              key={l.href}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link href={l.href} onClick={onClose} className="display block py-2 text-[2.6rem] text-bone hover:text-white">
                {l.label}
              </Link>
            </motion.li>
          ))}
        </ul>
        <p className="eyebrow mt-auto text-smoke">Perfumes &amp; attars · Cash on delivery available</p>
      </div>
    </Sheet>
  );
}
