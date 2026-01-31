import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

/* =========================
   UI helpers (OUTSIDE)
   ========================= */
function cx(...cls) {
  return cls.filter(Boolean).join(" ");
}

function Card({ title, right, children, className }) {
  return (
    <div className={cx("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div>{right}</div>
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "relative rounded-xl px-4 py-2 text-sm font-semibold transition",
        active ? "text-slate-900" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
      )}
    >
      {label}
      {active && (
        <span className="absolute inset-x-3 -bottom-1 h-[2px] rounded-full bg-brand-500" />
      )}
    </button>
  );
}

function SubTabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-xl px-4 py-2 text-sm font-semibold transition border",
        active
          ? "bg-brand-50 text-brand-800 border-brand-200"
          : "bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {label}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({ className, ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none",
        "placeholder:text-slate-400 focus:border-brand-400/70",
        className
      )}
    />
  );
}

function Select({ className, ...props }) {
  return (
    <select
      {...props}
      className={cx(
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none",
        "focus:border-brand-400/70",
        className
      )}
    />
  );
}

/* =========================
   Helpers
   ========================= */
const toDbNull = (v) => {
  if (v === "" || v === "Pasirinkti") return null;
  return v;
};

const safeNumberOrNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* =========================
   Tabs
   ========================= */
const TAB = {
  PALLET: "pallet",
  MEASURE: "measure",
  DEFECTS: "defects",
  SCORING: "scoring",
};

const MEASURE_TAB = {
  MEASUREMENTS: "measurements",
  COLORATION: "coloration",
  CONSISTENCY: "consistency",
};

/* =========================
   Scoring options (OLD)
   ========================= */
const QUALITY_OPTIONS = [
  "7 - Good",
  "6 - Fair",
  "5 - Reasonable",
  "4 - Moderate",
  "3 - Less than moderate",
  "2 - Poor",
  "1 - Total Loss",
];

const STORAGE_OPTIONS = [
  "7 - Good",
  "6 - Normal",
  "5 - Reduced",
  "4 - Moderate",
  "3 - Limited",
  "2 - Poor",
  "1 - No storage potential",
];

/* =========================
   Component
   ========================= */
