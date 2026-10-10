/** Minimal line versions of social marks (lucide no longer ships brand icons). */
const paths = {
  Instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
    </>
  ),
  Facebook: <path d="M14 8.5h2.5V5H14c-2.2 0-3.5 1.4-3.5 3.6V11H8v3.5h2.5V21H14v-6.5h2.4l.6-3.5h-3V9.1c0-.4.2-.6.6-.6z" />,
  YouTube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
      <path d="M10.2 9.3v5.4l4.6-2.7z" fill="currentColor" />
    </>
  ),
  Pinterest: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M11 9.2c.4-1 1.4-1.6 2.5-1.4 1.6.3 2.3 1.9 1.8 3.5-.4 1.3-1.5 2.2-2.6 1.9-.8-.2-1.2-.9-1-1.6M11.6 11.1 9.8 19" />
    </>
  ),
};

export function SocialIcon({ name, className }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {paths[name]}
    </svg>
  );
}

export const socialLinks: { name: keyof typeof paths; href: string }[] = [
  { name: "Instagram", href: "https://instagram.com" },
  { name: "Facebook", href: "https://facebook.com" },
  { name: "YouTube", href: "https://youtube.com" },
  { name: "Pinterest", href: "https://pinterest.com" },
];
