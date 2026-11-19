"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Sidebar from "@/components/painel/Sidebar";
import Topbar from "@/components/painel/Topbar";
import DashboardView from "@/components/painel/dashboard/DashboardView";
import DashboardViewOld from "@/components/painel/dashboard/DashboardViewOld";
import { getState, getToast, query, setState, subscribe, type DemoState } from "@/mvp/store";
import { dashboardData, installFetchMock, premiacao } from "@/mvp/mock";

installFetchMock();

const BASE = process.env.NEXT_PUBLIC_BASE ?? "";
const SERVER: DemoState = { period: "today", from: "", to: "", layout: "novo", device: "desktop", embed: true };

function useDemo() {
  return useSyncExternalStore(subscribe, getState, () => SERVER);
}

export default function Page() {
  const s = useDemo();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="min-h-screen bg-[#0a0b0d]" />;
  return s.embed ? <Painel s={s} /> : <Apresentacao s={s} />;
}

/** O painel do lojista, como no sistema: menu, topo e o dashboard. */
function Painel({ s }: { s: DemoState }) {
  const data = useMemo(() => dashboardData(s.period, s.from, s.to), [s.period, s.from, s.to]);
  const prem = useMemo(() => premiacao(), []);
  const toast = useSyncExternalStore(subscribe, getToast, () => null);
  return (
    <div className="panel-root flex min-h-screen bg-app text-mid antialiased">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pt-[45px] lg:pt-0">
        <div className="hidden lg:block">
          <Topbar userName="Lojista Demo" userEmail="lojista@exemplo.com" premiacao={s.layout === "novo" ? prem : null} />
        </div>
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1600px] px-4 pb-14 pt-6 sm:px-6 lg:px-8 lg:pt-7">
            {s.layout === "novo" ? <DashboardView data={data} /> : <DashboardViewOld data={data} />}
          </div>
        </main>
      </div>
      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-raised px-4 py-2.5 text-[13px] text-hi shadow-lg ring-1 ring-line">
          {toast}
        </div>
      )}
    </div>
  );
}

/** Tela de apresentação: chaves Antes/Depois e Desktop/Celular no primeiro plano. */
function Apresentacao({ s }: { s: DemoState }) {
  // O período escolhido dentro do painel volta para cá, para não se perder ao trocar as chaves.
  useEffect(() => {
    const on = (e: MessageEvent) => {
      const p = e.data?.voxDemo;
      if (p) setState({ period: p.period, from: p.from, to: p.to });
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  const [src] = useState(() => `${BASE}/?${query({ ...s, embed: true })}`);
  const [frameKey, setFrameKey] = useState(0);
  const [frameSrc, setFrameSrc] = useState(src);
  const trocar = (patch: Partial<DemoState>) => {
    const next = { ...getState(), ...patch };
    setState(patch);
    setFrameSrc(`${BASE}/?${query({ ...next, embed: true })}`);
    setFrameKey((k) => k + 1);
  };
  const mobile = s.device === "mobile";
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#060708] font-sans text-[#e9ecef]">
      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0d0f12] px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img src={`${BASE}/vox-logo.png`} alt="VOX" className="h-7 w-auto" />
          <div className="min-w-0 leading-tight">
            <div className="text-[14px] font-semibold">Dashboard do lojista</div>
            <div className="text-[11.5px] text-white/50">Demonstração · dados fictícios</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmento
            label="Layout"
            value={s.layout}
            onChange={(v) => trocar({ layout: v as DemoState["layout"] })}
            options={[{ v: "antigo", t: "Antes" }, { v: "novo", t: "Depois" }]}
          />
          <Segmento
            label="Tela"
            value={s.device}
            onChange={(v) => trocar({ device: v as DemoState["device"] })}
            options={[{ v: "desktop", t: "Desktop", icon: "desktop" }, { v: "mobile", t: "Celular", icon: "mobile" }]}
          />
        </div>
      </header>

      <div className={`relative min-h-0 flex-1 ${mobile ? "flex items-center justify-center overflow-auto bg-[radial-gradient(circle_at_50%_40%,#14181d,#060708_70%)] p-6" : ""}`}>
        {mobile ? (
          <Telefone>
            <iframe key={frameKey} src={frameSrc} title="Dashboard no celular" className="block h-[844px] w-[390px] rounded-[38px] border-0 bg-black" />
          </Telefone>
        ) : (
          <iframe key={frameKey} src={frameSrc} title="Dashboard no computador" className="block h-full w-full border-0" />
        )}
      </div>
    </div>
  );
}

/** Aparelho de 390×844 (tela real de celular), reduzido por inteiro se a janela for baixa. */
function Telefone({ children }: { children: React.ReactNode }) {
  const [k, setK] = useState(1);
  useEffect(() => {
    const fit = () => setK(Math.min(1, (window.innerHeight - 100) / 872, (window.innerWidth - 32) / 418));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div className="shrink-0" style={{ width: 414 * k, height: 868 * k }}>
      <div
        className="rounded-[50px] bg-[#1b1e23] p-3 shadow-[0_30px_80px_rgba(0,0,0,.6)] ring-1 ring-white/10"
        style={{ width: 414, height: 868, transform: `scale(${k})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}

function Segmento({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { v: string; t: string; icon?: "desktop" | "mobile" }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[11.5px] uppercase tracking-[0.08em] text-white/40 sm:inline">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10">
        {options.map((o) => {
          const on = o.v === value;
          return (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => !on && onChange(o.v)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                on ? "bg-emerald-500 text-[#04120c]" : "text-white/70 hover:text-white"
              }`}
            >
              {o.icon === "desktop" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
              )}
              {o.icon === "mobile" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>
              )}
              {o.t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