export default function CreateSample() {
  const navigate = useNavigate();
  const { reportId, sampleId } = useParams();

  const [activeTab, setActiveTab] = useState(TAB.PALLET);
  const [measureTab, setMeasureTab] = useState(MEASURE_TAB.MEASUREMENTS);
  const [saving, setSaving] = useState(false);

  // report type
  const [reportTypeId, setReportTypeId] = useState(null);
  const [fieldRules, setFieldRules] = useState({}); // field_key -> { required }
  const hasRules = useMemo(() => Object.keys(fieldRules).length > 0, [fieldRules]);
  const showField = (key) => (hasRules ? !!fieldRules[key] : true);

  // defects options (allowed by report type)
  const [minorOptions, setMinorOptions] = useState([]); // [{id,name}]
  const [majorOptions, setMajorOptions] = useState([]);
  const [minorMode, setMinorMode] = useState("qty"); // qty | pct
const [majorMode, setMajorMode] = useState("qty");

  // NEW defects rows (id + qty)
  const [minorRows, setMinorRows] = useState([]); // [{ id:"", qty:"" }]
  const [majorRows, setMajorRows] = useState([]);

  const [form, setForm] = useState({
    // pallet
    pallet_number: "",
    ggn_number: "",
    ggn_exp_date: "",
    grower_code: "",
    packing_code: "",
    variety: "",
    brand: "",

    // measurements
    packing_type: "",
    size: "",

    box_weight_min: "",
    box_weight_max: "",
    fruit_weight_min: "",
    fruit_weight_max: "",
    pressures_min: "",
    pressures_max: "",
    brix_min: "",
    brix_max: "",
    fruit_diameter_min: "",
    fruit_diameter_max: "",

    // new measurements
    punnet_weight_min: "",
    punnet_weight_max: "",
    bag_weight_min: "",
    bag_weight_max: "",
    calibration_min: "",
    calibration_max: "",
    rhizome_weight_min: "",
    rhizome_weight_max: "",

    // scoring (OLD)
    quality_score: "",
    storage_score: "",
  });

  // coloration + consistency (paliekam tavo funkcionalumą)
  const [externalColoration, setExternalColoration] = useState([]);
  const [internalColoration, setInternalColoration] = useState([]);
  const [consistency, setConsistency] = useState({ hard: "", sensitive: "", soft: "" });

  const defectNameById = useMemo(() => {
    const map = new Map();
    [...minorOptions, ...majorOptions].forEach((d) => map.set(d.id, d.name));
    return map;
  }, [minorOptions, majorOptions]);

  /* =========================
     Load report type
     ========================= */
  useEffect(() => {
    const loadReportType = async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("report_type_id")
        .eq("id", reportId)
        .single();

      if (!error) setReportTypeId(data?.report_type_id || null);
    };

    if (reportId) loadReportType();
  }, [reportId]);

  /* =========================
     Load report_type_fields
     ========================= */
  useEffect(() => {
    const loadFields = async () => {
      if (!reportTypeId) {
        setFieldRules({});
        return;
      }

      const { data, error } = await supabase
        .from("report_type_fields")
        .select("field_key, enabled, required, position")
        .eq("report_type_id", reportTypeId)
        .eq("enabled", true)
        .order("position", { ascending: true });

      if (error) {
        setFieldRules({});
        return;
      }

      const map = {};
      (data || []).forEach((r) => (map[r.field_key] = { required: !!r.required }));
      setFieldRules(map);
    };

    loadFields();
  }, [reportTypeId]);

  /* =========================
     Load report_type_defects
     ========================= */
  useEffect(() => {
    const loadDefects = async () => {
      if (!reportTypeId) {
        setMinorOptions([]);
        setMajorOptions([]);
        return;
      }

      const { data, error } = await supabase
        .from("report_type_defects")
        .select("enabled, position, defect:defect_id ( id, name, severity )")
        .eq("report_type_id", reportTypeId)
        .eq("enabled", true)
        .order("position", { ascending: true });

      if (error) {
        setMinorOptions([]);
        setMajorOptions([]);
        return;
      }

      const minors = [];
      const majors = [];
      (data || []).forEach((row) => {
        const d = row.defect;
        if (!d?.id) return;
        if (d.severity === "minor") minors.push({ id: d.id, name: d.name });
        if (d.severity === "major") majors.push({ id: d.id, name: d.name });
      });
let minMode = "qty";
let majMode = "qty";

(data || []).forEach((row) => {
  const d = row.defect;
  if (!d?.id) return;

  if (d.severity === "minor") {
    minors.push({ id: d.id, name: d.name });
    if (row.input_mode) minMode = row.input_mode;
  }

  if (d.severity === "major") {
    majors.push({ id: d.id, name: d.name });
    if (row.input_mode) majMode = row.input_mode;
  }
});

setMinorOptions(minors);
setMajorOptions(majors);
setMinorMode(minMode);
setMajorMode(majMode);
      setMinorOptions(minors);
      setMajorOptions(majors);
    };

    loadDefects();
  }, [reportTypeId]);

  /* =========================
     Load existing sample (edit)
     ========================= */
  useEffect(() => {
    const loadSample = async () => {
      if (!sampleId) return;

      const { data, error } = await supabase.from("samples").select("*").eq("id", sampleId).single();
      if (error) {
        toast.error("Failed to load sample");
        return;
      }

      setForm((prev) => ({ ...prev, ...(data || {}) }));
      setExternalColoration(Array.isArray(data?.external_coloration) ? data.external_coloration : []);
      setInternalColoration(Array.isArray(data?.internal_coloration) ? data.internal_coloration : []);
      setConsistency(data?.consistency || { hard: "", sensitive: "", soft: "" });

      // supports both old format [id,id] and new [{id,qty}]
      const safeRows = (v) =>
  Array.isArray(v)
    ? v
        .map((x) => {
          // very old: ["uuid", "uuid2"]
          if (typeof x === "string") return { id: x, value: "", unit: null };

          // old: {id, qty}
          if (x && typeof x === "object" && "qty" in x) {
            return { id: x.id || "", value: x.qty ?? "", unit: "qty" };
          }

          // new: {id, value, unit}
          if (x && typeof x === "object") {
            return { id: x.id || "", value: x.value ?? "", unit: x.unit ?? null };
          }

          return { id: "", value: "", unit: null };
        })
        .filter((r) => r.id || r.value !== "")
    : [];

      setMinorRows(safeRows(data?.minor_defects_selected));
      setMajorRows(safeRows(data?.major_defects_selected));
    };

    loadSample();
  }, [sampleId]);

  /* =========================
     Handlers
     ========================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const addMinorRow = () => setMinorRows((p) => [...p, { id: "", value: "", unit: null }]);
const addMajorRow = () => setMajorRows((p) => [...p, { id: "", value: "", unit: null }]);

  const updateRow = (setter, index, key, value) => {
    setter((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const removeRow = (setter, index) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const addColor = (kind) => {
    const setter = kind === "external" ? setExternalColoration : setInternalColoration;
    setter((prev) => [...prev, { color: "", percent: "" }]);
  };

  const updateColor = (kind, idx, field, value) => {
    const setter = kind === "external" ? setExternalColoration : setInternalColoration;
    setter((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const removeColor = (kind, idx) => {
    const setter = kind === "external" ? setExternalColoration : setInternalColoration;
    setter((prev) => prev.filter((_, i) => i !== idx));
  };

  /* =========================
     Save
     ========================= */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => (payload[k] = toDbNull(v)));

      payload.external_coloration = externalColoration.length ? externalColoration : null;
      payload.internal_coloration = internalColoration.length ? internalColoration : null;
      payload.consistency = consistency;

      const normalizeRows = (rows, mode) =>
  rows
    .filter((r) => r && r.id)
    .map((r) => ({
      id: r.id,
      value: r.value === "" ? null : Number(r.value),
      unit: mode, // 'qty' or 'pct'
    }))
    .filter((r) => r.value !== null && Number.isFinite(r.value));

      const minorPayload = normalizeRows(minorRows, minorMode);
