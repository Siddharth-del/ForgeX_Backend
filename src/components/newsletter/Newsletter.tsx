import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { EASE } from "@/lib/motion";

/**
 * Newsletter signup. The ForgeX API has no newsletter endpoint, so sign-ups go to the public URL in
 * VITE_NEWSLETTER_URL (your email provider's form endpoint, which receives { email } as JSON).
 * Until it's set, the form says sign-ups aren't open rather than pretending to subscribe anyone.
 */
const NEWSLETTER_URL = (import.meta.env.VITE_NEWSLETTER_URL ?? "").trim();

async function subscribe(email: string) {
  if (!NEWSLETTER_URL) throw new Error("Newsletter sign-ups aren't open yet. Please check back soon.");
  const res = await fetch(NEWSLETTER_URL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email: email.trim() }) });
  if (!res.ok) throw new Error("We couldn't add you just now. Please try again in a moment.");
}

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setState("error");
      setMessage("Enter a valid email address, like name@example.com.");
      return;
    }
    setState("loading");
    try {
      await subscribe(email);
      setState("done");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error && err.message ? err.message : "We couldn't add you just now. Please try again in a moment.");
    }
  };

  return (
    <section aria-labelledby="newsletter-title" className="grain relative overflow-hidden bg-espresso text-ivory">
      <div aria-hidden className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 select-none font-arabic text-[18rem] leading-none text-gold/[0.06] md:text-[26rem]">
        عطر
      </div>
      <div className="container-site relative z-[2] grid grid-cols-1 gap-10 py-section md:grid-cols-[1.1fr_1fr] md:items-end">
        <div>
          <p className="eyebrow mb-5 text-gold-soft">The Cosmic Life letter</p>
          <h2 id="newsletter-title" className="text-display-md uppercase">
            Stay in
            <br />
            the scent
          </h2>
          <p className="mt-5 max-w-sm text-[0.95rem] text-ivory/65">Discover new launches, exclusive collections and private offers. One letter a month, never more.</p>
        </div>
        <div>
          <AnimatePresence mode="wait">
            {state === "done" ? (
              <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="flex items-start gap-4 border-t border-gold/40 pt-6">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold-soft text-gold-soft">
                  <Check className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="font-display text-2xl uppercase">You&rsquo;re on the list</p>
                  <p className="mt-1 text-[0.85rem] text-ivory/60">Watch {email} for our next letter.</p>
                </div>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={onSubmit} noValidate exit={{ opacity: 0 }} className="w-full">
                <label htmlFor="newsletter-email" className="label text-ivory/60">
                  Email address
                </label>
                <div className="mt-3 flex items-center border-b border-ivory/35 transition-colors focus-within:border-gold-soft">
                  <input
                    id="newsletter-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (state === "error") setState("idle");
                    }}
                    placeholder="you@example.com"
                    aria-invalid={state === "error"}
                    aria-describedby="newsletter-msg"
                    className="h-14 min-w-0 flex-1 bg-transparent text-[1rem] text-ivory outline-none placeholder:text-ivory/35"
                  />
                  <button type="submit" disabled={state === "loading"} className="group flex h-14 items-center gap-3 pl-4 text-[0.7rem] font-medium uppercase tracking-[0.24em] text-gold-soft transition-colors hover:text-ivory disabled:opacity-60">
                    {state === "loading" ? "Joining" : "Subscribe"}
                    <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" strokeWidth={1.3} />
                  </button>
                </div>
                <p id="newsletter-msg" className={state === "error" ? "mt-3 text-[0.8rem] text-[#f0b8a8]" : "mt-3 text-[0.75rem] text-ivory/40"}>
                  {state === "error" ? message : "By subscribing you agree to our privacy policy. Unsubscribe anytime."}
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
