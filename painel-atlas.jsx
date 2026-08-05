import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Gauge, Fuel, TrendingUp, TrendingDown, Car, Clock, Plus, Trash2, Settings, BarChart3, Home, Wrench, Briefcase } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ---------- fonts ----------
function useFonts() {
  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(l);
    return () => document.head.removeChild(l);
  }, []);
}

// ---------- storage helpers ----------
const SKEY = "settings";
const EKEY = "entries";

const defaultSettings = {
  kmInicial: 0,
  valorCarro: 0,
  ganhoAcumuladoAtlasInicial: 0,
  metaDiaria: 200,
  metaHora: 25,
  custosFixosMensais: 0,
};

// migra configurações antigas (nome "99") para o novo esquema Atlas Logística
function migrateSettings(raw) {
  const s = { ...defaultSettings, ...raw };
  if ((!s.ganhoAcumuladoAtlasInicial || s.ganhoAcumuladoAtlasInicial === 0) && raw && raw.ganhoAcumulado99Inicial) {
    s.ganhoAcumuladoAtlasInicial = Number(raw.ganhoAcumulado99Inicial) || 0;
  }
  return s;
}

// migra lançamentos antigos (kmApp/kmParticular separados, ganho99) para o novo esquema
// onde todo km rodado é somado num único campo "km" e o ganho do app chama "ganhoAtlas"
function migrateEntry(e) {
  const kmApp = Number(e.kmApp) || 0;
  const kmParticular = Number(e.kmParticular) || 0;
  const km = e.km !== undefined ? Number(e.km) || 0 : kmApp + kmParticular;
  const ganhoAtlas = e.ganhoAtlas !== undefined ? Number(e.ganhoAtlas) || 0 : Number(e.ganho99) || 0;
  return {
    id: e.id,
    date: e.date,
    km,
    ganhoAtlas,
    ganhoParticular: Number(e.ganhoParticular) || 0,
    gastoCombustivel: Number(e.gastoCombustivel) || 0,
    gastoOutros: Number(e.gastoOutros) || 0,
    horas: Number(e.horas) || 0,
  };
}

async function loadSettings() {
  try {
    const r = await window.storage.get(SKEY, false);
    return r ? migrateSettings(JSON.parse(r.value)) : defaultSettings;
  } catch {
    return defaultSettings;
  }
}
async function saveSettings(s) {
  await window.storage.set(SKEY, JSON.stringify(s), false);
}
async function loadEntries() {
  try {
    const r = await window.storage.get(EKEY, false);
    return r ? JSON.parse(r.value).map(migrateEntry) : [];
  } catch {
    return [];
  }
}
async function saveEntries(list) {
  await window.storage.set(EKEY, JSON.stringify(list), false);
}

const fmtR = (n) =>
  (n < 0 ? "-R$ " : "R$ ") + Math.abs(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKm = (n) => (n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km";
const todayISO = () => new Date().toISOString().slice(0, 10);

// ---------- gauge (signature element) ----------
function Gauge180({ pct, label, sub, tone }) {
  const clamped = Math.max(0, Math.min(1, pct));
  const angle = clamped * 180;
  const r = 78;
  const cx = 100, cy = 100;
  const toRad = (a) => ((a - 180) * Math.PI) / 180;
  const x = cx + r * Math.cos(toRad(angle));
  const y = cy + r * Math.sin(toRad(angle));
  const large = angle > 180 ? 1 : 0;
  const color = tone === "neg" ? "#E85D5D" : tone === "warn" ? "#E8B430" : "#3FA796";

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="118" viewBox="0 0 200 118">
        <path d="M 22 100 A 78 78 0 0 1 178 100" fill="none" stroke="#2A2E35" strokeWidth="14" strokeLinecap="round" />
        <path
          d={`M 22 100 A 78 78 0 0 1 ${x} ${y}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          style={{ transition: "all 0.6s ease" }}
        />
        <circle cx={cx} cy={cy} r="3" fill="#8B8F98" />
      </svg>
      <div className="-mt-6 text-center">
        <div className="font-mono text-2xl tracking-tight" style={{ color, fontFamily: "'IBM Plex Mono', monospace" }}>
          {label}
        </div>
        <div className="text-xs uppercase tracking-widest text-[#8B8F98] mt-1">{sub}</div>
      </div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-[#1E2126] border border-[#2A2E35] rounded-xl p-5 ${className}`}>{children}</div>
  );
}

function StatRow({ icon: Icon, label, value, valueColor }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#2A2E35] last:border-0">
      <div className="flex items-center gap-2 text-[#8B8F98] text-sm">
        <Icon size={15} />
        <span>{label}</span>
      </div>
      <div className="font-mono text-sm" style={{ color: valueColor || "#ECEAE4" }}>
        {value}
      </div>
    </div>
  );
}

