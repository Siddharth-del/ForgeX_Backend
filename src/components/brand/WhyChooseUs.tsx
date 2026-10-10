import { site } from "@/lib/site";
import { Reveal } from "@/components/ui/Reveal";

/** Line icons drawn to match the 1px hairline language of the site. */
const icons: Record<string, React.ReactNode> = {
  ingredients: <path d="M12 3c3 4 6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 3-6 6-10zM12 21v-6m0 0-2.5-2.5M12 15l2.5-2.5" />,
  lasting: (
    <>
      <path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />
    </>
  ),
  craft: (
    <>
      <path d="M9 3h6v4H9zM10 7h4v2h-4z" />
      <rect x="6" y="9" width="12" height="12" rx="1.5" />
      <path d="M6 15h12" />
    </>
  ),
  secure: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5" />
    </>
  ),
  delivery: (
    <>
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
      <circle cx="7" cy="17.5" r="1.6" />
      <circle cx="17" cy="17.5" r="1.6" />
    </>
  ),
  returns: <path d="M4 9h11a5 5 0 0 1 0 10H9M4 9l4-4M4 9l4 4" />,
};

const points = [
  { icon: "ingredients", title: "Premium ingredients", body: "Oud, saffron, rose and sandalwood sourced from growers and distillers we know by name." },
  { icon: "lasting", title: "Long-lasting", body: "Concentrated eaux de parfum and pure perfume oils, made to stay with you from morning to night." },
  { icon: "craft", title: "Crafted with precision", body: "Every batch is macerated, matured and checked by hand before it is bottled." },
  { icon: "secure", title: "Secure payments", body: "UPI, cards, net banking and wallets through Razorpay, or cash on delivery." },
  { icon: "delivery", title: "Free shipping", body: `Packed by hand in our studio. Complimentary shipping on orders above ₹${site.freeShippingThreshold.toLocaleString("en-IN")}.` },
  { icon: "returns", title: "Easy returns", body: "Something not right? Unopened bottles can be returned under our returns policy." },
];

export function WhyChooseUs() {
  return (
    <section aria-labelledby="why-title" className="bg-ivory py-section">
      <div className="container-site">
        <Reveal className="mb-12 md:mb-16">
          <p className="eyebrow text-gold-deep">The house promise</p>
          <h2 id="why-title" className="mt-4 text-display-md uppercase">
            Why choose us
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 gap-px border-y border-hair bg-[rgba(50,24,14,0.14)] sm:grid-cols-2 lg:grid-cols-3">
          {points.map((p, i) => (
            <div key={p.title} className="bg-ivory px-1 py-6 sm:p-8">
              <Reveal delay={(i % 3) * 0.08} className="flex flex-row gap-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-7 w-7 shrink-0 text-gold-deep sm:h-8 sm:w-8">
                  {icons[p.icon]}
                </svg>
                <div>
                  <h3 className="font-display text-[1.3rem] uppercase leading-tight tracking-[0.03em] sm:text-[1.5rem]">{p.title}</h3>
                  <p className="mt-1.5 max-w-xs text-[0.84rem] text-ink-muted sm:mt-2 sm:text-[0.88rem]">{p.body}</p>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
