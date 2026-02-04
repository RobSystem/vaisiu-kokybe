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
<div className="flex items-center justify-between bg-gray-50 px-6 py-3">
  {/* Left side: Pallet + inline meta */}
  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
    <h3 className="text-xl md:text-2xl font-semibold text-gray-900">
      Pallet: {sample.pallet_number ?? idx + 1}
    </h3>
    {sample.ggn_number && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">GGN #:</span>
        <span className="text-sm font-medium text-slate-900">{sample.ggn_number}</span>
      </div>
    )}
    {(sample.ggn_exp_date || sample.ggn_exp) && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">GGN Exp:</span>
        <span className="text-sm font-medium text-slate-900">{sample.ggn_exp_date || sample.ggn_exp}</span>
      </div>
    )}
    {sample.grower_code && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Grower Code:</span>
        <span className="text-sm font-medium text-slate-900">{sample.grower_code}</span>
      </div>
    )}
    {sample.packing_code && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Packing Code:</span>
        <span className="text-sm font-medium text-slate-900">{sample.packing_code}</span>
      </div>
    )}   

    {sample.brand && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Brand:</span>
        <span className="text-sm font-medium text-slate-900">{sample.brand}</span>
      </div>
    )}   

    
    {sample.variety && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Variety:</span>
        <span className="text-sm font-medium text-slate-900">{sample.variety}</span>
      </div>
    )} 

    
  </div>

  {/* Right side: score badges (paliekam tavo esamą logiką) */}
  <div className="flex flex-wrap gap-2 text-sm md:text-base">
    <span className={'px-3 py-1.5 rounded-full font-semibold shadow-sm ' + getColor(sample.quality_score, 'quality')}>
      Quality Score: {sample.quality_score ?? '—'}
    </span>
    <span className={'px-3 py-1.5 rounded-full font-semibold ' + getColor(sample.storage_score, 'storage')}>
      Storage Score: {sample.storage_score ?? '—'}
    </span>
  </div>
</div>


      {/* Info – naujas išdėstymas (tik UI), rodome tik užpildytus laukus */}
