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

  // ===== Coloration state =====
const [colorationCatalog, setColorationCatalog] = useState([]);
const externalColors = useMemo(
  () => colorationCatalog.filter((c) => c.scope === "external"),
  [colorationCatalog]
);
const internalColors = useMemo(
  () => colorationCatalog.filter((c) => c.scope === "internal"),
  [colorationCatalog]
);

const [externalColorEnabled, setExternalColorEnabled] = useState({}); // coloration_id -> bool
const [internalColorEnabled, setInternalColorEnabled] = useState({}); // coloration_id -> bool

// ===== Add defect form =====
const [newDefectName, setNewDefectName] = useState("");
const [newDefectSeverity, setNewDefectSeverity] = useState("minor"); // minor|major
const [addingDefect, setAddingDefect] = useState(false);

// ===== Add coloration form =====
const [newColorName, setNewColorName] = useState("");
const [newColorScope, setNewColorScope] = useState("external"); // external|internal
const [addingColor, setAddingColor] = useState(false);

// ===== Report type edit/delete =====
const [editTypeName, setEditTypeName] = useState("");
const [editingType, setEditingType] = useState(false);
const [deletingType, setDeletingType] = useState(false);
const [deletingDefectId, setDeletingDefectId] = useState(null);
const [deletingColorId, setDeletingColorId] = useState(null);

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
useEffect(() => {
  const current = reportTypes.find((r) => r.id === selectedReportTypeId);
  setEditTypeName(current?.name || "");
}, [selectedReportTypeId, reportTypes]);

