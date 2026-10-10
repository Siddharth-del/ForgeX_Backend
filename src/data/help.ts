import { site } from "@/lib/site";

export interface HelpPage {
  slug: string;
  title: string;
  intro: string;
  /** Template legal copy should be reviewed by a professional before launch. */
  template?: boolean;
  sections?: { heading: string; body: string[] }[];
  faqs?: { q: string; a: string }[];
}

export const helpPages: HelpPage[] = [
  {
    slug: "shipping",
    title: "Shipping",
    template: true,
    intro: "Every order is packed by hand in our studio and dispatched on working days.",
    sections: [
      { heading: "Delivery times", body: ["Metro cities: 2–3 working days.", "Rest of India: 3–6 working days.", "Follow each order's status (Confirmed, Shipped, Delivered) under Orders in your account."] },
      { heading: "Shipping charges", body: [`Complimentary on orders above ₹${site.freeShippingThreshold.toLocaleString("en-IN")} (after any coupon). A flat ₹${site.shippingFee} applies below that.`, "Cash on delivery is available at no extra charge."] },
      { heading: "Perfume and air travel", body: ["Alcohol-based perfumes ship by surface to comply with courier regulations, which can add a day in some regions."] },
    ],
  },
  {
    slug: "returns",
    title: "Returns",
    template: true,
    intro: "If something isn't right, we'll make it right.",
    sections: [
      { heading: "Unopened bottles", body: ["Return any unopened, sealed product within 7 days of delivery for a full refund to your original payment method."] },
      { heading: "Damaged or incorrect items", body: ["Email us a photo within 48 hours of delivery and we'll send a replacement at no cost."] },
      { heading: "How to start a return", body: [`Write to ${site.contact.email} with your order number. We'll arrange a pickup from your address.`] },
    ],
  },
  {
    slug: "refund-policy",
    title: "Refund Policy",
    template: true,
    intro: "How and when refunds are issued.",
    sections: [
      { heading: "Timelines", body: ["Refunds are initiated within 2 working days of the returned item reaching us.", "UPI and wallet refunds usually reflect within 1–3 days; card and net-banking refunds within 5–7 working days."] },
      { heading: "Cash on delivery orders", body: ["Refunds for COD orders are paid to a bank account or UPI ID you share with us."] },
    ],
  },
  {
    slug: "faqs",
    title: "FAQs",
    intro: "Answers to the questions we hear most.",
    faqs: [
      { q: "What is the difference between an attar and a perfume?", a: "An attar is a pure, alcohol-free perfume oil applied with a dauber; it sits close to the skin and lasts longer. Our perfumes are eaux de parfum that project more and are sprayed. Read our journal story “Attar vs Perfume” for more." },
      { q: "How long do your fragrances last?", a: "Attars are concentrated oils that sit close to the skin and usually last longer; eaux de parfum project more. How long any fragrance lasts depends on your skin and the climate." },
      { q: "Are your attars alcohol-free?", a: "Yes. All attars are pure perfume oils with no alcohol." },
      { q: "How do I pay?", a: "Pay online with UPI, cards, net banking or wallets through Razorpay's secure checkout, or choose cash on delivery. Online orders are confirmed as soon as the payment is verified." },
      { q: "Where can I find my invoice?", a: "Open the order under Orders in your account and choose Download invoice. Invoices are available once an order is paid or confirmed." },
      { q: "How should I store my fragrance?", a: "Keep bottles away from direct sunlight and heat, ideally in a drawer or their box. Avoid steamy bathrooms." },
    ],
  },
  {
    slug: "track-order",
    title: "Track Order",
    intro: "Follow your order from our studio to your door.",
    sections: [
      { heading: "In your account", body: ["Sign in and open Orders in your account to see where each order is: Placed, Confirmed, Shipped or Delivered. You can download the invoice there too."] },
      { heading: "Need help?", body: [`Write to ${site.contact.email} with your order number (it starts with FGX-) and we'll look into it.`] },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    intro: "We're here to help you choose, gift and wear your fragrance.",
    sections: [
      { heading: "Email", body: [site.contact.email, "We reply within one working day."] },
      { heading: "Phone & WhatsApp", body: [site.contact.phone, site.contact.hours] },
      { heading: "Corporate & wedding gifting", body: ["For bulk orders with custom boxes and notes, email us with your date and quantity."] },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    template: true,
    intro: "How we collect, use and protect your personal information.",
    sections: [
      { heading: "What we collect", body: ["Contact and delivery details you provide at checkout, order history, and basic analytics about how our site is used."] },
      { heading: "How we use it", body: ["To fulfil orders, provide customer support, and, if you opt in, send our newsletter. We never sell your data."] },
      { heading: "Your choices", body: [`You can unsubscribe from emails at any time and request deletion of your data by writing to ${site.contact.email}.`] },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    template: true,
    intro: "The terms that apply when you shop with us.",
    sections: [
      { heading: "Orders", body: ["Online orders are confirmed once the payment is verified; unpaid online orders are cancelled automatically after 15 minutes. Cash-on-delivery orders are confirmed when placed. We may cancel orders affected by pricing errors and will refund in full."] },
      { heading: "Product information", body: ["We describe our fragrances as accurately as we can, but scent is personal and may wear differently on your skin."] },
      { heading: "Governing law", body: ["These terms are governed by the laws of India."] },
    ],
  },
];
