"use client";
// Estado da demonstração (período, layout, aparelho), espelhado na URL.
// Substitui o roteador do Next: o painel "navega" só trocando o período aqui.

export type DemoState = { period: string; from: string; to: string; layout: "novo" | "antigo"; device: "desktop" | "mobile"; embed: boolean };

const listeners = new Set<() => void>();
let state: DemoState = read();
let toast: string | null = null;

function read(): DemoState {
  if (typeof window === "undefined") return { period: "today", from: "", to: "", layout: "novo", device: "desktop", embed: false };
  const q = new URLSearchParams(window.location.search);
  return {
    period: q.get("period") || (q.get("from") || q.get("to") ? "custom" : "today"),
    from: q.get("from") || "",
    to: q.get("to") || "",
    layout: q.get("layout") === "antigo" ? "antigo" : "novo",
    device: q.get("device") === "mobile" ? "mobile" : "desktop",
    embed: q.get("embed") === "1",
  };
}

export function query(s: DemoState = state): string {
  const q = new URLSearchParams();
  if (s.period === "custom") {
    if (s.from) q.set("from", s.from);
    if (s.to) q.set("to", s.to);
  } else if (s.period !== "today") q.set("period", s.period);
  if (s.layout === "antigo") q.set("layout", "antigo");
  if (s.device === "mobile") q.set("device", "mobile");
  if (s.embed) q.set("embed", "1");
  return q.toString();
}

export function getState() { return state; }
export function getToast() { return toast; }
export function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }

export function setState(patch: Partial<DemoState>) {
  state = { ...state, ...patch };
  if (typeof window !== "undefined") {
    const qs = query();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    if (state.embed && window.parent !== window) window.parent.postMessage({ voxDemo: { period: state.period, from: state.from, to: state.to } }, "*");
  }
  listeners.forEach((l) => l());
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function showToast(msg: string) {
  toast = msg;
  listeners.forEach((l) => l());
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast = null; listeners.forEach((l) => l()); }, 2600);
}

/** Recebe um href do painel ("/painel?period=7d") e aplica o período. */
export function navigateTo(href: string) {
  const u = new URL(href, "http://x");
  const path = u.pathname.replace(/\/$/, "");
  if (path !== "/painel") {
    showToast("Nesta demonstração, só o Dashboard está disponível.");
    return;
  }
  const from = u.searchParams.get("from") || "";
  const to = u.searchParams.get("to") || "";
  const period = from || to ? "custom" : u.searchParams.get("period") || "today";
  setState({ period, from, to });
}
