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
  report_type_id: "",
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
const [reportTypes, setReportTypes] = useState([]);
const [basicReportTypeId, setBasicReportTypeId] = useState(null);
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
  const fetchReportTypes = async () => {
    const { data, error } = await supabase
      .from("report_types")
      .select("id, name")
      .order("name", { ascending: true });

    if (!error && data) {
      setReportTypes(data);
      const basic = data.find((t) => t.name?.toUpperCase() === "BASIC");
      if (basic) setBasicReportTypeId(basic.id);
    }
  };

  fetchReportTypes();
}, []);

useEffect(() => {
  if (!createOpen) return;

  const today = new Date().toISOString().slice(0, 10);
  setCreateMessage("");

  setFormData((prev) => ({
    ...initialForm,
    date: today,
    report_type_id: basicReportTypeId || "",
    surveyor: userProfile?.role === "user" ? (userProfile?.name || "") : prev.surveyor,
  }));
}, [createOpen, userProfile, basicReportTypeId]);

  return (
    <div className="w-full px-6 py-6">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
  {/* Left */}
  <div>
    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      Inspections
    </div>
    <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
      All reports
    </h2>
  </div>

  {/* Right controls */}
  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
    
    {/* Filter */}
    <select
      value={sentFilter}
      onChange={(e) => {
        setSentFilter(e.target.value);
        setPage(1);
      }}
      className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
    >
      <option value="all">All</option>
      <option value="sent">Sent</option>
      <option value="notsent">Not sent</option>
    </select>

    {/* Search */}
    <input
      type="text"
      placeholder="Search client, ref, container..."
      value={searchTerm}
      onChange={(e) => {
        setSearchTerm(e.target.value);
        setPage(1);
      }}
      className="h-11 w-full sm:w-[260px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
    />

    {/* Button */}
    <button
      type="button"
      onClick={() => setCreateOpen(true)}
      className="h-11 rounded-2xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-500 shadow-sm"
    >
      + New inspection
    </button>
  </div>
</div>
{createOpen && (
  <div
    className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) setCreateOpen(false);
    }}
  >
    <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" />

    <div className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Inspections
            </div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">
              New inspection
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Create a new inspection report and continue to the edit page.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>

      {/* Body */}
      <form onSubmit={handleCreateSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="max-h-[75vh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleCreateChange}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Variety
              </label>
              <input
                type="text"
                name="variety"
                value={formData.variety}
                onChange={handleCreateChange}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Report type
              </label>
              <select
                name="report_type_id"
                value={formData.report_type_id}
                onChange={handleCreateChange}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                required
              >
                <option value="">Select report type</option>
                {reportTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Client
              </label>
              <select
                name="client"
                value={formData.client}
                onChange={handleCreateChange}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                required
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Supplier
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleCreateChange}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Client ref
              </label>
              <input
                type="text"
                name="client_ref"
                value={formData.client_ref}
                onChange={handleCreateChange}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Origin
              </label>
              <input
                type="text"
                name="origin"
                value={formData.origin}
                onChange={handleCreateChange}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Container
              </label>
              <input
                type="text"
                name="container_number"
                value={formData.container_number}
                onChange={handleCreateChange}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleCreateChange}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Rochecks ref
              </label>
              <input
                type="text"
                name="rochecks_ref"
                value={formData.rochecks_ref}
                onChange={handleCreateChange}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Total pallets
              </label>
              <input
                type="text"
                name="total_pallets"
                value={formData.total_pallets}
                onChange={handleCreateChange}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleCreateChange}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                required
              >
                <option value="Conventional">Conventional</option>
                <option value="Organic">Organic</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Surveyor
              </label>
              <select
                name="surveyor"
                value={formData.surveyor}
                onChange={handleCreateChange}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50"
                required
                disabled={userProfile?.role === "user"}
              >
                <option value="">Select surveyor</option>
                {userProfile?.role === "admin"
                  ? users.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))
                  : userProfile && (
                      <option value={userProfile.name}>{userProfile.name}</option>
                    )}
              </select>
            </div>
          </div>

          {createMessage && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={createLoading}
              className="h-12 rounded-2xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
            >
              {createLoading ? "Creating..." : "Create inspection"}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
)}
      {/* Table card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
  <div>
    <h3 className="text-sm font-semibold text-slate-900">Inspection reports</h3>
    <p className="text-xs text-slate-500">
      Active reports list with quick access to edit view.
    </p>
  </div>

  <div className="text-xs font-medium text-slate-500">
    {total} total
  </div>
</div>
        {loading ? (
          <div className="px-5 py-10 text-sm text-slate-500">Loading reports...</div>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
  <table className="min-w-[980px] w-full border-collapse text-sm">
                <thead className="bg-slate-50">
  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {[
                      "Date",
  "Container",
  "Client Ref",
  "Rochecks Ref",
  "Client",
  "Variety",
  "Location",
  "Status",
                    ].map((h) => (
                      <th key={h} className="border-b border-slate-200 px-4 py-3.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {pageReports.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-14 text-center">
  <div className="mx-auto max-w-sm">
    <div className="text-sm font-semibold text-slate-900">No reports found</div>
    <p className="mt-1 text-sm text-slate-500">
      Try changing the search phrase or filter settings.
    </p>
  </div>
</td>
                    </tr>
                  ) : (
                    pageReports.map((report) => (
  <tr
  key={report.id}
  className="cursor-pointer transition hover:bg-brand-50/40"
    onClick={() => {
      setSelectedReport?.(report);
      navigate(`/edit/${report.id}`);
    }}
  >
    <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-700">
      {report.date}
    </td>
    <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-600">
      {report.container_number || "-"}
    </td>
    <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-600">
      {report.client_ref || "-"}
    </td>
   <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-600">
      {report.rochecks_ref || "-"}
    </td>
   <td className="border-b border-slate-100 px-4 py-3 align-middle font-semibold text-slate-900">
      {report.client}
    </td>
    <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-700">
      {report.variety}
    </td>
    <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-600">
      {report.location}
    </td>
    <td className="border-b border-slate-100 px-4 py-3 align-middle">
      <StatusBadge report={report} />
    </td>
  </tr>
))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer / pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
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
