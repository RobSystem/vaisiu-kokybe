// Perrašytas ViewReport.jsx su Tailwind dizainu (funkcionalumas nesikeičia)
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
        {arr.map((item, i) => (<li key={i}>
  {item.color || item.name} ({(item.percent || item.percentage)?.toString().replace('%', '')}%)
</li>
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
            <li key={k}>
              {k.charAt(0).toUpperCase() + k.slice(1)}:{' '}
              {v.toString().replace('%', '')}%
            </li>
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
    if (num >= 6) return 'text-green-600'     // 6, 7
    if (num >= 4) return 'text-orange-500'   // 4, 5
    return 'text-red-600'                    // 1–3
  }
  if (type === 'storage') {
    if (num >= 6) return 'text-green-600'     // 6, 7
    if (num >= 4) return 'text-orange-500'    // 4, 5
    return 'text-red-600'                     // 1–3
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
      <div className="flex items-center justify-between mb-6">
        <img src="/Logoedit2.png" alt="Logo" className="h-14" />
        <h1 className="text-2xl font-bold text-center flex-1">QUALITY CONTROL REPORT</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-6">
        <div>{renderField('Date', report.date)}{renderField('Client', report.client)}{renderField('Ref', report.client_ref)}{renderField('Container #', report.container_number)}{renderField('RoChecks Ref', report.rochecks_ref)}</div>
        <div>{renderField('Supplier', report.supplier)}{renderField('Variety', report.variety)}{renderField('Origin', report.origin)}{renderField('Location', report.location)}{renderField('Total Pallets', report.total_pallets)}</div>
        <div>{renderField('Type', report.type)}{renderField('Surveyor', report.surveyor)}{renderField('Brand', report.brand)}{renderField('Temperature', report.temperature)}{renderField('Category', report.category)}</div>
      </div>

      {samples.map(sample => (
  <div key={sample.id}>
    {/* Sample Info Block */}
    <div className="border rounded p-4 mb-6 bg-gray-50 break-before-page">
      <h3 className="font-semibold text-lg mb-2">Pallet: {sample.pallet_number}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          {renderField('GGN #', sample.ggn_number)}
          {renderField('GGN Exp', sample.ggn_exp_date)}
          {renderField('Grower Code', sample.grower_code)}
          {renderField('Packing Code', sample.packing_code)}
          {renderField('Variety', sample.variety)}
          {renderField('Brand', sample.brand)}
        </div>
        <div>
          {renderField('Packing Type', sample.packing_type)}
          {renderField('Size', sample.size)}
          {(sample.box_weight_min || sample.box_weight_max) &&
            renderInlineList('Box Weight', [`${sample.box_weight_min || ''} – ${sample.box_weight_max || ''}`], 'kg')}
          {sample.box_weight_extra?.length > 0 && renderInlineList('Extra Box Weights', sample.box_weight_extra, 'kg')}
          {(sample.fruit_weight_min || sample.fruit_weight_max) &&
            renderInlineList('Fruit Weight', [`${sample.fruit_weight_min || ''} – ${sample.fruit_weight_max || ''}`], 'g')}
          {sample.fruit_weights_extra?.length > 0 && renderInlineList('Extra Fruit Weights', sample.fruit_weights_extra, 'g')}
          {(sample.pressures_min || sample.pressures_max) &&
            renderInlineList('Pressures', [`${sample.pressures_min || ''} – ${sample.pressures_max || ''}`], 'kg')}
          {sample.pressures_extra?.length > 0 && renderInlineList('Extra Pressures', sample.pressures_extra, 'kg')}
          {(sample.brix_min || sample.brix_max) &&
            renderInlineList('Brix', [`${sample.brix_min || ''} – ${sample.brix_max || ''}`], '°')}
          {sample.brix_extra?.length > 0 && renderInlineList('Extra Brix', sample.brix_extra, '°')}
          {(sample.fruit_diameter_min || sample.fruit_diameter_max) &&
            renderInlineList('Diameter', [`${sample.fruit_diameter_min || ''} – ${sample.fruit_diameter_max || ''}`], 'mm')}
          {sample.diameter_extra?.length > 0 && renderInlineList('Extra Diameters', sample.diameter_extra, 'mm')}
        </div>
        <div>
          {renderList('External Coloration', sample.external_coloration)}
          {renderList('Internal Coloration', sample.internal_coloration)}
          {renderConsistency(sample.consistency)}
          {renderMultiLine('Minor Defects', sample.minor_defects)}
          {renderMultiLine('Major Defects', sample.major_defects)}
        </div>
      </div>

      <div className="flex gap-6 mt-4 pr-[80px]">
        <p className={"font-bold " + getColor(sample.quality_score, 'quality')}>Quality Score: {sample.quality_score}</p>
        <p className={"font-bold " + getColor(sample.storage_score, 'storage')}>Storage Score: {sample.storage_score}</p>
      </div>
    </div>

    {/* Photo Block */}
    <div className="border rounded p-4 mb-6 bg-white break-before-page break-inside-avoid">
      <h4 className="font-semibold text-md mb-2">Photos</h4>
      <div className="flex flex-wrap gap-4 mt-4">
        {getPhotosForSample(sample.id).map(photo => (
          <img
            key={photo.id}
            src={photo.url}
            alt="sample"
            className="w-36 h-36 object-cover rounded border"
          />
        ))}
      </div>
    </div>
  </div>
))}


      
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

export default ViewReport
