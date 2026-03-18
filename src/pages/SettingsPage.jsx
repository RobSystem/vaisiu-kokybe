import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const FIELD_KEYS = [
  { key: "packing_type", label: "Packing Type" },
  { key: "size", label: "Size" },
  { key: "box_weight", label: "Box Weight (min/max + extras)" },
  { key: "fruit_weight", label: "Fruit Weight (min/max + extras)" },
  { key: "pressures", label: "Pressures (min/max)" },
  { key: "brix", label: "Brix (min/max)" },
  { key: "fruit_diameter", label: "Fruit Diameter (min/max)" },
  { key: "punnet_weight", label: "Punnet Weight (min/max)" },
  { key: "bag_weight", label: "Bag Weight (min/max)" },
  { key: "calibration", label: "Calibration (min/max)" },
  { key: "rhizome_weight", label: "Rhizome Weight (min/max)" },
];

function SettingsPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);

  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToast({ id, type, message });

    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast((t) => (t?.id === id ? null : t));
    }, 3000);
  };

  const [reportTypes, setReportTypes] = useState([]);
  const [selectedReportTypeId, setSelectedReportTypeId] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [cloneFromBasic, setCloneFromBasic] = useState(true);

  const [fieldsEnabled, setFieldsEnabled] = useState(() => {
    const init = {};
    FIELD_KEYS.forEach((f) => (init[f.key] = true));
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

  const [minorEnabled, setMinorEnabled] = useState({});
  const [majorEnabled, setMajorEnabled] = useState({});
  const [minorInputMode, setMinorInputMode] = useState("qty");
  const [majorInputMode, setMajorInputMode] = useState("qty");

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const [colorationCatalog, setColorationCatalog] = useState([]);
  const externalColors = useMemo(
    () => colorationCatalog.filter((c) => c.scope === "external"),
    [colorationCatalog]
  );
  const internalColors = useMemo(
    () => colorationCatalog.filter((c) => c.scope === "internal"),
    [colorationCatalog]
  );

  const [externalColorEnabled, setExternalColorEnabled] = useState({});
  const [internalColorEnabled, setInternalColorEnabled] = useState({});

  const [newDefectName, setNewDefectName] = useState("");
  const [newDefectSeverity, setNewDefectSeverity] = useState("minor");
  const [addingDefect, setAddingDefect] = useState(false);

  const [newColorName, setNewColorName] = useState("");
  const [newColorScope, setNewColorScope] = useState("external");
  const [addingColor, setAddingColor] = useState(false);

  const [editTypeName, setEditTypeName] = useState("");
  const [editingType, setEditingType] = useState(false);
  const [deletingType, setDeletingType] = useState(false);
  const [deletingDefectId, setDeletingDefectId] = useState(null);
  const [deletingColorId, setDeletingColorId] = useState(null);

  useEffect(() => {
    const checkRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (user?.user_metadata?.role !== "admin") {
        navigate("/");
      } else {
        setRole("admin");
      }
    };

    checkRole();
  }, [navigate]);

  const loadReportTypes = async () => {
    const { data, error } = await supabase
      .from("report_types")
      .select("id, name")
      .order("name", { ascending: true });

    if (!error) {
      setReportTypes(data || []);
      if (!selectedReportTypeId && data?.length) {
        setSelectedReportTypeId(data[0].id);
      }
    }
  };

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
    const current = reportTypes.find((r) => r.id === selectedReportTypeId);
    setEditTypeName(current?.name || "");
  }, [selectedReportTypeId, reportTypes]);

  useEffect(() => {
    if (role === "admin") {
      loadReportTypes();
      loadDefectsCatalog();
      loadColorationCatalog();
    }
  }, [role]);

  useEffect(() => {
    const loadConfig = async () => {
      if (!selectedReportTypeId) return;

      setLoadingConfig(true);

      const { data: fieldsData, error: fieldsErr } = await supabase
        .from("report_type_fields")
        .select("field_key, enabled")
        .eq("report_type_id", selectedReportTypeId);

      const nextFields = {};
      FIELD_KEYS.forEach((f) => (nextFields[f.key] = false));

      if (!fieldsErr && fieldsData?.length) {
        fieldsData.forEach((r) => {
          if (r.field_key in nextFields) nextFields[r.field_key] = !!r.enabled;
        });
      } else {
        FIELD_KEYS.forEach((f) => (nextFields[f.key] = true));
      }
      setFieldsEnabled(nextFields);

      const { data: defectsData, error: defErr } = await supabase
        .from("report_type_defects")
        .select("defect_id, enabled, input_mode, defect:defect_id ( severity )")
        .eq("report_type_id", selectedReportTypeId);

      const minMap = {};
      const majMap = {};
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
        (minorCatalog || []).forEach((d) => (minMap[d.id] = true));
        (majorCatalog || []).forEach((d) => (majMap[d.id] = true));
      }

      const { data: colData, error: colErr } = await supabase
        .from("report_type_coloration")
        .select("coloration_id, enabled, coloration:coloration_id ( scope )")
        .eq("report_type_id", selectedReportTypeId);

      const extMap = {};
      const intMap = {};
      externalColors.forEach((c) => (extMap[c.id] = false));
      internalColors.forEach((c) => (intMap[c.id] = false));

      if (!colErr && colData?.length) {
        colData.forEach((row) => {
          const scope = row.coloration?.scope;
          if (scope === "external") extMap[row.coloration_id] = !!row.enabled;
          if (scope === "internal") intMap[row.coloration_id] = !!row.enabled;
        });
      } else {
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

    if (selectedReportTypeId) {
      loadConfig();
    }
  }, [
    selectedReportTypeId,
    defectsCatalog.length,
    colorationCatalog.length,
    minorCatalog,
    majorCatalog,
    externalColors,
    internalColors,
  ]);

  const handleCreateReportType = async () => {
    const name = newTypeName.trim();
    if (!name) return showToast("Enter report type name.", "error");

    const { data: created, error } = await supabase
      .from("report_types")
      .insert({ name })
      .select("id, name")
      .single();

    if (error) {
      console.error(error);
      return showToast("Failed to create report type.", "error");
    }

    if (cloneFromBasic) {
      const { data: basic, error: basicErr } = await supabase
        .from("report_types")
        .select("id")
        .eq("name", "BASIC")
        .single();

      if (!basicErr && basic?.id) {
        const { data: basicFields } = await supabase
          .from("report_type_fields")
          .select("field_key, enabled, required, position")
          .eq("report_type_id", basic.id);

        if (basicFields?.length) {
          await supabase.from("report_type_fields").insert(
            basicFields.map((r) => ({
              report_type_id: created.id,
              field_key: r.field_key,
              enabled: r.enabled,
              required: r.required,
              position: r.position ?? 0,
            }))
          );
        }

        const { data: basicDefects } = await supabase
          .from("report_type_defects")
          .select("defect_id, enabled, required, position, input_mode")
          .eq("report_type_id", basic.id);

        if (basicDefects?.length) {
          await supabase.from("report_type_defects").insert(
            basicDefects.map((r) => ({
              report_type_id: created.id,
              defect_id: r.defect_id,
              enabled: r.enabled,
              required: r.required,
              position: r.position ?? 0,
              input_mode: r.input_mode || "qty",
            }))
          );
        }
      }
    }

    setNewTypeName("");
    await loadReportTypes();
    setSelectedReportTypeId(created.id);
    showToast("Report type created!", "success");
  };

  const handleSaveConfig = async () => {
    if (!selectedReportTypeId) return;

    setSavingConfig(true);
    try {
      await supabase
        .from("report_type_fields")
        .delete()
        .eq("report_type_id", selectedReportTypeId);

      const enabledFieldKeys = FIELD_KEYS.filter((f) => fieldsEnabled[f.key]).map(
        (f) => f.key
      );

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

      await supabase
        .from("report_type_defects")
        .delete()
        .eq("report_type_id", selectedReportTypeId);

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

      const allDefects = [...minorRows, ...majorRows];
      if (allDefects.length) {
        const { error } = await supabase.from("report_type_defects").insert(allDefects);
        if (error) throw error;
      }

      await supabase
        .from("report_type_coloration")
        .delete()
        .eq("report_type_id", selectedReportTypeId);

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

      const allColors = [...extRows, ...intRows];
      if (allColors.length) {
        const { error } = await supabase.from("report_type_coloration").insert(allColors);
        if (error) throw error;
      }

      showToast("Saved!", "success");
    } catch (e) {
      console.error(e);
      showToast("Save failed. Check console.", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRenameReportType = async () => {
    const name = editTypeName.trim();
    if (!selectedReportTypeId) return;
    if (!name) return showToast("Name cannot be empty.", "error");

    setEditingType(true);
    try {
      const { error } = await supabase
        .from("report_types")
        .update({ name })
        .eq("id", selectedReportTypeId);

      if (error) throw error;
      await loadReportTypes();
      showToast("Renamed!", "success");
    } catch (e) {
      console.error(e);
      showToast("Rename failed (maybe duplicate name).", "error");
    } finally {
      setEditingType(false);
    }
  };

  const handleDeleteReportType = async () => {
    if (!selectedReportTypeId) return;
    const current = reportTypes.find((r) => r.id === selectedReportTypeId);

    if (!window.confirm(`Delete report type "${current?.name}"? This will remove mappings.`)) {
      return;
    }

    setDeletingType(true);
    try {
      const { error } = await supabase
        .from("report_types")
        .delete()
        .eq("id", selectedReportTypeId);

      if (error) throw error;

      await loadReportTypes();
      setSelectedReportTypeId("");
      showToast("Deleted!", "success");
    } catch (e) {
      console.error(e);
      showToast("Delete failed.", "error");
    } finally {
      setDeletingType(false);
    }
  };

  const handleAddDefect = async () => {
    const name = newDefectName.trim();
    if (!name) return showToast("Enter defect name.", "error");

    setAddingDefect(true);
    try {
      const { error } = await supabase
        .from("defects_catalog")
        .insert({ name, severity: newDefectSeverity });

      if (error) throw error;

      setNewDefectName("");
      await loadDefectsCatalog();
      showToast("Defect added!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to add defect (maybe duplicate name).", "error");
    } finally {
      setAddingDefect(false);
    }
  };

  const handleAddColoration = async () => {
    const name = newColorName.trim();
    if (!name) return showToast("Enter color name.", "error");

    setAddingColor(true);
    try {
      const { error } = await supabase
        .from("coloration_catalog")
        .insert({ name, scope: newColorScope });

      if (error) throw error;

      setNewColorName("");
      await loadColorationCatalog();
      showToast("Coloration added!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to add coloration (maybe duplicate).", "error");
    } finally {
      setAddingColor(false);
    }
  };

  const handleDeleteDefect = async (defect) => {
    if (!defect?.id) return;
    if (!window.confirm(`Delete defect "${defect.name}"?`)) return;

    setDeletingDefectId(defect.id);
    try {
      const { error: mapErr } = await supabase
        .from("report_type_defects")
        .delete()
        .eq("defect_id", defect.id);

      if (mapErr) throw mapErr;

      const { error: catErr } = await supabase
        .from("defects_catalog")
        .delete()
        .eq("id", defect.id);

      if (catErr) throw catErr;

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

      showToast("Defect deleted!", "success");
    } catch (e) {
      console.error(e);
      showToast("Delete failed. Check console / FK rules.", "error");
    } finally {
      setDeletingDefectId(null);
    }
  };

  const handleDeleteColoration = async (color) => {
    if (!color?.id) return;
    if (!window.confirm(`Delete color "${color.name}"?`)) return;

    setDeletingColorId(color.id);
    try {
      const { error } = await supabase
        .from("coloration_catalog")
        .delete()
        .eq("id", color.id);

      if (error) throw error;

      await loadColorationCatalog();

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

      showToast("Color deleted!", "success");
    } catch (e) {
      console.error(e);
      showToast(`Delete failed: ${e.message ?? "Unknown error"}`, "error");
    } finally {
      setDeletingColorId(null);
    }
  };

  if (role !== "admin") return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage catalogs and report type configurations.
          </p>
        </div>

        {/* Catalog Manager */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Catalog Manager
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Add defects and coloration options used across report types.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
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

            <div className="lg:col-span-8">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                </div>

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
                                setMinorEnabled((p) => ({
                                  ...p,
                                  [d.id]: e.target.checked,
                                }))
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
                            Delete
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
                                setMajorEnabled((p) => ({
                                  ...p,
                                  [d.id]: e.target.checked,
                                }))
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
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

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
                                setExternalColorEnabled((p) => ({
                                  ...p,
                                  [c.id]: e.target.checked,
                                }))
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
                            Delete
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
                                setInternalColorEnabled((p) => ({
                                  ...p,
                                  [c.id]: e.target.checked,
                                }))
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
                            Delete
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

        {toast && (
          <div className="fixed bottom-4 right-4 z-50">
            <div
              className={[
                "flex max-w-sm items-start gap-3 rounded-2xl border bg-white px-4 py-3 shadow-lg",
                toast.type === "success" ? "border-emerald-200" : "",
                toast.type === "error" ? "border-red-200" : "",
                toast.type === "info" ? "border-slate-200" : "",
              ].join(" ")}
              role="status"
              aria-live="polite"
            >
              <span
                className={[
                  "mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                  toast.type === "success" ? "bg-emerald-500" : "",
                  toast.type === "error" ? "bg-red-500" : "",
                  toast.type === "info" ? "bg-slate-500" : "",
                ].join(" ")}
              />
              <div className="flex-1 text-sm text-slate-800">{toast.message}</div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                aria-label="Close notification"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;