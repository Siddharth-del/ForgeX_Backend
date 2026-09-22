import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from './Icons';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../hooks/useCart';

const NAV = [
  { to: '/products', label: 'Shop all', end: true },
  { to: '/products?category=PERFUME', label: 'Perfume' },
  { to: '/products?category=ATTAR', label: 'Attar' },
  { to: '/products?gender=MEN', label: 'Men' },
  { to: '/products?gender=WOMEN', label: 'Women' },
];

function SearchForm({ onDone, autoFocus }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/products?q=${encodeURIComponent(term)}` : '/products');
    onDone?.();
  };
  return (
    <form role="search" onSubmit={submit} className="relative w-full">
      <label htmlFor="site-search" className="sr-only">Search products</label>
      <input id="site-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoFocus={autoFocus}
        placeholder="Search perfumes and attars" className="input pl-10" />
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel" width={18} height={18} />
    </form>
  );
}

function UserMenu() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!user) {
    return <Link to="/login" className="btn-ghost btn-sm hidden sm:inline-flex">Sign in</Link>;
  }

  const item = 'block w-full px-4 py-2.5 text-left text-[15px] hover:bg-paper';
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        className="flex h-11 w-11 items-center justify-center hover:bg-paper" aria-label="Account menu">
        <UserIcon />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-56 border border-line bg-white py-1 shadow-lg">
          <p className="truncate border-b border-line px-4 py-2.5 text-sm text-steel">{user.email}</p>
          <Link role="menuitem" to="/profile" className={item} onClick={() => setOpen(false)}>Account</Link>
          <Link role="menuitem" to="/orders" className={item} onClick={() => setOpen(false)}>Orders</Link>
          {isAdmin && <Link role="menuitem" to="/admin" className={item} onClick={() => setOpen(false)}>Admin</Link>}
          <button role="menuitem" type="button" className={`${item} border-t border-line`}
            onClick={async () => { setOpen(false); await logout(); navigate('/'); }}>Sign out</button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const { data: cart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); setSearchOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isActive = (to) => {
    const [path, query] = to.split('?');
    if (location.pathname !== path) return false;
    return query ? location.search.includes(query) : location.search === '';
  };

  const count = cart?.count ?? 0;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <div className="page flex h-16 items-center gap-4">
        <button type="button" className="-ml-2 flex h-11 w-11 items-center justify-center lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <MenuIcon />
        </button>
        <Logo />
        <nav aria-label="Main" className="ml-8 hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} className={`px-3 py-2 text-[15px] ${isActive(n.to) ? 'text-ink underline decoration-forge decoration-2 underline-offset-8' : 'text-steel hover:text-ink'}`}>
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto hidden w-72 md:block"><SearchForm /></div>
        <div className="ml-auto flex items-center md:ml-2">
          <button type="button" className="flex h-11 w-11 items-center justify-center hover:bg-paper md:hidden" onClick={() => setSearchOpen((s) => !s)} aria-label="Search" aria-expanded={searchOpen}>
            <SearchIcon />
          </button>
          <UserMenu />
          <Link to="/cart" className="relative flex h-11 w-11 items-center justify-center hover:bg-paper" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
            <BagIcon />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-forge px-1 text-[11px] font-semibold text-white" aria-hidden="true">{count}</span>
            )}
          </Link>
        </div>
      </div>
      {searchOpen && <div className="page pb-3 md:hidden"><SearchForm autoFocus onDone={() => setSearchOpen(false)} /></div>}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo />
              <button type="button" onClick={() => setMobileOpen(false)} className="flex h-11 w-11 items-center justify-center" aria-label="Close menu"><CloseIcon /></button>
            </div>
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto py-2">
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} className="block px-5 py-3.5 font-display text-xl">{n.label}</Link>
              ))}
              <div className="mt-2 border-t border-line pt-2">
                {isAuthenticated ? (
                  <>
                    <Link to="/profile" className="block px-5 py-3 text-[15px]">Account</Link>
                    <Link to="/orders" className="block px-5 py-3 text-[15px]">Orders</Link>
                    {isAdmin && <Link to="/admin" className="block px-5 py-3 text-[15px]">Admin</Link>}
                    <button type="button" onClick={logout} className="block w-full px-5 py-3 text-left text-[15px]">Sign out</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="block px-5 py-3 text-[15px]">Sign in</Link>
                    <Link to="/register" className="block px-5 py-3 text-[15px]">Create account</Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
