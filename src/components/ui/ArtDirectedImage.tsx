interface Props {
  /** Wide crop served from `minWidth` up. */
  wide: string;
  /** Portrait crop for phones. */
  narrow: string;
  alt: string;
  /** Media query breakpoint (px) where the wide crop takes over. */
  minWidth?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/**
 * Art-directed `fill` image: one <picture>, two crops, and the browser downloads only the one it shows.
 */
export function ArtDirectedImage({ wide, narrow, alt, minWidth = 768, priority = false, className }: Props) {
  return (
    <picture>
      <source media={`(min-width: ${minWidth}px)`} srcSet={wide} />
      <img
        src={narrow}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={className}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", color: "transparent" }}
      />
    </picture>
  );
}
