import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  const year = new Date().getFullYear();
  const col = 'space-y-2.5 text-[15px] text-steel';
  return (
    <footer className="mt-24 border-t border-line bg-paper">
      <div className="page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-[15px] text-steel">Perfumes and attars made to last through the day.</p>
        </div>
        <div>
          <h2 className="mb-3 font-sans text-[15px] font-semibold">Shop</h2>
          <ul className={col}>
            <li><Link className="hover:text-ink" to="/products?category=PERFUME">Perfume</Link></li>
            <li><Link className="hover:text-ink" to="/products?category=ATTAR">Attar</Link></li>
            <li><Link className="hover:text-ink" to="/products?gender=MEN">For men</Link></li>
            <li><Link className="hover:text-ink" to="/products?gender=WOMEN">For women</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-sans text-[15px] font-semibold">Your account</h2>
          <ul className={col}>
            <li><Link className="hover:text-ink" to="/profile">Account and addresses</Link></li>
            <li><Link className="hover:text-ink" to="/orders">Orders and tracking</Link></li>
            <li><Link className="hover:text-ink" to="/cart">Cart</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-sans text-[15px] font-semibold">Buying from us</h2>
          <ul className={col}>
            <li>Secure payment by UPI, card or net banking</li>
            <li>Cash on delivery available</li>
            <li>Prices include all taxes</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="page py-5 text-sm text-steel">© {year} ForgeX. All rights reserved.</p>
      </div>
    </footer>
  );
}
