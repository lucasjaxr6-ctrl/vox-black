"use client";
// Dados fictícios da demonstração. Gera ~75 dias de vendas, carrinhos e sessões
// de checkout de uma loja e calcula o DashboardData com as MESMAS regras do
// sistema: pago = PAID/SHIPPED, ticket = pago ÷ vendas pagas, aprovação do
// cartão = aprovados ÷ decididos, etc.

import { resolveRange, rangeLabel, spMidnight, ymdTodaySP } from "@/lib/painel-range";
import type { DashboardData } from "@/components/painel/dashboard/DashboardView";
import type { SeriesBlock, Gran } from "@/lib/dashboard-series";
import type { Premiacao } from "@/lib/premiacao";

type Order = {
  id: string; t: number; status: "PAID" | "SHIPPED" | "PENDING" | "CANCELLED"; method: "PIX" | "CREDIT_CARD";
  device: "MOBILE" | "DESKTOP"; cents: number; name: string; email: string; recovered: null | "pix" | "cart";
};
type Cart = { t: number; cents: number };
type Session = { t: number; step: number };

const DAY = 86400000;
const SP = 3 * 3600000;

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMES = ["Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Rocha", "Elisa Martins", "Fábio Costa", "Gabriela Alves", "Henrique Dias", "Isabela Nunes", "João Pereira", "Karina Lopes", "Lucas Ribeiro", "Mariana Freitas", "Natália Gomes", "Otávio Barros", "Paula Teixeira", "Rafael Moreira", "Sabrina Castro", "Tiago Cardoso", "Vanessa Pinto"];
const PRECOS = [18990, 12990, 15990, 8990, 10990, 24990, 17990, 21990];
// Peso de cada hora do dia (compras de anúncio: pico à noite).
const HORAS = [1, 0.5, 0.3, 0.2, 0.2, 0.3, 0.6, 1, 1.6, 2, 2.2, 2.3, 2.6, 2.4, 2.3, 2.4, 2.6, 2.9, 3.2, 3.6, 4, 3.8, 3, 2];

let cache: { orders: Order[]; carts: Cart[]; sessions: Session[] } | null = null;

function gerar() {
  if (cache) return cache;
  const r = rng(20261118);
  const now = Date.now();
  const today = spMidnight(ymdTodaySP()).getTime();
  const orders: Order[] = [];
  const carts: Cart[] = [];
  const sessions: Session[] = [];
  const horaSorteio = () => {
    const tot = HORAS.reduce((a, b) => a + b, 0);
    let x = r() * tot;
    for (let h = 0; h < 24; h++) { x -= HORAS[h]; if (x <= 0) return h; }
    return 23;
  };
  let n = 0;
  for (let d = 75; d >= 0; d--) {
    const dia = today - d * DAY;
    const dow = new Date(dia - SP).getUTCDay();
    const base = (dow === 0 || dow === 6 ? 9 : 7) * (1 + (75 - d) / 160); // crescimento leve
    const qtd = Math.round(base + r() * 5);
    const sess = Math.round(qtd * (6.5 + r() * 2));
    const ev = (k: number) => {
      const t = dia + horaSorteio() * 3600000 + Math.floor(r() * 3600000);
      return t <= now ? t : null;
    };
    for (let i = 0; i < qtd; i++) {
      const t = ev(i); if (t === null) continue;
      const method = r() < 0.62 ? "PIX" : "CREDIT_CARD";
      const x = r();
      let status: Order["status"];
      if (method === "PIX") status = x < 0.7 ? (t < now - 5 * DAY && r() < 0.6 ? "SHIPPED" : "PAID") : "PENDING";
      else status = x < 0.84 ? (t < now - 5 * DAY && r() < 0.6 ? "SHIPPED" : "PAID") : x < 0.95 ? "CANCELLED" : "PENDING";
      // Pix pendente com mais de 1 dia vira expirado (cancelado).
      if (method === "PIX" && status === "PENDING" && t < now - DAY && r() < 0.7) status = "CANCELLED";
      const itens = r() < 0.27 ? 2 : 1;
      let cents = 0;
      for (let k = 0; k < itens; k++) cents += PRECOS[Math.floor(r() * PRECOS.length)];
      const nome = NOMES[Math.floor(r() * NOMES.length)];
      const pago = status === "PAID" || status === "SHIPPED";
      const recovered = pago && r() < 0.08 ? (method === "PIX" && r() < 0.6 ? "pix" : "cart") : null;
      orders.push({
        id: `pedido-${++n}`, t, status, method, device: r() < 0.83 ? "MOBILE" : "DESKTOP", cents,
        name: nome, email: `${nome.toLowerCase().normalize("NFD").replace(/[^\w ]/g, "").replace(" ", ".")}${Math.floor(r() * 90 + 10)}@exemplo.com`,
        recovered,
      });
    }
    for (let i = 0; i < Math.round(qtd * 0.55); i++) {
      const t = ev(i); if (t === null) continue;
      carts.push({ t, cents: PRECOS[Math.floor(r() * PRECOS.length)] + (r() < 0.25 ? PRECOS[Math.floor(r() * PRECOS.length)] : 0) });
    }
    for (let i = 0; i < sess; i++) {
      const t = ev(i); if (t === null) continue;
      const x = r();
      sessions.push({ t, step: x < 0.26 ? 0 : x < 0.5 ? 1 : x < 0.72 ? 2 : 3 });
    }
  }
  orders.sort((a, b) => b.t - a.t);
  cache = { orders, carts, sessions };
  return cache;
}

