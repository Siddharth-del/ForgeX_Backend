/**
 * Brand + navigation configuration. Change the brand name, contact details,
 * offers and menus here; components read from this file.
 */
export const site = {
  name: "Cosmic Life",
  wordmark: "COSMIC LIFE",
  descriptor: "Parfums & Attars",
  // TODO: set your production domain (used for social share images)
  url: "https://cosmiclife.in",
  tagline: "Crafted fragrances. Timeless identity.",
  description:
    "Cosmic Life is a fragrance house of two worlds: modern eaux de parfum and traditional attars, composed in India with materials from around the world.",
  // TODO: replace with your real support details before launch
  contact: {
    email: "care@cosmiclife.in",
    phone: "+91 00000 00000",
    hours: "Monday to Saturday, 10 am – 7 pm IST",
  },
  /** Mirrors the backend's shop.shipping.free-above-paise (149900) and charge-paise (9900). Checkout always uses the server's numbers. */
  freeShippingThreshold: 1499,
  shippingFee: 99,
  announcements: [
    "Complimentary shipping on orders above ₹1,499",
    "Secure online payment with Razorpay, or cash on delivery",
  ],
  box: { size: 3, price: 1799, title: "Build Your Own Box" },
  /**
   * Features the backend can't support yet stay switched off, so shoppers never see a price
   * that checkout won't honour. Build Your Own Box needs bundle pricing on the server.
   */
  features: { buildYourBox: false },
} as const;

export type NavLink = { label: string; href: string; description?: string };

/** Desktop mega-panel content for a top-level item. */
export type NavPanel = {
  eyebrow: string;
  native: string;
  blurb: string;
  cta: NavLink;
  feature: { eyebrow: string; title: string; href: string; image: string; alt: string };
};

export const mainNav: { label: string; href: string; world?: "attar" | "perfume"; links?: NavLink[]; panel?: NavPanel }[] = [
  {
    label: "Attar",
    href: "/collections/attars",
    world: "attar",
    links: [
      { label: "All Attars", href: "/collections/attars" },
      { label: "The Oud Edit", href: "/collections/oud" },
      { label: "New Arrivals", href: "/collections/new-arrivals" },
    ],
    panel: {
      eyebrow: "The Attar House",
      native: "عطر",
      blurb: "Alcohol-free perfume oils of oud, rose, saffron and earth. Worn close, made to last.",
      cta: { label: "Shop all attars", href: "/collections/attars" },
      feature: { eyebrow: "The Oud Edit", title: "Agarwood in every form", href: "/collections/oud", image: "/images/campaign/cat-attar.webp", alt: "Attars on a brass tray with oud chips" },
    },
  },
  {
    label: "Perfumes",
    href: "/collections/perfumes",
    world: "perfume",
    links: [
      { label: "All Perfumes", href: "/collections/perfumes" },
      { label: "For Him", href: "/collections/him" },
      { label: "For Her", href: "/collections/her" },
      { label: "New Arrivals", href: "/collections/new-arrivals" },
    ],
    panel: {
      eyebrow: "The Perfume House",
      native: "Parfum",
      blurb: "Eaux de parfum with clean architecture and rich materials. Made for presence, every day.",
      cta: { label: "Shop all perfumes", href: "/collections/perfumes" },
      feature: { eyebrow: "Just composed", title: "New arrivals", href: "/collections/new-arrivals", image: "/images/campaign/cat-perfume.webp", alt: "Three flacons on stepped travertine blocks" },
    },
  },
  { label: "Shop All", href: "/collections/all" },
  { label: "Journal", href: "/journal" },
  { label: "About", href: "/about" },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Perfumes", href: "/collections/perfumes" },
      { label: "Attars", href: "/collections/attars" },
      { label: "New Arrivals", href: "/collections/new-arrivals" },
      { label: "Shop All", href: "/collections/all" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Our Story", href: "/about" },
      { label: "Journal", href: "/journal" },
      { label: "Contact", href: "/help/contact" },
    ],
  },
  {
    title: "Customer Care",
    links: [
      { label: "Shipping", href: "/help/shipping" },
      { label: "Returns", href: "/help/returns" },
      { label: "FAQs", href: "/help/faqs" },
      { label: "Track Order", href: "/help/track-order" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/help/privacy" },
      { label: "Terms", href: "/help/terms" },
      { label: "Refund Policy", href: "/help/refund-policy" },
    ],
  },
];
