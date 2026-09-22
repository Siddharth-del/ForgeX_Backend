import { Link } from 'react-router-dom';

export default function Logo({ className = '' }) {
  return (
    <Link to="/" className={`font-display text-[26px] font-semibold leading-none tracking-[0.02em] ${className}`} aria-label="ForgeX home">
      FORGE<span className="text-forge">X</span>
    </Link>
  );
}
