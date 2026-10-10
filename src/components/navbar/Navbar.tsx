import Image from "@/components/ui/Image";
import Link from "@/components/ui/Link";
import { useLocation } from "react-router";
import { isAdmin, useAuth } from "@/store/auth";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Heart, LayoutDashboard, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { useScrolled } from "@/hooks/useScrolled";
import { cartCount } from "@/store/cart";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useUI } from "@/store/ui";
import { mainNav, type NavLink, type NavPanel } from "@/lib/site";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { Wordmark } from "@/components/ui/Wordmark";
import { MobileMenu } from "./MobileMenu";

export function Navbar() {
  const scrolled = useScrolled(12);
  const { pathname } = useLocation();
  const user = useAuth((s) => s.user);
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const wishCount = useWishlist((s) => s.ids.length);
  const count = hydrated ? cartCount(lines) : 0;
  const openCart = useUI((s) => s.openCart);
  const openSearch = useUI((s) => s.openSearch);
  const setMenu = useUI((s) => s.setMenu);
  const menuOpen = useUI((s) => s.menuOpen);
  const [bump, setBump] = useState(0);
  const [panel, setPanel] = useState<string | null>(null);
  // Panel imagery loads on first hover/focus, not with every page.
  const [armed, setArmed] = useState<string[]>([]);
  const arm = (label: string) => setArmed((a) => (a.includes(label) ? a : [...a, label]));

  useEffect(() => {
    if (count > 0) setBump((n) => n + 1);
  }, [count]);

  useEffect(() => {
    setMenu(false);
    setPanel(null);
  }, [pathname, setMenu]);

  const onHero = !scrolled && pathname === "/";
  const dark = onHero && !panel;

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-[60] transition-[background-color,box-shadow,backdrop-filter,color] duration-700 ease-luxe",
          dark ? "bg-transparent text-ivory" : "bg-ivory/82 text-espresso backdrop-blur-xl backdrop-saturate-150 shadow-[0_1px_0_rgba(50,24,14,0.10)]",
        )}
      >
        <div className="container-site flex h-[4.25rem] items-center justify-between gap-4 md:h-[4.75rem]">
          {/* Mobile: hamburger, logo, search, bag */}
          <div className="flex w-full items-center justify-between md:hidden">
            <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menuOpen} className="-ml-2 flex h-11 w-11 items-center justify-center">
              <Menu className="h-5 w-5" strokeWidth={1.3} />
            </button>
            <Wordmark compact className="absolute left-1/2 -translate-x-1/2" />
            <div className="flex items-center">
              <button type="button" onClick={openSearch} aria-label="Search" className="flex h-11 w-11 items-center justify-center">
                <Search className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.3} />
              </button>
              <CartButton count={count} bump={bump} onClick={openCart} className="-mr-2" />
            </div>
          </div>

          {/* Desktop */}
          <Wordmark className="hidden md:inline-flex" />

          <nav aria-label="Primary" className="hidden h-full items-stretch gap-9 md:flex" onMouseLeave={() => setPanel(null)}>
            {mainNav.map((item) => (
              // Not positioned: the panel anchors to the sticky header and spans its full width.
              <div
                key={item.label}
                className="group/nav flex items-center"
                onMouseEnter={() => {
                  setPanel(item.panel ? item.label : null);
                  if (item.panel) arm(item.label);
                }}
                onFocus={() => item.panel && arm(item.label)}
              >
                <Link
                  href={item.href}
                  aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                  aria-expanded={item.panel ? panel === item.label : undefined}
                  className="link-underline relative font-sans text-[0.7rem] font-medium uppercase tracking-[0.22em]"
                >
                  {item.label}
                </Link>
                {item.panel && item.links && <MegaPanel open={panel === item.label} armed={armed.includes(item.label)} panel={item.panel} links={item.links} onNavigate={() => setPanel(null)} />}
              </div>
            ))}
          </nav>

          <div className="hidden items-center gap-1 md:flex">
            {isAdmin(user) && (
              <Link href="/admin" className="mr-2 inline-flex h-8 items-center gap-1.5 border border-gold/70 px-3 text-[0.6rem] font-medium uppercase tracking-[0.22em] text-gold-deep transition-colors hover:bg-espresso hover:text-gold-soft">
                <LayoutDashboard aria-hidden className="h-3.5 w-3.5" strokeWidth={1.4} /> Admin
              </Link>
            )}
            <IconLink href="/account" label={user ? `Account, signed in as ${user.username}` : "Sign in"} icon={<User className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.25} />} dot={!!user} />
            <IconLink href="/wishlist" label={`Wishlist${wishCount ? `, ${wishCount} saved` : ""}`} icon={<Heart className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.25} />} badge={hydrated ? wishCount : 0} />
            <button type="button" onClick={openSearch} aria-label="Search" className="flex h-11 w-11 items-center justify-center transition-opacity hover:opacity-60">
              <Search className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.25} />
            </button>
            <CartButton count={count} bump={bump} onClick={openCart} />
          </div>
        </div>
      </header>
      <MobileMenu />
    </>
  );
}

