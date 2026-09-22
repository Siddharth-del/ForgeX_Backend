const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const imageBase = (import.meta.env.VITE_IMAGE_BASE_URL || `${apiBase}/images`).replace(/\/$/, '');

/**
 * The backend stores either a full URL or just the uploaded file name
 * (FileServiceImpl returns "<uuid>.<ext>"). Resolve both to a usable src.
 */
export function resolveImage(image) {
  if (!image) return null;
  if (/^(https?:)?\/\//.test(image) || image.startsWith('data:')) return image;
  return `${imageBase}/${image.replace(/^\/?(images\/)?/, '')}`;
}
