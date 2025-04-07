import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const initialForm = {
  date: '',
  client: '',
  client_ref: '',
  container_number: '',
  rochecks_ref: '',
  variety: '',
  origin: '',
  location: '',
  total_pallets: '',
  type: 'Conventional',
  surveyor: '',
  status: 'active'
}

function CreateReport() {
  const [formData, setFormData] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [clients, setClients] = useState([])

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase.from('clients').select()
      if (!error) setClients(data)
    }
    fetchClients()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('reports').insert([formData])
    if (error) {
      setMessage('Klaida kuriant ataskaitą.')
    } else {
      setMessage('Ataskaita sėkmingai sukurta ✅')
      setFormData(initialForm)
    }

    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '500px', marginLeft: '3rem' }}>
      <h2>Create Report</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[['date', 'DATE', 'date']].map(([name, label, type]) => (
          <div key={name}>
            <label>{label}</label>
            <input
              type={type}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
        ))}

        {/* CLIENT SELECT */}
        <div>
          <label>CLIENT</label>
          <select
            name="client"
            value={formData.client}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          >
            <option value="">-- Select client --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {[
          ['client_ref', 'CLIENT REF'],
          ['container_number', 'CONTAINER NUMBER'],
          ['rochecks_ref', 'ROCHECKS REF'],
          ['variety', 'VARIETY'],
          ['origin', 'ORIGIN'],
          ['location', 'LOCATION'],
          ['total_pallets', 'TOTAL PALLETS']
        ].map(([name, label]) => (
          <div key={name}>
            <label>{label}</label>
            <input
              type="text"
              name={name}
              value={formData[name]}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
        ))}

        <div>
          <label>TYPE</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            <option value="Conventional">Conventional</option>
            <option value="Organic">Organic</option>
          </select>
        </div>

        <div>
          <label>SURVEYOR</label>
          <input
            type="text"
            name="surveyor"
            value={formData.surveyor}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: '0.75rem', background: '#4caf50', color: 'white', border: 'none', borderRadius: '6px' }}
        >
          {loading ? 'Kuriama...' : 'Create Report'}
        </button>

        {message && <p>{message}</p>}
      </form>
    </div>
  )
}

export default CreateReport