<div className="px-6 py-6 space-y-6">
  {/* Viršutinė eilė: identifikaciniai laukai (kaip tavo 2-oje nuotraukoje) */}
  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
    {sample.variety && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Variety:</span>
        <span className="text-sm font-medium text-slate-900">{sample.variety}</span>
      </div>
    )}
    {sample.brand && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Brand:</span>
        <span className="text-sm font-medium text-slate-900">{sample.brand}</span>
      </div>
    )}
    {sample.packing_code && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Packing Code:</span>
        <span className="text-sm font-medium text-slate-900">{sample.packing_code}</span>
      </div>
    )}
    {sample.grower_code && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Grower Code:</span>
        <span className="text-sm font-medium text-slate-900">{sample.grower_code}</span>
      </div>
    )}
    {sample.ggn_number && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">GGN #:</span>
        <span className="text-sm font-medium text-slate-900">{sample.ggn_number}</span>
      </div>
    )}
    {(sample.ggn_exp_date || sample.ggn_exp) && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">GGN Exp:</span>
        <span className="text-sm font-medium text-slate-900">{sample.ggn_exp_date || sample.ggn_exp}</span>
      </div>
    )}
  </div>

  {/* Pagrindiniai matavimai: horizontaliai (wrap) */}
  <div className="flex flex-wrap gap-4">
    {sample.packing_type && (
      <div className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Packing Type</div>
        <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-medium text-slate-900">
          {sample.packing_type}
        </div>
      </div>
    )}

    {sample.size && (
      <div className="min-w-[120px] rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Size</div>
        <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-medium text-slate-900">
          {sample.size}
        </div>
      </div>
    )}

    {(sample.box_weight_min || sample.box_weight_max) && (
      <div className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Box Weight</div>
        <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-medium text-slate-900">
          {`${sample.box_weight_min || ""} – ${sample.box_weight_max || ""}`.trim()}kg
        </div>
      </div>
    )}

    {(sample.fruit_weight_min || sample.fruit_weight_max) && (
      <div className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Fruit Weight</div>
        <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-medium text-slate-900">
          {`${sample.fruit_weight_min || ""} – ${sample.fruit_weight_max || ""}`.trim()}g
        </div>
      </div>
    )}

    {(sample.punnet_weight_min || sample.punnet_weight_max) && (
      <div className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Punnet Weight</div>
        <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-medium text-slate-900">
          {`${sample.punnet_weight_min || ""} – ${sample.punnet_weight_max || ""}`.trim()}g
        </div>
      </div>
    )}

    {(sample.bag_weight_min || sample.bag_weight_max) && (
      <div className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Bag Weight</div>
        <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-medium text-slate-900">
          {`${sample.bag_weight_min || ""} – ${sample.bag_weight_max || ""}`.trim()}g
        </div>
      </div>
    )}

    {(sample.calibration_min || sample.calibration_max) && (
      <div className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Calibration</div>
        <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-medium text-slate-900">
          {`${sample.calibration_min || ""} – ${sample.calibration_max || ""}`.trim()}
        </div>
      </div>
    )}

    {(sample.rhizome_weight_min || sample.rhizome_weight_max) && (
      <div className="min-w-[170px] rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Rhizome Weight</div>
        <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-medium text-slate-900">
          {`${sample.rhizome_weight_min || ""} – ${sample.rhizome_weight_max || ""}`.trim()}g
        </div>
      </div>
    )}

    {(sample.pressures_min || sample.pressures_max) && (
      <div className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Pressures</div>
        <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-medium text-slate-900">
          {`${sample.pressures_min || ""} – ${sample.pressures_max || ""}`.trim()}kg
        </div>
      </div>
    )}

    {(sample.brix_min || sample.brix_max) && (
      <div className="min-w-[120px] rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Brix</div>
        <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-medium text-slate-900">
          {`${sample.brix_min || ""} – ${sample.brix_max || ""}`.trim()}°
        </div>
      </div>
    )}

    {(sample.fruit_diameter_min || sample.fruit_diameter_max) && (
      <div className="min-w-[140px] rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Diameter</div>
        <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-medium text-slate-900">
          {`${sample.fruit_diameter_min || ""} – ${sample.fruit_diameter_max || ""}`.trim()}mm
        </div>
      </div>
    )}
  </div>

  {/* Extra list'ai (paliekam tavo esamą logiką, tik su modernesniais chip'ais per renderInlineList) */}
  <div className="space-y-4">
    {sample.box_weight_extra?.length > 0 &&
      renderInlineList("Extra Box Weights", sample.box_weight_extra, "kg")}
    {sample.fruit_weights_extra?.length > 0 &&
      renderInlineList("Extra Fruit Weights", sample.fruit_weights_extra, "g")}
    {sample.pressures_extra?.length > 0 &&
      renderInlineList("Extra Pressures", sample.pressures_extra, "kg")}
    {sample.brix_extra?.length > 0 &&
      renderInlineList("Extra Brix", sample.brix_extra, "°")}
    {sample.diameter_extra?.length > 0 &&
      renderInlineList("Extra Diameters", sample.diameter_extra, "mm")}
  </div>

  {/* Apatinė dalis: coloration/consistency + defects atskirom sekcijom (kaip 2-oje nuotraukoje) */}
  <div className="grid lg:grid-cols-3 gap-6">
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900">Coloration & Consistency</h4>
      </div>
      <div className="p-4 space-y-4 text-sm leading-relaxed">
        {renderList("External Coloration", sample.external_coloration)}
        {renderList("Internal Coloration", sample.internal_coloration)}
        {renderConsistency(sample.consistency)}
      </div>
    </div>

    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900">Minor Defects</h4>
      </div>
      <div className="p-4 text-sm leading-relaxed">
        {renderDefectsSelected("Minor Defects", sample.minor_defects_selected) ||
          renderMultiLine("Minor Defects", sample.minor_defects)}
      </div>
    </div>

    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900">Major Defects</h4>
      </div>
      <div className="p-4 text-sm leading-relaxed">
        {renderDefectsSelected("Major Defects", sample.major_defects_selected) ||
          renderMultiLine("Major Defects", sample.major_defects)}
      </div>
    </div>
  </div>
</div>


      {/* Photos – toje pačioje kortelėje */}
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
    </section>
  );
})}


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
