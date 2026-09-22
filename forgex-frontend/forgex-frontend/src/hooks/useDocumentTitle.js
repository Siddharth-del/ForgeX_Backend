import { useEffect } from 'react';

const BASE = 'ForgeX';

export function useDocumentTitle(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE}` : `${BASE} — Perfume & Attar`;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) { tag = document.createElement('meta'); tag.name = 'description'; document.head.appendChild(tag); }
      tag.content = description;
    }
  }, [title, description]);
}
