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
      const { data: reportData } = await supabase.from('reports').select('*').eq('id', reportId).single()
      const { data: sampleData } = await supabase.from('samples').select('*').eq('report_id', reportId).order('position')
      const { data: photoData } = await supabase
        .from('sample_photos')
        .select('*')
        .in('sample_id', sampleData.map(s => s.id))
        .order('created_at', { ascending: true })
      setReport(reportData)
      setSamples(sampleData)
      setPhotos(photoData)
      // Surenkam visus defect id iš samples (minor/major selected)
const ids = new Set();
(sampleData || []).forEach((s) => {
  const a = s?.minor_defects_selected;
  const b = s?.major_defects_selected;

  if (Array.isArray(a)) a.forEach((x) => x?.id && ids.add(x.id));
  if (Array.isArray(b)) b.forEach((x) => x?.id && ids.add(x.id));
});

if (ids.size > 0) {
  const { data: defs, error: defsErr } = await supabase
    .from("defects_catalog")
    .select("id, name")
    .in("id", Array.from(ids));

  if (!defsErr && defs) {
    setDefectNameById(new Map(defs.map((d) => [d.id, d.name])));
  }
}

    }
    fetchData()
    

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
          <span
  key={i}
  className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800"
>
  {val}{unit}
</span>
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
function getHeaderBgByQuality(score) {
  const n = typeof score === 'number'
    ? score
    : (() => {
        const m = String(score || '').match(/^\s*(\d+)/);
        return m ? parseInt(m[1], 10) : null;
      })();

  if (n == null) return 'from-slate-50 to-slate-50';
  if (n >= 6 && n <= 7) return 'from-green-50 to-green-100';
  if (n >= 4 && n <= 5) return 'from-yellow-50 to-yellow-100';
  return 'from-red-50 to-red-100';
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

      {/* Each Sample */}
     {samples.map((sample, idx) => {
  const photosForSample = getPhotosForSample(sample.id);
  const groups = [];
  for (let i = 0; i < photosForSample.length; i += 28) {
    groups.push(photosForSample.slice(i, i + 28));
  }

  return (
    <section key={sample.id || idx} className="mt-8 border rounded-2xl shadow-sm overflow-hidden break-before-page">
      {/* Header */}
      {/* Header (tik UI): Pallet + identifikacija vienoje eilėje, score'ai dešinėje */}
<div
  className={
    'flex items-center justify-between px-6 py-3 ' +
    'bg-gradient-to-r ' + getHeaderBgByQuality(sample.quality_score) +
    ' border-b border-slate-200'
  }
>
  {/* Left side: Pallet + inline meta */}
  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
    <h3 className="text-sm md:text-base font-semibold text-slate-900">
  PALLET: {sample.pallet_number ?? idx + 1}
</h3>
    {sample.ggn_number && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
  GGN:
</span>
<span className="text-sm md:text-base font-medium text-slate-900">
  {sample.ggn_number}
</span>
      </div>
    )}
    {(sample.ggn_exp_date || sample.ggn_exp) && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
  GGN EXP DATE:
</span>
<span className="text-sm md:text-base font-medium text-slate-900">
  {sample.ggn_exp_date}
</span>
      </div>
    )}
    {sample.grower_code && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
  GROWER CODE:
</span>
<span className="text-sm md:text-base font-medium text-slate-900">
  {sample.grower_code}
</span>
      </div>
    )}
    {sample.packing_code && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
  PACKING CODE:
</span>
<span className="text-sm md:text-base font-medium text-slate-900">
  {sample.packing_code}
</span>
      </div>
    )}      

    
    {sample.variety && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
  VARIETY:
</span>
<span className="text-sm md:text-base font-medium text-slate-900">
  {sample.variety}
</span>
      </div>
    )} 
    {sample.brand && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
  BRAND:
</span>
<span className="text-sm md:text-base font-medium text-slate-900">
  {sample.brand}
</span>
      </div>
    )} 
    
  </div>

  {/* Right side: score badges (paliekam tavo esamą logiką) */}
  <div className="flex flex-wrap gap-2 text-sm md:text-base">
   <span
  className={
    'inline-flex items-center rounded-full ' +
    'px-4 py-2 text-sm md:text-base font-semibold ' +
    'shadow-md ring-1 ring-black/10 border border-white/70 ' +
    getColor(sample.quality_score, 'quality')
  }
>
  Quality Score: {sample.quality_score ?? '—'}
</span>

