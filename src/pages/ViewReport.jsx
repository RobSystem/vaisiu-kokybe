import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import html2pdf from 'html2pdf.js'
import { useRef } from 'react'

function ViewReport() {
  const { reportId } = useParams()
  const [report, setReport] = useState(null)
  const [samples, setSamples] = useState([])
  const [photos, setPhotos] = useState([])
  const [previewUrl, setPreviewUrl] = useState(null)
  const reportRef = useRef()

  useEffect(() => {
    const fetchData = async () => {
      const { data: reportData } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single()

      const { data: sampleData } = await supabase
        .from('samples')
        .select('*')
        .eq('report_id', reportId)

      const { data: photoData } = await supabase
        .from('sample_photos')
        .select('*')
        .in('sample_id', sampleData.map(s => s.id))

      setReport(reportData)
      setSamples(sampleData)
      setPhotos(photoData)
    }
    fetchData()
  }, [reportId])

  if (!report || !Array.isArray(samples) || !Array.isArray(photos)) return null

  const getPhotosForSample = (sampleId) => {
    return photos.filter(p => p.sample_id === sampleId)
  }

  const renderField = (label, value) => {
    if (value === null || value === undefined || value === '') return null

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        const formatted = value.map(v => {
          if (typeof v === 'object') {
            return `${v.color || ''} (${v.percent || ''})`
          }
          return v
        }).join(', ')
        if (!formatted || formatted === ' ()') return null
        return <p><strong>{label}:</strong> {formatted}</p>
      }

      const formatted = Object.entries(value)
        .filter(([_, val]) => val !== '' && val !== null && val !== undefined)
        .map(([key, val]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${val}`)
        .join(', ')

      if (!formatted) return null
      return <p><strong>{label}:</strong> {formatted}</p>
    }

    return <p><strong>{label}:</strong> {value}</p>
  }

  const renderMultilineField = (label, value) => {
    if (!value) return null
    const lines = value.split(/\r?\n|\\n/).filter(l => l.trim() !== '')
    if (lines.length === 0) return null
    return (
      <div>
        <p><strong>{label}:</strong></p>
        {lines.map((line, index) => <div key={index}>{line}</div>)}
      </div>
    )
  }

  const renderRangeField = (label, min, max, unit = '') => {
    if ((min === null || min === '' || min === undefined) && (max === null || max === '' || max === undefined)) return null
    const format = (val) => val ? val.toString() : ''
    return (
      <p><strong>{label}:</strong> {format(min)}{unit} {min && max ? '–' : ''} {max ? format(max) + unit : ''}</p>
    )
  }

  const getQualityColor = (text) => {
    if (!text) return 'black'
    const lower = text.toLowerCase()
    if (lower.includes('good') || lower.includes('fair')) return 'green'
    if (lower.includes('reasonable') || lower.includes('moderate')) return 'orange'
    if (lower.includes('less') || lower.includes('poor') || lower.includes('loss')) return 'red'
    return 'black'
  }

  const getStorageColor = (text) => {
    if (!text) return 'black'
    const lower = text.toLowerCase()
    if (lower.includes('good') || lower.includes('normal')) return 'green'
    if (lower.includes('reduced') || lower.includes('moderate')) return 'orange'
    if (lower.includes('limited') || lower.includes('poor') || lower.includes('no storage')) return 'red'
    return 'black'
  }
  const handleDownloadPDF = () => {
    const element = reportRef.current
    if (!element) return
  
    // Palauk truputį, kad nuotraukos tikrai būtų DOM'e
    setTimeout(() => {
      html2pdf()
        .set({
          filename: `${report.client}_report.pdf`,
          image: { type: 'jpeg', quality: 1 },
          html2canvas: {
            scale: 2,
            useCORS: true, // svarbu, kad būtų įtrauktos ir nuotraukos
            logging: true,
          },
          jsPDF: {
            orientation: 'portrait',
            unit: 'px',
            format: 'a4', // gali būti px arba palikti default
          },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(element)
        .save()
    }, 500) // 0.5s kad DOM pilnai įsikrautų, ypač nuotraukos
  }
  return (
    <div
  ref={reportRef}
  style={{ fontFamily: 'Arial, sans-serif', padding: '2rem', width: '100vw', minHeight: '100vh', boxSizing: 'border-box', backgroundColor: '#fff' }}
>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <img src="/Logoedit2.png" alt="Logo" style={{ height: '60px', marginRight: '1rem' }} />
        <h1 style={{ flex: 1, textAlign: 'center' }}>QUALITY CONTROL REPORT</h1>
      </div>

      <hr style={{ borderTop: '5px solid #ccc', margin: '2rem 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '14px' }}>
        <div style={{ width: '32%' }}>
          {renderField('Date', report.date)}
          {renderField('Client', report.client)}
          {renderField('Client Ref', report.client_ref)}
          {renderField('Container Number', report.container_number)}
          {renderField('RoChecks Ref', report.rochecks_ref)}
        </div>
        <div style={{ width: '32%' }}>
          {renderField('Variety', report.variety)}
          {renderField('Origin', report.origin)}
          {renderField('Location', report.location)}
          {renderField('Total Pallets', report.total_pallets)}
          {renderField('Type', report.type)}
        </div>
        <div style={{ width: '32%' }}>
          {renderField('Surveyor', report.surveyor)}
          {renderField('Brand', report.brand)}
          {renderField('Temperature', report.temperature)}
          {renderField('Category', report.category)}
        </div>
      </div>

      <hr style={{ borderTop: '5px solid #ccc', margin: '2rem 0' }} />

      {samples.map(sample => (
  <div
    key={sample.id}
    style={{
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '2rem',
      backgroundColor: '#f9f9f9',
      pageBreakAfter: 'always'  // <- čia svarbiausia
    }}
  >
          <h3 style={{ fontSize: '18px', marginBottom: '1rem' }}>Pallet Number: {sample.pallet_number}</h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', gap: '2rem' }}>
            <div style={{ width: '32%' }}>
              {renderField('GGN Number', sample.ggn_number)}
              {renderField('GGN Exp. Date', sample.ggn_exp_date)}
              {renderField('Grower Code', sample.grower_code)}
              {renderField('Packing Code', sample.packing_code)}
              {renderField('Variety', sample.variety)}
              {renderField('Brand', sample.brand)}
            </div>
            <div style={{ width: '32%' }}>
              {renderField('Packing Type', sample.packing_type)}
              {renderField('Size', sample.size)}
              {renderRangeField('Box Weight', sample.box_weight_min, sample.box_weight_max, 'kg')}
              {renderRangeField('Fruit Weight', sample.fruit_weight_min, sample.fruit_weight_max, 'g')}
              {sample.fruit_weights_extra && Array.isArray(sample.fruit_weights_extra) && sample.fruit_weights_extra.length > 0 && (
  <div>
    <p><strong>Additional Fruit Weights:</strong></p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {sample.fruit_weights_extra.map((val, idx) => (
        <div key={idx} style={{ padding: '0.3rem 0.6rem', backgroundColor: '#eee', borderRadius: '4px', fontSize: '13px' }}>
          {val}g
        </div>
      ))}
    </div>
  </div>
)}
              {renderRangeField('Pressures', sample.pressures_min, sample.pressures_max, 'kg')}
              {renderRangeField('Brix', sample.brix_min, sample.brix_max, '°')}
              {renderRangeField('Fruit Diameter', sample.fruit_diameter_min, sample.fruit_diameter_max, 'mm')}
            </div>
            <div style={{ width: '32%' }}>
              {renderField('External Coloration', sample.external_coloration)}
              {renderField('Internal Coloration', sample.internal_coloration)}
              {renderField('Consistency', sample.consistency)}
              {renderMultilineField('Minor Defects', sample.minor_defects)}
              {renderMultilineField('Major Defects', sample.major_defects)}
              {renderField('Comments', sample.observations)}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'start', marginTop: '1rem', gap: '3rem' }}>
          <p style={{ color: getQualityColor(report.quality_score), fontWeight: 'bold' }}>
  Quality Score: {report.quality_score}
</p>
<p style={{ color: getStorageColor(report.storage_score), fontWeight: 'bold' }}>
  Storage Score: {report.storage_score}
</p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {getPhotosForSample(sample.id).map(photo => (
              <img
                key={photo.id}
                src={photo.url}
                crossOrigin="anonymous"
                alt="sample"
                style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => setPreviewUrl(photo.url)}
              />
            ))}
          </div>
        </div>
      ))}

      <hr style={{ borderTop: '5px solid #ccc', margin: '2rem 0' }} />

      <div style={{ display: 'flex', gap: '3rem', fontWeight: 'bold', marginBottom: '1rem' }}>
      <p style={{ color: getQualityColor(report.qualityScore), fontWeight: 'bold' }}>
  Quality Score: {report.qualityScore}
</p>
<p style={{ color: getStorageColor(report.storageScore), fontWeight: 'bold' }}>
  Storage Score: {report.storageScore}
  </p>
</div>

{report.conclusion && (
  <div style={{
    fontSize: '15px',
    whiteSpace: 'pre-line',
    padding: '1rem',
    border: '1px solid #ccc',
    borderRadius: '6px',
    backgroundColor: '#f5f5f5'
  }}>
    <p><strong>Conclusion:</strong></p>
    <p>{report.conclusion}</p>
  </div>
)}

      {previewUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }} onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="preview" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px' }} />
        </div>
      )}
      <button
  onClick={handleDownloadPDF}
  style={{
    marginTop: '2rem',
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#1d4ed8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
    
  }}
>
  Download PDF
</button>
    </div>
    
  )
}

export default ViewReport
