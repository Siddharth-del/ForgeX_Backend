import { useState } from 'react';
import { resolveImage } from '../../utils/image';

function Placeholder({ name }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-paper" aria-hidden="true">
      <svg viewBox="0 0 60 90" className="h-1/2 w-auto text-line">
        <rect x="24" y="4" width="12" height="10" fill="currentColor" />
        <rect x="21" y="14" width="18" height="6" fill="currentColor" />
        <rect x="8" y="22" width="44" height="64" rx="4" fill="currentColor" />
      </svg>
      <span className="sr-only">{name}</span>
    </div>
  );
}

/** Fixed aspect box so a missing or broken image never shifts the layout. */
export default function ProductImage({ src, alt, className = 'aspect-[4/5]', eager = false }) {
  const url = resolveImage(src);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-paper ${className}`}>
      {!url || failed ? <Placeholder name={alt} /> : (
        <img src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async"
          onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`} />
      )}
    </div>
  );
}
