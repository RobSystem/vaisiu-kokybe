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
    }
    fetchData()

    const fetchAttachments = async () => {
      const { data } = await supabase.storage.from('report-files').list(`${reportId}/`)
      if (data?.length) setAttachments(data)
    }
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
  const getColor = (val, type) => {
    if (!val) return ''
    const num = parseInt(val)
    if (type === 'quality') {
      if (num >= 6) return 'text-green-600'
      if (num >= 4) return 'text-orange-500'
      return 'text-red-600'
    }
    if (type === 'storage') {
      if (num >= 6) return 'text-green-600'
      if (num >= 4) return 'text-orange-500'
      return 'text-red-600'
    }
    return ''
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

  return (
    <div ref={reportRef} className="w-full px-6 py-6 bg-white">
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
     <div className="mt-8 border rounded-2xl overflow-hidden shadow-sm">
  <div className="bg-gray-50 border-b px-6 py-3">
    <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
      General Information
    </h2>
  </div>

  {/* 3 column layout */}
  <div className="grid md:grid-cols-3 gap-x-10 gap-y-3 px-8 py-6 text-[17px] leading-relaxed">
    <div>
      <p><span className="font-semibold text-gray-700">Date:</span> {report?.date ? new Date(report.date).toLocaleDateString() : '—'}</p>
      <p><span className="font-semibold text-gray-700">Client:</span> {report?.client || '—'}</p>
      <p><span className="font-semibold text-gray-700">Ref:</span> {report?.client_ref || '—'}</p>
      <p><span className="font-semibold text-gray-700">Container #:</span> {report?.container_number || '—'}</p>
      <p><span className="font-semibold text-gray-700">RoChecks Ref:</span> {report?.rochecks_ref || '—'}</p>
    </div>

    <div>
      <p><span className="font-semibold text-gray-700">Supplier:</span> {report?.supplier || '—'}</p>
      <p><span className="font-semibold text-gray-700">Variety:</span> {report?.variety || '—'}</p>
      <p><span className="font-semibold text-gray-700">Origin:</span> {report?.origin || '—'}</p>
      <p><span className="font-semibold text-gray-700">Location:</span> {report?.location || '—'}</p>
      <p><span className="font-semibold text-gray-700">Total Pallets:</span> {report?.total_pallets || '—'}</p>
    </div>

    <div>
      <p><span className="font-semibold text-gray-700">Type:</span> {report?.type || '—'}</p>
      <p><span className="font-semibold text-gray-700">Surveyor:</span> {report?.surveyor || '—'}</p>
      <p><span className="font-semibold text-gray-700">Brand:</span> {report?.brand || '—'}</p>
      <p><span className="font-semibold text-gray-700">Temperature:</span> {report?.temperature || '—'}</p>
      <p><span className="font-semibold text-gray-700">Category:</span> {report?.category || '—'}</p>
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
      <div className="flex items-center justify-between bg-gray-50 px-6 py-3">
        <h3 className="text-xl md:text-2xl font-semibold text-gray-900">
          Pallet: {sample.pallet_number ?? idx + 1}
        </h3>
        <div className="flex flex-wrap gap-6 text-sm md:text-base">
  <p className={'font-bold ' + getColor(sample.quality_score, 'quality')}>
    Quality Score: {sample.quality_score ?? '—'}
  </p>
  <p className={'font-bold ' + getColor(sample.storage_score, 'storage')}>
    Storage Score: {sample.storage_score ?? '—'}
  </p>
</div>
      </div>

      {/* Info – 3 stulpeliai, didesnis/paryškintas tekstas */}
      <div className="grid md:grid-cols-3 gap-8 px-6 py-6 text-[16px] leading-relaxed">
        <div className="space-y-1">
          {renderField('GGN #', sample.ggn_number)}
          {renderField('GGN Exp', sample.ggn_exp_date || sample.ggn_exp)}
          {renderField('Grower Code', sample.grower_code)}
          {renderField('Packing Code', sample.packing_code)}
          {renderField('Variety', sample.variety)}
          {renderField('Brand', sample.brand)}
        </div>

        <div className="space-y-1">
          {renderField('Packing Type', sample.packing_type)}
          {renderField('Size', sample.size)}
          {(sample.box_weight_min || sample.box_weight_max) &&
            renderInlineList('Box Weight', [`${sample.box_weight_min || ''} – ${sample.box_weight_max || ''}`], 'kg')}
          {sample.box_weight_extra?.length > 0 &&
            renderInlineList('Extra Box Weights', sample.box_weight_extra, 'kg')}
          {(sample.fruit_weight_min || sample.fruit_weight_max) &&
            renderInlineList('Fruit Weight', [`${sample.fruit_weight_min || ''} – ${sample.fruit_weight_max || ''}`], 'g')}
          {sample.fruit_weights_extra?.length > 0 &&
            renderInlineList('Extra Fruit Weights', sample.fruit_weights_extra, 'g')}
          {(sample.pressures_min || sample.pressures_max) &&
            renderInlineList('Pressures', [`${sample.pressures_min || ''} – ${sample.pressures_max || ''}`], 'kg')}
          {sample.pressures_extra?.length > 0 &&
            renderInlineList('Extra Pressures', sample.pressures_extra, 'kg')}
          {(sample.brix_min || sample.brix_max) &&
            renderInlineList('Brix', [`${sample.brix_min || ''} – ${sample.brix_max || ''}`], '°')}
          {sample.brix_extra?.length > 0 &&
            renderInlineList('Extra Brix', sample.brix_extra, '°')}
          {(sample.fruit_diameter_min || sample.fruit_diameter_max) &&
            renderInlineList('Diameter', [`${sample.fruit_diameter_min || ''} – ${sample.fruit_diameter_max || ''}`], 'mm')}
          {sample.diameter_extra?.length > 0 &&
            renderInlineList('Extra Diameters', sample.diameter_extra, 'mm')}
        </div>

        <div className="space-y-2">
          {renderList('External Coloration', sample.external_coloration)}
          {renderList('Internal Coloration', sample.internal_coloration)}
          {renderConsistency(sample.consistency)}
          {renderMultiLine('Minor Defects', sample.minor_defects)}
          {renderMultiLine('Major Defects', sample.major_defects)}
        </div>
      </div>

      {/* Photos – toje pačioje kortelėje */}
      {groups.length > 0 && (
        <>
          <div className="border-t bg-gray-50 px-6 py-3">
            <h4 className="text-base md:text-lg font-semibold text-gray-800">Photos</h4>
          </div>

          {groups.map((group, index) => (
            <div
              key={index}
              className={`px-6 py-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 ${index > 0 ? 'pdf-photo-break' : ''}`}
            >
              {group.map((photo) => (
                <button
                  key={photo.id || photo.url}
                  onClick={() => setPreviewUrl(photo.url)}
                  className="block group focus:outline-none"
                  title="Open photo"
                >
                  <img
                    src={photo.url}
                    alt=""
                    className="w-full h-28 md:h-32 object-cover rounded-md border group-hover:opacity-90"
                  />
                </button>
              ))}
            </div>
          ))}
        </>
      )}
    </section>
  );
})}


      {/* Final Summary */}
      {(report.qualityScore || report.storageScore || report.conclusion) && (
        <div className="mt-6 p-4 bg-gray-100 border rounded space-y-2 break-before-page">
          <div className="flex flex-wrap gap-6 text-lg">
            {report.qualityScore && (
              <p className={"font-bold " + getColor(report.qualityScore, 'quality')}>
                Quality Score: {report.qualityScore}
              </p>
            )}
            {report.storageScore && (
              <p className={"font-bold " + getColor(report.storageScore, 'storage')}>
                Storage Score: {report.storageScore}
              </p>
            )}
          </div>
          {report.conclusion && (
            <div>
              <p className="font-semibold">Conclusion:</p>
              <p className="whitespace-pre-line">{report.conclusion}</p>
            </div>
          )}
        </div>
      )}

      {/* PDF Download & Attachments */}
      <div className="mt-8">
        <button
          onClick={handleDownloadPDF}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
        >
          Download PDF
        </button>
      </div>

      {attachments.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Temp. Records:</h3>
          <ul className="list-disc ml-5">
            {attachments.map((f, i) => {
              const url = supabase.storage.from('report-files').getPublicUrl(`${reportId}/${f.name}`).data.publicUrl
              return <li key={i}><a href={url} className="text-blue-600 underline" target="_blank" rel="noreferrer">📎 File {i + 1}</a></li>
            })}
          </ul>
        </div>
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