const majorPayload = normalizeRows(majorRows, majorMode);

payload.minor_defects_selected = minorPayload.length ? minorPayload : null;
payload.major_defects_selected = majorPayload.length ? majorPayload : null;

      // legacy text (kad senos vietos nesulūžtų)
      const minorNames = minorPayload.map((r) => defectNameById.get(r.id)).filter(Boolean);
const majorNames = majorPayload.map((r) => defectNameById.get(r.id)).filter(Boolean);

payload.minor_defects = minorNames.length ? minorNames.join(", ") : null;
payload.major_defects = majorNames.length ? majorNames.join(", ") : null;

      if (sampleId) {
        const { error } = await supabase.from("samples").update(payload).eq("id", sampleId);
        if (error) throw error;
      } else {
        // next position
        const { data: last, error: lastErr } = await supabase
          .from("samples")
          .select("position")
          .eq("report_id", reportId)
          .order("position", { ascending: false })
          .limit(1);
        if (lastErr) throw lastErr;

        const nextPosition = (last?.[0]?.position || 0) + 1;

        const { error } = await supabase.from("samples").insert({
          report_id: reportId,
          position: nextPosition,
          ...payload,
        });
        if (error) throw error;
      }

      toast.success("Saved successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     Render
     ========================= */
  return (
    <div className="w-full px-6 py-6">
      {/* header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            CREATE SAMPLE
          </div>
          <h2 className="text-xl font-bold text-slate-900">{sampleId ? "Edit Sample" : "New Sample"}</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            onClick={() => navigate(`/edit/${reportId}`)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Report
          </button>
        </div>
      </div>

      {/* tabs */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <TabButton label="Pallet information" active={activeTab === TAB.PALLET} onClick={() => setActiveTab(TAB.PALLET)} />
          <TabButton label="Measurements" active={activeTab === TAB.MEASURE} onClick={() => setActiveTab(TAB.MEASURE)} />
          <TabButton label="Defects" active={activeTab === TAB.DEFECTS} onClick={() => setActiveTab(TAB.DEFECTS)} />
          <TabButton label="Scoring" active={activeTab === TAB.SCORING} onClick={() => setActiveTab(TAB.SCORING)} />
        </div>
      </div>

      {/* PALLET */}
      {activeTab === TAB.PALLET && (
        <Card title="Pallet information">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              ["Pallet Number", "pallet_number"],
              ["GGN Number", "ggn_number"],
              ["GGN Exp Date", "ggn_exp_date"],
              ["Grower Code", "grower_code"],
              ["Packing Code", "packing_code"],
              ["Variety", "variety"],
              ["Brand", "brand"],
            ].map(([label, key]) => (
              <Field key={key} label={label}>
                <Input name={key} value={form[key] ?? ""} onChange={handleChange} />
              </Field>
            ))}
          </div>
        </Card>
      )}

      {/* MEASUREMENTS */}
      {activeTab === TAB.MEASURE && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-2 flex flex-wrap gap-2">
            <SubTabButton label="Measurements" active={measureTab === MEASURE_TAB.MEASUREMENTS} onClick={() => setMeasureTab(MEASURE_TAB.MEASUREMENTS)} />
            <SubTabButton label="Coloration" active={measureTab === MEASURE_TAB.COLORATION} onClick={() => setMeasureTab(MEASURE_TAB.COLORATION)} />
            <SubTabButton label="Consistency" active={measureTab === MEASURE_TAB.CONSISTENCY} onClick={() => setMeasureTab(MEASURE_TAB.CONSISTENCY)} />
          </div>

          {measureTab === MEASURE_TAB.MEASUREMENTS && (
            <Card title="Measurements">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {showField("packing_type") && (
                  <Field label="Packing Type">
                    <Input name="packing_type" value={form.packing_type ?? ""} onChange={handleChange} />
                  </Field>
                )}
                {showField("size") && (
                  <Field label="Size">
                    <Input name="size" value={form.size ?? ""} onChange={handleChange} />
                  </Field>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {showField("box_weight") && (
                  <>
                    <Field label="Box Weight Min">
                      <Input name="box_weight_min" value={form.box_weight_min ?? ""} onChange={handleChange} />
                    </Field>
                    <Field label="Box Weight Max">
                      <Input name="box_weight_max" value={form.box_weight_max ?? ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {showField("fruit_weight") && (
                  <>
                    <Field label="Fruit Weight Min">
                      <Input name="fruit_weight_min" value={form.fruit_weight_min ?? ""} onChange={handleChange} />
                    </Field>
                    <Field label="Fruit Weight Max">
                      <Input name="fruit_weight_max" value={form.fruit_weight_max ?? ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {showField("pressures") && (
                  <>
                    <Field label="Pressures Min">
                      <Input name="pressures_min" value={form.pressures_min ?? ""} onChange={handleChange} />
                    </Field>
                    <Field label="Pressures Max">
                      <Input name="pressures_max" value={form.pressures_max ?? ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {showField("brix") && (
                  <>
                    <Field label="Brix Min">
                      <Input name="brix_min" value={form.brix_min ?? ""} onChange={handleChange} />
                    </Field>
                    <Field label="Brix Max">
                      <Input name="brix_max" value={form.brix_max ?? ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {showField("fruit_diameter") && (
                  <>
                    <Field label="Fruit Diameter Min">
                      <Input name="fruit_diameter_min" value={form.fruit_diameter_min ?? ""} onChange={handleChange} />
                    </Field>
                    <Field label="Fruit Diameter Max">
                      <Input name="fruit_diameter_max" value={form.fruit_diameter_max ?? ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {showField("punnet_weight") && (
                  <>
                    <Field label="Punnet Weight Min">
                      <Input name="punnet_weight_min" value={form.punnet_weight_min ?? ""} onChange={handleChange} />
                    </Field>
                    <Field label="Punnet Weight Max">
                      <Input name="punnet_weight_max" value={form.punnet_weight_max ?? ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {showField("bag_weight") && (
                  <>
                    <Field label="Bag Weight Min">
                      <Input name="bag_weight_min" value={form.bag_weight_min ?? ""} onChange={handleChange} />
                    </Field>
                    <Field label="Bag Weight Max">
                      <Input name="bag_weight_max" value={form.bag_weight_max ?? ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {showField("calibration") && (
                  <>
                    <Field label="Calibration Min">
                      <Input name="calibration_min" value={form.calibration_min ?? ""} onChange={handleChange} />
                    </Field>
                    <Field label="Calibration Max">
                      <Input name="calibration_max" value={form.calibration_max ?? ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {showField("rhizome_weight") && (
                  <>
                    <Field label="Rhizome Weight Min">
                      <Input name="rhizome_weight_min" value={form.rhizome_weight_min ?? ""} onChange={handleChange} />
                    </Field>
                    <Field label="Rhizome Weight Max">
                      <Input name="rhizome_weight_max" value={form.rhizome_weight_max ?? ""} onChange={handleChange} />
                    </Field>
                  </>
                )}
              </div>
            </Card>
          )}

          {measureTab === MEASURE_TAB.COLORATION && (
            <Card
              title="Coloration"
              right={
                <div className="flex gap-2">
                  <button type="button" onClick={() => addColor("external")} className="h-9 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-500">
                    + External
                  </button>
                  <button type="button" onClick={() => addColor("internal")} className="h-9 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-500">
                    + Internal
                  </button>
                </div>
              }
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-3">External coloration</div>
                  {externalColoration.length === 0 ? (
                    <div className="text-sm text-slate-500">No entries.</div>
                  ) : (
                    <div className="space-y-2">
                      {externalColoration.map((row, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input placeholder="Color" value={row.color ?? ""} onChange={(e) => updateColor("external", idx, "color", e.target.value)} />
                          <Input placeholder="%" className="w-28" value={row.percent ?? ""} onChange={(e) => updateColor("external", idx, "percent", e.target.value)} />
                          <button type="button" onClick={() => removeColor("external", idx)} className="h-10 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-3">Internal coloration</div>
                  {internalColoration.length === 0 ? (
                    <div className="text-sm text-slate-500">No entries.</div>
                  ) : (
                    <div className="space-y-2">
                      {internalColoration.map((row, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input placeholder="Color" value={row.color ?? ""} onChange={(e) => updateColor("internal", idx, "color", e.target.value)} />
                          <Input placeholder="%" className="w-28" value={row.percent ?? ""} onChange={(e) => updateColor("internal", idx, "percent", e.target.value)} />
                          <button type="button" onClick={() => removeColor("internal", idx)} className="h-10 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {measureTab === MEASURE_TAB.CONSISTENCY && (
            <Card title="Consistency">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {["hard", "sensitive", "soft"].map((type) => (
                  <Field key={type} label={type.toUpperCase()}>
                    <Select value={consistency[type] ?? ""} onChange={(e) => setConsistency((p) => ({ ...p, [type]: e.target.value }))}>
                      <option value="">Choose...</option>
                      {["0%", "5%", "10%", "15%", "20%", "25%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </Select>
                  </Field>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* DEFECTS (NEW rows + qty) */}
      {activeTab === TAB.DEFECTS && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            title={`Minor defects (${minorRows.length})`}
            right={
              <button type="button" onClick={addMinorRow} className="h-9 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-500">
                + Add minor defect
              </button>
            }
          >
            {minorRows.length === 0 ? (
              <div className="text-sm text-slate-500">No minor defects added.</div>
            ) : (
              <div className="space-y-2">
                {minorRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-7">
                      <select
                        value={row.id}
                        onChange={(e) => updateRow(setMinorRows, idx, "id", e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/70"
                      >
                        <option value="">Choose defect...</option>
                        {minorOptions.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <input
  type="number"
  min="0"
  max={minorMode === "pct" ? "100" : undefined}
  step={minorMode === "pct" ? "0.1" : "1"}
  placeholder={minorMode === "pct" ? "%" : "Qty"}
  value={row.value ?? ""}
  onChange={(e) => updateRow(setMinorRows, idx, "value", e.target.value)}
  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/70"
/>
                    </div>

                    <div className="md:col-span-2 md:flex md:justify-end">
                      <button
                        type="button"
                        onClick={() => removeRow(setMinorRows, idx)}
                        className="h-10 w-full rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 md:w-auto"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title={`Major defects (${majorRows.length})`}
            right={
              <button type="button" onClick={addMajorRow} className="h-9 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-500">
                + Add major defect
              </button>
            }
          >
            {majorRows.length === 0 ? (
              <div className="text-sm text-slate-500">No major defects added.</div>
            ) : (
              <div className="space-y-2">
                {majorRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-7">
                      <select
                        value={row.id}
                        onChange={(e) => updateRow(setMajorRows, idx, "id", e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/70"
                      >
                        <option value="">Choose defect...</option>
                        {majorOptions.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                     <input
  type="number"
  min="0"
  max={majorMode === "pct" ? "100" : undefined}
  step={majorMode === "pct" ? "0.1" : "1"}
  placeholder={majorMode === "pct" ? "%" : "Qty"}
  value={row.value ?? ""}
  onChange={(e) => updateRow(setMinorRows, idx, "value", e.target.value)}
  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/70"
/>
                    </div>

                    <div className="md:col-span-2 md:flex md:justify-end">
                      <button
                        type="button"
                        onClick={() => removeRow(setMajorRows, idx)}
                        className="h-10 w-full rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 md:w-auto"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* SCORING (OLD look + OLD options) */}
      {activeTab === TAB.SCORING && (
        <div className="mx-4 md:mx-6 mt-6 rounded-2xl border shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Scoring</h3>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { field: "quality_score", options: QUALITY_OPTIONS },
              { field: "storage_score", options: STORAGE_OPTIONS },
            ].map(({ field, options }) => (
              <div key={field}>
                <label className="block text-gray-700 mb-1 capitalize">
                  {field.replace(/_/g, " ")}
                </label>

                <select
                  name={field}
                  value={form[field] ?? ""}
                  onChange={handleChange}
                  className="p-2 border rounded w-full"
                >
                  <option value="">Choose...</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
