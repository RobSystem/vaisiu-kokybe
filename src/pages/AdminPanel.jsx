import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const FIELD_KEYS = [
  // Measurements tab
  { key: "packing_type", label: "Packing Type" },
  { key: "size", label: "Size" },

  { key: "box_weight", label: "Box Weight (min/max + extras)" },
  { key: "fruit_weight", label: "Fruit Weight (min/max + extras)" },
  { key: "pressures", label: "Pressures (min/max)" },
  { key: "brix", label: "Brix (min/max)" },
  { key: "fruit_diameter", label: "Fruit Diameter (min/max)" },

  // New fields
  { key: "punnet_weight", label: "Punnet Weight (min/max)" },
  { key: "bag_weight", label: "Bag Weight (min/max)" },
  { key: "calibration", label: "Calibration (min/max)" },
  { key: "rhizome_weight", label: "Rhizome Weight (min/max)" },
];

function AdminPanel() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);

  // ===== Report Types state =====
  const [reportTypes, setReportTypes] = useState([]);
  const [selectedReportTypeId, setSelectedReportTypeId] = useState("");

  const [newTypeName, setNewTypeName] = useState("");
  const [cloneFromBasic, setCloneFromBasic] = useState(true);

  const [fieldsEnabled, setFieldsEnabled] = useState(() => {
    const init = {};
    FIELD_KEYS.forEach((f) => (init[f.key] = true)); // BASIC style default: all ON
    return init;
  });

  const [defectsCatalog, setDefectsCatalog] = useState([]);
  const minorCatalog = useMemo(
    () => defectsCatalog.filter((d) => d.severity === "minor"),
    [defectsCatalog]
  );
  const majorCatalog = useMemo(
    () => defectsCatalog.filter((d) => d.severity === "major"),
    [defectsCatalog]
  );

  const [minorEnabled, setMinorEnabled] = useState({}); // defect_id -> bool
  const [majorEnabled, setMajorEnabled] = useState({}); // defect_id -> bool

  const [minorInputMode, setMinorInputMode] = useState("qty"); // qty | pct
  const [majorInputMode, setMajorInputMode] = useState("qty");

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // ===== Auth check =====
  useEffect(() => {
    const checkRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      // tavo dabartinis metodas
      if (user?.user_metadata?.role !== "admin") {
        navigate("/");
      } else {
        setRole("admin");
      }
    };

    checkRole();
  }, [navigate]);

  // ===== Load report types =====
  const loadReportTypes = async () => {
    const { data, error } = await supabase
      .from("report_types")
      .select("id, name")
      .order("name", { ascending: true });

    if (!error) {
      setReportTypes(data || []);
      // jei dar nepasirinkta – parink pirmą
      if (!selectedReportTypeId && data?.length) {
        setSelectedReportTypeId(data[0].id);
      }
    }
  };

  // ===== Load defects catalog =====
  const loadDefectsCatalog = async () => {
    const { data, error } = await supabase
      .from("defects_catalog")
      .select("id, name, severity")
      .order("severity", { ascending: true })
      .order("name", { ascending: true });

    if (!error) setDefectsCatalog(data || []);
  };

  useEffect(() => {
    if (role === "admin") {
      loadReportTypes();
      loadDefectsCatalog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // ===== Load selected report type config =====
  useEffect(() => {
    const loadConfig = async () => {
      if (!selectedReportTypeId) return;

      setLoadingConfig(true);

      // 1) fields
      const { data: fieldsData, error: fieldsErr } = await supabase
        .from("report_type_fields")
        .select("field_key, enabled")
        .eq("report_type_id", selectedReportTypeId);

      // default: all false, then enable those from DB
      const nextFields = {};
      FIELD_KEYS.forEach((f) => (nextFields[f.key] = false));

      if (!fieldsErr && fieldsData?.length) {
        fieldsData.forEach((r) => {
          if (r.field_key in nextFields) nextFields[r.field_key] = !!r.enabled;
        });
      } else {
        // jei nėra įrašų – elgiamės kaip BASIC (all on)
        FIELD_KEYS.forEach((f) => (nextFields[f.key] = true));
      }
      setFieldsEnabled(nextFields);

      // 2) defects mapping
      const { data: defectsData, error: defErr } = await supabase
        .from("report_type_defects")
        .select("defect_id, enabled, input_mode, defect:defect_id ( severity )")
        .eq("report_type_id", selectedReportTypeId);

      const minMap = {};
      const majMap = {};

      // default – išjungta visiems
      (minorCatalog || []).forEach((d) => (minMap[d.id] = false));
      (majorCatalog || []).forEach((d) => (majMap[d.id] = false));

      let minMode = "qty";
      let majMode = "qty";

      if (!defErr && defectsData?.length) {
        defectsData.forEach((row) => {
          const sev = row.defect?.severity;
          if (sev === "minor") {
            minMap[row.defect_id] = !!row.enabled;
            if (row.input_mode) minMode = row.input_mode;
          }
          if (sev === "major") {
            majMap[row.defect_id] = !!row.enabled;
            if (row.input_mode) majMode = row.input_mode;
          }
        });
      } else {
        // jei nėra mapping – BASIC style: viskas on
        (minorCatalog || []).forEach((d) => (minMap[d.id] = true));
        (majorCatalog || []).forEach((d) => (majMap[d.id] = true));
      }

      setMinorEnabled(minMap);
      setMajorEnabled(majMap);
      setMinorInputMode(minMode);
      setMajorInputMode(majMode);

      setLoadingConfig(false);
    };

    // katalogas užsikrauna async – palaukiam, kad būtų listai
    if (selectedReportTypeId && defectsCatalog.length >= 0) {
      loadConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReportTypeId, defectsCatalog.length]);

  // ===== Create new report type =====
  const handleCreateReportType = async () => {
    const name = newTypeName.trim();
    if (!name) return alert("Enter report type name.");

    // 1) create report type
    const { data: created, error } = await supabase
      .from("report_types")
      .insert({ name })
      .select("id, name")
      .single();

    if (error) {
      console.error(error);
      return alert("Failed to create report type.");
    }

    // 2) optionally clone from BASIC
    if (cloneFromBasic) {
      const { data: basic, error: basicErr } = await supabase
        .from("report_types")
        .select("id")
        .eq("name", "BASIC")
        .single();

      if (!basicErr && basic?.id) {
        // clone fields
        const { data: basicFields } = await supabase
          .from("report_type_fields")
          .select("field_key, enabled, required, position")
          .eq("report_type_id", basic.id);

        if (basicFields?.length) {
          const rows = basicFields.map((r) => ({
            report_type_id: created.id,
            field_key: r.field_key,
            enabled: r.enabled,
            required: r.required,
            position: r.position ?? 0,
          }));
          await supabase.from("report_type_fields").insert(rows);
        }

        // clone defects
        const { data: basicDefects } = await supabase
          .from("report_type_defects")
          .select("defect_id, enabled, required, position, input_mode")
          .eq("report_type_id", basic.id);

        if (basicDefects?.length) {
          const rows = basicDefects.map((r) => ({
            report_type_id: created.id,
            defect_id: r.defect_id,
            enabled: r.enabled,
            required: r.required,
            position: r.position ?? 0,
            input_mode: r.input_mode || "qty",
          }));
          await supabase.from("report_type_defects").insert(rows);
        }
      }
    }

    setNewTypeName("");
    await loadReportTypes();
    setSelectedReportTypeId(created.id);
  };

  // ===== Save config =====
  const handleSaveConfig = async () => {
    if (!selectedReportTypeId) return;

    setSavingConfig(true);
    try {
      // 1) report_type_fields: replace strategy (delete + insert)
      await supabase.from("report_type_fields").delete().eq("report_type_id", selectedReportTypeId);

      const enabledFieldKeys = FIELD_KEYS.filter((f) => fieldsEnabled[f.key]).map((f) => f.key);

      if (enabledFieldKeys.length) {
        const rows = enabledFieldKeys.map((k, idx) => ({
          report_type_id: selectedReportTypeId,
          field_key: k,
          enabled: true,
          required: false,
          position: idx,
        }));
        const { error: insErr } = await supabase.from("report_type_fields").insert(rows);
        if (insErr) throw insErr;
      }

      // 2) report_type_defects: replace strategy
      await supabase.from("report_type_defects").delete().eq("report_type_id", selectedReportTypeId);

      const minorRows = minorCatalog
        .filter((d) => minorEnabled[d.id])
        .map((d, idx) => ({
          report_type_id: selectedReportTypeId,
          defect_id: d.id,
          enabled: true,
          required: false,
          position: idx,
          input_mode: minorInputMode,
        }));

      const majorRows = majorCatalog
        .filter((d) => majorEnabled[d.id])
        .map((d, idx) => ({
          report_type_id: selectedReportTypeId,
          defect_id: d.id,
          enabled: true,
          required: false,
          position: idx,
          input_mode: majorInputMode,
        }));

      const all = [...minorRows, ...majorRows];
      if (all.length) {
        const { error: defInsErr } = await supabase.from("report_type_defects").insert(all);
        if (defInsErr) throw defInsErr;
      }

      alert("Saved!");
    } catch (e) {
      console.error(e);
      alert("Save failed. Check console.");
    } finally {
      setSavingConfig(false);
    }
  };

  if (role !== "admin") return null;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-8">Admin Panel</h1>

      {/* Existing buttons */}
      <div className="flex gap-4 mb-10">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded"
          onClick={() => navigate("/admin/clients")}
        >
          Add Client
        </button>

        <button
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded"
          onClick={() => navigate("/admin/add-user")}
        >
          Add User
        </button>
      </div>

      {/* Report Types Manager */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Report Types Manager</h2>
            <p className="text-sm text-slate-600">
              Create report types, enable fields, choose allowed defects, and set Qty/% mode.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                New report type name
              </label>
              <input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className="h-10 w-64 rounded-xl border border-slate-200 px-3 text-sm outline-none"
                placeholder="PINEAPPLE"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 mb-1 sm:mb-0">
              <input
                type="checkbox"
                checked={cloneFromBasic}
                onChange={(e) => setCloneFromBasic(e.target.checked)}
              />
              Clone from BASIC
            </label>

            <button
              className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={handleCreateReportType}
            >
              Create
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Select report type */}
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Select Report Type
            </label>
            <select
              value={selectedReportTypeId}
              onChange={(e) => setSelectedReportTypeId(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
            >
              {reportTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>

            {loadingConfig && (
              <div className="mt-3 text-sm text-slate-500">Loading config...</div>
            )}

            <button
              disabled={savingConfig || loadingConfig}
              onClick={handleSaveConfig}
              className="mt-4 h-10 w-full rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
            >
              {savingConfig ? "Saving..." : "Save configuration"}
            </button>
          </div>

          {/* Fields */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Measurements fields</h3>
            <div className="space-y-2">
              {FIELD_KEYS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!fieldsEnabled[f.key]}
                    onChange={(e) =>
                      setFieldsEnabled((p) => ({ ...p, [f.key]: e.target.checked }))
                    }
                  />
                  {f.label}
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              These control what appears in CreateSample → Measurements.
            </p>
          </div>

          {/* Defects */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">Defects</h3>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">Minor defects input mode</div>
                <select
                  value={minorInputMode}
                  onChange={(e) => setMinorInputMode(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
                >
                  <option value="qty">Qty</option>
                  <option value="pct">%</option>
                </select>
              </div>

              <div className="mt-2 max-h-40 overflow-auto pr-2">
                {minorCatalog.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm text-slate-700 py-1">
                    <input
                      type="checkbox"
                      checked={!!minorEnabled[d.id]}
                      onChange={(e) => setMinorEnabled((p) => ({ ...p, [d.id]: e.target.checked }))}
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">Major defects input mode</div>
                <select
                  value={majorInputMode}
                  onChange={(e) => setMajorInputMode(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
                >
                  <option value="qty">Qty</option>
                  <option value="pct">%</option>
                </select>
              </div>

              <div className="mt-2 max-h-40 overflow-auto pr-2">
                {majorCatalog.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm text-slate-700 py-1">
                    <input
                      type="checkbox"
                      checked={!!majorEnabled[d.id]}
                      onChange={(e) => setMajorEnabled((p) => ({ ...p, [d.id]: e.target.checked }))}
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Later we will make CreateSample show Qty or % based on this setting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
