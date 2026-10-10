import Image from "@/components/ui/Image";
import { BoxBuilder } from "@/components/box/BoxBuilder";
import { MaskLines } from "@/components/ui/Reveal";
import { getBoxBundle, getProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { rupees } from "@/lib/api/types";
import { redirect, useLoaderData } from "react-router";
import { usePageMeta } from "@/hooks/usePageMeta";

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** The box size comes from the backend, so the first step says how many to choose. */
const stepsFor = (count: number) => [
  { t: `Choose ${NUMBER_WORDS[count] ?? count}`, d: "Mix 50 ml eaux de parfum and 6 ml attars as you like." },
  { t: "We box them", d: "Packed by hand in our espresso keepsake box with gold foil." },
  { t: "Wear, discover", d: "Live with each one for a week and find your signature." },
];

export async function loader() {
  // The box (size, price, rules) is defined on the backend; without an active one there's nothing to build.
  const [box, products] = await Promise.all([getBoxBundle(), getProducts()]);
  if (!box) throw redirect("/collections/all");
  return { box, products };
}

export default function BuildYourBoxPage() {
  const { box, products } = useLoaderData<typeof loader>();
  const price = formatPrice(rupees(box.price));
  usePageMeta(box.name, `Choose any ${box.itemCount} perfumes or attars for ${price}.`);

  return (
    <>
      <section className="relative overflow-hidden bg-espresso-deep text-ivory">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="container-site flex flex-col justify-center py-16 md:py-24 md:pr-12">
            <p className="eyebrow text-gold-soft">The signature box</p>
            <h1 className="mt-5 text-display-lg font-light uppercase">
              <MaskLines lines={["Build your", "own box"]} delay={0.2} />
            </h1>
            <p className="mt-6 max-w-md text-[1rem] text-ivory/70">Choose your fragrances. Create your signature collection.</p>
            <p className="mt-8 font-display text-[clamp(2.2rem,4vw,3.2rem)] font-light uppercase text-gold-soft">
              Any {box.itemCount} for {price}
            </p>
          </div>
          <div className="relative aspect-[16/11] md:aspect-auto md:min-h-[32rem]">
            <Image src="/images/campaign/build-box.webp" alt="An open gift box holding three fragrances" fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover object-[78%_50%]" />
          </div>
        </div>
      </section>
      <section className="border-b border-hair bg-sand">
        <ol className="container-site grid grid-cols-1 gap-6 py-8 md:grid-cols-3">
          {stepsFor(box.itemCount).map((s, i) => (
            <li key={s.t} className="flex gap-4">
              <span className="font-display text-3xl font-light italic text-gold-deep">{i + 1}</span>
              <div>
                <p className="label">{s.t}</p>
                <p className="mt-1 text-[0.85rem] text-ink-muted">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="bg-ivory py-16 md:py-24">
        <div className="container-site max-w-6xl">
          <BoxBuilder box={box} products={products} />
        </div>
      </section>
    </>
  );
}
