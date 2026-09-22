import { Link } from 'react-router-dom';
import { useFullCatalog } from '../../hooks/useCatalog';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import ProductGrid from '../../components/product/ProductGrid';
import ProductImage from '../../components/common/ProductImage';
import Price from '../../components/common/Price';
import { ProductGridSkeleton, Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/States';
import { errorMessage } from '../../utils/errors';

function SectionHead({ title, to, linkLabel }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="text-2xl sm:text-3xl">{title}</h2>
      {to && <Link to={to} className="link shrink-0 text-[15px]">{linkLabel}</Link>}
    </div>
  );
}

function Hero({ product, loading }) {
  return (
    <section className="border-b border-line">
      <div className="page grid items-center gap-10 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div>
          <h1 className="font-display text-[44px] leading-[0.95] sm:text-[64px] lg:text-[84px]">
            Fragrance that lasts past the evening.
          </h1>
          <div className="mt-6 h-1 w-16 bg-forge" aria-hidden="true" />
          <p className="mt-6 max-w-md text-lg text-steel">
            Eau de parfum and alcohol-free attars, priced plainly, with the saving against MRP shown on every bottle.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/products" className="btn-primary">Shop all fragrances</Link>
            <Link to="/products?category=ATTAR" className="btn-outline">Explore attars</Link>
          </div>
        </div>
        <div>
          {loading ? <Skeleton className="aspect-[4/5] w-full" /> : product ? (
            <Link to={`/products/${product.id}`} className="group block">
              <ProductImage src={product.image} alt={product.name} eager className="aspect-[4/5]" />
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <p className="font-display text-2xl group-hover:underline group-hover:underline-offset-4">{product.name}</p>
                <Price price={product.price} mrp={product.mrp} discount={product.discount} />
              </div>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

const CATEGORY_TILES = [
  { to: '/products?category=PERFUME', title: 'Perfume', body: 'Eau de parfum in spray bottles, built for daily wear.' },
  { to: '/products?category=ATTAR', title: 'Attar', body: 'Concentrated, alcohol-free oils. A few drops go a long way.' },
];

const GENDER_TILES = [
  { to: '/products?gender=MEN', title: 'For men' },
  { to: '/products?gender=WOMEN', title: 'For women' },
  { to: '/products?gender=UNISEX', title: 'Unisex' },
];

export default function HomePage() {
  useDocumentTitle(null, 'ForgeX perfumes and attars. Long-lasting fragrance with clear pricing, online payment and cash on delivery.');
  const { data, isLoading, isError, error, refetch } = useFullCatalog();
  const products = (data ?? []).filter((p) => p.active);
  const inStock = products.filter((p) => p.stock > 0);
  const hero = [...inStock].sort((a, b) => b.discount - a.discount)[0] ?? products[0];
  const featured = inStock.slice(0, 4);
  const bestValue = [...inStock].filter((p) => p.discount > 0).sort((a, b) => b.discount - a.discount).slice(0, 4);

  return (
    <>
      <Hero product={hero} loading={isLoading} />

      <section className="page py-16">
        <SectionHead title="Featured" to="/products" linkLabel="View all" />
        {isLoading ? <ProductGridSkeleton count={4} />
          : isError ? <ErrorState message={errorMessage(error)} onRetry={refetch} />
          : featured.length ? <ProductGrid products={featured} />
          : <p className="text-steel">New fragrances are on their way. Check back soon.</p>}
      </section>

      <section className="bg-paper py-16">
        <div className="page">
          <h2 className="mb-6 text-2xl sm:text-3xl">Shop by type</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {CATEGORY_TILES.map((t) => (
              <Link key={t.to} to={t.to} className="group flex min-h-[220px] flex-col justify-end border border-line bg-white p-6 hover:border-ink sm:p-8">
                <h3 className="text-4xl sm:text-5xl">{t.title}</h3>
                <p className="mt-2 max-w-sm text-steel">{t.body}</p>
                <span className="mt-4 text-[15px] font-medium underline decoration-forge decoration-2 underline-offset-4">Shop {t.title.toLowerCase()}</span>
              </Link>
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-3 gap-4">
            {GENDER_TILES.map((t) => (
              <li key={t.to}>
                <Link to={t.to} className="block border border-line bg-white px-4 py-5 text-center font-display text-xl hover:border-ink sm:text-2xl">{t.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {bestValue.length > 0 && (
        <section className="page py-16">
          <SectionHead title="Biggest savings" to="/products?sort=featured" linkLabel="Shop all" />
          <ProductGrid products={bestValue} />
        </section>
      )}

      <section className="border-y border-line">
        <div className="page grid gap-8 py-14 md:grid-cols-3">
          {[
            ['Clear prices', 'MRP, selling price and your saving are shown before you add anything to the cart. Prices include all taxes.'],
            ['Pay your way', 'UPI, cards and net banking through Razorpay, or cash on delivery.'],
            ['Track every order', 'See payment and delivery status for each order from your account.'],
          ].map(([title, body]) => (
            <div key={title}>
              <h2 className="text-xl">{title}</h2>
              <p className="mt-2 text-steel">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page py-16">
        <div className="flex flex-col items-start justify-between gap-6 bg-ink px-6 py-10 text-white sm:flex-row sm:items-center sm:px-10">
          <div>
            <h2 className="text-3xl text-white">Not sure where to start?</h2>
            <p className="mt-2 max-w-lg text-white/70">Filter by type, who it's for and fragrance family to narrow the range in a few taps.</p>
          </div>
          <Link to="/products" className="btn border border-white bg-white text-ink hover:bg-paper">Browse the range</Link>
        </div>
      </section>
    </>
  );
}
