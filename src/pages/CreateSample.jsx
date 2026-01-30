import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

function cx(...cls) {
  return cls.filter(Boolean).join(" ");
}

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

const toNullIfEmpty = (v) => {
  if (v === "" || v === "Pasirinkti") return null;
  return v;
};

const trimArray = (arr) =>
  Array.isArray(arr)
    ? arr
        .map((v) => (typeof v === "string" ? v.trim() : v))
        .filter((v) => v !== "")
    : [];
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={[
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none",
        "focus:border-brand-400/70",
        props.className || "",
      ].join(" ")}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={[
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none",
        "focus:border-brand-400/70",
        props.className || "",
      ].join(" ")}
    />
  );
}
export default function CreateSample() {
  const navigate = useNavigate();
  const { reportId, sampleId } = useParams();

  // ===== Report type mechanism state =====
  const [reportTypeId, setReportTypeId] = useState(null);
  const [fieldRules, setFieldRules] = useState({}); // field_key -> { enabled, required }
  const [minorOptions, setMinorOptions] = useState([]); // [{id,name}]
  const [majorOptions, setMajorOptions] = useState([]); // [{id,name}]

  // ===== UI tabs =====
  const [activeTab, setActiveTab] = useState(TAB.PALLET);
  const [measureTab, setMeasureTab] = useState(MEASURE_TAB.MEASUREMENTS);

  // ===== Defects selected =====
  const [minorSelected, setMinorSelected] = useState([]); // array of defect ids
  const [majorSelected, setMajorSelected] = useState([]);

  const [minorSearch, setMinorSearch] = useState("");
  const [majorSearch, setMajorSearch] = useState("");

  // ===== Form state =====
  const [form, setForm] = useState({
    pallet_number: "",
    ggn_number: "",
    ggn_exp_date: "",
    grower_code: "",
    packing_code: "",
    variety: "",
    brand: "",

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

    // NEW measurements (tu pridėjaiIB)
    punnet_weight_min: "",
    punnet_weight_max: "",
    bag_weight_min: "",
    bag_weight_max: "",
    calibration_min: "",
    calibration_max: "",
    rhizome_weight_min: "",
    rhizome_weight_max: "",

    // legacy text fields (paliekam, kad niekas nesulūžtų)
    minor_defects: "",
    major_defects: "",

    quality_score: "",
    storage_score: "",

    created_at: null,
  });

  const [saving, setSaving] = useState(false);

  // extras (paliekam tavo logiką)
  const [fruitWeightsExtra, setFruitWeightsExtra] = useState([]);
  const [boxWeightExtra, setBoxWeightExtra] = useState([]);
  const [pressuresExtra, setPressuresExtra] = useState([]);
  const [brixExtra, setBrixExtra] = useState([]);
  const [diameterExtra, setDiameterExtra] = useState([]);

  // coloration
  const [externalColoration, setExternalColoration] = useState([]); // [{color, percent}]
  const [internalColoration, setInternalColoration] = useState([]);

  // consistency
  const [consistency, setConsistency] = useState({ hard: "", sensitive: "", soft: "" });

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleConsistencyChange = (type, value) =>
    setConsistency((p) => ({ ...p, [type]: value }));

  // ====== Load existing sample if edit ======
  useEffect(() => {
    const fetchSample = async () => {
      if (!sampleId) return;

      const { data, error } = await supabase
        .from("samples")
        .select("*")
        .eq("id", sampleId)
        .single();

      if (error) {
        toast.error("Failed to load sample");
        return;
      }

      if (data) {
        setForm((prev) => ({ ...prev, ...data }));
        setFruitWeightsExtra(Array.isArray(data.fruit_weights_extra) ? data.fruit_weights_extra : []);
        setBoxWeightExtra(Array.isArray(data.box_weight_extra) ? data.box_weight_extra : []);
        setPressuresExtra(Array.isArray(data.pressures_extra) ? data.pressures_extra : []);
        setBrixExtra(Array.isArray(data.brix_extra) ? data.brix_extra : []);
        setDiameterExtra(Array.isArray(data.diameter_extra) ? data.diameter_extra : []);
        setExternalColoration(Array.isArray(data.external_coloration) ? data.external_coloration : []);
        setInternalColoration(Array.isArray(data.internal_coloration) ? data.internal_coloration : []);
        setConsistency(data.consistency || { hard: "", sensitive: "", soft: "" });

        // NEW: selected defects (jsonb arrays of ids)
        setMinorSelected(Array.isArray(data.minor_defects_selected) ? data.minor_defects_selected : []);
        setMajorSelected(Array.isArray(data.major_defects_selected) ? data.major_defects_selected : []);
      }
    };

    fetchSample();
  }, [sampleId]);

  // ====== Load report type id ======
  useEffect(() => {
    const fetchReportType = async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("report_type_id")
        .eq("id", reportId)
        .single();

      if (error) {
        console.warn("Failed to load report:", error);
        return;
      }

      setReportTypeId(data?.report_type_id || null);
    };

    if (reportId) fetchReportType();
  }, [reportId]);

  // ====== Load report_type_fields rules ======
  useEffect(() => {
    const fetchRules = async () => {
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
        console.warn("Failed to load report_type_fields:", error);
        setFieldRules({});
        return;
      }

      const map = {};
      (data || []).forEach((r) => {
        map[r.field_key] = { enabled: true, required: !!r.required };
      });
      setFieldRules(map);
    };

    fetchRules();
  }, [reportTypeId]);

  const hasRules = useMemo(() => Object.keys(fieldRules).length > 0, [fieldRules]);
  const showField = (key) => (hasRules ? !!fieldRules[key] : true);

  // ====== Load allowed defects per report type ======
  useEffect(() => {
    const fetchDefects = async () => {
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
        console.warn("Failed to load report_type_defects:", error);
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

      setMinorOptions(minors);
      setMajorOptions(majors);
    };

    fetchDefects();
  }, [reportTypeId]);

  const defectNameById = useMemo(() => {
    const m = new Map();
    [...minorOptions, ...majorOptions].forEach((d) => m.set(d.id, d.name));
    return m;
  }, [minorOptions, majorOptions]);

  const toggleSelected = (id, setter) => {
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filteredMinorOptions = useMemo(() => {
    const q = minorSearch.trim().toLowerCase();
    if (!q) return minorOptions;
    return minorOptions.filter((d) => d.name.toLowerCase().includes(q));
  }, [minorOptions, minorSearch]);

  const filteredMajorOptions = useMemo(() => {
    const q = majorSearch.trim().toLowerCase();
    if (!q) return majorOptions;
    return majorOptions.filter((d) => d.name.toLowerCase().includes(q));
  }, [majorOptions, majorSearch]);

  // ====== Coloration helpers ======
  const addColoration = (type) => {
    const setter = type === "external" ? setExternalColoration : setInternalColoration;
    setter((prev) => [...prev, { color: "", percent: "" }]);
  };

  const updateColoration = (type, index, field, value) => {
    const setter = type === "external" ? setExternalColoration : setInternalColoration;
    setter((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeColoration = (type, index) => {
    const setter = type === "external" ? setExternalColoration : setInternalColoration;
    setter((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  // ====== SAVE ======
  const handleSave = async () => {
    setSaving(true);

    const cleanedForm = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, toNullIfEmpty(v)])
    );

    // build legacy strings (kad senos vietos nesulūžtų)
    const minorNames = minorSelected.map((id) => defectNameById.get(id)).filter(Boolean);
    const majorNames = majorSelected.map((id) => defectNameById.get(id)).filter(Boolean);

    const updatePayload = {
      ...cleanedForm,

      // extras
      fruit_weights_extra: trimArray(fruitWeightsExtra).length ? trimArray(fruitWeightsExtra) : null,
      box_weight_extra: trimArray(boxWeightExtra).length ? trimArray(boxWeightExtra) : null,
      pressures_extra: trimArray(pressuresExtra).length ? trimArray(pressuresExtra) : null,
      brix_extra: trimArray(brixExtra).length ? trimArray(brixExtra) : null,
      diameter_extra: trimArray(diameterExtra).length ? trimArray(diameterExtra) : null,

      // coloration + consistency
      external_coloration: externalColoration.length ? externalColoration : null,
      internal_coloration: internalColoration.length ? internalColoration : null,
      consistency,

      // NEW: selected defects
      minor_defects_selected: minorSelected.length ? minorSelected : null,
      major_defects_selected: majorSelected.length ? majorSelected : null,

      // legacy text fields (optional)
      minor_defects: minorNames.length ? minorNames.join(", ") : cleanedForm.minor_defects,
      major_defects: majorNames.length ? majorNames.join(", ") : cleanedForm.major_defects,
    };

    try {
      if (sampleId) {
        const { error } = await supabase.from("samples").update(updatePayload).eq("id", sampleId);
        if (error) throw error;
      } else {
        const { data: existingSamples, error: posErr } = await supabase
          .from("samples")
          .select("position")
          .eq("report_id", reportId)
          .order("position", { ascending: false })
          .limit(1);

        if (posErr) throw posErr;

        const nextPosition = (existingSamples?.[0]?.position || 0) + 1;

        const { error: insErr } = await supabase.from("samples").insert({
          report_id: reportId,
          position: nextPosition,
          ...updatePayload,
        });

        if (insErr) throw insErr;
      }

      toast.success("Saved successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ====== UI helpers ======
  const TabButton = ({ id, label }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={cx(
        "relative px-4 py-2 text-sm font-semibold transition rounded-xl",
        activeTab === id ? "text-slate-900" : "text-slate-600 hover:text-slate-900"
      )}
    >
      {label}
      {activeTab === id && (
        <span className="absolute inset-x-3 -bottom-1 h-[2px] rounded-full bg-brand-500" />
      )}
    </button>
  );

  const Card = ({ title, children, className }) => (
    <div className={cx("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      {title && (
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  );

  const Field = ({ label, children }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );

  const Input = (props) => (
    <input
      {...props}
      className={cx(
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none",
        "focus:border-brand-400/70",
        props.className
      )}
    />
  );

  const Select = (props) => (
    <select
      {...props}
      className={cx(
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none",
        "focus:border-brand-400/70",
        props.className
      )}
    />
  );

  return (
    <div className="w-full px-6 py-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            CREATE SAMPLE
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {sampleId ? "Edit Sample" : "New Sample"}
          </h2>
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

      {/* Tabs bar */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <TabButton id={TAB.PALLET} label="Pallet information" />
          <TabButton id={TAB.MEASURE} label="Measurements" />
          <TabButton id={TAB.DEFECTS} label="Defects" />
          <TabButton id={TAB.SCORING} label="Scoring" />
        </div>
      </div>

      {/* Content */}
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
                <Input name={key} value={form[key] || ""} onChange={handleChange} />
              </Field>
            ))}
          </div>
        </Card>
      )}

      {activeTab === TAB.MEASURE && (
        <div className="space-y-4">
          {/* sub-tabs */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-2 flex flex-wrap gap-2">
            {[
              [MEASURE_TAB.MEASUREMENTS, "Measurements"],
              [MEASURE_TAB.COLORATION, "Coloration"],
              [MEASURE_TAB.CONSISTENCY, "Consistency"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMeasureTab(id)}
                className={cx(
                  "rounded-xl px-4 py-2 text-sm font-semibold transition",
                  measureTab === id
                    ? "bg-brand-50 text-brand-800 border border-brand-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {measureTab === MEASURE_TAB.MEASUREMENTS && (
            <Card title="Measurements">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {showField("packing_type") && (
                  <Field label="Packing Type">
                    <Input name="packing_type" value={form.packing_type || ""} onChange={handleChange} />
                  </Field>
                )}

                {showField("size") && (
                  <Field label="Size">
                    <Input name="size" value={form.size || ""} onChange={handleChange} />
                  </Field>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {showField("box_weight") && (
                  <>
                    <Field label="Box Weight Min">
                      <Input name="box_weight_min" value={form.box_weight_min || ""} onChange={handleChange} />
                    </Field>
                    <Field label="Box Weight Max">
                      <Input name="box_weight_max" value={form.box_weight_max || ""} onChange={handleChange} />
                    </Field>

                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() => setBoxWeightExtra(Array(10).fill(""))}
                        className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800 border border-brand-200 hover:bg-brand-100"
                      >
                        Add extra
                      </button>

                      {Array.isArray(boxWeightExtra) && boxWeightExtra.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {boxWeightExtra.map((val, i) => (
                            <Input
                              key={i}
                              value={val}
                              onChange={(e) => {
                                const updated = [...boxWeightExtra];
                                updated[i] = e.target.value;
                                setBoxWeightExtra(updated);
                              }}
                              className="w-28"
                              placeholder={`#${i + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {showField("fruit_weight") && (
                  <>
                    <Field label="Fruit Weight Min">
                      <Input name="fruit_weight_min" value={form.fruit_weight_min || ""} onChange={handleChange} />
                    </Field>
                    <Field label="Fruit Weight Max">
                      <Input name="fruit_weight_max" value={form.fruit_weight_max || ""} onChange={handleChange} />
                    </Field>

                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() => setFruitWeightsExtra(Array(10).fill(""))}
                        className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800 border border-brand-200 hover:bg-brand-100"
                      >
                        Add extra
                      </button>

                      {Array.isArray(fruitWeightsExtra) && fruitWeightsExtra.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {fruitWeightsExtra.map((val, i) => (
                            <Input
                              key={i}
                              value={val}
                              onChange={(e) => {
                                const updated = [...fruitWeightsExtra];
                                updated[i] = e.target.value;
                                setFruitWeightsExtra(updated);
                              }}
                              className="w-28"
                              placeholder={`#${i + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {showField("pressures") && (
                  <>
                    <Field label="Pressures Min">
                      <Input name="pressures_min" value={form.pressures_min || ""} onChange={handleChange} />
                    </Field>
                    <Field label="Pressures Max">
                      <Input name="pressures_max" value={form.pressures_max || ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {showField("brix") && (
                  <>
                    <Field label="Brix Min">
                      <Input name="brix_min" value={form.brix_min || ""} onChange={handleChange} />
                    </Field>
                    <Field label="Brix Max">
                      <Input name="brix_max" value={form.brix_max || ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {showField("fruit_diameter") && (
                  <>
                    <Field label="Fruit Diameter Min">
                      <Input name="fruit_diameter_min" value={form.fruit_diameter_min || ""} onChange={handleChange} />
                    </Field>
                    <Field label="Fruit Diameter Max">
                      <Input name="fruit_diameter_max" value={form.fruit_diameter_max || ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {/* NEW fields */}
                {showField("punnet_weight") && (
                  <>
                    <Field label="Punnet Weight Min">
                      <Input name="punnet_weight_min" value={form.punnet_weight_min || ""} onChange={handleChange} />
                    </Field>
                    <Field label="Punnet Weight Max">
                      <Input name="punnet_weight_max" value={form.punnet_weight_max || ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {showField("bag_weight") && (
                  <>
                    <Field label="Bag Weight Min">
                      <Input name="bag_weight_min" value={form.bag_weight_min || ""} onChange={handleChange} />
                    </Field>
                    <Field label="Bag Weight Max">
                      <Input name="bag_weight_max" value={form.bag_weight_max || ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {showField("calibration") && (
                  <>
                    <Field label="Calibration Min">
                      <Input name="calibration_min" value={form.calibration_min || ""} onChange={handleChange} />
                    </Field>
                    <Field label="Calibration Max">
                      <Input name="calibration_max" value={form.calibration_max || ""} onChange={handleChange} />
                    </Field>
                  </>
                )}

                {showField("rhizome_weight") && (
                  <>
                    <Field label="Rhizome Weight Min">
                      <Input name="rhizome_weight_min" value={form.rhizome_weight_min || ""} onChange={handleChange} />
                    </Field>
                    <Field label="Rhizome Weight Max">
                      <Input name="rhizome_weight_max" value={form.rhizome_weight_max || ""} onChange={handleChange} />
                    </Field>
                  </>
                )}
              </div>
            </Card>
          )}

          {measureTab === MEASURE_TAB.COLORATION && (
            <Card title="Coloration">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">External coloration</h4>
                    <button
                      type="button"
                      onClick={() => addColoration("external")}
                      className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800 border border-brand-200 hover:bg-brand-100"
                    >
                      Add
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {externalColoration.length === 0 ? (
                      <div className="text-sm text-slate-500">No entries.</div>
                    ) : (
                      externalColoration.map((row, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            placeholder="Color"
                            value={row.color || ""}
                            onChange={(e) => updateColoration("external", idx, "color", e.target.value)}
                          />
                          <Input
                            placeholder="%"
                            className="w-28"
                            value={row.percent || ""}
                            onChange={(e) => updateColoration("external", idx, "percent", e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeColoration("external", idx)}
                            className="h-10 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Internal coloration</h4>
                    <button
                      type="button"
                      onClick={() => addColoration("internal")}
                      className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800 border border-brand-200 hover:bg-brand-100"
                    >
                      Add
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {internalColoration.length === 0 ? (
                      <div className="text-sm text-slate-500">No entries.</div>
                    ) : (
                      internalColoration.map((row, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            placeholder="Color"
                            value={row.color || ""}
                            onChange={(e) => updateColoration("internal", idx, "color", e.target.value)}
                          />
                          <Input
                            placeholder="%"
                            className="w-28"
                            value={row.percent || ""}
                            onChange={(e) => updateColoration("internal", idx, "percent", e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeColoration("internal", idx)}
                            className="h-10 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {measureTab === MEASURE_TAB.CONSISTENCY && (
            <Card title="Consistency">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {["hard", "sensitive", "soft"].map((type) => (
                  <Field key={type} label={type.toUpperCase()}>
                    <Select
                      value={consistency[type] || ""}
                      onChange={(e) => handleConsistencyChange(type, e.target.value)}
                    >
                      <option value="">Choose...</option>
                      {["0%", "5%", "10%", "15%", "20%", "25%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"].map((p) => (
                        <option key={p} value={p}>
                          {p}
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

      {activeTab === TAB.DEFECTS && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title={`Minor defects (${minorSelected.length})`}>
            <div className="mb-3">
              <Input
                placeholder="Search minor defects..."
                value={minorSearch}
                onChange={(e) => setMinorSearch(e.target.value)}
              />
            </div>

            <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
              {filteredMinorOptions.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No minor defects for this report type.</div>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {filteredMinorOptions.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 w-10">
                          <input
                            type="checkbox"
                            checked={minorSelected.includes(d.id)}
                            onChange={() => toggleSelected(d.id, setMinorSelected)}
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-900">{d.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          <Card title={`Major defects (${majorSelected.length})`}>
            <div className="mb-3">
              <Input
                placeholder="Search major defects..."
                value={majorSearch}
                onChange={(e) => setMajorSearch(e.target.value)}
              />
            </div>

            <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
              {filteredMajorOptions.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No major defects for this report type.</div>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {filteredMajorOptions.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 w-10">
                          <input
                            type="checkbox"
                            checked={majorSelected.includes(d.id)}
                            onChange={() => toggleSelected(d.id, setMajorSelected)}
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-900">{d.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === TAB.SCORING && (
        <Card title="Scoring">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Quality Score">
              <Select name="quality_score" value={form.quality_score || ""} onChange={handleChange}>
                <option value="">Choose...</option>
                {["A", "B", "C", "D"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Storage Score">
              <Select name="storage_score" value={form.storage_score || ""} onChange={handleChange}>
                <option value="">Choose...</option>
                {["A", "B", "C", "D"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>
      )}
    </div>
  );
}
