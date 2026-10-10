import { useEffect } from "react";
import { site } from "@/lib/site";

const DEFAULT_TITLE = `${site.name} | ${site.descriptor}`;

function setMeta(name: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (content === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

/** Sets the document title ("Title | Cosmic Life") and meta description for the current page. */
export function usePageMeta(title?: string, description?: string, opts: { noindex?: boolean } = {}) {
  const { noindex = false } = opts;
  useEffect(() => {
    document.title = title ? `${title} | ${site.name}` : DEFAULT_TITLE;
    setMeta("description", description ?? site.description);
    setMeta("robots", noindex ? "noindex" : null);
  }, [title, description, noindex]);
}