const handleRenameReportType = async () => {
  const name = editTypeName.trim();
  if (!selectedReportTypeId) return;
  if (!name) return alert("Name cannot be empty.");

  setEditingType(true);
  try {
    const { error } = await supabase
      .from("report_types")
      .update({ name })
      .eq("id", selectedReportTypeId);

    if (error) throw error;
    await loadReportTypes();
    alert("Renamed!");
  } catch (e) {
    console.error(e);
    alert("Rename failed (maybe duplicate name).");
  } finally {
    setEditingType(false);
  }
};
const handleDeleteReportType = async () => {
  if (!selectedReportTypeId) return;
  const current = reportTypes.find((r) => r.id === selectedReportTypeId);
  if (!window.confirm(`Delete report type "${current?.name}"? This will remove mappings.`)) return;

  setDeletingType(true);
  try {
    const { error } = await supabase
      .from("report_types")
      .delete()
      .eq("id", selectedReportTypeId);

    if (error) throw error;

    await loadReportTypes();
    setSelectedReportTypeId(""); // loadReportTypes parinks pirmą
    alert("Deleted!");
  } catch (e) {
    console.error(e);
    alert("Delete failed.");
  } finally {
    setDeletingType(false);
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
  const loadColorationCatalog = async () => {
  const { data, error } = await supabase
    .from("coloration_catalog")
    .select("id, name, scope")
    .order("scope", { ascending: true })
    .order("name", { ascending: true });

  if (!error) setColorationCatalog(data || []);
};


  useEffect(() => {
    if (role === "admin") {
  loadReportTypes();
  loadDefectsCatalog();
  loadColorationCatalog();
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
      // 3) coloration mapping
const { data: colData, error: colErr } = await supabase
  .from("report_type_coloration")
  .select("coloration_id, enabled, coloration:coloration_id ( scope )")
  .eq("report_type_id", selectedReportTypeId);

const extMap = {};
const intMap = {};
(externalColors || []).forEach((c) => (extMap[c.id] = false));
(internalColors || []).forEach((c) => (intMap[c.id] = false));

if (!colErr && colData?.length) {
  colData.forEach((row) => {
    const scope = row.coloration?.scope;
    if (scope === "external") extMap[row.coloration_id] = !!row.enabled;
    if (scope === "internal") intMap[row.coloration_id] = !!row.enabled;
  });
} if (!colData || colData.length === 0) {
  // default tik naujam report type
  externalColors.forEach((c) => (extMap[c.id] = true));
  internalColors.forEach((c) => (intMap[c.id] = true));
}

setExternalColorEnabled(extMap);
setInternalColorEnabled(intMap);


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
  }, [selectedReportTypeId, defectsCatalog.length, colorationCatalog.length]);
  

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
  const handleAddColoration = async () => {
  const name = newColorName.trim();
  if (!name) return alert("Enter color name.");

  setAddingColor(true);
  try {
    const { error } = await supabase
      .from("coloration_catalog")
      .insert({ name, scope: newColorScope });

    if (error) throw error;

    setNewColorName("");
    await loadColorationCatalog();
    alert("Coloration added!");
  } catch (e) {
    console.error(e);
    alert("Failed to add coloration (maybe duplicate).");
  } finally {
    setAddingColor(false);
  }
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
      // 3) report_type_coloration: replace strategy
await supabase.from("report_type_coloration").delete().eq("report_type_id", selectedReportTypeId);

const extRows = externalColors
  .filter((c) => externalColorEnabled[c.id])
  .map((c, idx) => ({
    report_type_id: selectedReportTypeId,
    coloration_id: c.id,
    enabled: true,
    position: idx,
  }));

const intRows = internalColors
  .filter((c) => internalColorEnabled[c.id])
  .map((c, idx) => ({
    report_type_id: selectedReportTypeId,
    coloration_id: c.id,
    enabled: true,
    position: idx,
  }));

const colAll = [...extRows, ...intRows];
if (colAll.length) {
  const { error: colInsErr } = await supabase.from("report_type_coloration").insert(colAll);
  if (colInsErr) throw colInsErr;
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
  const handleAddDefect = async () => {
  const name = newDefectName.trim();
  if (!name) return alert("Enter defect name.");

  setAddingDefect(true);
  try {
    const { error } = await supabase
      .from("defects_catalog")
      .insert({ name, severity: newDefectSeverity });

    if (error) throw error;

    setNewDefectName("");
    await loadDefectsCatalog();
    alert("Defect added!");
  } catch (e) {
    console.error(e);
    alert("Failed to add defect (maybe duplicate name).");
  } finally {
    setAddingDefect(false);
  }
};
const handleDeleteDefect = async (defect) => {
  if (!defect?.id) return;

  const ok = window.confirm(`Delete defect "${defect.name}"?`);
  if (!ok) return;

  setDeletingDefectId(defect.id);
  try {
    // 1) remove mappings first (safe if you have FK constraints)
    const { error: mapErr } = await supabase
      .from("report_type_defects")
      .delete()
      .eq("defect_id", defect.id);

    if (mapErr) throw mapErr;

    // 2) delete from catalog
    const { error: catErr } = await supabase
      .from("defects_catalog")
      .delete()
      .eq("id", defect.id);

    if (catErr) throw catErr;

    // 3) refresh catalog + clean local enabled maps (optional but nice)
    await loadDefectsCatalog();

    setMinorEnabled((p) => {
      const next = { ...p };
      delete next[defect.id];
      return next;
    });
    setMajorEnabled((p) => {
      const next = { ...p };
      delete next[defect.id];
      return next;
    });
  } catch (e) {
    console.error(e);
    alert("Delete failed. Check console / FK rules.");
  } finally {
    setDeletingDefectId(null);
  }
};
const handleDeleteColoration = async (color) => {
  if (!color?.id) return;

  const ok = window.confirm(`Delete color "${color.name}"?`);
  if (!ok) return;

  setDeletingColorId(color.id);
  try {
    // 1) remove mappings first (safe if FK constraints exist)
    // !!! Jei tavo mapping lentelė vadinasi kitaip – pakeisk čia pavadinimą.
    const { error: mapErr } = await supabase
      .from("report_type_coloration")
      .delete()
      .eq("coloration_id", color.id);

    // Jei tokios lentelės nėra pas tave, ištrink šitą bloką arba pritaikyk.
    if (mapErr && mapErr.code !== "42P01") {
      // 42P01 = undefined_table (Postgres) – palikau „safe“, kad nelūžtų, jei neturi šitos lentelės
      throw mapErr;
    }

    // 2) delete from catalog
    const { error: catErr } = await supabase
      .from("coloration_catalog")
      .delete()
      .eq("id", color.id);

    if (catErr) throw catErr;

    // 3) refresh
    await loadColorationsCatalog();

    // 4) cleanup local enabled maps (optional)
    setExternalColorEnabled((p) => {
      const next = { ...p };
      delete next[color.id];
      return next;
    });
    setInternalColorEnabled((p) => {
      const next = { ...p };
      delete next[color.id];
      return next;
    });
  } catch (e) {
    console.error(e);
    alert("Delete failed. Check console / FK rules / table names.");
  } finally {
    setDeletingColorId(null);
  }
};



  return (
  <div className="min-h-screen bg-slate-50">
    <div className="w-full px-6 py-8 sm:px-8 lg:px-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Admin Panel
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage catalogs and report type configurations.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            onClick={() => navigate("/admin/clients")}
          >
            Add Client
          </button>

          <button
            className="inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
            onClick={() => navigate("/admin/add-user")}
          >
            Add User
          </button>
        </div>
      </div>

      {/* Catalog Manager */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Catalog Manager
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Add defects and coloration options used across report types.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Add Defect */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">
              Add Defect
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={newDefectName}
                onChange={(e) => setNewDefectName(e.target.value)}
                className="h-10 w-full flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                placeholder="Mold"
              />

              <select
                value={newDefectSeverity}
                onChange={(e) => setNewDefectSeverity(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100 sm:w-40"
              >
                <option value="minor">Minor</option>
                <option value="major">Major</option>
              </select>

              <button
                onClick={handleAddDefect}
                disabled={addingDefect}
                className="h-10 w-full rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
              >
                {addingDefect ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {/* Add Coloration */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">
              Add Coloration
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                className="h-10 w-full flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                placeholder="Orange"
              />

              <select
                value={newColorScope}
                onChange={(e) => setNewColorScope(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100 sm:w-40"
              >
                <option value="external">External</option>
                <option value="internal">Internal</option>
              </select>

              <button
                onClick={handleAddColoration}
                disabled={addingColor}
                className="h-10 w-full rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
              >
                {addingColor ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Types Manager */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Report Types Manager
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Create report types, enable fields, choose allowed defects, and set Qty/% mode.
            </p>
          </div>

          {/* Create new type */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-72">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                New report type name
              </label>
              <input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                placeholder="PINEAPPLE"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={cloneFromBasic}
                onChange={(e) => setCloneFromBasic(e.target.checked)}
                className="h-4 w-4"
              />
              Clone from BASIC
            </label>

            <button
              className="h-10 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={handleCreateReportType}
            >
              Create
            </button>
          </div>
        </div>

        {/* Main layout: left sidebar + right content */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left / Sidebar */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Select Report Type
              </label>
              <select
                value={selectedReportTypeId}
                onChange={(e) => setSelectedReportTypeId(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
              >
                {reportTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>

              {loadingConfig && (
                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Loading config...
                </div>
              )}

              <button
                disabled={savingConfig || loadingConfig}
                onClick={handleSaveConfig}
                className="mt-4 h-10 w-full rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {savingConfig ? "Saving..." : "Save configuration"}
              </button>

              {/* Edit / Rename / Delete (sutvarkyta: nebe “išmesta” grid’e) */}
              <div className="mt-6 border-t border-slate-200 pt-4">
                <div className="mb-2 text-xs font-semibold text-slate-600">
                  Edit report type name
                </div>

                <div className="flex gap-2">
                  <input
                    value={editTypeName}
                    onChange={(e) => setEditTypeName(e.target.value)}
                    className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                  />
                  <button
                    onClick={handleRenameReportType}
                    disabled={editingType || loadingConfig}
                    className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {editingType ? "Renaming..." : "Rename"}
                  </button>
                </div>

                <button
                  onClick={handleDeleteReportType}
                  disabled={deletingType || loadingConfig}
                  className="mt-3 h-10 w-full rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  {deletingType ? "Deleting..." : "Delete report type"}
                </button>
              </div>
            </div>
          </div>

          {/* Right / Content */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Fields */}
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Measurements fields
                </h3>

                <div className="space-y-2">
                  {FIELD_KEYS.map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={!!fieldsEnabled[f.key]}
                        onChange={(e) =>
                          setFieldsEnabled((p) => ({
                            ...p,
                            [f.key]: e.target.checked,
                          }))
                        }
                        className="h-4 w-4"
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
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Defects
                </h3>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-800">
                      Minor input mode
                    </div>
                    <select
                      value={minorInputMode}
                      onChange={(e) => setMinorInputMode(e.target.value)}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="qty">Qty</option>
                      <option value="pct">%</option>
                    </select>
                  </div>

                  <div className="mt-2 max-h-48 overflow-auto pr-2">
                    {minorCatalog.map((d) => (
  <div
    key={d.id}
    className="group flex items-center justify-between gap-3 py-1 text-sm text-slate-700"
  >
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={!!minorEnabled[d.id]}
        onChange={(e) =>
          setMinorEnabled((p) => ({ ...p, [d.id]: e.target.checked }))
        }
      />
      {d.name}
    </label>

    <button
      type="button"
      onClick={() => handleDeleteDefect(d)}
      disabled={deletingDefectId === d.id}
      className="rounded-lg p-1 text-slate-400 hover:text-red-600 disabled:opacity-50"
      title="Delete defect"
    >
      {/* Trash icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M9 3a1 1 0 0 0-1 1v1H5.75a.75.75 0 0 0 0 1.5h.62l.86 13.02A2 2 0 0 0 9.23 22h5.54a2 2 0 0 0 2-1.48l.86-13.02h.62a.75.75 0 0 0 0-1.5H16V4a1 1 0 0 0-1-1H9Zm1.5 2.5h3V5h-3v.5ZM9.5 9a.75.75 0 0 1 .75.75v8a.75.75 0 0 1-1.5 0v-8A.75.75 0 0 1 9.5 9Zm5 0a.75.75 0 0 1 .75.75v8a.75.75 0 0 1-1.5 0v-8A.75.75 0 0 1 14.5 9Z" />
      </svg>
    </button>
  </div>
))}

                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-800">
                      Major input mode
                    </div>
                    <select
                      value={majorInputMode}
                      onChange={(e) => setMajorInputMode(e.target.value)}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="qty">Qty</option>
                      <option value="pct">%</option>
                    </select>
                  </div>

                  <div className="mt-2 max-h-48 overflow-auto pr-2">
                   {majorCatalog.map((d) => (
  <div
    key={d.id}
    className="group flex items-center justify-between gap-3 py-1 text-sm text-slate-700"
  >
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={!!majorEnabled[d.id]}
        onChange={(e) =>
          setMajorEnabled((p) => ({ ...p, [d.id]: e.target.checked }))
        }
      />
      {d.name}
    </label>

    <button
      type="button"
      onClick={() => handleDeleteDefect(d)}
      disabled={deletingDefectId === d.id}
      className="rounded-lg p-1 text-slate-400 hover:text-red-600 disabled:opacity-50"
      title="Delete defect"
    >
      {/* Trash icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M9 3a1 1 0 0 0-1 1v1H5.75a.75.75 0 0 0 0 1.5h.62l.86 13.02A2 2 0 0 0 9.23 22h5.54a2 2 0 0 0 2-1.48l.86-13.02h.62a.75.75 0 0 0 0-1.5H16V4a1 1 0 0 0-1-1H9Zm1.5 2.5h3V5h-3v.5ZM9.5 9a.75.75 0 0 1 .75.75v8a.75.75 0 0 1-1.5 0v-8A.75.75 0 0 1 9.5 9Zm5 0a.75.75 0 0 1 .75.75v8a.75.75 0 0 1-1.5 0v-8A.75.75 0 0 1 14.5 9Z" />
      </svg>
    </button>
  </div>
))}

                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Later we will make CreateSample show Qty or % based on this setting.
                </p>
              </div>
            </div>

            {/* Coloration full width under */}
            <div className="mt-6 rounded-2xl border border-slate-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Coloration
              </h3>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2 text-sm font-semibold text-slate-800">
                    External colors
                  </div>
                  <div className="max-h-48 overflow-auto pr-2">
                    {externalColors.map((c) => (
  <div
    key={c.id}
    className="group flex items-center justify-between gap-3 py-1 text-sm text-slate-700"
  >
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={!!externalColorEnabled[c.id]}
        onChange={(e) =>
          setExternalColorEnabled((p) => ({ ...p, [c.id]: e.target.checked }))
        }
        className="h-4 w-4"
      />
      {c.name}
    </label>

    <button
      type="button"
      onClick={() => handleDeleteColoration(c)}
      disabled={deletingColorId === c.id}
      className="rounded-lg p-1 text-slate-400 hover:text-red-600 disabled:opacity-50"
      title="Delete color"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M9 3a1 1 0 0 0-1 1v1H5.75a.75.75 0 0 0 0 1.5h.62l.86 13.02A2 2 0 0 0 9.23 22h5.54a2 2 0 0 0 2-1.48l.86-13.02h.62a.75.75 0 0 0 0-1.5H16V4a1 1 0 0 0-1-1H9Zm1.5 2.5h3V5h-3v.5ZM9.5 9a.75.75 0 0 1 .75.75v8a.75.75 0 0 1-1.5 0v-8A.75.75 0 0 1 9.5 9Zm5 0a.75.75 0 0 1 .75.75v8a.75.75 0 0 1-1.5 0v-8A.75.75 0 0 1 14.5 9Z" />
      </svg>
    </button>
  </div>
))}

                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2 text-sm font-semibold text-slate-800">
                    Internal colors
                  </div>
                  <div className="max-h-48 overflow-auto pr-2">
                    {internalColors.map((c) => (
  <div
    key={c.id}
    className="group flex items-center justify-between gap-3 py-1 text-sm text-slate-700"
  >
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={!!internalColorEnabled[c.id]}
        onChange={(e) =>
          setInternalColorEnabled((p) => ({ ...p, [c.id]: e.target.checked }))
        }
        className="h-4 w-4"
      />
      {c.name}
    </label>

    <button
      type="button"
      onClick={() => handleDeleteColoration(c)}
      disabled={deletingColorId === c.id}
      className="rounded-lg p-1 text-slate-400 hover:text-red-600 disabled:opacity-50"
      title="Delete color"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M9 3a1 1 0 0 0-1 1v1H5.75a.75.75 0 0 0 0 1.5h.62l.86 13.02A2 2 0 0 0 9.23 22h5.54a2 2 0 0 0 2-1.48l.86-13.02h.62a.75.75 0 0 0 0-1.5H16V4a1 1 0 0 0-1-1H9Zm1.5 2.5h3V5h-3v.5ZM9.5 9a.75.75 0 0 1 .75.75v8a.75.75 0 0 1-1.5 0v-8A.75.75 0 0 1 9.5 9Zm5 0a.75.75 0 0 1 .75.75v8a.75.75 0 0 1-1.5 0v-8A.75.75 0 0 1 14.5 9Z" />
      </svg>
    </button>
  </div>
))}

                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
);

}

export default AdminPanel;
