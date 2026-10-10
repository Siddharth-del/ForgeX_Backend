import Link from "@/components/ui/Link";
import { Newsletter } from "@/components/newsletter/Newsletter";
import { SocialIcon, socialLinks } from "@/components/ui/Social";
import { footerNav, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-auto">
      <Newsletter />
      <div className="bg-espresso-deep text-ivory">
        <div className="container-site grid grid-cols-1 gap-12 border-t border-hair-light py-16 lg:grid-cols-[1.2fr_2fr]">
          <div className="max-w-sm">
            <p className="font-display text-[1.6rem] tracking-[0.3em]">{site.wordmark}</p>
            <p className="mt-4 text-[0.88rem] leading-relaxed text-ivory/60">{site.description}</p>
            <div className="mt-6 space-y-1 text-[0.82rem] text-ivory/70">
              <p className="select-all">{site.contact.email}</p>
              <p className="select-all tabular">{site.contact.phone}</p>
              <p className="text-ivory/45">{site.contact.hours}</p>
            </div>
            <ul className="mt-7 flex gap-2" aria-label="Social media">
              {socialLinks.map((s) => (
                <li key={s.name}>
                  <a href={s.href} target="_blank" rel="noreferrer" aria-label={s.name} className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory/20 text-ivory/75 transition-colors duration-300 hover:border-gold-soft hover:text-gold-soft">
                    <SocialIcon name={s.name} className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {footerNav.map((col) => (
              <div key={col.title}>
                <p className="label mb-5 text-gold-soft/80">{col.title}</p>
                <ul className="space-y-3 text-[0.86rem] text-ivory/70">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="link-underline transition-colors hover:text-ivory">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div aria-hidden className="container-site overflow-hidden">
          <p className="select-none whitespace-nowrap text-center font-display text-[10.6vw] font-light leading-[0.85] tracking-[0.04em] text-ivory/[0.07] 2xl:text-[10rem]">COSMIC LIFE</p>
        </div>

        <div className="container-site flex flex-col gap-3 border-t border-hair-light py-6 text-[0.72rem] text-ivory/45 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. Prices in INR, inclusive of GST.</p>
          <p>UPI · Cards · Net banking · Cash on delivery</p>
        </div>
      </div>
    </footer>
  );
}
