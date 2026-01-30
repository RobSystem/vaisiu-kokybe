import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function cx(...cls) {
  return cls.filter(Boolean).join(" ");
}

function StatusBadge({ report }) {
  // paprasta logika dabar, bet plečiama ateityje
  if (report.status === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
        Archived
      </span>
    );
  }

  if (report.sent) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <span className="text-emerald-600">●</span> Sent
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <span className="text-amber-500">●</span> Not sent
    </span>
  );
}

const initialForm = {
  date: "",
  client: "",
  client_ref: "",
  container_number: "",
  rochecks_ref: "",
  supplier: "",
  variety: "",
  origin: "",
  location: "",
  total_pallets: "",
  type: "Conventional",
  surveyor: "",
  status: "active",
};

export default function AllReports({ setSelectedReport }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [sentFilter, setSentFilter] = useState("all"); // all | sent | notsent

  const [userProfile, setUserProfile] = useState(null);

  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
const [createLoading, setCreateLoading] = useState(false);
const [createMessage, setCreateMessage] = useState("");

const [clients, setClients] = useState([]);
const [users, setUsers] = useState([]);

const [formData, setFormData] = useState(initialForm);
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

  const handleCreateChange = (e) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));
};

const handleCreateSubmit = async (e) => {
  e.preventDefault();
  setCreateMessage("");

  // tokia pati validacija kaip CreateReport.jsx (visi laukai privalomi)
  for (const [key, value] of Object.entries(formData)) {
    if (!value) {
      setCreateMessage(`Laukas "${key}" yra privalomas.`);
      return;
    }
  }

  setCreateLoading(true);

  const { data, error } = await supabase
    .from("reports")
    .insert([formData])
    .select()
    .single();

  setCreateLoading(false);

  if (error || !data) {
    setCreateMessage("Klaida kuriant inspekciją.");
    return;
  }

  // uždarom modal ir einam į edit (tas pats flow kaip anksčiau)
  setCreateOpen(false);
  navigate(`/edit/${data.id}`);
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

  useEffect(() => {
  const fetchClients = async () => {
    const { data, error } = await supabase.from("clients").select("id, name");
    if (!error && data) setClients(data);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("user_profiles").select("id, name");
    if (!error && data) setUsers(data);
  };

  fetchClients();
  fetchUsers();
}, []);

useEffect(() => {
  if (!createOpen) return;

  const today = new Date().toISOString().slice(0, 10);
  setCreateMessage("");

  setFormData((prev) => ({
    ...initialForm,
    date: today,
    surveyor: userProfile?.role === "user" ? (userProfile?.name || "") : prev.surveyor,
  }));
}, [createOpen, userProfile]);

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

          <button type="button" onClick={() => setCreateOpen(true)}
            className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-500 transition"
          >
            + New inspection
          </button>
        </div>
      </div>
{createOpen && (
  <div
    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    onMouseDown={(e) => {
      // click ant backdrop uždaro
      if (e.target === e.currentTarget) setCreateOpen(false);
    }}
  >
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

    <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Inspections
          </div>
          <h3 className="text-lg font-bold text-slate-900">New inspection</h3>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(false)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      <form onSubmit={handleCreateSubmit} className="p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* DATE */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">DATE</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleCreateChange}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
              required
            />
          </div>

          {/* VARIETY */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">VARIETY</label>
            <input
              type="text"
              name="variety"
              value={formData.variety}
              onChange={handleCreateChange}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
              required
            />
          </div>

          {/* CLIENT */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">CLIENT</label>
            <select
              name="client"
              value={formData.client}
              onChange={handleCreateChange}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
              required
            >
              <option value="">-- Select client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* SUPPLIER */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">SUPPLIER</label>
            <input
              type="text"
              name="supplier"
              value={formData.supplier}
              onChange={handleCreateChange}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
              required
            />
          </div>

          {/* CLIENT REF */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">CLIENT REF</label>
            <input
              type="text"
              name="client_ref"
              value={formData.client_ref}
              onChange={handleCreateChange}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
              required
            />
          </div>

          {/* ORIGIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">ORIGIN</label>
            <input
              type="text"
              name="origin"
              value={formData.origin}
              onChange={handleCreateChange}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
              required
            />
          </div>

          {/* CONTAINER NUMBER */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">CONTAINER</label>
            <input
              type="text"
              name="container_number"
              value={formData.container_number}
              onChange={handleCreateChange}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
              required
            />
          </div>

          {/* LOCATION */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">LOCATION</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleCreateChange}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
              required
            />
          </div>

          {/* ROCHECKS REF */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">ROCHECKS REF</label>
            <input
              type="text"
              name="rochecks_ref"
              value={formData.rochecks_ref}
              onChange={handleCreateChange}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
              required
            />
          </div>

          {/* TOTAL PALLETS */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">TOTAL PALLETS</label>
            <input
              type="text"
              name="total_pallets"
              value={formData.total_pallets}
              onChange={handleCreateChange}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
              required
            />
          </div>

          {/* TYPE */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">TYPE</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleCreateChange}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
              required
            >
              <option value="Conventional">Conventional</option>
              <option value="Organic">Organic</option>
            </select>
          </div>

          {/* SURVEYOR */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">SURVEYOR</label>
            <select
              name="surveyor"
              value={formData.surveyor}
              onChange={handleCreateChange}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
              required
              disabled={userProfile?.role === "user"} // user negali keisti
            >
              <option value="">-- Select surveyor --</option>
              {userProfile?.role === "admin"
                ? users.map((u) => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))
                : userProfile && (
                    <option value={userProfile.name}>{userProfile.name}</option>
                  )}
            </select>
          </div>
        </div>

        {createMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {createMessage}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={createLoading}
            className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
          >
            {createLoading ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
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
  <StatusBadge report={report} />
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