<span
  className={
    'inline-flex items-center rounded-full ' +
    'px-4 py-2 text-sm md:text-base font-semibold ' +
    'shadow-md ring-1 ring-black/10 border border-white/70 ' +
    getColor(sample.storage_score, 'quality')
  }
>
  Storage Score: {sample.storage_score ?? '—'}
</span>
  </div>
</div>


      {/* Info – naujas išdėstymas (tik UI), rodome tik užpildytus laukus */}
<div className="px-6 py-6 space-y-6">
  {/* Viršutinė eilė: identifikaciniai laukai (kaip tavo 2-oje nuotraukoje) */}
 
  {/* Pagrindiniai matavimai: horizontaliai (wrap) */}
  {/* Pagrindiniai matavimai: General Information stilius (be kortelių), rodome tik užpildytus */}
<div className="grid md:grid-cols-12 gap-6">
  {/* Kairė: Measurements */}
  <div className="md:col-span-8">
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x divide-y divide-slate-200 text-sm">
        {sample.packing_type && (
          <div className="px-4 py-3">
            <dt className="text-xs font-medium text-slate-600 uppercase">Packing Type</dt>
            <dd className="mt-1 font-medium text-slate-900">{sample.packing_type}</dd>
          </div>
        )}

        {sample.size && (
         <div className="px-4 py-3">
            <dt className="text-xs font-medium text-slate-600 uppercase">Size</dt>
            <dd className="mt-1 font-medium text-slate-900">{sample.size}</dd>
          </div>
        )}

        {(sample.box_weight_min || sample.box_weight_max) && (
          <div className="px-4 py-3">
            <dt className="text-xs font-medium text-slate-600 uppercase">Box Weight</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {`${sample.box_weight_min || ""} – ${sample.box_weight_max || ""}`.trim()}kg
            </dd>
          </div>
        )}

        {(sample.fruit_weight_min || sample.fruit_weight_max) && (
          <div className="px-4 py-3">
            <dt className="text-xs font-medium text-slate-600 uppercase">Fruit Weight</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {`${sample.fruit_weight_min || ""} – ${sample.fruit_weight_max || ""}`.trim()}g
            </dd>
          </div>
        )}

        {(sample.punnet_weight_min || sample.punnet_weight_max) && (
          <div className="px-4 py-3">
            <dt className="text-xs font-medium text-slate-600 uppercase">Punnet Weight</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {`${sample.punnet_weight_min || ""} – ${sample.punnet_weight_max || ""}`.trim()}g
            </dd>
          </div>
        )}

        {(sample.bag_weight_min || sample.bag_weight_max) && (
          <div className="px-4 py-3">
            <dt className="text-xs font-medium text-slate-600 uppercase">Bag Weight</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {`${sample.bag_weight_min || ""} – ${sample.bag_weight_max || ""}`.trim()}g
            </dd>
          </div>
        )}

        {(sample.calibration_min || sample.calibration_max) && (
          <div className="px-4 py-3">
            <dt className="text-xs font-medium text-slate-600 uppercase">Calibration</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {`${sample.calibration_min || ""} – ${sample.calibration_max || ""}`.trim()}
            </dd>
          </div>
        )}

        {(sample.rhizome_weight_min || sample.rhizome_weight_max) && (
         <div className="px-4 py-3">
            <dt className="text-xs font-medium text-slate-600 uppercase">Rhizome Weight</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {`${sample.rhizome_weight_min || ""} – ${sample.rhizome_weight_max || ""}`.trim()}g
            </dd>
          </div>
        )}

        {(sample.pressures_min || sample.pressures_max) && (
          <div className="px-4 py-3">
            <dt className="text-xs font-medium text-slate-600 uppercase">Pressures</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {`${sample.pressures_min || ""} – ${sample.pressures_max || ""}`.trim()}kg
            </dd>
          </div>
        )}

        {(sample.brix_min || sample.brix_max) && (
          <div className="px-4 py-3">
            <dt className="text-xs font-medium text-slate-600 uppercase">Brix</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {`${sample.brix_min || ""} – ${sample.brix_max || ""}`.trim()}°
            </dd>
          </div>
        )}

        {(sample.fruit_diameter_min || sample.fruit_diameter_max) && (
          <div className="px-4 py-3">
            <dt className="text-xs font-medium text-slate-600 uppercase">Diameter</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {`${sample.fruit_diameter_min || ""} – ${sample.fruit_diameter_max || ""}`.trim()}mm
            </dd>
          </div>
        )}
      </dl>

      {(sample.box_weight_extra?.length > 0 || sample.fruit_weights_extra?.length > 0) && (
        <div className="border-t border-slate-200 px-4 py-4 space-y-3 text-sm">
          {sample.box_weight_extra?.length > 0 &&
            renderInlineList("Extra Box Weights", sample.box_weight_extra, "kg")}
          {sample.fruit_weights_extra?.length > 0 &&
            renderInlineList("Extra Fruit Weights", sample.fruit_weights_extra, "g")}
        </div>
      )}
    </div>
  </div>

  {/* Dešinė: Defects (Minor + Major šalia, be kortelių) */}
  <div className="md:col-span-4 space-y-6">
  {/* Defects – kaip dabar */}
  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
    <div className="grid grid-cols-2 gap-px bg-slate-200">
      <div className="bg-slate-50 px-4 py-3">
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Minor
        </div>
        <div className="text-sm leading-relaxed">
          {renderDefectsSelected("Minor Defects", sample.minor_defects_selected) ||
            renderMultiLine("Minor Defects", sample.minor_defects)}
        </div>
      </div>

      <div className="bg-slate-50 px-4 py-3">
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Major
        </div>
        <div className="text-sm leading-relaxed">
          {renderDefectsSelected("Major Defects", sample.major_defects_selected) ||
            renderMultiLine("Major Defects", sample.major_defects)}
        </div>
      </div>
    </div>
  </div>

  {/* Coloration + Consistency – 3 stulpeliai horizontaliai */}
  {(sample.external_coloration || sample.internal_coloration || sample.consistency) && (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-3 gap-px bg-slate-200">
        {/* External */}
        <div className="bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            External
          </div>
          <div className="text-sm leading-relaxed">
            {renderList("External Coloration", sample.external_coloration)}
          </div>
        </div>

        {/* Internal */}
        <div className="bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Internal
          </div>
          <div className="text-sm leading-relaxed">
            {renderList("Internal Coloration", sample.internal_coloration)}
          </div>
        </div>

        {/* Consistency */}
        <div className="bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Consistency
          </div>
          <div className="text-sm leading-relaxed">
            {renderConsistency(sample.consistency)}
          </div>
        </div>
      </div>
    </div>
  )}
