import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [days, setDays] = useState(30); // laikotarpio filtras

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      // Pasiimam paskutinių N dienų reportus (gali keisti lentelės / laukų pavadinimus pagal savo DB)
      const from = new Date();
      from.setDate(from.getDate() - days);

      const { data, error } = await supabase
        .from("reports")
        .select("id, client, client_ref, container_number, sent, quality_score, storage_score, created_at")
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: false });

      if (!isMounted) return;
      if (error) {
        console.error(error);
        setRows([]);
      } else {
        setRows(data || []);
      }
      setLoading(false);
    }

    load();
    return () => { isMounted = false; };
  }, [days]);

  // KPI skaičiavimai
  const kpi = useMemo(() => {
    const total = rows.length;
    const sent = rows.filter(r => !!r.sent).length;
    const pending = total - sent;
    const avgQ = rows.length ? (rows
      .map(r => (typeof r.quality_score === "number" ? r.quality_score : parseInt(String(r.quality_score||"").match(/\d+/)?.[0]||0,10)))
      .filter(Boolean)
      .reduce((a,b)=>a+b,0) / rows.filter(r=>r.quality_score).length).toFixed(1) : "—";
    const avgS = rows.length ? (rows
      .map(r => (typeof r.storage_score === "number" ? r.storage_score : parseInt(String(r.storage_score||"").match(/\d+/)?.[0]||0,10)))
      .filter(Boolean)
      .reduce((a,b)=>a+b,0) / rows.filter(r=>r.storage_score).length).toFixed(1) : "—";
    return { total, sent, pending, avgQ, avgS };
  }, [rows]);

  // Paprastas "bar chart" – ataskaitos per dieną
  const byDay = useMemo(() => {
    const map = new Map();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    // inicializuojam visas dienas
    for (let i = 0; i < days; i++) {
      const d = new Date(start); d.setDate(start.getDate()+i);
      map.set(d.toISOString().slice(0,10), 0);
    }
    rows.forEach(r => {
      const key = String(r.created_at).slice(0,10);
      if (map.has(key)) map.set(key, (map.get(key)||0)+1);
    });
    return Array.from(map.entries()); // [ [YYYY-MM-DD, count], ... ]
  }, [rows, days]);

  return (
    <div className="px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wide">Overview</p>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Range:</label>
          <select
            className="border rounded px-2 py-1"
            value={days}
            onChange={e => setDays(parseInt(e.target.value,10))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* KPI kortelės */}
      <div className="grid md:grid-cols-5 gap-4">
        <KpiCard label="Reports" value={kpi.total} />
        <KpiCard label="Sent" value={kpi.sent} />
        <KpiCard label="Pending" value={kpi.pending} />
        <KpiCard label="Avg Quality" value={kpi.avgQ} />
        <KpiCard label="Avg Storage" value={kpi.avgS} />
      </div>

      {/* Mini grafikas */}
      <div className="mt-6 border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Reports per day</h3>
          <span className="text-xs text-gray-500">last {days} days</span>
        </div>
        <div className="h-28 flex items-end gap-1">
          {byDay.map(([date,count], i) => (
            <div key={date} className="flex-1">
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${Math.min(100, count*12)}%` }}
                title={`${date}: ${count}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 text-[11px] text-gray-500">* simple inline chart (no libs)</div>
      </div>

      {/* Naujausios ataskaitos */}
      <div className="mt-6 border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Recent reports</h3>
          <Link to="/allreports" className="text-blue-600 hover:underline text-sm">See all</Link>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Client</th>
                <th className="py-2 pr-4">Ref</th>
                <th className="py-2 pr-4">Container</th>
                <th className="py-2 pr-4">Quality</th>
                <th className="py-2 pr-4">Storage</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={8} className="py-6 text-center text-gray-500">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="py-6 text-center text-gray-500">No reports in selected range.</td></tr>
              ) : rows.slice(0,10).map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="py-2 pr-4">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="py-2 pr-4">{r.client || "—"}</td>
                  <td className="py-2 pr-4">{r.client_ref || "—"}</td>
                  <td className="py-2 pr-4">{r.container_number || "—"}</td>
                  <td className="py-2 pr-4">{r.quality_score || "—"}</td>
                  <td className="py-2 pr-4">{r.storage_score || "—"}</td>
                  <td className="py-2 pr-4">
                    {r.sent ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Sent</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">Pending</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <Link to={`/viewreport/${r.id}`} className="text-blue-600 hover:underline">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-2xl border shadow-sm p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
