import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [monthsBack, setMonthsBack] = useState(12);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);

    try {
      // 1. User profile / role
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserProfile(null);
        setIsAdmin(false);
        setReports([]);
        setClients([]);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, name, role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("User profile error:", profileError);
        setUserProfile(null);
        setIsAdmin(false);
        setReports([]);
        setClients([]);
        setLoading(false);
        return;
      }

      setUserProfile(profile);
      const admin = profile?.role === "admin";
      setIsAdmin(admin);

      if (!admin) {
        setReports([]);
        setClients([]);
        setLoading(false);
        return;
      }

      // 2. Reports
      const { data: reportRows, error: reportsError } = await supabase
        .from("reports")
        .select(
          "id, created_at, date, client, client_ref, container_number, sent, qualityScore, storageScore"
        )
        .order("created_at", { ascending: false });

      if (reportsError) {
        console.error("Reports fetch error:", reportsError);
        setReports([]);
      } else {
        setReports(reportRows || []);
      }

      // 3. Clients
      const { data: clientRows, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, email")
        .order("name", { ascending: true });

      if (clientsError) {
        console.error("Clients fetch error:", clientsError);
        setClients([]);
      } else {
        setClients(clientRows || []);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      setReports([]);
      setClients([]);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    const reportsChannel = supabase
      .channel("dashboard-reports-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    const clientsChannel = supabase
      .channel("dashboard-clients-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(clientsChannel);
    };
  }, [loadDashboardData]);

  const totalReports = reports.length;
  const sentReports = reports.filter((r) => !!r.sent).length;
  const pendingReports = totalReports - sentReports;

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const result = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      });

      result.push({
        key,
        label,
        count: 0,
      });
    }

    reports.forEach((report) => {
      const rawDate = report.date || report.created_at;
      if (!rawDate) return;

      const d = new Date(rawDate);
      if (Number.isNaN(d.getTime())) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = result.find((x) => x.key === key);
      if (row) row.count += 1;
    });

    return result;
  }, [reports, monthsBack]);

  const clientStats = useMemo(() => {
    const map = new Map();

    // Pirmiausia visi klientai iš clients lentelės
    clients.forEach((client) => {
      map.set(client.name, {
        name: client.name,
        email: client.email || "—",
        count: 0,
      });
    });

    // Tada suskaičiuojam reports pagal client
    reports.forEach((report) => {
      const name = report.client?.trim() || "Unknown";
      if (!map.has(name)) {
        map.set(name, {
          name,
          email: "—",
          count: 0,
        });
      }

      map.get(name).count += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [reports, clients]);

  const recentReports = useMemo(() => reports.slice(0, 10), [reports]);

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="px-4 md:px-6 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500 uppercase tracking-wide">Dashboard</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Access restricted</h1>
          <p className="text-slate-600 mt-3">
            This dashboard is visible only for admin users.
          </p>
        </div>
      </div>
    );
  }

  const maxMonthlyCount = Math.max(...monthlyStats.map((m) => m.count), 1);
  const maxClientCount = Math.max(...clientStats.map((c) => c.count), 1);

  return (
    <div className="px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-sm text-slate-500 uppercase tracking-wide">Overview</p>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Signed in as: {userProfile?.name || "—"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Months:</label>
          <select
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            value={monthsBack}
            onChange={(e) => setMonthsBack(parseInt(e.target.value, 10))}
          >
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </select>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Total inspections" value={totalReports} />
        <KpiCard label="Sent reports" value={sentReports} />
        <KpiCard label="Pending reports" value={pendingReports} />
      </div>

      {/* Monthly chart */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Inspections per month
          </h3>
          <span className="text-xs text-slate-500">Auto refresh enabled</span>
        </div>

        <div className="h-64 flex items-end gap-2">
          {monthlyStats.map((item) => {
            const height = `${(item.count / maxMonthlyCount) * 100}%`;

            return (
              <div key={item.key} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-2">
                <div className="text-[11px] text-slate-600">{item.count}</div>
                <div
                  className="w-full max-w-[36px] rounded-t-xl bg-slate-800"
                  style={{ height }}
                  title={`${item.label}: ${item.count}`}
                />
                <div className="text-[10px] text-slate-500 text-center leading-tight">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Client stats */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Inspections per client
          </h3>

          <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
            {clientStats.length === 0 ? (
              <p className="text-sm text-slate-500">No client data found.</p>
            ) : (
              clientStats.map((client) => (
                <div key={client.name}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {client.name}
                      </div>
                      <div className="text-xs text-slate-500">{client.email}</div>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {client.count}
                    </div>
                  </div>

                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-3 rounded-full bg-slate-800"
                      style={{ width: `${(client.count / maxClientCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Client statistics table
          </h3>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-4">Client</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Inspections</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientStats.map((client) => (
                  <tr key={client.name} className="hover:bg-slate-50">
                    <td className="py-2 pr-4">{client.name}</td>
                    <td className="py-2 pr-4">{client.email}</td>
                    <td className="py-2 pr-4 font-semibold">{client.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent reports */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent inspections</h3>
          <Link to="/all" className="text-sm text-blue-600 hover:underline">
            See all
          </Link>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600 border-b">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Client</th>
                <th className="py-2 pr-4">Client Ref</th>
                <th className="py-2 pr-4">Container</th>
                <th className="py-2 pr-4">Quality</th>
                <th className="py-2 pr-4">Storage</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    No reports found.
                  </td>
                </tr>
              ) : (
                recentReports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2 pr-4">
                      {r.date
                        ? new Date(r.date).toLocaleDateString()
                        : r.created_at
                        ? new Date(r.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">{r.client || "—"}</td>
                    <td className="py-2 pr-4">{r.client_ref || "—"}</td>
                    <td className="py-2 pr-4">{r.container_number || "—"}</td>
                    <td className="py-2 pr-4">{r.qualityScore || "—"}</td>
                    <td className="py-2 pr-4">{r.storageScore || "—"}</td>
                    <td className="py-2 pr-4">
                      {r.sent ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                          Sent
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <Link
                        to={`/viewreport/${r.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}