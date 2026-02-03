// Perrašytas ViewReport.jsx su taisyklinga nuotraukų blokų struktūra
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import html2pdf from 'html2pdf.js'

function ViewReport() {
  const { reportId } = useParams()
  const [report, setReport] = useState(null)
  const [samples, setSamples] = useState([])
  const [photos, setPhotos] = useState([])
  const [attachments, setAttachments] = useState([])
  const [previewUrl, setPreviewUrl] = useState(null)
  const reportRef = useRef()
  const [defectNameById, setDefectNameById] = useState(new Map());

  useEffect(() => {
    const fetchData = async () => {
  try {
    const { data: reportData, error: repErr } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (repErr) throw repErr;

    const { data: sampleData, error: sampErr } = await supabase
      .from('samples')
      .select('*')
      .eq('report_id', reportId)
      .order('position');

    if (sampErr) throw sampErr;

    const safeSamples = sampleData || [];
    const sampleIds = safeSamples.map((s) => s.id).filter(Boolean);

    // Photos – tik jei yra sample IDs
    let photoData = [];
    if (sampleIds.length > 0) {
      const { data: pData, error: photoErr } = await supabase
        .from('sample_photos')
        .select('*')
        .in('sample_id', sampleIds)
        .order('created_at', { ascending: true });

      if (photoErr) throw photoErr;
      photoData = pData || [];
    }

    setReport(reportData);
    setSamples(safeSamples);
    setPhotos(photoData);

    // ===== Defect name mapping (safe) =====
    const ids = new Set();
    safeSamples.forEach((s) => {
      const a = s?.minor_defects_selected;
      const b = s?.major_defects_selected;
      if (Array.isArray(a)) a.forEach((x) => x?.id && ids.add(x.id));
      if (Array.isArray(b)) b.forEach((x) => x?.id && ids.add(x.id));
    });

    if (ids.size > 0) {
      const { data: defs, error: defsErr } = await supabase
        .from('defects_catalog')
        .select('id, name')
        .in('id', Array.from(ids));

      if (!defsErr && defs) {
        setDefectNameById(new Map(defs.map((d) => [d.id, d.name])));
      }
    }
  } catch (e) {
    console.error('ViewReport fetchData failed:', e);
    // Kad nematytum "balto", gali rodyti bent minimalų tekstą:
    setReport({}); 
    setSamples([]);
    setPhotos([]);
  }
};

   const fetchAttachments = async () => {
  try {
    const { data } = await supabase
      .storage
      .from('report-files')
      .list(`${reportId}/`);

    if (!data?.length) {
      setAttachments([]);
      return;
    }

    // Sudarom pilnus URL + ?download=<fileName>
    const files = data.map((f) => {
      const path = `${reportId}/${f.name}`;
      const { data: pub } = supabase.storage.from('report-files').getPublicUrl(path);
      let url = pub?.publicUrl || '';

      // Pridedam ?download=, kad naršyklė siųstų failą
      if (url) {
        const u = new URL(url, window.location.origin);
        if (!u.searchParams.has('download')) {
          u.searchParams.set('download', f.name);
        }
        url = u.toString();
      }

      return { ...f, url, name: f.name };
    });

    setAttachments(files);
  } catch (e) {
    console.error('Failed to load attachments:', e);
    setAttachments([]);
  }
};
    fetchAttachments()
  }, [reportId])

  if (!report) return null

  const getPhotosForSample = id => photos.filter(p => p.sample_id === id)
  const renderField = (label, value) => value && <p><span className="font-semibold">{label}:</span> {value}</p>
  const renderRange = (label, min, max, unit) => (min || max) && (
    <p><span className="font-semibold">{label}:</span> {min || ''}{unit} {min && max ? '–' : ''} {max ? max + unit : ''}</p>
  )
  const renderList = (label, arr) => Array.isArray(arr) && arr.length > 0 && (
    <div>
      <p className="font-semibold">{label}:</p>
      <ul className="list-disc ml-5">
        {arr.map((item, i) => (
          <li key={i}>{item.color || item.name} ({(item.percent || item.percentage)?.toString().replace('%', '')}%)</li>
        ))}
      </ul>
    </div>
  )
  const renderMultiLine = (label, val) => val && (
    <div>
      <p className="font-semibold">{label}:</p>
      {val.split(/\r?\n|\\n/).map((line, i) => <p key={i}>{line}</p>)}
    </div>
  )
  const renderConsistency = obj => obj && (
    <div>
      <p className="font-semibold">Consistency:</p>
      <ul className="list-disc ml-5">
        {Object.entries(obj).map(([k, v]) =>
          v && (
            <li key={k}>{k.charAt(0).toUpperCase() + k.slice(1)}: {v.toString().replace('%', '')}%</li>
          )
        )}
      </ul>
    </div>
  )
  const renderInlineList = (label, arr, unit = '') => (
    <div>
      <p className="font-semibold">{label}:</p>
      <div className="flex flex-wrap gap-2 mt-1">
        {arr.map((val, i) => (
          <span key={i} className="bg-gray-200 px-2 py-1 rounded text-xs">{val}{unit}</span>
        ))}
      </div>
    </div>
  )
  const renderDefectsSelected = (label, arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return null;

  return (
    <div>
      <p className="font-semibold">{label}:</p>
      <ul className="list-disc ml-5">
        {arr.map((d, i) => {
          const name = defectNameById.get(d.id) || d.id; // fallback
          const unit = d.unit || "qty";
          const value = d.value ?? "";

          // Jei qty -> rodom value + (pct) jei yra
          if (unit === "qty") {
            const pct = d.pct ?? null;
            return (
              <li key={d.id || i}>
                {name}
                {value !== "" && value !== null ? ` — ${value}` : ""}
                {pct !== null && pct !== undefined ? ` (${pct}%)` : ""}
              </li>
            );
          }

          // Jei pct -> rodom value%
          if (unit === "pct") {
            return (
              <li key={d.id || i}>
                {name}
                {value !== "" && value !== null ? ` — ${value}%` : ""}
              </li>
            );
          }

          return <li key={d.id || i}>{name}</li>;
        })}
      </ul>
    </div>
  );
};

  function getColor(score, type) {
  const n = typeof score === 'number'
    ? score
    : (() => {
        const m = String(score || '').match(/^\s*(\d+)/);
        return m ? parseInt(m[1], 10) : null;
      })();

  if (n == null) return 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-900';

  // QUALITY SCORE
  if (type === 'quality') {
    if (n >= 6 && n <= 7)
      return 'bg-gradient-to-r from-green-300 to-green-400 text-green-900';
    if (n >= 4 && n <= 5)
      return 'bg-gradient-to-r from-yellow-200 to-yellow-300 text-yellow-900';
    if (n <= 3)
      return 'bg-gradient-to-r from-red-300 to-red-400 text-red-900';
  }

  // STORAGE SCORE
  if (type === 'storage') {
    if (n >= 6 && n <= 7)
      return 'bg-gradient-to-r from-green-300 to-green-400 text-green-900';
    if (n >= 4 && n <= 5)
      return 'bg-gradient-to-r from-yellow-200 to-yellow-300 text-yellow-900';
    if (n <= 3)
      return 'bg-gradient-to-r from-red-300 to-red-400 text-red-900';
  }

  return 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-900';
}

  const handleDownloadPDF = () => {
    const el = reportRef.current
    if (!el) return
    setTimeout(() => {
      html2pdf().set({
        filename: `${report.client_ref}_report.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 1.5, useCORS: true },
        jsPDF: { orientation: 'landscape', unit: 'pt', format: 'a4' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }).from(el).save()
    }, 500)
  }
  const card = "mt-8 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-sm";
const cardHeader = "flex items-center justify-between border-b border-slate-200/70 bg-slate-50/60 px-6 py-3";
const cardTitle = "text-lg md:text-xl font-semibold text-slate-900";

const chipScoreClass = (score) => {
  // score gali būti "2 - Poor" arba "2" ir pan.
  const s = String(score || "");
  if (s.includes("1")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s.includes("2")) return "bg-rose-50 text-rose-700 border-rose-200";
  if (s.includes("3")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (s.includes("4")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (s.includes("5")) return "bg-slate-50 text-slate-700 border-slate-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const Pill = ({ children }) => (
  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
    {children}
  </span>
);

const KV = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs font-semibold text-slate-600">{label}:</span>
    {value ? <Pill>{value}</Pill> : <span className="text-xs text-slate-400">—</span>}
  </div>
);


  return (
    <div ref={reportRef} className="min-h-screen bg-slate-50">
  <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
    {/* visas turinys, įskaitant headerį, korteles ir t.t. */}
  </div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b print:hidden">
  <div className="w-full px-8 py-3 flex items-center justify-between">
  {/* Left: Logo */}
  <div className="flex-shrink-0 mr-6">
    <img
      src="/Logoedit2.png"
      alt="Company Logo"
      className="h-12 w-auto object-contain"
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  </div>

  {/* Center: Summary */}
  <div className="flex-1 text-center">
    <p className="text-2xl font-bold text-gray-900 uppercase tracking-widest leading-tight">
      Quality Inspection Report
    </p>

    <h1 className="text-lg font-semibold text-gray-900 mt-2">
      {report?.client || '—'}
      {report?.client_ref ? ` • Ref ${report.client_ref}` : ''}
      {report?.container_number ? ` • Container ${report.container_number}` : ''}
    </h1>

    <div className="mt-1 text-[12px] text-gray-600 flex justify-center flex-wrap gap-x-4 gap-y-1">
      {report?.date && <span>{new Date(report.date).toLocaleDateString()}</span>}
      {report?.location && <span>{report.location}</span>}
      {report?.variety && <span>{report.variety}</span>}
    </div>
  </div>

  {/* Right: Actions */}
  <div className="flex-shrink-0">
    <button
      onClick={handleDownloadPDF}
      className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
    >
      Download PDF
    </button>
    {attachments?.length > 0 && (
  <div className="relative z-10 flex flex-wrap justify-end gap-2 mt-2">
    {attachments.map((file, index) => (
  <a
    key={index}
    href={file.url}
    rel="noopener noreferrer"
    className="cursor-pointer bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded shadow-sm transition focus:outline-none focus:ring-2 focus:ring-amber-300"
  >
    Download Temp. Recorder {index + 1}
  </a>
))}
  </div>
)}
  </div>
</div>
</div>

{/* PRINT HEADER (rodyti tik PDF/spausdinant) */}
<div className="hidden print:block">
  <div className="max-w-[100%] mx-auto px-4 py-2 border-b">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[16pt] font-bold text-gray-900 uppercase tracking-widest leading-tight">
  Quality Inspection Report
</div>

<div className="mt-2" />

        <div className="text-[12pt] font-semibold text-gray-900">
          {report?.client || '—'}
          {report?.client_ref ? ` • Ref ${report.client_ref}` : ''}
          {report?.container_number ? ` • Container ${report.container_number}` : ''}
        </div>
        <div className="text-[9pt] text-gray-700 mt-0.5">
          {report?.date && new Date(report.date).toLocaleDateString()}
          {report?.location ? ` • ${report.location}` : ''}
          {report?.variety ? ` • ${report.variety}` : ''}
        </div>
      </div>
      {/* jei turi mažą spausdinamą logotipą */}
      <img
  src="/Logoedit2.png"
  alt="Logo"
  className="h-8 w-auto object-contain"
  onError={(e) => { e.currentTarget.style.display = 'none'; }}
/>
    </div>
  </div>
</div>

      {/* General Info */}
<div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
  <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
    <h2 className="text-lg md:text-xl font-bold text-slate-900 uppercase tracking-wide">
      General Information
    </h2>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 py-6">
    {/* Column 1 */}
    <div className="rounded-xl border border-slate-200 bg-white">
      <dl className="divide-y divide-slate-200">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</dt>
          <dd className="text-sm font-medium text-slate-900">
            {report?.date ? new Date(report.date).toLocaleDateString() : '—'}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Client</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.client || '—'}</dd>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ref</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.client_ref || '—'}</dd>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Container #</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.container_number || '—'}</dd>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">RoChecks Ref</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.rochecks_ref || '—'}</dd>
        </div>
      </dl>
    </div>

    {/* Column 2 */}
    <div className="rounded-xl border border-slate-200 bg-white">
      <dl className="divide-y divide-slate-200">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Supplier</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.supplier || '—'}</dd>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Variety</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.variety || '—'}</dd>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Origin</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.origin || '—'}</dd>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Location</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.location || '—'}</dd>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Pallets</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.total_pallets || '—'}</dd>
        </div>
      </dl>
    </div>

    {/* Column 3 */}
    <div className="rounded-xl border border-slate-200 bg-white">
      <dl className="divide-y divide-slate-200">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.type || '—'}</dd>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Surveyor</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.surveyor || '—'}</dd>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Brand</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.brand || '—'}</dd>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Temperature</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.temperature || '—'}</dd>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</dt>
          <dd className="text-sm font-medium text-slate-900">{report?.category || '—'}</dd>
        </div>
      </dl>
    </div>
  </div>
</div>

     {samples.map((sample, idx) => (
  <div
    key={sample.id || idx}
    className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
  >
    {/* HEADER */}
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="text-lg font-bold text-slate-900">
          Pallet: {sample.position ?? idx + 1}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <span className="text-slate-700"><span className="font-semibold">Variety:</span> {sample.variety || "—"}</span>
          <span className="text-slate-700"><span className="font-semibold">Brand:</span> {sample.brand || "—"}</span>
          <span className="text-slate-700"><span className="font-semibold">Packing Code:</span> {sample.packing_code || "—"}</span>
          <span className="text-slate-700"><span className="font-semibold">Grower Code:</span> {sample.grower_code || "—"}</span>
          <span className="text-slate-700"><span className="font-semibold">GGN #:</span> {sample.ggn_number || "—"}</span>
          <span className="text-slate-700"><span className="font-semibold">GGN Exp:</span> {sample.ggn_exp_date || "—"}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${chipScoreClass(sample.quality_score)}`}>
          Quality Score: {sample.quality_score || "—"}
        </span>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${chipScoreClass(sample.storage_score)}`}>
          Storage Score: {sample.storage_score || "—"}
        </span>
      </div>
    </div>

    {/* BODY */}
    <div className="px-6 py-5">
      {/* TOP ROW: Measurements + Defects columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT (2 cols): measurements */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KV label="Packing Type" value={sample.packing_type} />
            <KV label="Size" value={sample.size} />
            <KV label="Box Weight" value={sample.box_weight_min || sample.box_weight_max ? `${sample.box_weight_min || ""}–${sample.box_weight_max || ""} kg` : ""} />
            <KV label="Fruit Weight" value={sample.fruit_weight_min || sample.fruit_weight_max ? `${sample.fruit_weight_min || ""}–${sample.fruit_weight_max || ""} g` : ""} />

            <KV label="Punnet Weight" value={sample.punnet_weight_min || sample.punnet_weight_max ? `${sample.punnet_weight_min || ""}–${sample.punnet_weight_max || ""} g` : ""} />
            <KV label="Bag Weight" value={sample.bag_weight_min || sample.bag_weight_max ? `${sample.bag_weight_min || ""}–${sample.bag_weight_max || ""} g` : ""} />
            <KV label="Calibration" value={sample.calibration_min || sample.calibration_max ? `${sample.calibration_min || ""}–${sample.calibration_max || ""}` : ""} />
            <KV label="Rhizome Weight" value={sample.rhizome_weight_min || sample.rhizome_weight_max ? `${sample.rhizome_weight_min || ""}–${sample.rhizome_weight_max || ""} g` : ""} />

            <KV label="Pressures" value={sample.pressures_min || sample.pressures_max ? `${sample.pressures_min || ""}–${sample.pressures_max || ""} kg` : ""} />
            <KV label="Brix" value={sample.brix_min || sample.brix_max ? `${sample.brix_min || ""}–${sample.brix_max || ""}°` : ""} />
            <KV label="Diameter" value={sample.fruit_diameter_min || sample.fruit_diameter_max ? `${sample.fruit_diameter_min || ""}–${sample.fruit_diameter_max || ""} mm` : ""} />
          </div>

          {/* EXTRA WEIGHTS */}
          {(Array.isArray(sample.box_weight_extra) && sample.box_weight_extra.length > 0) && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-700 mb-2">Extra Box Weights</div>
              <div className="flex flex-wrap gap-2">
                {sample.box_weight_extra.filter(Boolean).map((v, i) => <Pill key={i}>{v} kg</Pill>)}
              </div>
            </div>
          )}

          {(Array.isArray(sample.fruit_weights_extra) && sample.fruit_weights_extra.length > 0) && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-700 mb-2">Extra Fruit Weights</div>
              <div className="flex flex-wrap gap-2">
                {sample.fruit_weights_extra.filter(Boolean).map((v, i) => <Pill key={i}>{v} g</Pill>)}
              </div>
            </div>
          )}

          {/* COLORATION + CONSISTENCY */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm font-bold text-slate-900 mb-2">External Coloration</div>
              {renderList("", sample.external_coloration) || <div className="text-sm text-slate-400">—</div>}
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900 mb-2">Internal Coloration</div>
              {renderList("", sample.internal_coloration) || <div className="text-sm text-slate-400">—</div>}
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900 mb-2">Consistency</div>
              {renderList("", sample.consistency) || <div className="text-sm text-slate-400">—</div>}
            </div>
          </div>
        </div>

        {/* RIGHT: defects columns */}
        <div className="lg:col-span-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
            <div>
              <div className="text-sm font-bold text-slate-900 mb-2">Minor Defects</div>
              {renderDefectsSelected("", sample.minor_defects_selected) || renderMultiLine("", sample.minor_defects) || (
                <div className="text-sm text-slate-400">—</div>
              )}
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900 mb-2">Major Defects</div>
              {renderDefectsSelected("", sample.major_defects_selected) || renderMultiLine("", sample.major_defects) || (
                <div className="text-sm text-slate-400">—</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {photosForSample.length > 0 && (
  <>
    <div className="border-t bg-gray-50 px-6 py-3">
      <h4 className="text-base md:text-lg font-semibold text-gray-800">Photos</h4>
    </div>

    <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {photosForSample.map((photo, i) => {
        const url = photo.url || photo.publicUrl || photo.path;

        // print'e darysim puslapio lūžį kas 28 (tik spausdinant)
        const printBreakClass = i > 0 && i % 28 === 0 ? 'print:break-before-page' : '';

        return (
          <button
            key={photo.id || url || i}
            onClick={() => setPreviewUrl(url)}
            title="Open photo"
            className={`group block focus:outline-none ${printBreakClass}`}
          >
            {/* Vienodas rėmelis, bet be kirpimo: object-contain + fiksuotas santykis */}
            <div className="aspect-[4/3] w-full overflow-hidden rounded-md border bg-white">
              <img
                src={url}
                alt=""
                loading="lazy"
                className="w-full h-full object-contain group-hover:opacity-90"
              />
            </div>
          </button>
        );
      })}
    </div>
  </>
)}
    </div>
  </div>
))}

      {/* Final Summary */}
      {(report.qualityScore || report.storageScore || report.conclusion) && (
  <section className="mt-8 border rounded-2xl shadow-sm overflow-hidden print:break-inside-avoid">
    {/* Header */}
    <div className="bg-gray-50 border-b px-6 py-3">
      <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
        Final Summary
      </h2>
    </div>

    {/* Content */}
    <div className="px-6 py-6 space-y-6 text-[17px] leading-relaxed">
      {/* Scores as chips (naudoja tavo getColor su gradientais) */}
      <div className="flex flex-wrap gap-2">
        {report.qualityScore && (
          <span
            className={
              "px-4 py-2 rounded-full font-semibold shadow-sm " +
              getColor(report.qualityScore, "quality")
            }
          >
            Quality Score: {report.qualityScore}
          </span>
        )}

        {report.storageScore && (
          <span
            className={
              "px-4 py-2 rounded-full font-semibold shadow-sm " +
              getColor(report.storageScore, "storage")
            }
          >
            Storage Score: {report.storageScore}
          </span>
        )}
      </div>

      {/* Conclusion */}
     {report.conclusion && (
  <div className="rounded-xl border bg-white">
    <div className="px-4 py-2 border-b bg-gray-50 text-base font-semibold text-gray-700">
      Conclusion
    </div>
    <div className="p-5 text-gray-900 text-[18px] leading-relaxed whitespace-pre-wrap">
      {report.conclusion}
    </div>
  </div>
)}
    </div>
  </section>
)}

      

      {previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="preview" className="max-w-[90%] max-h-[90%] rounded" />
        </div>
      )}
    </div>
  )
}

export default ViewReport;
