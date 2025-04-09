import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useParams } from 'react-router-dom'

function EditReport() {
  const [form, setForm] = useState({
        brand: '',
        temperature: '',
        category: 'CLASS I',
    qualityScore: '',
    storageScore: '',
    conclusion: ''
  })
  const [report, setReport] = useState(null)
  const [samples, setSamples] = useState([])
  const { reportId } = useParams()

  useEffect(() => {
    const fetchReport = async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single()
      setReport(data)

      if (data) {
        setForm({
          brand: data.brand || '',
          temperature: data.temperature || '',
          category: data.category || 'CLASS I',
          qualityScore: data.qualityScore || '',
          storageScore: data.storageScore || '',
          conclusion: data.conclusion || ''
        })
        fetchSamples(data.id)
      }
    }

    if (reportId) {
      fetchReport()
    }
  }, [reportId])

  const fetchSamples = async (reportId) => {
    const { data, error } = await supabase
      .from('samples')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true }) // ← Rūšiuojam pagal sukūrimo laiką
  
    if (!error) {
      setSamples(data)
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddSample = () => {
    if (report?.id) {
      window.location.href = `/create-sample/${report.id}`
    }
  }

  const handleSave = async () => {
    const { error } = await supabase
      .from('reports')
      .update({
        ...form,
        samples: samples
      })
      .eq('id', report.id)

    if (error) {
      console.error('Klaida saugant:', error.message)
      alert('Nepavyko išsaugoti')
    } else {
      alert('Sėkmingai išsaugota!')
    }
  }

  // Functions for sample actions
  const handleEditSample = (sampleId) => {
  window.location.href = `/create-sample/${reportId}/${sampleId}`
    // Galite nukreipti į redagavimo puslapį arba atidaryti modalinį langą
  }

  const handleCopySample = async (sampleId) => {
    const { data: sampleToCopy, error: fetchError } = await supabase
      .from('samples')
      .select('*')
      .eq('id', sampleId)
      .single();
  
    if (fetchError || !sampleToCopy) {
      console.error('Nepavyko gauti sample:', fetchError?.message);
      alert('Nepavyko gauti sample kopijai');
      return;
    }
  
    const { id, created_at, ...newSample } = sampleToCopy;
  
    const { data, error } = await supabase
      .from('samples')
      .insert([{ ...newSample, created_at }])
      .select();
  
    if (error) {
      console.error('Klaida kopijuojant:', error.message);
      alert('Nepavyko kopijuoti');
      return;
    }
  
    const { data: updatedSamples, error: fetchError2 } = await supabase
      .from('samples')
      .select('*')
      .eq('report_id', sampleToCopy.report_id)
      .order('created_at', { ascending: true });
  
    if (fetchError2) {
      console.error('Nepavyko atnaujinti sąrašo');
      alert('Nepavyko atnaujinti sąrašo');
      return;
    }
  
    setSamples(updatedSamples);
    alert('Kopija sėkmingai sukurta!');
  };
  
  

  const handleDeleteSample = async (sampleId) => {
    const { error } = await supabase.from('samples').delete().eq('id', sampleId)
    if (error) {
      console.error('Klaida trinant:', error.message)
      alert('Nepavyko ištrinti')
    } else {
      setSamples(samples.filter(s => s.id !== sampleId))
      alert('Ištrinta sėkmingai!')
    }
  }

  return (
    <div style={{ padding: '2rem', width: '100%', height: '100%', boxSizing: 'border-box' }}>
      <h2>Edit Report</h2>

      {/* Pirma eilutė */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label>BRAND</label>
          <input type="text" name="brand" value={form.brand} onChange={handleFormChange} style={styles.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label>TEMPERATURE</label>
          <input type="text" name="temperature" value={form.temperature} onChange={handleFormChange} style={styles.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label>CATEGORY</label>
          <select name="category" value={form.category} onChange={handleFormChange} style={styles.input}>
            <option>Pasirinkti</option>
            <option>Class I</option>
            <option>CLASS II</option>
            <option>INDUSTRY CLASS</option>
            <option>CLASS I & CLASS II</option>
          </select>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Quality & Storage Score */}
      <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
        <div style={{ flex: 1 }}>
          <label>QUALITY SCORE</label>
          <select name="qualityScore" value={form.qualityScore} onChange={handleFormChange} style={styles.input}>
            <option value="">Pasirinkti</option>
            <option>7 - Good</option>
            <option>6 - Fair</option>
            <option>5 - Reasonable</option>
            <option>4 - Moderate</option>
            <option>3 - Less than moderate</option>
            <option>2 - Poor</option>
            <option>1 - Total loss</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>STORAGE SCORE</label>
          <select name="storageScore" value={form.storageScore} onChange={handleFormChange} style={styles.input}>
            <option value="">Pasirinkti</option>
            <option>7 - Good</option>
            <option>6 - Normal</option>
            <option>5 - Reduced</option>
            <option>4 - Moderate</option>
            <option>3 - Limited</option>
            <option>2 - Poor</option>
            <option>1 - No storage potential</option>
          </select>
        </div>
      </div>

      {/* Conclusion */}
      <div>
        <label>CONCLUSION</label>
        <textarea name="conclusion" value={form.conclusion} onChange={handleFormChange} style={styles.textarea} />
      </div>

      <div style={styles.divider} />

      {/* Sample Table */}
      <h3>SAMPLES</h3>
      <button onClick={handleAddSample} style={{ marginBottom: '1rem', ...styles.buttonSecondary }}>ADD SAMPLE</button>

      {samples.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3rem' }}>
          <thead>
            <tr>
              {['#', 'Pallet number', 'Quality Score', 'Storage Score', 'Action'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
          {[...samples]
  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  .map((s, i) => (
    <tr key={s.id}>
      <td style={styles.td}>{i + 1}</td>
      <td style={styles.td}>{s.pallet_number}</td>
      <td style={styles.td}>{s.quality_score}</td>
      <td style={styles.td}>{s.storage_score}</td>
      <td style={styles.td}>
        <button onClick={() => handleEditSample(s.id)} style={styles.buttonSecondary}>EDIT</button>
        <button onClick={() => handleCopySample(s.id)} style={styles.buttonSecondary}>COPY</button>
        <button onClick={() => handleDeleteSample(s.id)} style={styles.buttonSecondary}>DELETE</button>
      </td>
    </tr>
))}
          </tbody>
        </table>
      ) : (
        <p>Nėra pridėtų sample.</p>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={handleSave} style={styles.buttonPrimary}>SAVE</button>
      </div>
    </div>
  )
}

const styles = {
  input: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '6px',
    border: '1px solid #ccc'
  },
  textarea: {
    width: '100%',
    height: '100px',
    padding: '0.5rem',
    borderRadius: '6px',
    border: '1px solid #ccc',
    resize: 'vertical'
  },
  divider: {
    height: '5px',
    background: '#ccc',
    margin: '2rem 0'
  },
  th: {
    textAlign: 'left',
    padding: '0.5rem',
    background: '#f5f5f5'
  },
  td: {
    padding: '0.5rem'
  },
  buttonPrimary: {
    padding: '0.75rem 1.5rem',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  buttonSecondary: {
    padding: '0.75rem 1.5rem',
    background: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  }
}

export default EditReport