const pago = (o: Order) => o.status === "PAID" || o.status === "SHIPPED";
const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

// ── Baldes de tempo (mesma lógica de lib/dashboard-series.ts) ──
const ymdSP = (t: number) => new Date(t - SP).toISOString().slice(0, 10);
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dayMonth = (ymd: string) => `${Number(ymd.slice(8, 10))} de ${MES[Number(ymd.slice(5, 7)) - 1]}`;

function buckets(start: number, end: number) {
  const first = ymdSP(start);
  const last = ymdSP(end - 1);
  const days = Math.round((spMidnight(last).getTime() - spMidnight(first).getTime()) / DAY) + 1;
  const gran: Gran = days <= 1 ? "hour" : days <= 62 ? "day" : "month";
  const keys: string[] = [];
  const labels: string[] = [];
  if (gran === "hour") for (let h = 0; h < 24; h++) { keys.push(`${first} ${String(h).padStart(2, "0")}`); labels.push(`${String(h).padStart(2, "0")}h`); }
  else if (gran === "day") for (let i = 0; i < days; i++) { const d = ymdSP(spMidnight(first).getTime() + i * DAY); keys.push(d); labels.push(`${d.slice(8, 10)}/${d.slice(5, 7)}`); }
  else {
    let y = +first.slice(0, 4), m = +first.slice(5, 7);
    const ly = +last.slice(0, 4), lm = +last.slice(5, 7);
    while (y < ly || (y === ly && m <= lm)) { keys.push(`${y}-${String(m).padStart(2, "0")}`); labels.push(`${MES[m - 1]}/${String(y).slice(2)}`); if (++m > 12) { m = 1; y++; } }
  }
  const keyOf = (t: number) => {
    const iso = new Date(t - SP).toISOString();
    return gran === "hour" ? `${iso.slice(0, 10)} ${iso.slice(11, 13)}` : gran === "day" ? iso.slice(0, 10) : iso.slice(0, 7);
  };
  let nowIndex = keys.length - 1;
  if (gran === "hour" && first === ymdSP(Date.now())) nowIndex = new Date(Date.now() - SP).getUTCHours();
  const label = first === last ? dayMonth(first) : `${dayMonth(first)} - ${dayMonth(last)}`;
  return { gran, keys, labels, keyOf, nowIndex, label };
}

