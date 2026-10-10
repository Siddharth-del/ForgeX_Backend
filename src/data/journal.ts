import type { JournalArticle } from "@/types";

const img = (name: string, alt: string, width = 1600, height = 1000) => ({ src: `/images/campaign/${name}.webp`, alt, width, height });

export const journal: JournalArticle[] = [
  {
    slug: "the-art-of-oud",
    title: "The Art of Oud",
    kicker: "Materials",
    excerpt: "Why a wound in a tree became the most treasured material in perfumery, and how to wear it well.",
    readTime: "6 min read",
    date: "2026-09-12",
    image: img("oud-close", "Oud chips and rising smoke beside an attar bottle", 1200, 1500),
    cover: { ...img("banner-oud", "An attar bottle in a shaft of light with oud chips and rising smoke", 2400, 900), position: "72% 50%" },
    body: [
      {
        paragraphs: [
          "Oud begins as a defence. When an Aquilaria tree is wounded and infected by a particular mould, its heartwood darkens with a fragrant resin to protect itself. That resin-soaked wood is agarwood, and the oil distilled from it is oud.",
          "Because the process can take many years and only a fraction of trees ever produce it, natural oud has always been rare. Its scent is just as hard to pin down: smoky, leathery, animalic, sweet, sometimes all at once.",
        ],
      },
      {
        heading: "How oud is worn",
        paragraphs: [
          "In Arabian tradition, oud is layered. Chips of agarwood are burned as bakhoor to scent clothes and rooms, then oud oil is dabbed on the skin, and finally a spray is worn over it. Each layer lasts differently, so the scent changes through the day.",
          "If oud is new to you, start soft: an oud softened with florals or musk, before moving on to a pure, resinous oud oil.",
        ],
      },
      {
        heading: "Reading an oud",
        paragraphs: [
          "Smoky ouds feel dry and dark, like a fire that has just gone out. Sweeter ouds lean toward honey and leather. Rose and saffron are its oldest companions, softening the edges and lifting the opening.",
        ],
      },
    ],
  },
  {
    slug: "choosing-your-signature",
    title: "How to Choose Your Signature Fragrance",
    kicker: "Guide",
    excerpt: "A practical way to find the scent people will remember you by, without testing fifty blotters.",
    readTime: "5 min read",
    date: "2026-08-30",
    image: img("lineup", "Five flacons in a row on a travertine shelf"),
    body: [
      {
        paragraphs: [
          "A signature scent is less about the most beautiful perfume in the shop and more about the one that feels like you on an ordinary Tuesday.",
        ],
      },
      {
        heading: "Start with what you already love",
        paragraphs: [
          "Think of smells you return to: rain on dry earth, sandalwood incense, fresh laundry, a bowl of citrus. Each points to a family. Earthy lovers often settle on vetiver and petrichor; laundry lovers on musk; incense lovers on woods and oud.",
        ],
      },
      {
        heading: "Test on skin, then wait",
        paragraphs: [
          "Blotters show the opening. Skin shows the truth. Spray once on the inner wrist, leave it alone, and smell it again after an hour and after four hours. The drydown is what you will live with.",
          "A discovery set is the easiest way to do this properly: wear one fragrance per day for a week before deciding.",
        ],
      },
      {
        heading: "Match it to your days",
        paragraphs: [
          "If most of your life is office hours and humid commutes, choose something fresh or musky with moderate projection. If your evenings matter most, go deeper with amber, oud or leather.",
        ],
      },
    ],
  },
  {
    slug: "attar-vs-perfume",
    title: "Attar vs Perfume",
    kicker: "Two worlds",
    excerpt: "Oil or alcohol, intimate or projecting. What separates the two, and why you might want both.",
    readTime: "4 min read",
    date: "2026-08-14",
    image: img("duel", "An attar bottle on dark wood beside a perfume flacon on travertine"),
    body: [
      {
        paragraphs: [
          "Both are perfume. The difference is what carries the scent. An attar is a pure perfume oil with no alcohol; an eau de parfum dissolves fragrance oils in perfumer's alcohol so they can be sprayed.",
        ],
      },
      {
        heading: "How they behave",
        paragraphs: [
          "Alcohol evaporates quickly, throwing the fragrance into the air around you. That is why a spray projects. Oil stays on the skin and warms with your body, so an attar sits closer and lasts longer, often through the night.",
          "Attars are applied with the glass dauber or a fingertip to pulse points: wrists, behind the ears, the base of the throat. A little goes a long way.",
        ],
      },
      {
        heading: "Why wear both",
        paragraphs: [
          "Layering is the old secret. Dab an attar first, then mist a perfume from the same family over it. The oil anchors the spray, and the spray gives the oil a trail.",
        ],
      },
    ],
  },
  {
    slug: "make-fragrance-last-longer",
    title: "How to Make Your Fragrance Last Longer",
    kicker: "Ritual",
    excerpt: "Seven small habits that keep your scent on the skin from the morning commute to the last dinner course.",
    readTime: "3 min read",
    date: "2026-07-28",
    image: img("new-arrival", "A flacon on a round plinth in warm window light", 1200, 1500),
    cover: { ...img("cat-perfume", "Three flacons on stepped travertine blocks in low warm light", 1500, 1300), position: "50% 42%" },
    body: [
      {
        paragraphs: [
          "Longevity depends as much on how you wear a fragrance as on the fragrance itself. These habits make the biggest difference.",
        ],
      },
      {
        heading: "On the skin",
        paragraphs: [
          "Apply right after a shower, onto moisturised skin. Fragrance clings to hydrated skin far better than to dry skin; an unscented lotion is ideal.",
          "Spray, don't rub. Rubbing your wrists together warms and breaks down the top notes faster.",
          "Choose pulse points and the back of the neck, where warmth helps the scent unfold.",
        ],
      },
      {
        heading: "Beyond the skin",
        paragraphs: [
          "Mist a little onto your hair brush or scarf; fibres hold scent for hours. Layer an attar underneath for an oil base that anchors the spray.",
          "Store bottles away from heat and sunlight. A drawer is better than a sunny bathroom shelf.",
        ],
      },
    ],
  },
  {
    slug: "the-history-of-oud",
    title: "The History of Oud",
    kicker: "Heritage",
    excerpt: "From the forests of Assam to the courts of Arabia: following agarwood across centuries of trade.",
    readTime: "7 min read",
    date: "2026-07-02",
    image: img("landscape", "Sand dunes at dusk with an attar bottle on a stone plinth"),
    body: [
      {
        paragraphs: [
          "For as long as people have traded spices, they have traded agarwood. The forests of North-East India and South-East Asia supplied resinous wood that travelled overland and by sea to Arabia, Persia and beyond.",
        ],
      },
      {
        heading: "A material of ceremony",
        paragraphs: [
          "Agarwood smoke has scented temples, mosques and royal courts across many cultures. Burning it was a gesture of welcome and respect, and in much of the Gulf it still is: guests are offered bakhoor as they arrive.",
        ],
      },
      {
        heading: "From smoke to oil",
        paragraphs: [
          "Distillers learned to draw oil from the wood, concentrating its scent into a few drops. In India, perfumers in Kannauj refined distillation into an art, using copper stills and sandalwood oil to capture flowers, earth and woods.",
          "Today natural oud is rarer than ever, and responsible sourcing and cultivated agarwood matter. The tradition continues in every bottle that carries its name.",
        ],
      },
    ],
  },
];
