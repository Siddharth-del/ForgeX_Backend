import type { Category, Collection } from "@/types";

const c = (src: string, alt: string, width = 1200, height = 1500) => ({ src, alt, width, height });
const wide = (name: string, alt: string) => c(`/images/campaign/${name}.webp`, alt, 2400, 900);

export const collections: Collection[] = [
  {
    slug: "perfumes",
    title: "Perfumes",
    eyebrow: "The Perfume House",
    description: "Modern eaux de parfum composed for presence: clean lines, rich materials, made to be worn every day.",
    world: "perfume",
    theme: "light",
    image: c("/images/campaign/world-perfume.webp", "Two flacons on travertine plinths in arched window light"),
    banner: wide("banner-perfume", "Two Cosmic Life flacons on travertine plinths in arched window light"),
  },
  {
    slug: "attars",
    title: "Attars",
    eyebrow: "The Attar House",
    description: "Pure, alcohol-free perfume oils rooted in Indian and Arabian tradition. Concentrated, intimate, long-lasting.",
    world: "attar",
    theme: "dark",
    image: c("/images/campaign/world-attar.webp", "Gold-capped attar bottles beside smouldering oud in a brass bowl"),
    banner: wide("banner-attar", "Gold-capped attar bottles beside a brass bowl of smouldering oud"),
  },
  {
    slug: "oud",
    title: "The Oud Edit",
    eyebrow: "Agarwood",
    description: "Smoky, resinous, precious. Every way we work with oud, as oil and as spray.",
    theme: "dark",
    image: c("/images/campaign/oud-close.webp", "Oud chips and rising smoke around an attar bottle"),
    banner: wide("banner-oud", "An attar bottle in a shaft of light with oud chips and rising smoke"),
  },
  {
    slug: "new-arrivals",
    title: "New Arrivals",
    eyebrow: "Just composed",
    description: "Our latest compositions, fresh from the studio.",
    theme: "light",
    image: c("/images/campaign/new-arrival.webp", "A Cosmic Life flacon on a round travertine plinth"),
  },
  {
    slug: "him",
    title: "For Him",
    eyebrow: "Collection",
    description: "Woods, spices, vetiver and leather. Fragrances with quiet confidence.",
    theme: "light",
    image: c("/images/campaign/world-perfume.webp", "Perfume flacons on stone plinths"),
    banner: wide("banner-perfume", "Perfume flacons on stone plinths in arched window light"),
  },
  {
    slug: "her",
    title: "For Her",
    eyebrow: "Collection",
    description: "Rose, peony, musk and saffron. Fragrances with grace and depth.",
    theme: "light",
    image: c("/images/campaign/world-perfume.webp", "Perfume flacons on stone plinths"),
    banner: c("/images/campaign/lineup.webp", "A row of Cosmic Life flacons on a travertine shelf", 1600, 1000),
  },
  {
    slug: "all",
    title: "All Fragrances",
    eyebrow: "Shop all",
    description: "Every perfume and attar in the house.",
    theme: "light",
    image: c("/images/campaign/lineup.webp", "A row of Cosmic Life flacons on a travertine shelf", 1600, 1000),
    banner: c("/images/campaign/lineup.webp", "A row of Cosmic Life flacons on a travertine shelf", 1600, 1000),
  },
];

export const categories: Category[] = [
  {
    slug: "perfumes",
    title: "Perfumes",
    description: "Modern compositions made for unforgettable presence.",
    href: "/collections/perfumes",
    image: c("/images/campaign/cat-perfume.webp", "Three Cosmic Life flacons on stepped travertine blocks", 1500, 1300),
  },
  {
    slug: "attars",
    title: "Attars",
    description: "Pure concentrated fragrances rooted in tradition.",
    href: "/collections/attars",
    image: c("/images/campaign/cat-attar.webp", "Three attars on a brass tray with oud chips", 1500, 1300),
  },
  {
    slug: "oud",
    title: "Oud",
    description: "Agarwood in every form: smoky, resinous, rare.",
    href: "/collections/oud",
    image: c("/images/campaign/oud-close.webp", "Oud chips and smoke"),
  },
  {
    slug: "new-arrivals",
    title: "New Arrivals",
    description: "Fresh compositions from the studio.",
    href: "/collections/new-arrivals",
    image: c("/images/campaign/new-arrival.webp", "A Cosmic Life flacon on a travertine plinth"),
  },
  {
    slug: "all",
    title: "All Fragrances",
    description: "Every perfume and attar in the house.",
    href: "/collections/all",
    image: c("/images/campaign/lineup.webp", "A row of Cosmic Life flacons on a travertine shelf", 1600, 1000),
  },
];
