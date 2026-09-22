import ProductCard from './ProductCard';

export default function ProductGrid({ products }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => <li key={p.id}><ProductCard product={p} eager={i < 4} /></li>)}
    </ul>
  );
}
