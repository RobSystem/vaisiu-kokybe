import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function cx(...cls) {
  return cls.filter(Boolean).join(" ");
}

function SentBadge({ sent }) {
  return sent ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <span className="text-emerald-600">●</span> Sent
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
      <span className="text-slate-400">●</span> Not sent
    </span>
  );
}

export default function AllReports({ setSelectedReport }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [sentFilter, setSentFilter] = useState("all"); // all | sent | notsent

  const [userProfile, setUserProfile] = useState(null);

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const navigate = useNavigate();

  const fetchReports = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("reports")
      .select("*")
      .eq("status", "active")
      .order("date", { ascending: false });

    // jei paprastas user – rodom tik jo ataskaitas
    if (userProfile?.role === "user") {
      query = query.eq("surveyor", userProfile.name);
    }

    const { data, error } = await query;
    if (!error && data) setReports(data);
    setLoading(false);
  }, [userProfile]);

  const handleDone = async (id) => {
    const { error } = await supabase.from("reports").update({ status: "done" }).eq("id", id);
    if (!error) setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Ar tikrai nori ištrinti šią ataskaitą?")) return;

    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (!error) {
      setReports((prev) => prev.filter((r) => r.id !== id));
      // palikau alert, bet jei nori – pakeisim į toast
      alert("Ataskaita ištrinta sėkmingai!");
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("name, role")
        .eq("id", user.id)
        .single();

      if (!error) setUserProfile(data);
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (!userProfile) return;
    fetchReports();
  }, [userProfile, fetchReports]);

  // realtime update: paprasta, bet patikima strategija
  useEffect(() => {
    if (!userProfile) return;

    const channel = supabase.channel("reports-realtime");
    channel.on(
      "postgres_changes",
      { schema: "public", table: "reports", event: "*" },
      () => fetchReports()
    );
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile, fetchReports]);

  const filteredReports = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return reports
      .filter((r) => {
        if (sentFilter === "sent") return !!r.sent;
        if (sentFilter === "notsent") return !r.sent;
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        const fields = [
          r.client,
          r.container_number,
          r.location,
          r.variety,
          r.client_ref,
          r.rochecks_ref,
        ];
        return fields.some((f) => (f ?? "").toString().toLowerCase().includes(q));
      });
  }, [reports, searchTerm, sentFilter]);

  const total = filteredReports.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageReports = filteredReports.slice(start, end);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  return (
    <div className="w-full px-6 py-6">
      {/* Page header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Inspections
          </div>
          <h2 className="text-xl font-bold text-slate-900">All Reports</h2>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            <select
              value={sentFilter}
              onChange={(e) => {
                setSentFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-400/60"
            >
              <option value="all">All</option>
              <option value="sent">Sent</option>
              <option value="notsent">Not sent</option>
            </select>

            <input
              type="text"
              placeholder="Search client, ref, container, location..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full min-w-[240px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-400/60"
            />
          </div>

          <button
            type="button"
            onClick={() => navigate("/create")}
            className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-500 transition"
          >
            + New inspection
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-600">Kraunama…</div>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <table className="min-w-[1100px] w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    {[
                      "Date",
                      "Container",
                      "Client Ref",
                      "Rochecks Ref",
                      "Client",
                      "Variety",
                      "Location",
                      "Actions",
                      "Status",
                    ].map((h) => (
                      <th key={h} className="border-b border-slate-200 px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {pageReports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                        No reports found.
                      </td>
                    </tr>
                  ) : (
                    pageReports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50/70">
                        <td className="border-b border-slate-100 px-4 py-3 text-slate-800">
                          {report.date}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {report.container_number || "-"}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {report.client_ref || "-"}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {report.rochecks_ref || "-"}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-900">
                          {report.client}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {report.variety}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {report.location}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReport?.(report);
                                navigate(`/edit/${report.id}`);
                              }}
                              className="rounded-lg border border-brand-400/40 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDone(report.id)}
                              className="rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              Done
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(report.id)}
                              className="rounded-lg border border-red-300/60 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-3">
                          <SentBadge sent={!!report.sent} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer / pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Showing {total === 0 ? 0 : start + 1}–{end} of {total} entries
              </p>

              <div className="flex items-center justify-center gap-2">
                <button
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>

                <span className="text-sm text-slate-700">
                  Page <span className="font-semibold">{page}</span> of{" "}
                  <span className="font-semibold">{totalPages}</span>
                </span>

                <button
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
