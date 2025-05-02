import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const initialForm = {
  date: '',
  client: '',
  client_ref: '',
  container_number: '',
  rochecks_ref: '',
  supplier: '',
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
  const [users, setUsers] = useState([])
  const [userProfile, setUserProfile] = useState(null);

 useEffect(() => {
  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name');

    if (!error) {
      setClients(data);
    } else {
      console.error('Klaida gaunant klientus:', error.message);
    }
  };

  fetchClients();
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, name');
  
    if (!error) {
      setUsers(data);
    }
  };
  fetchUsers();

const fetchUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('name, role')
    .eq('id', user.id)
    .single();

  if (!error && data) {
    setUserProfile(data);
  }
};

fetchUserProfile();
}, []);

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    console.log('Siunčiami duomenys:', formData);
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
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
  <div style={{ maxWidth: '900px', width: '100%' }}>
    <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Create Report</h2>
    <form
  onSubmit={handleSubmit}
  style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    columnGap: '2rem',
    rowGap: '1.5rem',
    maxWidth: '900px',
    margin: '0 auto',
  }}
>
      {/* DATE */}
      <div style={{ marginBottom: '1rem' }}>
        <label>DATE</label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      {/* VARIETY */}
      <div style={{ marginBottom: '1rem' }}>
        <label>VARIETY</label>
        <input
          type="text"
          name="variety"
          value={formData.variety}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      {/* CLIENT */}
      <div style={{ marginBottom: '1rem' }}>
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

      {/* SUPPLIER */}
      <div style={{ marginBottom: '1rem' }}>
        <label>SUPPLIER</label>
        <input
          type="text"
          name="supplier"
          value={formData.supplier}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      {/* CLIENT REF */}
      <div style={{ marginBottom: '1rem' }}>
        <label>CLIENT REF</label>
        <input
          type="text"
          name="client_ref"
          value={formData.client_ref}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      {/* ORIGIN */}
      <div style={{ marginBottom: '1rem' }}> 
        <label>ORIGIN</label>
        <input
          type="text"
          name="origin"
          value={formData.origin}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      {/* CONTAINER NUMBER */}
      <div style={{ marginBottom: '1rem' }}>
        <label>CONTAINER NUMBER</label>
        <input
          type="text"
          name="container_number"
          value={formData.container_number}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      {/* LOCATION */}
      <div style={{ marginBottom: '1rem' }}>
        <label>LOCATION</label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      {/* ROCHECKS REF */}
      <div style={{ marginBottom: '1rem' }}>
        <label>ROCHECKS REF</label>
        <input
          type="text"
          name="rochecks_ref"
          value={formData.rochecks_ref}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      {/* TOTAL PALLETS */}
      <div style={{ marginBottom: '1rem' }}>
        <label>TOTAL PALLETS</label>
        <input
          type="text"
          name="total_pallets"
          value={formData.total_pallets}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      {/* TYPE */}
      <div style={{ marginBottom: '1rem' }}>
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

      {/* SURVEYOR */}
      <div style={{ marginBottom: '1rem' }}>
        <label>SURVEYOR</label>
        <select
          name="surveyor"
          value={formData.surveyor}
          onChange={handleChange}
          style={{ width: '100%', padding: '0.5rem' }}
        >
          <option value="">-- Select surveyor --</option>
          {userProfile?.role === 'admin'
            ? users.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))
            : userProfile && (
              <option key={userProfile.name} value={userProfile.name}>
                {userProfile.name}
              </option>
            )}
        </select>
      </div>

      {/* BUTTON - center across both columns */}
      <div style={{ gridColumn: 'span 2', textAlign: 'center' }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.75rem',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            width: '50%'
          }}
        >
          {loading ? 'Kuriama...' : 'Create Report'}
        </button>
        {message && <p>{message}</p>}
      </div>
    </form>
  </div>
</div>
  )
}

export default CreateReport
