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
  const [attachments, setAttachments] = useState([]);

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
        .order('position', { ascending: true })

      const { data: photoData } = await supabase
        .from('sample_photos')
        .select('*')
        .in('sample_id', sampleData.map(s => s.id))

      setReport(reportData)
      setSamples(sampleData)
      setPhotos(photoData)
    }
    fetchData()
    const fetchAttachments = async () => {
      const { data, error } = await supabase.storage
        .from('report-files')
        .list(`${reportId}/`);
  
      if (!error && data.length) {
        setAttachments(data);
      }
    };
  
    if (reportId) fetchAttachments();
  }, [reportId])

  if (!report || !Array.isArray(samples) || !Array.isArray(photos)) return null

  const getPhotosForSample = (sampleId) => {
    return photos.filter(p => p.sample_id === sampleId)
  }

  const renderListField = (label, values) => {
    if (!Array.isArray(values) || values.length === 0) return null;
    return (
      <div style={{ marginBottom: '0.5rem' }}>
        <p><strong>{label}:</strong></p>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {values
            .filter(item => (item.percent || item.percentage) !== undefined && (item.percent || item.percentage) !== '')
            .map((item, index) => (
              <li key={index}>
                {item.color || item.name} ({parseFloat(item.percent || item.percentage)}%)
              </li>
          ))}
        </ul>
      </div>
    )
  }
  const renderField = (label, value) => {
    if (!value) return null;
    return (
      <p>
        <strong>{label}:</strong> {value}
      </p>
    );
  };

  const renderConsistency = (consistencyObj) => {
    if (!consistencyObj || typeof consistencyObj !== 'object') return null;
  
    const entries = Object.entries(consistencyObj).filter(([_, val]) => val && val !== '');
  
    if (entries.length === 0) return null;
  
    return (
      <div style={{ marginBottom: '0.5rem' }}>
        <p><strong>Consistency:</strong></p>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {entries.map(([key, val]) => (
            <li key={key}>
              {key.charAt(0).toUpperCase() + key.slice(1)}: {parseFloat(val)}%
            </li>
          ))}
        </ul>
      </div>
    )
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
    if (lower.includes('less') || lower.includes('poor') || lower.includes('loss')) return 'red'
    if (lower.includes('good') || lower.includes('fair')) return 'green'
    if (lower.includes('reasonable') || lower.includes('moderate')) return 'orange'
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

    setTimeout(() => {
      html2pdf()
        .set({
          filename: `${report.client_ref}_report.pdf`,
          image: { type: 'jpeg', quality: 1 },
          html2canvas: {
            scale: 1.5,
            useCORS: true,
            logging: true,
          },
          jsPDF: {
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4',
          },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(element)
        .save()
    }, 500)
  }

  return (
    <div
      ref={reportRef}
      className="pdf-wrapper"
      style={{
        width: '100vw',
        maxWidth: '100%',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
        padding: '2rem',
        minHeight: '100vh',
        boxSizing: 'border-box',
        backgroundColor: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <img src="/Logoedit2.png" alt="Logo" style={{ height: '60px', marginRight: '1rem' }} />
        <h1 style={{ flex: 1, textAlign: 'center' }}>QUALITY CONTROL REPORT</h1>
      </div>

      <hr style={{ borderTop: '5px solid #ccc', margin: '2rem 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '14px' }}>
        <div style={{ width: '32%' }}>
          {renderField('Date', report.date)}
          {renderField('Consignee', report.client)}
          {renderField('Consignee Ref', report.client_ref)}
          {renderField('Container Number', report.container_number)}
          {renderField('RoChecks Ref', report.rochecks_ref)}
        </div>
        <div style={{ width: '32%' }}>
        {renderField('Supplier', report.supplier)}
          {renderField('Variety', report.variety)}
          {renderField('Origin', report.origin)}
          {renderField('Location', report.location)}
          {renderField('Total Pallets', report.total_pallets)}          
        </div>
        <div style={{ width: '32%' }}>
        {renderField('Type', report.type)}
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
            pageBreakAfter: 'always'
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
              {renderListField('External Coloration', sample.external_coloration)}
              {renderListField('Internal Coloration', sample.internal_coloration)}
              {renderConsistency(sample.consistency)}
              {renderMultilineField('Minor Defects', sample.minor_defects)}
              {renderMultilineField('Major Defects', sample.major_defects)}
              {renderField('Comments', sample.observations)}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'start', marginTop: '1rem', gap: '3rem' }}>
          <p style={{ color: getQualityColor(sample.quality_score), fontWeight: 'bold' }}>
  Quality Score: {sample.quality_score}
</p>
<p style={{ color: getStorageColor(sample.storage_score), fontWeight: 'bold' }}>
  Storage Score: {sample.storage_score}
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
      {attachments.length > 0 && (
  <div style={{ marginTop: '2rem' }}>
    <h3>Temp. recordes:</h3>
    {attachments.map((file, index) => {
      const publicUrl = supabase.storage
        .from('report-files')
        .getPublicUrl(`${reportId}/${file.name}`).data.publicUrl;

      return (
        <div key={file.name} style={{ marginBottom: '0.5rem' }}>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            📎 Download File {index + 1}
          </a>
        </div>
      );
    })}
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
