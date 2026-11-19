"use client";
import { useSyncExternalStore } from "react";
import { getState, subscribe, navigateTo, query } from "../src/mvp/store";

// Substituto de next/navigation para a demonstração estática.
export function usePathname() { return "/painel"; }

let cacheKey = "";
let cacheVal = new URLSearchParams();
function snapshot() {
  const s = getState();
  const k = `${s.period}|${s.from}|${s.to}`;
  if (k !== cacheKey) {
    cacheKey = k;
    const q = new URLSearchParams();
    if (s.period === "custom") { if (s.from) q.set("from", s.from); if (s.to) q.set("to", s.to); }
    else q.set("period", s.period);
    cacheVal = q;
  }
  return cacheVal;
}
export function useSearchParams() { return useSyncExternalStore(subscribe, snapshot, snapshot); }

const router = {
  push: (href: string) => navigateTo(href),
  replace: (href: string) => navigateTo(href),
  refresh: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
};
export function useRouter() { return router; }
export function redirect() {}
export function notFound() {}
export { query };
