"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

/* ─── helpers ─── */
const CLP = (n: number) =>
  "$" + Math.abs(Math.round(n)).toLocaleString("es-CL");

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const CAT_COLORS: Record<string, string> = {
  "Alimentación": "#6366f1",
  "Transporte": "#06b6d4",
  "Restaurantes": "#f59e0b",
  "Servicios": "#ef4444",
  "Entretenimiento": "#8b5cf6",
  "Combustible": "#f97316",
  "Ingresos": "#10b981",
  "Salud": "#ec4899",
  "Educación": "#3b82f6",
  "Otros": "#94a3b8",
};

const getColor = (cat: string) => CAT_COLORS[cat] || "#94a3b8";

/* ─── chart components ─── */
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const steps = 4;
  return (
    <div style={{ width: "100%", height: 220, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 6, position: "relative", paddingLeft: 50 }}>
        {/* Y axis */}
        {Array.from({ length: steps + 1 }).map((_, i) => {
          const val = Math.round((max / steps) * (steps - i));
          return (
            <div key={i} style={{ position: "absolute", left: 0, top: `${(i / steps) * 100}%`, width: "100%", display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#94a3b8", width: 45, textAlign: "right", paddingRight: 8, fontFamily: "'DM Sans', sans-serif" }}>
                {val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
              </span>
              <div style={{ flex: 1, borderTop: "1px solid #f1f5f9", height: 0 }} />
            </div>
          );
        })}
        {/* Bars */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flex: 1, zIndex: 1, paddingBottom: 2 }}>
          {data.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: "100%",
                  maxWidth: 36,
                  height: `${Math.max((d.value / max) * 180, 4)}px`,
                  background: "linear-gradient(180deg, #6366f1 0%, #818cf8 100%)",
                  borderRadius: "6px 6px 2px 2px",
                  transition: "height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  cursor: "pointer",
                  position: "relative",
                }}
                title={`${d.label}: ${CLP(d.value)}`}
              />
            </div>
          ))}
        </div>
      </div>
      {/* X axis labels */}
      <div style={{ display: "flex", gap: 6, paddingLeft: 50, marginTop: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: { category: string; amount: number }[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (total === 0) return null;
  const radius = 70;
  const stroke = 28;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", width: 180, height: 180 }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
          {data.map((d, i) => {
            const pct = d.amount / total;
            const dash = pct * circumference;
            const gap = circumference - dash;
            const currentOffset = offset;
            offset += dash;
            return (
              <circle
                key={i}
                cx="90" cy="90" r={radius}
                fill="none"
                stroke={getColor(d.category)}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-currentOffset}
                strokeLinecap="round"
                style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dasharray 0.8s ease" }}
              />
            );
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>Total</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", fontFamily: "'DM Sans', sans-serif" }}>{CLP(total)}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", justifyContent: "center" }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: getColor(d.category) }} />
            <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>{d.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── main ─── */
export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [txs, setTxs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [saved, setSaved] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    const stored = localStorage.getItem("finzen-txs");
    if (stored) setTxs(JSON.parse(stored));
  }, []);

  async function scan() {
    setScanning(true); setError(""); setSaved(false);
    const token = (session as any)?.accessToken;
    if (!token) { setError("Sin token — vuelve a hacer login"); setScanning(false); return; }
    try {
      setProgress("Buscando correos bancarios...");
      const g = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:santander.cl OR from:bancochile.cl&maxResults=20", { headers: { Authorization: "Bearer " + token } }).then(r => r.json());
      const msgs = g.messages || [];
      if (!msgs.length) { setError("No hay correos bancarios"); setScanning(false); return; }
      const results = [];
      for (let i = 0; i < Math.min(msgs.length, 15); i++) {
        setProgress("Analizando correo " + (i + 1) + " de " + Math.min(msgs.length, 15) + "...");
        const m = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + msgs[i].id + "?format=full", { headers: { Authorization: "Bearer " + token } }).then(r => r.json());
        const subject = m.payload?.headers?.find((h: any) => h.name === "Subject")?.value || "";
        const from = m.payload?.headers?.find((h: any) => h.name === "From")?.value || "";
        const snippet = m.snippet || "";
        const p = await fetch("http://localhost:4000/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, from, snippet }) }).then(r => r.json());
        if (p.transaction) results.push({ ...p.transaction, id: msgs[i].id });
      }
      setTxs(results);
      localStorage.setItem("finzen-txs", JSON.stringify(results));
      setSaved(true);
      setProgress("");
    } catch (e: any) { setError(e.message); }
    setScanning(false);
  }

  /* ─── derived data ─── */
  const expenses = useMemo(() => txs.filter(t => t.type !== "income"), [txs]);
  const totalExp = useMemo(() => expenses.reduce((s, t) => s + (t.amount || 0), 0), [expenses]);
  const totalInc = useMemo(() => txs.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0), [txs]);
  const balance = totalInc - totalExp;

  const catData = useMemo(() => {
    const bycat = expenses.reduce((a: any, t) => {
      a[t.category || "Otros"] = (a[t.category || "Otros"] || 0) + (t.amount || 0);
      return a;
    }, {});
    return Object.entries(bycat).map(([k, v]) => ({ category: k, amount: v as number })).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const barData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    expenses.forEach(t => {
      if (t.date) {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
        byMonth[key] = (byMonth[key] || 0) + (t.amount || 0);
      }
    });
    const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.length > 0
      ? sorted.map(([k, v]) => ({ label: MONTHS[parseInt(k.split("-")[1])], value: v }))
      : MONTHS.slice(0, 6).map(m => ({ label: m, value: 0 }));
  }, [expenses]);

  const topCategory = catData[0];
  const txCount = txs.length;
  const expPct = totalInc > 0 ? Math.min(Math.round((totalExp / totalInc) * 100), 100) : 0;

  if (status === "loading") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ color: "#64748b", fontSize: 14 }}>Cargando...</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  const NAV = [
    { id: "dashboard", label: "Inicio", icon: "📊" },
    { id: "transactions", label: "Movimientos", icon: "📋" },
    { id: "analytics", label: "Análisis", icon: "📈" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-12px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.6 } }
        .fin-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; transition: box-shadow 0.2s; }
        .fin-card:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
        .fin-btn { border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .fin-btn:hover { transform: translateY(-1px); }
        .fin-metric { animation: fadeIn 0.5s ease both; }
        .fin-nav-item { cursor: pointer; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 500; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
        .fin-nav-active { background: #6366f1; color: #fff !important; }
        .fin-progress { height: 6px; border-radius: 3px; background: #f1f5f9; overflow: hidden; }
        .fin-progress-bar { height: 100%; border-radius: 3px; transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .fin-tx-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f1f5f9; transition: background 0.15s; cursor: default; }
        .fin-tx-row:last-child { border-bottom: none; }
        .fin-tx-row:hover { background: #f8fafc; margin: 0 -12px; padding: 12px; border-radius: 10px; border-bottom-color: transparent; }
        @media (max-width: 768px) {
          .fin-grid { flex-direction: column !important; }
          .fin-sidebar { order: -1 !important; }
          .fin-main-col { min-width: 0 !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", color: "#1e293b" }}>
        {/* ─── Header ─── */}
        <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", letterSpacing: "-0.02em" }}>
                FinZen <span style={{ color: "#c7d2fe" }}>✦</span>
              </div>
              <nav style={{ display: "flex", gap: 4 }}>
                {NAV.map(n => (
                  <div
                    key={n.id}
                    className={`fin-nav-item ${tab === n.id ? "fin-nav-active" : ""}`}
                    onClick={() => setTab(n.id)}
                    style={{ color: tab === n.id ? "#fff" : "#64748b" }}
                  >
                    <span>{n.icon}</span>
                    <span>{n.label}</span>
                  </div>
                ))}
              </nav>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {session?.user?.name && (
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  {session.user.name}
                </span>
              )}
              <button
                className="fin-btn"
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{ background: "#f1f5f9", color: "#64748b", padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500 }}
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        {/* ─── Content ─── */}
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 100px" }}>
          {/* Title + Scan */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>Dashboard</h1>
              <p style={{ fontSize: 14, color: "#94a3b8", margin: "4px 0 0" }}>
                Revisa tus indicadores y movimientos financieros
              </p>
            </div>
            <button
              className="fin-btn"
              onClick={!scanning ? scan : undefined}
              style={{
                background: scanning ? "#e2e8f0" : "linear-gradient(135deg, #6366f1, #818cf8)",
                color: scanning ? "#64748b" : "#fff",
                padding: "10px 20px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: scanning ? "none" : "0 4px 14px rgba(99,102,241,0.3)",
              }}
            >
              {scanning ? (
                <>
                  <div style={{ width: 16, height: 16, border: "2px solid #94a3b8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  {progress || "Escaneando..."}
                </>
              ) : (
                <>📧 Detectar gastos</>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Saved notification */}
          {saved && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#16a34a", display: "flex", alignItems: "center", gap: 8, animation: "fadeIn 0.4s ease" }}>
              <span>✅</span> {txs.length} transacciones detectadas y guardadas
            </div>
          )}

          {tab === "dashboard" && (
            <>
              {/* ─── Metric Cards ─── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Ingresos", value: totalInc, color: "#10b981", bg: "#f0fdf4", icon: "↗", pct: 100 },
                  { label: "Gastos", value: totalExp, color: "#ef4444", bg: "#fef2f2", icon: "↘", pct: expPct },
                  { label: "Balance", value: balance, color: balance >= 0 ? "#10b981" : "#ef4444", bg: balance >= 0 ? "#f0fdf4" : "#fef2f2", icon: balance >= 0 ? "▲" : "▼", pct: null },
                  { label: "Transacciones", value: txCount, color: "#6366f1", bg: "#eef2ff", icon: "#", pct: null, isCount: true },
                ].map((m, i) => (
                  <div className="fin-card fin-metric" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</span>
                      <span style={{ width: 32, height: 32, borderRadius: 10, background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: m.color }}>{m.icon}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", letterSpacing: "-0.02em" }}>
                      {(m as any).isCount ? m.value : CLP(m.value)}
                    </div>
                    {m.pct !== null && (
                      <div style={{ marginTop: 10 }}>
                        <div className="fin-progress">
                          <div className="fin-progress-bar" style={{ width: `${m.pct}%`, background: m.color }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "block" }}>{m.pct}% del ingreso</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ─── Main Grid ─── */}
              <div className="fin-grid" style={{ display: "flex", gap: 20 }}>
                {/* Left: Charts */}
                <div className="fin-main-col" style={{ flex: 2, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Bar Chart */}
                  <div className="fin-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>Resumen por período</h3>
                      </div>
                      <select
                        value={filterPeriod}
                        onChange={e => setFilterPeriod(e.target.value)}
                        style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#64748b", background: "#fff", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}
                      >
                        <option value="all">Todos</option>
                        <option value="3m">Últimos 3 meses</option>
                        <option value="6m">Últimos 6 meses</option>
                      </select>
                    </div>
                    {barData.some(d => d.value > 0) ? (
                      <BarChart data={barData} />
                    ) : (
                      <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>
                        Escanea tus correos para ver el gráfico 📧
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
                      {[{ label: "Gastos", color: "#6366f1" }, { label: "Ingresos", color: "#10b981" }].map((l, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Donut + Summary Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
                    {/* Donut */}
                    <div className="fin-card">
                      <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>Gastos por categoría</h3>
                      {catData.length > 0 ? (
                        <DonutChart data={catData} />
                      ) : (
                        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>
                          Sin datos aún
                        </div>
                      )}
                    </div>

                    {/* Resumen General */}
                    <div className="fin-card">
                      <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>Resumen general</h3>
                      <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 20px" }}>Resumen de tus métricas</p>

                      {txCount > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                          {[
                            { label: "INGRESOS DETECTADOS", value: totalInc, color: "#10b981", icon: "📥", pct: 100 },
                            { label: "GASTOS DETECTADOS", value: totalExp, color: "#ef4444", icon: "📤", pct: expPct },
                          ].map((item, i) => (
                            <div key={i}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 16 }}>{item.icon}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</span>
                              </div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>{CLP(item.value)}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div className="fin-progress" style={{ flex: 1 }}>
                                  <div className="fin-progress-bar" style={{ width: `${item.pct}%`, background: item.color }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.pct}%</span>
                              </div>
                            </div>
                          ))}

                          {topCategory && (
                            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>✦ Insight</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                                {topCategory.category} es tu mayor gasto
                              </div>
                              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                                Representa el {Math.round((topCategory.amount / totalExp) * 100)}% de tus gastos totales
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>
                          Sin datos aún
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ─── Right Sidebar ─── */}
                <div className="fin-sidebar" style={{ flex: 1, minWidth: 280, maxWidth: 340 }}>
                  {/* Scan Status */}
                  <div className="fin-card" style={{ marginBottom: 20 }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#64748b" }}>Estado del escaneo</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", background: txs.length > 0 ? "#f0fdf4" : "#f8fafc", borderRadius: 12, border: `1px solid ${txs.length > 0 ? "#bbf7d0" : "#e2e8f0"}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: txs.length > 0 ? "#dcfce7" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                        {scanning ? "⏳" : txs.length > 0 ? "✅" : "📧"}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                          {scanning ? progress : txs.length > 0 ? `${txs.length} transacciones` : "Sin escanear"}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                          {saved ? "Guardado localmente" : "Banco de Chile · Santander"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Últimas transacciones */}
                  <div className="fin-card" style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#64748b" }}>Últimas transacciones</h3>
                      {txs.length > 0 && (
                        <span
                          style={{ fontSize: 12, color: "#6366f1", cursor: "pointer", fontWeight: 500 }}
                          onClick={() => setTab("transactions")}
                        >
                          Ver todas →
                        </span>
                      )}
                    </div>
                    {txs.length === 0 ? (
                      <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                        Escanea tus correos para ver transacciones
                      </div>
                    ) : (
                      <div>
                        {txs.slice(0, 5).map((tx, i) => (
                          <div className="fin-tx-row" key={i} style={{ animation: `slideIn 0.3s ease ${i * 0.05}s both` }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10,
                              background: tx.type === "income" ? "#f0fdf4" : "#eef2ff",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                            }}>
                              {tx.type === "income" ? "💰" : "💸"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.merchant}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>{tx.category} · {tx.date}</div>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: tx.type === "income" ? "#10b981" : "#1e293b", whiteSpace: "nowrap" }}>
                              {tx.type === "income" ? "+" : "-"}{CLP(tx.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top Categorías */}
                  <div className="fin-card">
                    <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#64748b" }}>Top categorías</h3>
                    {catData.length === 0 ? (
                      <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                        Sin datos aún
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {catData.slice(0, 5).map((c, i) => (
                          <div key={i}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: getColor(c.category) }} />
                                <span style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{c.category}</span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{CLP(c.amount)}</span>
                            </div>
                            <div className="fin-progress">
                              <div className="fin-progress-bar" style={{ width: `${Math.round((c.amount / totalExp) * 100)}%`, background: getColor(c.category) }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─── Transactions Tab ─── */}
          {tab === "transactions" && (
            <div className="fin-card" style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Movimientos ({txs.length})</h2>
              </div>
              {txs.length === 0 ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                  Escanea tus correos primero 📧
                </div>
              ) : (
                <div>
                  {txs.map((tx, i) => (
                    <div className="fin-tx-row" key={i}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: tx.type === "income" ? "#f0fdf4" : "#eef2ff",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                      }}>
                        {tx.type === "income" ? "💰" : "💸"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{tx.merchant}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{tx.category} · {tx.date}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: tx.type === "income" ? "#10b981" : "#1e293b" }}>
                          {tx.type === "income" ? "+" : "-"}{CLP(tx.amount)}
                        </div>
                        <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 500 }}>⚡ auto</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Analytics Tab ─── */}
          {tab === "analytics" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                <div className="fin-card">
                  <h3 style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>Distribución de gastos</h3>
                  {catData.length > 0 ? <DonutChart data={catData} /> : (
                    <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>Escanea tus correos primero 📧</div>
                  )}
                </div>
                <div className="fin-card">
                  <h3 style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>Detalle por categoría</h3>
                  {catData.length === 0 ? (
                    <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>Sin datos aún</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {catData.map((c, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${getColor(c.category)}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: getColor(c.category) }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{c.category}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{CLP(c.amount)}</span>
                            </div>
                            <div className="fin-progress" style={{ height: 4 }}>
                              <div className="fin-progress-bar" style={{ width: `${Math.round((c.amount / totalExp) * 100)}%`, background: getColor(c.category) }} />
                            </div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", minWidth: 36, textAlign: "right" }}>
                            {Math.round((c.amount / totalExp) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

