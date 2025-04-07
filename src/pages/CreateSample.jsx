import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function CreateSample() {
  const navigate = useNavigate()
  const { reportId, sampleId } = useParams()
  useEffect(() => {
    const fetchSample = async () => {
      if (!sampleId) return
  
      const { data, error } = await supabase
        .from('samples')
        .select('*')
        .eq('id', sampleId)
        .single()
  
      if (error) {
        console.error('Klaida gaunant sample:', error.message)
        return
      }
  
      setForm(data)
      setFruitWeightsExtra(data.fruit_weights_extra || [])
      setExternalColoration(data.external_coloration || [])
      setInternalColoration(data.internal_coloration || [])
      setConsistency(data.consistency || { hard: '', sensitive: '', soft: '' })
    }
  
    fetchSample()
  }, [sampleId])

  const [form, setForm] = useState({
    pallet_number: '',
    ggn_number: '',
    ggn_exp_date: '',
    grower_code: '',
    packing_code: '',
    variety: '',
    brand: '',
    packing_type: '',
    size: '',
    box_weight_min: '',
    box_weight_max: '',
    fruit_weight_min: '',
    fruit_weight_max: '',
    pressures_min: '',
    pressures_max: '',
    brix_min: '',
    brix_max: '',
    fruit_diameter_min: '',
    fruit_diameter_max: '',
    minor_defects: '',
    major_defects: '',
    quality_score: '',
    storage_score: ''
  })

  const [fruitWeightsExtra, setFruitWeightsExtra] = useState([])
  const [externalColoration, setExternalColoration] = useState([])
  const [internalColoration, setInternalColoration] = useState([])
  const [consistency, setConsistency] = useState({ hard: '', sensitive: '', soft: '' })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleConsistencyChange = (type, value) => {
    setConsistency(prev => ({ ...prev, [type]: value }))
  }

  const handleAddWeight = () => setFruitWeightsExtra(Array(10).fill(''))
  
  const handleRemoveWeight = (index) => {
    const updated = [...fruitWeightsExtra];
    updated.splice(index, 1);
    setFruitWeightsExtra(updated);
  };

  const handleWeightChange = (index, value) => {
    const updated = [...fruitWeightsExtra]
    updated[index] = value
    setFruitWeightsExtra(updated)
  }

  const addColoration = (type) => {
    const setter = type === 'external' ? setExternalColoration : setInternalColoration
    setter(prev => [...prev, { color: '', percent: '' }])
  }

  const updateColoration = (type, index, field, value) => {
    const list = type === 'external' ? [...externalColoration] : [...internalColoration]
    list[index][field] = value
    type === 'external' ? setExternalColoration(list) : setInternalColoration(list)
  }

  const removeColoration = (type, index) => {
    const list = type === 'external' ? [...externalColoration] : [...internalColoration]
    list.splice(index, 1)
    type === 'external' ? setExternalColoration(list) : setInternalColoration(list)
  }

  const handleSave = async () => {
    const cleanedForm = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        value === '' || value === 'Pasirinkti' ? null : value
      ])
    );
  
    const { error } = sampleId
      ? await supabase.from('samples').update({
          ...cleanedForm,
          fruit_weights_extra: fruitWeightsExtra.length > 0 ? fruitWeightsExtra : null,
          external_coloration: externalColoration.length > 0 ? externalColoration : null,
          internal_coloration: internalColoration.length > 0 ? internalColoration : null,
          consistency: consistency
        }).eq('id', sampleId)
        : await supabase.from('samples').insert({
          report_id: reportId, // ← taisyta čia!
          ...cleanedForm,
          fruit_weights_extra: fruitWeightsExtra.length > 0 ? fruitWeightsExtra : null,
          external_coloration: externalColoration.length > 0 ? externalColoration : null,
          internal_coloration: internalColoration.length > 0 ? internalColoration : null,
          consistency: consistency
        })
      console.log("Duomenys siunčiami į Supabase:", {
        report_id: parseInt(reportId),
        ...cleanedForm,
        fruit_weights_extra: fruitWeightsExtra.length > 0 ? fruitWeightsExtra : null,
        external_coloration: externalColoration.length > 0 ? externalColoration : null,
        internal_coloration: internalColoration.length > 0 ? internalColoration : null,
        consistency: consistency
      })
  
    if (error) {
      alert('Nepavyko išsaugoti')
    } else {
      alert('Išsaugota sėkmingai!')
      navigate(`/edit/${reportId}`)
    }
  }

  const renderInputField = (label, name, type = 'text') => (
    <div style={{ flex: 1 }}>
      <label style={{ fontWeight: 'bold' }}>{label}</label>
      <input
        name={name}
        placeholder={label}
        type={type}
        value={form[name] || ''}
        onChange={handleChange}
        style={inputStyle}
      />
    </div>
  )

  const renderTextArea = (label, name) => (
    <div style={{ flex: 1 }}>
      <label style={{ fontWeight: 'bold' }}>{label}</label>
      <textarea
        name={name}
        placeholder={label}
        value={form[name] || ''}
        onChange={handleChange}
        style={{ ...inputStyle, height: '80px' }}
      />
    </div>
  )

  const renderSelectField = (label, name, options) => (
    <div style={{ flex: 1 }}>
      <label style={{ fontWeight: 'bold' }}>{label}</label>
      <select
        name={name}
        value={form[name] || ''}
        onChange={handleChange}
        style={inputStyle}
      >
        {options.map((option, index) => (
          <option key={index} value={option}>{option}</option>
        ))}
      </select>
    </div>
  )

  return (
    <div style={{ padding: '2rem', width: '100%', height: '100%', boxSizing: 'border-box' }}>
      <h2>New Sample</h2>

      <h3>GENERAL INFORMATION</h3>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {renderInputField('Pallet number', 'pallet_number')}
        {renderInputField('GGN number', 'ggn_number')}
        {renderInputField('GGN exp. date', 'ggn_exp_date',)}
        {renderInputField('Grower code', 'grower_code')}
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        {renderInputField('Packing code', 'packing_code')}
        {renderInputField('Variety', 'variety')}
        {renderInputField('Brand', 'brand')}
      </div>
      <hr style={divider} />

      <h3>EXTRA INFORMATION</h3>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {renderInputField('Packing type', 'packing_type')}
        {renderInputField('Size', 'size')}
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        {renderInputField('Box weight min', 'box_weight_min')}
        {renderInputField('Box weight max', 'box_weight_max')}
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        {renderInputField('Fruit weight min', 'fruit_weight_min')}
        {renderInputField('Fruit weight max', 'fruit_weight_max')}
        <button onClick={handleAddWeight}>Add Weight</button>
      </div>
      {fruitWeightsExtra.length > 0 && (
  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
    {fruitWeightsExtra.map((val, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
        <input
          value={val}
          placeholder={`#${i + 1}`}
          onChange={(e) => handleWeightChange(i, e.target.value)}
          style={{ width: '50px' }}
        />
        <button
          onClick={() => handleRemoveWeight(i)}
          style={{ marginLeft: '10px', cursor: 'pointer' }}
        >
          ❌
        </button>
      </div>
    ))}
  </div>
)}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        {renderInputField('Pressures min', 'pressures_min')}
        {renderInputField('Pressures max', 'pressures_max')}
        {renderInputField('Brix min', 'brix_min')}
        {renderInputField('Brix max', 'brix_max')}
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        {renderInputField('Fruit diameter min', 'fruit_diameter_min')}
        {renderInputField('Fruit diameter max', 'fruit_diameter_max')}
      </div>
      <hr style={divider} />

      <h3>COLORATION</h3>

<div style={{ marginBottom: '1rem' }}>
  <button onClick={() => addColoration('external')} style={{ marginBottom: '0.5rem' }}>Add External Coloration</button>
</div>

{externalColoration.map((item, i) => (
  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
    <select onChange={(e) => updateColoration('external', i, 'color', e.target.value)} value={item.color}>
      <option>Pasirinkti</option>
      <option>Green</option><option>Light Green</option><option>Yellow</option><option>Turning</option><option>Orange</option><option>Brown</option><option>White</option><option>Beige</option><option>Green Tinges</option><option>Red</option><option>Purple</option>
    </select>
    <select onChange={(e) => updateColoration('external', i, 'percent', e.target.value)} value={item.percent}>
      {[...Array(21)].map((_, i) => <option key={i}>{i * 5}%</option>)}
    </select>
    <button onClick={() => removeColoration('external', i)}>Delete</button>
  </div>
))}

<div style={{ marginBottom: '1rem' }}>
  <button onClick={() => addColoration('internal')} style={{ marginBottom: '0.5rem' }}>Add Internal Coloration</button>
</div>

{internalColoration.map((item, i) => (
  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
    <select onChange={(e) => updateColoration('internal', i, 'color', e.target.value)} value={item.color}>
      <option>Pasirinkti</option>
      <option>Green</option><option>Light Green</option><option>Yellow</option><option>Orange</option><option>Light Yellow</option><option>White</option><option>Red</option><option>Purple</option>
    </select>
    <select onChange={(e) => updateColoration('internal', i, 'percent', e.target.value)} value={item.percent}>
      {[...Array(21)].map((_, i) => <option key={i}>{i * 5}%</option>)}
    </select>
    <button onClick={() => removeColoration('internal', i)}>Delete</button>
  </div>
))}

<h3>Consistency</h3>
<div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
  <div style={{ flex: 1 }}>
    <label style={{ fontWeight: 'bold' }}>Hard/Firm</label>
    <select onChange={(e) => handleConsistencyChange('hard', e.target.value)} value={consistency.hard} style={inputStyle}>
      {[...Array(21)].map((_, i) => <option key={i}>{i * 5}%</option>)}
    </select>
  </div>
  <div style={{ flex: 1 }}>
    <label style={{ fontWeight: 'bold' }}>Sensitive</label>
    <select onChange={(e) => handleConsistencyChange('sensitive', e.target.value)} value={consistency.sensitive} style={inputStyle}>
      {[...Array(21)].map((_, i) => <option key={i}>{i * 5}%</option>)}
    </select>
  </div>
  <div style={{ flex: 1 }}>
    <label style={{ fontWeight: 'bold' }}>Soft</label>
    <select onChange={(e) => handleConsistencyChange('soft', e.target.value)} value={consistency.soft} style={inputStyle}>
      {[...Array(21)].map((_, i) => <option key={i}>{i * 5}%</option>)}
    </select>
  </div>
</div>

      <hr style={divider} />

      <h3>DEFECTS</h3>
      {renderTextArea('Major defects', 'major_defects')}
      {renderTextArea('Minor defects', 'minor_defects')}
      <hr style={divider} />

      <h3>SCORING</h3>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {renderSelectField('Quality score', 'quality_score', ['Pasirinkti', '7 - Good', '6 - Fair', '5 - Reasonable', '4 - Moderate', '3 - Less than moderate', '2 - Poor', '1 - Total Loss'])}
        {renderSelectField('Storage score', 'storage_score', ['Pasirinkti', '7 - Good', '6 - Normal', '5 - Reduced', '4 - Moderate', '3 - Limited', '2 - Poor', '1 - No storage potential'])}
      </div>
      <hr style={divider} />

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={handleSave}>SAVE AND BACK</button>
        <button onClick={() => navigate(`/upload-photos/${sampleId}`)}>UPLOAD PHOTOS</button>
      </div>
    </div>
  )
}

const inputStyle = {
  padding: '0.5rem',
  borderRadius: '6px',
  border: '1px solid #ccc',
  width: '100%',
  boxSizing: 'border-box'
}

const divider = {
  height: '5px',
  background: '#ccc',
  margin: '2rem 0'
}

export default CreateSample
