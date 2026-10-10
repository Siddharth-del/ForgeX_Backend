import type { CSSProperties, ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height"> & {
  src: string;
  alt: string;
  /** Cover the nearest positioned parent (the parent sets the aspect ratio). */
  fill?: boolean;
  width?: number;
  height?: number;
  /** Above-the-fold image: load eagerly at high priority instead of lazily. */
  priority?: boolean;
};

const FILL: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", color: "transparent" };

/**
 * Image with the same props the storefront has always used (`fill`, `priority`, `sizes`),
 * rendered as a plain <img>. The source art in /public is already sized and compressed WebP.
 */
export default function Image({ fill, priority, loading, decoding, style, sizes: _sizes, ...rest }: Props) {
  return (
    <img
      {...rest}
      loading={priority ? "eager" : (loading ?? "lazy")}
      fetchPriority={priority ? "high" : undefined}
      decoding={decoding ?? "async"}
      style={fill ? { ...FILL, ...style } : style}
    />
  );
}
