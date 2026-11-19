"use client";
import React from "react";
import { navigateTo } from "../src/mvp/store";

// Substituto de next/link: links do painel não saem da página; o Dashboard
// troca o período, o resto avisa que a demonstração é só do Dashboard.
type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string | { pathname?: string }; prefetch?: boolean; scroll?: boolean; replace?: boolean };
const Link = React.forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch, scroll, replace, onClick, ...rest }, ref) {
  const h = typeof href === "string" ? href : ((href as { pathname?: string }).pathname ?? "#");
  return (
    <a
      ref={ref}
      href="#"
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        e.preventDefault();
        navigateTo(h);
      }}
    />
  );
});
export default Link;
