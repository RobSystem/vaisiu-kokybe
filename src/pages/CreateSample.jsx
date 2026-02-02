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
  PHOTOS: "photos",
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

const DEFAULT_COLORS = [
  "Orange",
  "Light Green",
  "Green",
  "Yellow",
  "Red",
  "Brown",
  "Black",
  "White",
];

const PERCENT_OPTIONS = Array.from({ length: 101 }, (_, i) => String(i));
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

  const [files, setFiles] = useState([]);
const [photos, setPhotos] = useState([]);
const [previewUrl, setPreviewUrl] = useState(null);
const [uploadProgress, setUploadProgress] = useState(0);

  const [form, setForm] = useState({
    // pallet
    pallet_number: "",
    ggn_number: "",
    ggn_exp_date: "",
    grower_code: "",
    packing_code: "",
    variety: "",
    brand: "",
    box_amount: "",
fruits_amount: "",

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
  const [boxWeightExtra, setBoxWeightExtra] = useState([]); // 10 small inputs
const [fruitWeightExtra, setFruitWeightExtra] = useState([]); // 10 small inputs
const [allowedColorsExternal, setAllowedColorsExternal] = useState([]);
const [allowedColorsInternal, setAllowedColorsInternal] = useState([]);

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
.select("defect_id, input_mode, enabled, position, defect:defect_id ( id, name, severity )")
        .eq("report_type_id", reportTypeId)
        .eq("enabled", true)
        .order("position", { ascending: true });

      if (error) {
        setMinorOptions([]);
        setMajorOptions([]);
        return;
      }

     let minMode = "qty";
let majMode = "qty";

const minorsMap = new Map();
const majorsMap = new Map();

(data || []).forEach((row) => {
  const d = row.defect;
  if (!d?.id) return;

  if (d.severity === "minor") {
    if (row.input_mode) minMode = row.input_mode;
    if (!minorsMap.has(d.id)) minorsMap.set(d.id, { id: d.id, name: d.name });
  }

  if (d.severity === "major") {
    if (row.input_mode) majMode = row.input_mode;
    if (!majorsMap.has(d.id)) majorsMap.set(d.id, { id: d.id, name: d.name });
  }
});

setMinorOptions(Array.from(minorsMap.values()));
setMajorOptions(Array.from(majorsMap.values()));
setMinorMode(minMode);
setMajorMode(majMode);
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
      if (Array.isArray(data?.box_weight_extra) && data.box_weight_extra.length) {
  setBoxWeightExtra(toTen(data.box_weight_extra));
} else {
  setBoxWeightExtra([]);
}

if (Array.isArray(data?.fruit_weights_extra) && data.fruit_weights_extra.length) {
  setFruitWeightExtra(toTen(data.fruit_weights_extra));
} else {
  setFruitWeightExtra([]);
}

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
        .filter((r) => r.id)
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
  const toTen = (arr) => {
  const a = Array.isArray(arr) ? arr.map((v) => (v === null || v === undefined ? "" : String(v))) : [];
  while (a.length < 10) a.push("");
  return a.slice(0, 10);
};

const addBoxWeightExtra = () => setBoxWeightExtra((p) => (p.length ? p : Array(10).fill("")));
const removeBoxWeightExtra = () => setBoxWeightExtra([]);
const setBoxExtraAt = (i, val) => setBoxWeightExtra((p) => {
  const c = [...p];
  c[i] = val;
  return c;
});
const clearBoxExtraAt = (i) => setBoxExtraAt(i, "");

const addFruitWeightExtra = () => setFruitWeightExtra((p) => (p.length ? p : Array(10).fill("")));
const removeFruitWeightExtra = () => setFruitWeightExtra([]);
const setFruitExtraAt = (i, val) => setFruitWeightExtra((p) => {
  const c = [...p];
  c[i] = val;
  return c;
});
const clearFruitExtraAt = (i) => setFruitExtraAt(i, "");

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

  const fetchPhotos = async () => {
  if (!sampleId) return;

  const { data, error } = await supabase
    .from("sample_photos")
    .select("*")
    .eq("sample_id", sampleId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ Klaida gaunant nuotraukas iš DB:", error.message);
  } else {
    setPhotos(data || []);
  }
};

useEffect(() => {
  // kraunam kai sampleId atsiranda arba kai pereini į PHOTOS tab
  if (activeTab === TAB.PHOTOS) fetchPhotos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [sampleId, activeTab]);

const handleFileChange = (e) => setFiles([...e.target.files]);

const removeSelectedFile = (index) => {
  const newFiles = [...files];
  newFiles.splice(index, 1);
  setFiles(newFiles);
};

const handleUpload = async () => {
  if (!sampleId) {
    toast.error("Pirmiausia išsaugok sample (Save), tada galėsi įkelti nuotraukas.");
    return;
  }
  if (!files.length) return;

  let uploaded = 0;

  for (const file of files) {
    const filePath = `samples/${sampleId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Nepavyko įkelti: " + file.name);
      continue;
    }

    const publicUrl = supabase.storage
      .from("photos")
      .getPublicUrl(filePath).data.publicUrl;

    await supabase.from("sample_photos").insert({ sample_id: sampleId, url: publicUrl });

    uploaded++;
    setUploadProgress(Math.round((uploaded / files.length) * 100));
  }

  toast.success("Nuotraukos įkeltos!");
  setFiles([]);
  setUploadProgress(0);
  fetchPhotos();
};

const handleDeletePhoto = async (photoId, url) => {
  const path = url.split("/storage/v1/object/public/photos/")[1];

  const { error: deleteError } = await supabase.storage.from("photos").remove([path]);
  if (deleteError) {
    toast.error("Nepavyko ištrinti iš bucket");
    return;
  }

  const { error: dbError } = await supabase.from("sample_photos").delete().eq("id", photoId);
  if (dbError) toast.error("Nepavyko ištrinti iš DB");
  else fetchPhotos();
};

  /* =========================
     Save
     ========================= */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => (payload[k] = toDbNull(v)));
      payload.box_amount = safeNumberOrNull(form.box_amount);
payload.fruits_amount = safeNumberOrNull(form.fruits_amount);

const sizeNum = safeNumberOrNull(form.size);
const fruitsPerBox = payload.fruits_amount ?? sizeNum;
const totalFruits = payload.box_amount && fruitsPerBox ? payload.box_amount * fruitsPerBox : null;

      payload.external_coloration = externalColoration.length ? externalColoration : null;
      payload.internal_coloration = internalColoration.length ? internalColoration : null;
      payload.consistency = consistency;
      const bwExtra = (boxWeightExtra || []).map(safeNumberOrNull).filter((v) => v !== null);
const fwExtra = (fruitWeightExtra || []).map(safeNumberOrNull).filter((v) => v !== null);

payload.box_weight_extra = bwExtra.length ? bwExtra : null;
payload.fruit_weights_extra = fwExtra.length ? fwExtra : null;

      const normalizeRows = (rows, mode) =>
  rows
    .filter((r) => r && r.id)
    .map((r) => {
      const val =
        r.value === "" || r.value === null || r.value === undefined ? null : Number(r.value);

      // pct skaičiuojam tik kai mode=qty ir turim totalFruits
      const pct =
        mode === "qty" && totalFruits && val !== null && Number.isFinite(val)
          ? Number(((val / totalFruits) * 100).toFixed(2))
          : null;

      return {
        id: r.id,
        value: val,
        unit: mode,     // 'qty' | 'pct'
        pct,            // jei qty -> auto, jei pct -> null (arba galim palikti value kaip pct)
      };
    });

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

        const { data: inserted, error } = await supabase
  .from("samples")
  .insert({
    report_id: reportId,
    position: nextPosition,
    ...payload,
  })
  .select("id")
  .single();

if (error) throw error;

// pereinam į /create-sample/:reportId/:sampleId, kad Photo tab turėtų sampleId
navigate(`/create-sample/${reportId}/${inserted.id}`, { replace: true });
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
            <TabButton
  label="Photos"
  active={activeTab === TAB.PHOTOS}
  onClick={() => setActiveTab(TAB.PHOTOS)}
/>
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
              ["Box Amount", "box_amount"],
["Fruits Amount (per box)", "fruits_amount"],
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
                {showField("box_weight") && (
  <div className="md:col-span-2">
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={addBoxWeightExtra}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        + Add extra
      </button>

      {boxWeightExtra.length > 0 && (
        <button
          type="button"
          onClick={removeBoxWeightExtra}
          className="h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
        >
          Remove extras
        </button>
      )}
    </div>

    {boxWeightExtra.length > 0 && (
      <>
        <div className="my-3 border-t border-slate-200" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {boxWeightExtra.map((v, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="number"
                placeholder={`#${i + 1}`}
                value={v}
                onChange={(e) => setBoxExtraAt(i, e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-brand-400/70"
              />
              <button
                type="button"
                onClick={() => clearBoxExtraAt(i)}
                className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-500 hover:bg-slate-50"
                title="Clear"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
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
                {showField("fruit_weight") && (
  <div className="md:col-span-2">
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={addFruitWeightExtra}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        + Add extra
      </button>

      {fruitWeightExtra.length > 0 && (
        <button
          type="button"
          onClick={removeFruitWeightExtra}
          className="h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
        >
          Remove extras
        </button>
      )}
    </div>

    {fruitWeightExtra.length > 0 && (
      <>
        <div className="my-3 border-t border-slate-200" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {fruitWeightExtra.map((v, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="number"
                placeholder={`#${i + 1}`}
                value={v}
                onChange={(e) => setFruitExtraAt(i, e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-brand-400/70"
              />
              <button
                type="button"
                onClick={() => clearFruitExtraAt(i)}
                className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-500 hover:bg-slate-50"
                title="Clear"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
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
            <Card title="Coloration">
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    {/* External */}
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">External coloration</div>

        <button
          type="button"
          onClick={() => addColor("external")}
          className="h-9 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-500"
        >
          + Add External
        </button>
      </div>

      {externalColoration.length === 0 ? (
        <div className="text-sm text-slate-500">No entries.</div>
      ) : (
        <div className="space-y-2">
          {externalColoration.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
              <div className="md:col-span-7">
                <select
                  value={row.color ?? ""}
                  onChange={(e) => updateColor("external", idx, "color", e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/70"
                >
                  <option value="">Choose color...</option>
                  {(allowedColorsExternal?.length ? allowedColorsExternal : DEFAULT_COLORS).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={row.percent ?? ""}
                  onChange={(e) => updateColor("external", idx, "percent", e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/70"
                >
                  <option value="">%</option>
                  {PERCENT_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 md:flex md:justify-end">
                <button
                  type="button"
                  onClick={() => removeColor("external", idx)}
                  className="h-10 w-full rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 md:w-auto"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Internal */}
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">Internal coloration</div>

        <button
          type="button"
          onClick={() => addColor("internal")}
          className="h-9 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-500"
        >
          + Add Internal
        </button>
      </div>

      {internalColoration.length === 0 ? (
        <div className="text-sm text-slate-500">No entries.</div>
      ) : (
        <div className="space-y-2">
          {internalColoration.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
              <div className="md:col-span-7">
                <select
                  value={row.color ?? ""}
                  onChange={(e) => updateColor("internal", idx, "color", e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/70"
                >
                  <option value="">Choose color...</option>
                  {(allowedColorsInternal?.length ? allowedColorsInternal : DEFAULT_COLORS).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={row.percent ?? ""}
                  onChange={(e) => updateColor("internal", idx, "percent", e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/70"
                >
                  <option value="">%</option>
                  {PERCENT_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 md:flex md:justify-end">
                <button
                  type="button"
                  onClick={() => removeColor("internal", idx)}
                  className="h-10 w-full rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 md:w-auto"
                >
                  Remove
                </button>
              </div>
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
                      {PERCENT_OPTIONS.map((p) => (
  <option key={p} value={`${p}%`}>
    {p}%
  </option>
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
                      {minorMode === "pct" ? (
  <select
    value={row.value ?? ""}
    onChange={(e) => updateRow(setMinorRows, idx, "value", e.target.value)}
    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/70"
  >
    <option value="">%</option>
    {PERCENT_OPTIONS.map((p) => (
      <option key={p} value={p}>
        {p}%
      </option>
    ))}
  </select>
) : (
  <input
    type="number"
    min="0"
    step="1"
    placeholder="Qty"
    value={row.value ?? ""}
    onChange={(e) => updateRow(setMinorRows, idx, "value", e.target.value)}
    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/70"
  />
)}
{(minorMode === "qty" && totalFruits && row.value) && (
  <div className="mt-1 text-xs text-slate-500">
    {(Number(row.value) / totalFruits * 100).toFixed(2)}%
  </div>
)}
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
                     {majorMode === "pct" ? (
  <select
    value={row.value ?? ""}
    onChange={(e) => updateRow(setMajorRows, idx, "value", e.target.value)}
    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/70"
  >
    <option value="">%</option>
    {PERCENT_OPTIONS.map((p) => (
      <option key={p} value={p}>
        {p}%
      </option>
    ))}
  </select>
) : (
  <input
    type="number"
    min="0"
    step="1"
    placeholder="Qty"
    value={row.value ?? ""}
    onChange={(e) => updateRow(setMajorRows, idx, "value", e.target.value)}
    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/70"
  />
)}
{(majorMode === "qty" && totalFruits && row.value) && (
  <div className="mt-1 text-xs text-slate-500">
    {(Number(row.value) / totalFruits * 100).toFixed(2)}%
  </div>
)}
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
      {/* PHOTOS */}
{activeTab === TAB.PHOTOS && (
  <Card
    title="Photos"
    right={
      !sampleId ? (
        <span className="text-xs text-slate-500">Save sample first to enable uploads</span>
      ) : null
    }
  >
    {!sampleId ? (
      <div className="text-sm text-slate-600">
        Pirmiausia paspausk <b>Save</b>, kad sistema sukurtų sample ID. Tada galėsi įkelti nuotraukas.
      </div>
    ) : (
      <>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="mb-4"
        />

        {files.length > 0 && (
          <ul className="mb-4 text-slate-700 space-y-2">
            {files.map((file, index) => (
              <li
                key={index}
                className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-xl"
              >
                <span className="text-sm">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeSelectedFile(index)}
                  className="h-8 rounded-lg bg-red-500 text-white text-xs px-3 hover:bg-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {uploadProgress > 0 && (
          <div className="w-full bg-slate-200 rounded h-2 mb-4">
            <div
              className="bg-green-500 h-2 rounded"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={handleUpload}
            className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Upload Photos
          </button>

          <button
            type="button"
            onClick={fetchPhotos}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <h3 className="text-sm font-semibold mb-2">Uploaded Photos</h3>
        {photos.length === 0 && <p className="text-slate-500 text-sm">Nuotraukų kol kas nėra.</p>}

        <div className="flex flex-wrap gap-4 mt-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative">
              <img
                src={photo.url}
                alt="photo"
                className="w-40 h-40 object-cover rounded-xl border border-slate-200 cursor-pointer"
                onClick={() => setPreviewUrl(photo.url)}
              />
              <button
                type="button"
                onClick={() => handleDeletePhoto(photo.id, photo.url)}
                className="absolute top-2 right-2 bg-black/60 text-white text-xs rounded-full w-7 h-7 flex items-center justify-center"
                title="Ištrinti"
              >
                ❌
              </button>
            </div>
          ))}
        </div>

        {previewUrl && (
          <div
            className="fixed inset-0 bg-black/80 flex justify-center items-center z-50"
            onClick={() => setPreviewUrl(null)}
          >
            <img src={previewUrl} alt="preview" className="max-w-[90%] max-h-[90%] rounded-xl" />
          </div>
        )}
      </>
    )}
  </Card>
)}

    </div>
  );
}