</div>

   

    </div>
</div>


      {/* Photos – toje pačioje kortelėje */}
     {/* Photos – pritaikyta prie Sample dizaino */}
{samplePhotos?.[sample.id]?.length > 0 && (
  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-200">
      <h4 className="text-sm font-semibold text-slate-900">Photos</h4>
    </div>

    <div className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {samplePhotos[sample.id].map((p) => (
          <a
            key={p.id || p.url}
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-slate-200 bg-white overflow-hidden"
          >
            <img
              src={p.url}
              alt={p.name || "Sample photo"}
              className="w-full h-40 object-cover"
              loading="lazy"
            />
          </a>
        ))}
      </div>
    </div>
  </div>
)}

    </section>
  );
})}


      {/* Final Summary */}
{/* Final Summary */}
{(report?.quality_score || report?.storage_score || report?.conclusion) && (
  <section className="mt-8 rounded-2xl border border-slate-200 overflow-hidden print:break-inside-avoid">
    {/* Header (spalva pagal Quality) */}
    <div
      className={
        "px-6 py-3 border-b border-slate-200 " +
        "bg-gradient-to-r " +
        getHeaderBgByQuality(report?.quality_score)
      }
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base md:text-lg font-semibold text-slate-900 uppercase tracking-wide">
          Final Summary
        </h2>

        {/* Scores */}
        <div className="flex flex-wrap gap-2">
          {report?.quality_score != null && (
            <span
              className={
                "inline-flex items-center rounded-full " +
                "px-4 py-2 text-sm md:text-base font-semibold " +
                "shadow-md ring-1 ring-black/10 border border-white/70 " +
                getColor(report.quality_score, "quality")
              }
            >
              Quality Score: {report.quality_score}
            </span>
          )}

          {report?.storage_score != null && (
            <span
              className={
                "inline-flex items-center rounded-full " +
                "px-4 py-2 text-sm md:text-base font-semibold " +
                "shadow-md ring-1 ring-black/10 border border-white/70 " +
                getColor(report.storage_score, "storage")
              }
            >
              Storage Score: {report.storage_score}
            </span>
          )}
        </div>
      </div>
    </div>

    {/* Body (be Conclusion kortelės) */}
    <div className="bg-slate-50 px-6 py-5">
      {report?.conclusion && (
        <div className="text-slate-900 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
          {report.conclusion}
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
