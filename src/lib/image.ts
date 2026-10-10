/**
 * Prepares a product photo for upload. The backend has no multipart size setting, so Spring's
 * default 1 MB per file applies; larger photos are scaled and re-encoded in the browser first.
 */
export const MAX_UPLOAD_BYTES = 1024 * 1024;
const TARGET = 950 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export interface PreparedImage {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  /** True when the photo had to be resized or re-encoded. */
  converted: boolean;
}

function loadBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be read as an image."));
    };
    img.src = url;
  });
}

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function prepareProductImage(file: File): Promise<PreparedImage> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Choose a JPEG, PNG or WebP image.");
  const img = await loadBitmap(file);
  if (img.naturalWidth < 400 || img.naturalHeight < 400) throw new Error("That image is too small. Use one at least 400 × 400 pixels (1200 px or more looks best).");
  if (file.size <= TARGET && file.type !== "image/png") {
    return { blob: file, filename: file.name, width: img.naturalWidth, height: img.naturalHeight, converted: false };
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "product";
  for (const longest of [2000, 1600, 1280]) {
    const scale = Math.min(1, longest / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#ffffff"; // PNG transparency becomes white rather than black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.88, 0.8, 0.72]) {
      const blob = await encode(canvas, "image/jpeg", q);
      if (blob && blob.size <= TARGET) return { blob, filename: `${base}.jpg`, width: canvas.width, height: canvas.height, converted: true };
    }
  }
  throw new Error("We couldn't bring that image under 1 MB. Try a smaller photo.");
}

export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