// ---------- main app ----------
export default function App() {
  useFonts();
  const [view, setView] = useState("inicio");
  const [settings, setSettings] = useState(defaultSettings);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingMsg, setSavingMsg] = useState("");

  useEffect(() => {
    (async () => {
      const [s, e] = await Promise.all([loadSettings(), loadEntries()]);
      setSettings(s);
      setEntries(e);
      setLoading(false);
    })();
  }, []);

  const persistSettings = useCallback(async (next) => {
    setSettings(next);
    await saveSettings(next);
  }, []);

  const persistEntries = useCallback(async (next) => {
    setEntries(next);
    await saveEntries(next);
  }, []);

  const todays = useMemo(() => entries.filter((e) => e.date === todayISO()), [entries]);

  const totals = useMemo(() => {
    const sum = (arr, k) => arr.reduce((a, e) => a + (Number(e[k]) || 0), 0);
    const ganhoAtlas = sum(entries, "ganhoAtlas");
    const ganhoParticular = sum(entries, "ganhoParticular");
    const gastoCombustivel = sum(entries, "gastoCombustivel");
    const gastoOutros = sum(entries, "gastoOutros");
    const km = sum(entries, "km");
    const horas = sum(entries, "horas");
    const ganhoTotal = ganhoAtlas + ganhoParticular;
    const gastoTotal = gastoCombustivel + gastoOutros;
    const lucroApp = ganhoAtlas - gastoTotal;
    const saldo = ganhoTotal - gastoTotal;
    return { ganhoAtlas, ganhoParticular, gastoCombustivel, gastoOutros, km, horas, ganhoTotal, gastoTotal, lucroApp, saldo };
  }, [entries]);

  const hoje = useMemo(() => {
    const sum = (k) => todays.reduce((a, e) => a + (Number(e[k]) || 0), 0);
    const ganhoTotal = sum("ganhoAtlas") + sum("ganhoParticular");
    const gastoTotal = sum("gastoCombustivel") + sum("gastoOutros");
    return { ganhoTotal, gastoTotal, saldo: ganhoTotal - gastoTotal, horas: sum("horas") };
  }, [todays]);

  const kmTotalDesdeCompra = settings.kmInicial + totals.km;
  const rsPorHoraGeral = totals.horas > 0 ? totals.ganhoTotal / totals.horas : 0;
  const rsPorKm = totals.km > 0 ? totals.ganhoAtlas / totals.km : 0;
  const faltaMeta = Math.max(0, settings.metaDiaria - hoje.ganhoTotal);
  const tone = hoje.saldo > 0 ? "pos" : hoje.saldo < 0 ? "neg" : "warn";
  const gaugePct = settings.metaDiaria > 0 ? hoje.ganhoTotal / settings.metaDiaria : 0;

  const chartData = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!map[e.date]) map[e.date] = { date: e.date, ganho: 0, gasto: 0 };
      map[e.date].ganho += (Number(e.ganhoAtlas) || 0) + (Number(e.ganhoParticular) || 0);
      map[e.date].gasto += (Number(e.gastoCombustivel) || 0) + (Number(e.gastoOutros) || 0);
    });
    return Object.values(map)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map((d) => ({ ...d, saldo: d.ganho - d.gasto, label: d.date.slice(5) }));
  }, [entries]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#14161A] flex items-center justify-center text-[#8B8F98] font-sans">
        Carregando painel...
      </div>
    );
  }

  const nav = [
    { id: "inicio", label: "Início", icon: Home },
    { id: "lancar", label: "Lançar dia", icon: Plus },
    { id: "historico", label: "Histórico", icon: BarChart3 },
    { id: "analise", label: "Análise", icon: TrendingUp },
    { id: "config", label: "Config", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#14161A] text-[#ECEAE4]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-5xl mx-auto px-4 pb-24 pt-6">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[#E8B430] flex items-center justify-center">
              <Car size={18} color="#14161A" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Painel do Carro
              </div>
              <div className="text-xs text-[#8B8F98]">Atlas Logística &amp; particular</div>
            </div>
          </div>
          {savingMsg && <span className="text-xs text-[#3FA796]">{savingMsg}</span>}
        </header>

        {view === "inicio" && (
          <InicioView
            hoje={hoje}
            settings={settings}
            tone={tone}
            gaugePct={gaugePct}
            faltaMeta={faltaMeta}
            totals={totals}
            kmTotalDesdeCompra={kmTotalDesdeCompra}
            rsPorHoraGeral={rsPorHoraGeral}
            rsPorKm={rsPorKm}
          />
        )}
        {view === "lancar" && (
          <LancarView
            onSave={async (entry) => {
              await persistEntries([...entries, entry]);
              setSavingMsg("Lançamento salvo");
              setTimeout(() => setSavingMsg(""), 2000);
              setView("inicio");
            }}
          />
        )}
        {view === "historico" && (
          <HistoricoView
            entries={entries}
            onDelete={async (id) => {
              await persistEntries(entries.filter((e) => e.id !== id));
            }}
          />
        )}
        {view === "analise" && <AnaliseView chartData={chartData} totals={totals} kmTotalDesdeCompra={kmTotalDesdeCompra} settings={settings} />}
        {view === "config" && (
          <ConfigView
            settings={settings}
            onSave={async (s) => {
              await persistSettings(s);
              setSavingMsg("Config. salva");
              setTimeout(() => setSavingMsg(""), 2000);
            }}
          />
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#1A1D22] border-t border-[#2A2E35]">
        <div className="max-w-5xl mx-auto flex">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors"
                style={{ color: active ? "#E8B430" : "#8B8F98" }}
              >
                <Icon size={18} />
                <span className="text-[10px] uppercase tracking-wide">{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ---------- Início ----------
function InicioView({ hoje, settings, tone, gaugePct, faltaMeta, totals, kmTotalDesdeCompra, rsPorHoraGeral, rsPorKm }) {
  const label = fmtR(hoje.saldo);
  const sub = tone === "neg" ? "negativo hoje" : tone === "pos" ? "positivo hoje" : "zerado hoje";

  return (
    <div className="space-y-4">
      <Card className="flex flex-col items-center">
        <div className="text-xs uppercase tracking-widest text-[#8B8F98] mb-2">Saldo de hoje</div>
        <Gauge180 pct={gaugePct} label={label} sub={sub} tone={tone} />
        <div className="grid grid-cols-2 gap-3 w-full mt-3">
          <div className="bg-[#14161A] rounded-lg p-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-[#8B8F98]">Meta do dia</div>
            <div className="font-mono text-sm mt-1">{fmtR(settings.metaDiaria)}</div>
          </div>
          <div className="bg-[#14161A] rounded-lg p-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-[#8B8F98]">Falta p/ meta</div>
            <div className="font-mono text-sm mt-1" style={{ color: faltaMeta > 0 ? "#E8B430" : "#3FA796" }}>
              {faltaMeta > 0 ? fmtR(faltaMeta) : "Meta batida"}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="text-xs uppercase tracking-widest text-[#8B8F98] mb-2">Ganho hoje</div>
          <div className="font-mono text-xl text-[#3FA796]">{fmtR(hoje.ganhoTotal)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-widest text-[#8B8F98] mb-2">Gasto hoje</div>
          <div className="font-mono text-xl text-[#E85D5D]">{fmtR(hoje.gastoTotal)}</div>
        </Card>
      </div>

      <Card>
        <div className="text-xs uppercase tracking-widest text-[#8B8F98] mb-3">Panorama geral</div>
        <StatRow icon={TrendingUp} label="Saldo acumulado (tudo)" value={fmtR(totals.saldo)} valueColor={totals.saldo >= 0 ? "#3FA796" : "#E85D5D"} />
        <StatRow icon={TrendingUp} label="Lucro do carro (Atlas − gastos)" value={fmtR(totals.lucroApp)} valueColor={totals.lucroApp >= 0 ? "#3FA796" : "#E85D5D"} />
        <StatRow icon={Gauge} label="R$/hora (geral)" value={fmtR(rsPorHoraGeral)} />
        <StatRow icon={Fuel} label="R$/km rodado" value={fmtR(rsPorKm)} />
        <StatRow icon={Car} label="Km total desde a compra" value={fmtKm(kmTotalDesdeCompra)} />
        <StatRow icon={Briefcase} label="Ganho acumulado Atlas Logística" value={fmtR(totals.ganhoAtlas)} />
        <StatRow icon={Wrench} label="Ganho acumulado particular" value={fmtR(totals.ganhoParticular)} />
      </Card>
    </div>
  );
}

// ---------- Lançar ----------
function LancarView({ onSave }) {
  const [form, setForm] = useState({
    date: todayISO(),
    km: "",
    ganhoAtlas: "",
    ganhoParticular: "",
    gastoCombustivel: "",
    gastoOutros: "",
    horas: "",
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const fields = [
    { k: "km", label: "Km rodado (tudo — vira Atlas Logística)", icon: Car },
    { k: "ganhoAtlas", label: "Ganho na Atlas Logística (R$)", icon: Briefcase },
    { k: "ganhoParticular", label: "Ganho particular / escritórios (R$)", icon: Wrench },
    { k: "gastoCombustivel", label: "Gasto com combustível (R$)", icon: Fuel },
    { k: "gastoOutros", label: "Outros gastos do carro (R$)", icon: Wrench },
    { k: "horas", label: "Horas trabalhadas", icon: Clock },
  ];

  return (
    <Card className="space-y-4">
      <div className="text-sm uppercase tracking-widest text-[#8B8F98]">Lançamento do dia</div>
      <div>
        <label className="text-xs text-[#8B8F98]">Data</label>
        <input
          type="date"
          value={form.date}
          onChange={set("date")}
          className="w-full mt-1 bg-[#14161A] border border-[#2A2E35] rounded-lg px-3 py-2 font-mono text-sm outline-none focus:border-[#E8B430]"
        />
      </div>
      {fields.map((f) => (
        <div key={f.k}>
          <label className="text-xs text-[#8B8F98] flex items-center gap-1.5">
            <f.icon size={13} /> {f.label}
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form[f.k]}
            onChange={set(f.k)}
            placeholder="0"
            className="w-full mt-1 bg-[#14161A] border border-[#2A2E35] rounded-lg px-3 py-2 font-mono text-sm outline-none focus:border-[#E8B430]"
          />
        </div>
      ))}
      <button
        onClick={() =>
          onSave({
            id: Date.now().toString(),
            date: form.date,
            km: Number(form.km) || 0,
            ganhoAtlas: Number(form.ganhoAtlas) || 0,
            ganhoParticular: Number(form.ganhoParticular) || 0,
            gastoCombustivel: Number(form.gastoCombustivel) || 0,
            gastoOutros: Number(form.gastoOutros) || 0,
            horas: Number(form.horas) || 0,
          })
        }
        className="w-full bg-[#E8B430] text-[#14161A] font-semibold rounded-lg py-2.5 mt-2 hover:opacity-90 transition"
      >
        Salvar lançamento
      </button>
    </Card>
  );
}

// ---------- Histórico ----------
function HistoricoView({ entries, onDelete }) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  if (sorted.length === 0) {
    return (
      <Card>
        <div className="text-[#8B8F98] text-sm text-center py-6">Nenhum lançamento ainda. Adicione o primeiro em "Lançar dia".</div>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {sorted.map((e) => {
        const ganho = e.ganhoAtlas + e.ganhoParticular;
        const gasto = e.gastoCombustivel + e.gastoOutros;
        const saldo = ganho - gasto;
        return (
          <Card key={e.id}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm text-[#8B8F98]">{e.date}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm" style={{ color: saldo >= 0 ? "#3FA796" : "#E85D5D" }}>
                  {fmtR(saldo)}
                </span>
                <button onClick={() => onDelete(e.id)} className="text-[#8B8F98] hover:text-[#E85D5D]">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#8B8F98]">
              <span>Ganho Atlas Logística: <span className="text-[#ECEAE4]">{fmtR(e.ganhoAtlas)}</span></span>
              <span>Ganho particular: <span className="text-[#ECEAE4]">{fmtR(e.ganhoParticular)}</span></span>
              <span>Km rodado: <span className="text-[#ECEAE4]">{fmtKm(e.km)}</span></span>
              <span>Horas: <span className="text-[#ECEAE4]">{e.horas}h</span></span>
              <span>Combustível: <span className="text-[#ECEAE4]">{fmtR(e.gastoCombustivel)}</span></span>
              <span>Outros gastos: <span className="text-[#ECEAE4]">{fmtR(e.gastoOutros)}</span></span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ---------- Análise ----------
function AnaliseView({ chartData, totals, kmTotalDesdeCompra, settings }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="text-xs uppercase tracking-widest text-[#8B8F98] mb-3">Ganho x Gasto (últimos lançamentos)</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#2A2E35" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#8B8F98" fontSize={11} />
            <YAxis stroke="#8B8F98" fontSize={11} />
            <Tooltip contentStyle={{ background: "#1E2126", border: "1px solid #2A2E35", fontSize: 12 }} />
            <Line type="monotone" dataKey="ganho" stroke="#3FA796" strokeWidth={2} dot={false} name="Ganho" />
            <Line type="monotone" dataKey="gasto" stroke="#E85D5D" strokeWidth={2} dot={false} name="Gasto" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <div className="text-xs uppercase tracking-widest text-[#8B8F98] mb-3">Saldo diário</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid stroke="#2A2E35" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#8B8F98" fontSize={11} />
            <YAxis stroke="#8B8F98" fontSize={11} />
            <Tooltip contentStyle={{ background: "#1E2126", border: "1px solid #2A2E35", fontSize: 12 }} />
            <Bar dataKey="saldo" fill="#E8B430" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <div className="text-xs uppercase tracking-widest text-[#8B8F98] mb-3">Eficiência</div>
        <StatRow icon={Car} label="Km rodado (total)" value={fmtKm(totals.km)} />
        <StatRow icon={Gauge} label="Km total desde a compra" value={fmtKm(kmTotalDesdeCompra)} />
        <StatRow icon={Fuel} label="Lucro do carro (Atlas − gastos)" value={fmtR(totals.lucroApp)} valueColor={totals.lucroApp >= 0 ? "#3FA796" : "#E85D5D"} />
      </Card>
    </div>
  );
}

// ---------- Config ----------
function ConfigView({ settings, onSave }) {
  const [form, setForm] = useState(settings);
  useEffect(() => setForm(settings), [settings]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const fields = [
    { k: "kmInicial", label: "Km rodado até hoje (da sua planilha)", step: "1" },
    { k: "valorCarro", label: "Valor pago no carro (R$)", step: "0.01" },
    { k: "ganhoAcumuladoAtlasInicial", label: "Ganho já acumulado na Atlas Logística até hoje, se não lançado dia a dia (R$)", step: "0.01" },
    { k: "metaDiaria", label: "Meta de ganho por dia (R$)", step: "0.01" },
    { k: "metaHora", label: "Meta de ganho por hora (R$)", step: "0.01" },
    { k: "custosFixosMensais", label: "Custos fixos mensais do carro — financiamento, seguro etc. (R$)", step: "0.01" },
  ];

  return (
    <Card className="space-y-4">
      <div className="text-sm uppercase tracking-widest text-[#8B8F98]">Configurações e dados da planilha</div>
      <p className="text-xs text-[#8B8F98] leading-relaxed">
        Preencha aqui os totais que você já tem acumulados antes de começar a lançar dia a dia — assim o painel soma
        certo desde o início da operação.
      </p>
      {fields.map((f) => (
        <div key={f.k}>
          <label className="text-xs text-[#8B8F98]">{f.label}</label>
          <input
            type="number"
            step={f.step}
            value={form[f.k]}
            onChange={set(f.k)}
            className="w-full mt-1 bg-[#14161A] border border-[#2A2E35] rounded-lg px-3 py-2 font-mono text-sm outline-none focus:border-[#E8B430]"
          />
        </div>
      ))}
      <button
        onClick={() =>
          onSave({
            ...form,
            kmInicial: Number(form.kmInicial) || 0,
            valorCarro: Number(form.valorCarro) || 0,
            ganhoAcumuladoAtlasInicial: Number(form.ganhoAcumuladoAtlasInicial) || 0,
            metaDiaria: Number(form.metaDiaria) || 0,
            metaHora: Number(form.metaHora) || 0,
            custosFixosMensais: Number(form.custosFixosMensais) || 0,
          })
        }
        className="w-full bg-[#E8B430] text-[#14161A] font-semibold rounded-lg py-2.5 mt-2 hover:opacity-90 transition"
      >
        Salvar configurações
      </button>
    </Card>
  );
}
