import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function cx(...cls) {
  return cls.filter(Boolean).join(" ");
}

/* ----------------------------- Icons ----------------------------- */

function IconSearch(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20L17 17" />
    </svg>
  );
}

function IconPlus(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconChevronRight(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function IconCalendar(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M8 3v3M16 3v3" />
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function IconBox(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" />
    </svg>
  );
}

function IconHash(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M5 9h14M4 15h14M10 3L8 21M16 3l-2 18" />
    </svg>
  );
}

function IconMapPin(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconLeaf(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M19 5C10 5 5 10 5 19c9 0 14-5 14-14z" />
      <path d="M9 15c1.5-2 4.5-5 8-6" />
    </svg>
  );
}

function IconUser(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

function IconBuilding(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M9 21v-4h6v4" />
      <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  );
}

function IconMore(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="6" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18" cy="12" r="1.7" />
    </svg>
  );
}

function IconEdit(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M13 7l4 4" />
    </svg>
  );
}

function IconArchive(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="5" width="18" height="4" rx="1" />
      <path d="M5 9h14v9a2 2 0 01-2 2H7a2 2 0 01-2-2V9z" />
      <path d="M10 13h4" />
    </svg>
  );
}

function IconTrash(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

function IconLayers(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </svg>
  );
}

/* --------------------------- UI helpers -------------------------- */

function StatusBadge({ report }) {
  if (report.status === "done") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Archived
      </span>
    );
  }

  if (report.sent) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Sent
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Not sent
    </span>
  );
}

function MetaItem({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="mt-0.5 shrink-0 text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div
          className={cx(
            "truncate text-sm text-slate-900",
            mono && "font-mono text-[13px]"
          )}
          title={value || "-"}
        >
          {value || "-"}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" />
      </div>
      <h4 className="text-sm font-bold text-slate-900">{children}</h4>
    </div>
  );
}