export function premiacao(): Premiacao {
  const { orders } = gerar();
  const total = sum(orders.filter(pago), (o) => o.cents) + 41_870_00; // histórico anterior aos 75 dias
  const MARCOS = [10_000_00, 100_000_00, 500_000_00, 1_000_000_00, 5_000_000_00, 10_000_000_00];
  const LBL = ["R$ 10 mil", "R$ 100 mil", "R$ 500 mil", "R$ 1 milhão", "R$ 5 milhões", "R$ 10 milhões"];
  const i = MARCOS.findIndex((m) => total < m);
  const prox = i < 0 ? null : { cents: MARCOS[i], label: LBL[i] };
  const atual = i === 0 ? null : { cents: MARCOS[(i < 0 ? MARCOS.length : i) - 1], label: LBL[(i < 0 ? MARCOS.length : i) - 1] };
  return { totalCents: total, atual, proximo: prox, progresso: prox ? total / prox.cents : 1, conquistados: i < 0 ? MARCOS.length : i, totalMarcos: MARCOS.length };
}

export function dashboardData(period: string, from: string, to: string): DashboardData {
  const { orders, carts, sessions } = gerar();
  const { key, since, until } = resolveRange(period === "custom" ? undefined : period, from || undefined, to || undefined);
  const lo = since ? since.getTime() : -Infinity;
  const hi = until ? until.getTime() : Infinity;
  const inR = (t: number) => t >= lo && t < hi;

  const os = orders.filter((o) => inR(o.t));
  const pagos = os.filter(pago);
  const pix = pagos.filter((o) => o.method === "PIX");
  const card = pagos.filter((o) => o.method === "CREDIT_CARD");
  const pend = os.filter((o) => o.status === "PENDING");
  const mob = pagos.filter((o) => o.device === "MOBILE");
  const desk = pagos.filter((o) => o.device === "DESKTOP");
  const rec = pagos.filter((o) => o.recovered);
  const cs = carts.filter((c) => inR(c.t));
  const ss = sessions.filter((s) => inR(s.t));
  const paidCents = sum(pagos, (o) => o.cents);
  const cardDeclined = os.filter((o) => o.method === "CREDIT_CARD" && o.status === "CANCELLED").length;

  // Séries
  const first = since ? since.getTime() : orders.length ? spMidnight(ymdSP(orders[orders.length - 1].t)).getTime() : spMidnight(ymdTodaySP()).getTime();
  const start = spMidnight(ymdSP(first)).getTime();
  const end = until ? until.getTime() : spMidnight(ymdTodaySP()).getTime() + DAY;
  const b = buckets(start, end);
  const idx = new Map(b.keys.map((k, i) => [k, i]));
  const z = () => new Array<number>(b.keys.length).fill(0);
  const cur: Record<string, number[]> = { paid: z(), paidCount: z(), orders: z(), ticket: z(), pix: z(), card: z(), mobile: z(), desktop: z(), pending: z(), abandoned: z(), recovered: z() };
  const add = (k: string, t: number, v: number) => { const i = idx.get(b.keyOf(t)); if (i !== undefined) cur[k][i] += v; };
  for (const o of os) {
    add("orders", o.t, 1);
    if (o.status === "PENDING") add("pending", o.t, o.cents);
    if (!pago(o)) continue;
    add("paid", o.t, o.cents); add("paidCount", o.t, 1);
    add(o.method === "PIX" ? "pix" : "card", o.t, o.cents);
    add(o.device === "MOBILE" ? "mobile" : "desktop", o.t, o.cents);
    if (o.recovered) add("recovered", o.t, o.cents);
  }
  for (const c of cs) add("abandoned", c.t, c.cents);
  cur.ticket = cur.paid.map((v, i) => (cur.paidCount[i] ? Math.round(v / cur.paidCount[i]) : 0));
  const series: SeriesBlock = { gran: b.gran, labels: b.labels, nowIndex: b.nowIndex, currentLabel: b.label, cur };

  const fmtYmd = (d?: string) => d ?? "";
  return {
    storeName: "Casa Aurora",
    series,
    period: { key, label: rangeLabel(key, from || undefined, to || undefined), from: fmtYmd(from), to: fmtYmd(to) },
    paid: { cents: paidCents, count: pagos.length, pixCents: sum(pix, (o) => o.cents), pixCount: pix.length, cardCents: sum(card, (o) => o.cents), cardCount: card.length },
    orders: { total: os.length, pending: pend.length },
    ticketCents: pagos.length ? Math.round(paidCents / pagos.length) : 0,
    approval: { pixPaid: pix.length, pixTotal: os.filter((o) => o.method === "PIX").length, cardApproved: card.length, cardDecided: card.length + cardDeclined },
    devices: { mobileCents: sum(mob, (o) => o.cents), mobileCount: mob.length, desktopCents: sum(desk, (o) => o.cents), desktopCount: desk.length },
    pending: {
      cents: sum(pend, (o) => o.cents), count: pend.length,
      pixCents: sum(pend.filter((o) => o.method === "PIX"), (o) => o.cents), pixCount: pend.filter((o) => o.method === "PIX").length,
      cardCents: sum(pend.filter((o) => o.method === "CREDIT_CARD"), (o) => o.cents), cardCount: pend.filter((o) => o.method === "CREDIT_CARD").length,
    },
    abandoned: { cents: sum(cs, (c) => c.cents), count: cs.length },
    recovered: {
      cents: sum(rec, (o) => o.cents), count: rec.length,
      cartCents: sum(rec.filter((o) => o.recovered === "cart"), (o) => o.cents), cartCount: rec.filter((o) => o.recovered === "cart").length,
      pixCents: sum(rec.filter((o) => o.recovered === "pix"), (o) => o.cents), pixCount: rec.filter((o) => o.recovered === "pix").length,
    },
    funnel: [
      { label: "Chegaram no checkout", short: "Checkout", value: ss.length },
      { label: "Dados pessoais", short: "Dados", value: ss.filter((s) => s.step >= 1).length },
      { label: "Endereço", short: "Endereço", value: ss.filter((s) => s.step >= 2).length },
      { label: "Pagamento", short: "Pagamento", value: ss.filter((s) => s.step >= 3).length },
      { label: "Comprou", short: "Compra", value: Math.min(pagos.length, ss.filter((s) => s.step >= 3).length), done: true },
    ],
    recent: os.slice(0, 8).map((o) => ({
      id: o.id, status: o.status, paymentMethod: o.method, cardAttempts: 1, totalCents: o.cents,
      createdAt: new Date(o.t).toISOString(), name: o.name, email: o.email,
    })),
  };
}

// ── Respostas falsas das rotas /api que os componentes chamam ──
let onlineBase = 14;
export function installFetchMock() {
  if (typeof window === "undefined" || (window as any).__voxMock) return;
  (window as any).__voxMock = true;
  const orig = window.fetch.bind(window);
  const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    if (url.includes("/api/painel/live")) {
      onlineBase = Math.max(6, Math.min(28, onlineBase + Math.round((Math.random() - 0.5) * 4)));
      const online = onlineBase;
      const checkout = Math.max(1, Math.round(online * (0.22 + Math.random() * 0.12)));
      const dados = Math.max(0, Math.round(checkout * 0.45));
      const endereco = Math.max(0, Math.round(checkout * 0.3));
      return json({ online, loja: online - checkout, checkout, funnel: { dados, endereco, pagamento: checkout - dados - endereco, comprou: 0 }, states: [], cities: [], visitors: [] });
    }
    if (url.includes("/api/painel/stores")) return json({ stores: [{ id: "1", name: "Casa Aurora" }, { id: "2", name: "Urban Gear" }], activeStoreId: "1" });
    if (url.includes("/api/")) return json({ ok: true, settled: 0 });
    return orig(input, init);
  };
}
