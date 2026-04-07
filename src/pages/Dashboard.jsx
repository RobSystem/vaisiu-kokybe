import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [monthsBack, setMonthsBack] = useState(12);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserProfile(null);
        setIsAdmin(false);
        setReports([]);
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
        setLoading(false);
        return;
      }

      setUserProfile(profile);
      const admin = profile?.role === "admin";
      setIsAdmin(admin);

      if (!admin) {
        setReports([]);
        setLoading(false);
        return;
      }

      const { data: reportRows, error: reportsError } = await supabase
        .from("reports")
        .select("id, created_at, date, client")
        .order("created_at", { ascending: false });

      if (reportsError) {
        console.error("Reports fetch error:", reportsError);
        setReports([]);
      } else {
        setReports(reportRows || []);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      setReports([]);
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

    return () => {
      supabase.removeChannel(reportsChannel);
    };
  }, [loadDashboardData]);

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

    reports.forEach((report) => {
      const clientName = report.client?.trim() || "Unknown";

      if (!map.has(clientName)) {
        map.set(clientName, {
          name: clientName,
          count: 0,
        });
      }

      map.get(clientName).count += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [reports]);

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-sm text-slate-500 uppercase tracking-wide">Overview</p>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Inspections per month */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Inspections per month
            </h3>
            <span className="text-xs text-slate-500">Auto refresh</span>
          </div>

          {monthlyStats.length === 0 ? (
            <p className="text-sm text-slate-500">No data found.</p>
          ) : (
            <div className="h-72 flex items-end gap-2">
              {monthlyStats.map((item) => {
                const height = `${(item.count / maxMonthlyCount) * 100}%`;

                return (
                  <div
                    key={item.key}
                    className="flex-1 min-w-0 flex flex-col items-center justify-end gap-2"
                  >
                    <div className="text-[11px] text-slate-600">{item.count}</div>
                    <div
                      className="w-full max-w-[42px] rounded-t-xl bg-slate-800"
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
          )}
        </div>

        {/* Inspections per client */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Inspections per client
            </h3>
            <span className="text-xs text-slate-500">Auto refresh</span>
          </div>

          {clientStats.length === 0 ? (
            <p className="text-sm text-slate-500">No data found.</p>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
              {clientStats.map((client) => (
                <div key={client.name}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="text-sm font-semibold text-slate-900">
                      {client.name}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}