/** Full-width desktop panel: the world's links in large serif, a line of character, and a feature card. */
function MegaPanel({ open, armed, panel, links, onNavigate }: { open: boolean; armed: boolean; panel: NavPanel; links: NavLink[]; onNavigate: () => void }) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-full transition-[opacity,visibility,transform] duration-500 ease-luxe group-has-[:focus-visible]/nav:visible group-has-[:focus-visible]/nav:translate-y-0 group-has-[:focus-visible]/nav:opacity-100",
        open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
      )}
    >
      <div className="border-t border-hair bg-ivory text-espresso shadow-[0_40px_80px_-40px_rgba(31,15,8,0.4)]">
        <div className="container-site grid grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)] gap-12 py-10 xl:gap-16">
          <div>
            <p className="eyebrow flex items-baseline gap-3 text-gold-deep">
              {panel.eyebrow}
              <span aria-hidden className={cn("normal-case tracking-normal", panel.native === "عطر" ? "font-arabic text-base" : "font-display text-[0.95rem] italic")}>
                {panel.native}
              </span>
            </p>
            <ul className="mt-6 space-y-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={onNavigate} className="group/ml inline-flex items-center gap-3 py-1 font-display text-[1.85rem] font-light uppercase leading-tight transition-colors duration-300 hover:text-gold-deep">
                    {l.label}
                    <ArrowRight aria-hidden className="h-4 w-4 -translate-x-2 opacity-0 transition-all duration-500 ease-luxe group-hover/ml:translate-x-0 group-hover/ml:opacity-100" strokeWidth={1.2} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-end border-l border-hair pl-12 xl:pl-16">
            <p className="max-w-xs font-display text-[1.4rem] italic leading-snug text-ink-muted">{panel.blurb}</p>
            <Link href={panel.cta.href} onClick={onNavigate} className="label group/cta mt-6 inline-flex items-center gap-2 self-start">
              <span className="link-underline pb-1">{panel.cta.label}</span>
              <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-500 ease-luxe group-hover/cta:translate-x-1" strokeWidth={1.4} />
            </Link>
          </div>
          <Link href={panel.feature.href} onClick={onNavigate} className="group/feat relative block aspect-[16/10] overflow-hidden bg-espresso text-ivory">
            {armed && <Image src={panel.feature.image} alt={panel.feature.alt} fill sizes="34vw" className="object-cover transition-transform duration-[1.6s] ease-luxe group-hover/feat:scale-[1.05]" />}
            <div className="absolute inset-0 bg-gradient-to-t from-espresso-deep/75 via-espresso-deep/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
              <div>
                <p className="eyebrow text-gold-soft">{panel.feature.eyebrow}</p>
                <p className="mt-2 font-display text-[1.6rem] font-light uppercase leading-none">{panel.feature.title}</p>
              </div>
              <ArrowRight aria-hidden className="mb-1 h-4 w-4 transition-transform duration-500 ease-luxe group-hover/feat:translate-x-1" strokeWidth={1.3} />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function IconLink({ href, label, icon, badge = 0, dot = false }: { href: string; label: string; icon: React.ReactNode; badge?: number; dot?: boolean }) {
  return (
    <Link href={href} aria-label={label} title={label} className="relative flex h-11 w-11 items-center justify-center transition-opacity hover:opacity-60">
      {icon}
      {badge > 0 && <Badge n={badge} />}
      {dot && <span aria-hidden className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-gold" />}
    </Link>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute right-1 top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-gold px-1 text-[0.58rem] font-semibold leading-none text-espresso-deep tabular">
      {n}
    </span>
  );
}

function CartButton({ count, bump, onClick, className }: { count: number; bump: number; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Open bag, ${count} item${count === 1 ? "" : "s"}`} className={cn("relative flex h-11 w-11 items-center justify-center transition-opacity hover:opacity-60", className)}>
      <ShoppingBag className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.25} />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={bump}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="absolute right-1 top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-gold px-1 text-[0.58rem] font-semibold leading-none text-espresso-deep tabular"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
