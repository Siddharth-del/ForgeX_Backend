import type { AnchorHTMLAttributes, Ref } from "react";
import { Link as RouterLink } from "react-router";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  replace?: boolean;
  ref?: Ref<HTMLAnchorElement>;
};

const EXTERNAL = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

/** Internal links go through the client-side router; external, mailto: and tel: links stay plain anchors. */
export default function Link({ href, replace, ref, ...rest }: Props) {
  if (EXTERNAL.test(href) || rest.target === "_blank" || rest.download !== undefined) {
    return <a ref={ref} href={href} {...rest} />;
  }
  return <RouterLink ref={ref} to={href} replace={replace} {...rest} />;
}