function ActionMenu({ onOpen, onArchive, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (!menuRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div
      ref={menuRef}
      className="relative"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
      >
        <IconMore className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-20 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpen?.();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <IconEdit className="h-4 w-4" />
            Open / Edit
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onArchive?.();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <IconArchive className="h-4 w-4" />
            Archive
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete?.();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <IconTrash className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function ReportCard({ report, onOpen, onArchive, onDelete }) {
  return (
    <div
      className={cx(
        "group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500/0 via-brand-500/60 to-brand-500/0 opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-4">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Inspection
            </span>
            <StatusBadge report={report} />
          </div>

          <h3 className="mt-3 truncate text-xl font-bold tracking-tight text-slate-900">
            {report.client || "Unnamed client"}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <IconCalendar className="h-4 w-4 text-slate-400" />
              {report.date || "-"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5">
              <IconLeaf className="h-4 w-4 text-slate-400" />
              {report.variety || "No variety"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5">
              <IconMapPin className="h-4 w-4 text-slate-400" />
              {report.location || "No location"}
            </span>
          </div>
        </button>

        <ActionMenu onOpen={onOpen} onArchive={onArchive} onDelete={onDelete} />
      </div>

      <button type="button" onClick={onOpen} className="mt-5 block w-full text-left">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetaItem icon={IconBox} label="Container" value={report.container_number} mono />
          <MetaItem icon={IconHash} label="Client Ref" value={report.client_ref} mono />
          <MetaItem icon={IconHash} label="Rochecks Ref" value={report.rochecks_ref} mono />
          <MetaItem icon={IconUser} label="Surveyor" value={report.surveyor} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetaItem icon={IconBuilding} label="Supplier" value={report.supplier} />
          <MetaItem icon={IconMapPin} label="Origin" value={report.origin} />
          <MetaItem icon={IconLayers} label="Pallets" value={report.total_pallets} />
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
              {report.type || "-"}
            </span>
            {report.report_type_id && (
              <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
                Report type assigned
              </span>
            )}
          </div>

          <div className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
            Open report
            <IconChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>
    </div>
  );
}

/* ----------------------------- Forms ----------------------------- */

function InputField({
  label,
  name,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder = "",
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400/60 focus:ring-4 focus:ring-brand-100"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  children,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-400/60 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-100"
      >
        {children}
      </select>
    </div>
  );
}

/* ---------------------------- Component --------------------------- */

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
  const [sentFilter, setSentFilter] = useState("all");

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

  const pageSize = 10;
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

  const handleDone = async (id) => {
    const { error } = await supabase.from("reports").update({ status: "done" }).eq("id", id);
    if (!error) {
      setReports((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Ar tikrai nori ištrinti šią ataskaitą?")) return;

    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (!error) {
      setReports((prev) => prev.filter((r) => r.id !== id));
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
      surveyor: userProfile?.role === "user" ? userProfile?.name || "" : prev.surveyor,
    }));
  }, [createOpen, userProfile, basicReportTypeId]);

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
          r.type,
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
  }, [page, totalPages]);

  const filterTabs = [
    { value: "all", label: "All" },
    { value: "sent", label: "Sent" },
    { value: "notsent", label: "Not sent" },
  ];

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Inspections
            </div>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              All Reports
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Premium card-based view for faster scanning, clearer metadata and quicker actions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-500"
          >
            <IconPlus className="h-4 w-4" />
            New inspection
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="w-full xl:max-w-xl">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search
              </label>

              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search client, refs, container, location, surveyor..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400/60 focus:ring-4 focus:ring-brand-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </label>

              <div className="inline-flex rounded-2xl bg-slate-100 p-1">
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
                        "rounded-xl px-4 py-2 text-sm font-semibold transition",
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

        {/* Create modal */}
        {createOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setCreateOpen(false);
            }}
          >
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />

            <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur sm:px-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Inspections
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Create new inspection</h3>
                </div>

                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-5 sm:p-6">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                      <SectionTitle icon={IconCalendar}>Basic info</SectionTitle>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <InputField
                          label="Date"
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleCreateChange}
                          required
                        />

                        <SelectField
                          label="Report type"
                          name="report_type_id"
                          value={formData.report_type_id}
                          onChange={handleCreateChange}
                          required
                        >
                          <option value="">-- Select report type --</option>
                          {reportTypes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </SelectField>

                        <SelectField
                          label="Client"
                          name="client"
                          value={formData.client}
                          onChange={handleCreateChange}
                          required
                        >
                          <option value="">-- Select client --</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </SelectField>

                        <InputField
                          label="Supplier"
                          name="supplier"
                          value={formData.supplier}
                          onChange={handleCreateChange}
                          required
                        />

                        <InputField
                          label="Variety"
                          name="variety"
                          value={formData.variety}
                          onChange={handleCreateChange}
                          required
                        />

                        <InputField
                          label="Origin"
                          name="origin"
                          value={formData.origin}
                          onChange={handleCreateChange}
                          required
                        />

                        <InputField
                          label="Location"
                          name="location"
                          value={formData.location}
                          onChange={handleCreateChange}
                          required
                        />

                        <SelectField
                          label="Type"
                          name="type"
                          value={formData.type}
                          onChange={handleCreateChange}
                          required
                        >
                          <option value="Conventional">Conventional</option>
                          <option value="Organic">Organic</option>
                        </SelectField>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                      <SectionTitle icon={IconHash}>References & shipment</SectionTitle>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <InputField
                          label="Container"
                          name="container_number"
                          value={formData.container_number}
                          onChange={handleCreateChange}
                          required
                        />

                        <InputField
                          label="Client ref"
                          name="client_ref"
                          value={formData.client_ref}
                          onChange={handleCreateChange}
                          required
                        />

                        <InputField
                          label="Rochecks ref"
                          name="rochecks_ref"
                          value={formData.rochecks_ref}
                          onChange={handleCreateChange}
                          required
                        />

                        <InputField
                          label="Total pallets"
                          name="total_pallets"
                          value={formData.total_pallets}
                          onChange={handleCreateChange}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <SectionTitle icon={IconUser}>Assignment</SectionTitle>

                      <div className="space-y-4">
                        <SelectField
                          label="Surveyor"
                          name="surveyor"
                          value={formData.surveyor}
                          onChange={handleCreateChange}
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
                                <option value={userProfile.name}>{userProfile.name}</option>
                              )}
                        </SelectField>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-brand-100 bg-brand-50 p-4 sm:p-5">
                      <SectionTitle icon={IconLayers}>Summary</SectionTitle>

                      <div className="space-y-3 text-sm text-slate-700">
                        <div className="flex items-center justify-between gap-4 border-b border-brand-100 pb-2">
                          <span className="text-slate-500">Client</span>
                          <span className="font-medium text-slate-900">{formData.client || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-b border-brand-100 pb-2">
                          <span className="text-slate-500">Variety</span>
                          <span className="font-medium text-slate-900">{formData.variety || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-b border-brand-100 pb-2">
                          <span className="text-slate-500">Container</span>
                          <span className="font-mono text-[13px] text-slate-900">
                            {formData.container_number || "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-b border-brand-100 pb-2">
                          <span className="text-slate-500">Location</span>
                          <span className="font-medium text-slate-900">{formData.location || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500">Surveyor</span>
                          <span className="font-medium text-slate-900">{formData.surveyor || "-"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                      <div className="text-sm font-semibold text-slate-900">Before creating</div>
                      <p className="mt-1 text-sm text-slate-500">
                        Check key fields like container, refs and surveyor before continuing.
                      </p>
                    </div>
                  </div>
                </div>

                {createMessage && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {createMessage}
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={createLoading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
                  >
                    <IconPlus className="h-4 w-4" />
                    {createLoading ? "Creating..." : "Create inspection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm sm:p-5">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
              Kraunama…
            </div>
          ) : pageReports.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <IconLayers className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">No reports found</h3>
              <p className="mt-2 text-sm text-slate-500">
                Pabandyk pakeisti paieškos frazę arba filtrus.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {pageReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onOpen={() => {
                    setSelectedReport?.(report);
                    navigate(`/edit/${report.id}`);
                  }}
                  onArchive={() => handleDone(report.id)}
                  onDelete={() => handleDelete(report.id)}
                />
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Showing {total === 0 ? 0 : start + 1}–{end} of {total} entries
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
                className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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