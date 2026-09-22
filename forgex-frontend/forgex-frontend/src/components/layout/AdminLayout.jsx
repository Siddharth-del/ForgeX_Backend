import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import Logo from './Logo';
import { PageLoader } from '../common/Spinner';
import { useAuth } from '../../context/AuthContext';

const LINKS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/users', label: 'Users' },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const linkClass = ({ isActive }) =>
    `whitespace-nowrap px-3 py-2 text-[15px] lg:block lg:border-l-2 lg:px-4 ${isActive ? 'border-forge font-medium text-ink lg:bg-white' : 'border-transparent text-steel hover:text-ink'}`;

  return (
    <div className="min-h-screen bg-paper lg:flex">
      <aside className="border-b border-line bg-paper lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-4 lg:px-5">
          <div className="flex items-baseline gap-2"><Logo /><span className="text-sm text-steel">Admin</span></div>
          <Link to="/" className="text-sm text-steel hover:text-ink lg:hidden">View store</Link>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-2 lg:block lg:space-y-0.5 lg:px-0">
          {LINKS.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>{l.label}</NavLink>)}
        </nav>
        <div className="hidden px-5 pt-8 text-sm text-steel lg:block">
          <p className="truncate">{user?.email}</p>
          <Link to="/" className="mt-2 inline-block hover:text-ink">View store</Link>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
        <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
      </main>
    </div>
  );
}
