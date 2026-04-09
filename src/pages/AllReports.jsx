import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function cx(...cls) {
  return cls.filter(Boolean).join(" ");
}

function StatusBadge({ report }) {
  if (report.status === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
        <span className="text-slate-500">●</span>
        Archived
      </span>
    );
  }

  if (report.sent) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <span className="text-emerald-500">●</span>
        Sent
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <span className="text-amber-500">●</span>
      Not sent
    </span>
  );
}

function InfoChip({ label, value, mono = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={cx(
          "mt-1 text-sm text-slate-900",
          mono && "font-mono text-[13px]"
        )}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function ReportCard({ report, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        "group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-brand-300/50"
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Inspection
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                {report.client || "Unnamed client"}
              </h3>
              <span className="text-sm text-slate-400">•</span>
              <span className="text-sm font-medium text-slate-600">
                {report.date || "-"}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                {report.variety || "No variety"}
              </span>
              <span>·</span>
              <span>{report.location || "No location"}</span>
              {report.type && (
                <>
                  <span>·</span>
                  <span>{report.type}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <StatusBadge report={report} />
            <span className="hidden text-sm font-semibold text-brand-700 transition group-hover:translate-x-0.5 sm:inline-flex">
              Open →
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoChip
            label="Container"
            value={report.container_number}
            mono
          />
          <InfoChip
            label="Client Ref"
            value={report.client_ref}
            mono
          />
          <InfoChip
            label="Rochecks Ref"
            value={report.rochecks_ref}
            mono
          />
          <InfoChip
            label="Surveyor"
            value={report.surveyor}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
            <span>
              <span className="font-semibold text-slate-800">Origin:</span>{" "}
              {report.origin || "-"}
            </span>
            <span>
              <span className="font-semibold text-slate-800">Supplier:</span>{" "}
              {report.supplier || "-"}
            </span>
            <span>
              <span className="font-semibold text-slate-800">Pallets:</span>{" "}
              {report.total_pallets || "-"}
            </span>
          </div>

          <div className="text-sm font-medium text-slate-500 group-hover:text-brand-700">
            Click to open report
          </div>
        </div>
      </div>
    </button>
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

  const pageSize = 12;
  const navigate = useNavigate();

  const fetchReports = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("reports")
      .select("*")
      .eq("status", "active")
      .order("date", { ascending: false });

    if (userProfile?.role === "user") {
      query = query.eq("surveyor", userProfile.name);
    }

    const { data, error } = await query;
    if (!error && data) setReports(data);

    setLoading(false);
  }, [userProfile]);

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateMessage("");

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
          r.supplier,
          r.origin,
          r.surveyor,
        ];

        return fields.some((f) =>
          (f ?? "").toString().toLowerCase().includes(q)
        );
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
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, name");
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
      surveyor:
        userProfile?.role === "user" ? userProfile?.name || "" : prev.surveyor,
    }));
  }, [createOpen, userProfile, basicReportTypeId]);

  const filterTabs = [
    { value: "all", label: "All" },
    { value: "sent", label: "Sent" },
    { value: "notsent", label: "Not sent" },
  ];

  return (
    <div className="w-full px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Inspections
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              All Reports
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Browse, filter and open inspection reports faster.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-500"
          >
            + New inspection
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-xl">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search
              </label>
              <input
                type="text"
                placeholder="Search client, ref, container, location, surveyor..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400/60"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </label>
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                {filterTabs.map((tab) => {
                  const active = sentFilter === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        setSentFilter(tab.value);
                        setPage(1);
                      }}
                      className={cx(
                        "rounded-lg px-4 py-2 text-sm font-semibold transition",
                        active
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {createOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onMouseDown={(e) => {
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
                  <h3 className="text-lg font-bold text-slate-900">
                    New inspection
                  </h3>
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
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      DATE
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleCreateChange}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      VARIETY
                    </label>
                    <input
                      type="text"
                      name="variety"
                      value={formData.variety}
                      onChange={handleCreateChange}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      REPORT TYPE
                    </label>
                    <select
                      name="report_type_id"
                      value={formData.report_type_id}
                      onChange={handleCreateChange}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
                      required
                    >
                      <option value="">-- Select report type --</option>
                      {reportTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      CLIENT
                    </label>
                    <select
                      name="client"
                      value={formData.client}
                      onChange={handleCreateChange}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
                      required
                    >
                      <option value="">-- Select client --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      SUPPLIER
                    </label>
                    <input
                      type="text"
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleCreateChange}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      CLIENT REF
                    </label>
                    <input
                      type="text"
                      name="client_ref"
                      value={formData.client_ref}
                      onChange={handleCreateChange}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      ORIGIN
                    </label>
                    <input
                      type="text"
                      name="origin"
                      value={formData.origin}
                      onChange={handleCreateChange}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      CONTAINER
                    </label>
                    <input
                      type="text"
                      name="container_number"
                      value={formData.container_number}
                      onChange={handleCreateChange}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      LOCATION
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleCreateChange}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      ROCHECKS REF
                    </label>
                    <input
                      type="text"
                      name="rochecks_ref"
                      value={formData.rochecks_ref}
                      onChange={handleCreateChange}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      TOTAL PALLETS
                    </label>
                    <input
                      type="text"
                      name="total_pallets"
                      value={formData.total_pallets}
                      onChange={handleCreateChange}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      TYPE
                    </label>
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

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      SURVEYOR
                    </label>
                    <select
                      name="surveyor"
                      value={formData.surveyor}
                      onChange={handleCreateChange}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/60"
                      required
                      disabled={userProfile?.role === "user"}
                    >
                      <option value="">-- Select surveyor --</option>
                      {userProfile?.role === "admin"
                        ? users.map((u) => (
                            <option key={u.id} value={u.name}>
                              {u.name}
                            </option>
                          ))
                        : userProfile && (
                            <option value={userProfile.name}>
                              {userProfile.name}
                            </option>
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

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Kraunama…
            </div>
          ) : pageReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
              <div className="text-base font-semibold text-slate-900">
                No reports found
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Pabandyk pakeisti paiešką arba filtrus.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pageReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onOpen={() => {
                    setSelectedReport?.(report);
                    navigate(`/edit/${report.id}`);
                  }}
                />
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 px-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
        </div>
      </div>
    </div>
  );
}