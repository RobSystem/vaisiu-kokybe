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
    e.preventDefault();
  
    // Paprasta validacija
    for (const [key, value] of Object.entries(formData)) {
      if (!value) {
        setMessage(`Laukas "${key}" yra privalomas.`);
        return;
      }
    }
  
    setLoading(true);
    const { error } = await supabase.from('reports').insert([formData]);
  
    if (error) {
      setMessage('Klaida kuriant ataskaitą.');
    } else {
      setMessage('Ataskaita sėkmingai sukurta ✅');
      setFormData(initialForm);
    }
  
    setLoading(false);
  };

  return (
    <div className="flex justify-center p-8">
      <div className="w-full max-w-7xl px-4 text-sm">
        <h2 className="text-2xl font-semibold text-center mb-8">Create Report</h2>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6"
        >
          {/* DATE */}
          <div>
            <label className="block mb-1 font-medium">DATE</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
  
          {/* VARIETY */}
          <div>
            <label className="block mb-1 font-medium">VARIETY</label>
            <input
              type="text"
              name="variety"
              value={formData.variety}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
  
          {/* CLIENT */}
          <div>
            <label className="block mb-1 font-medium">CLIENT</label>
            <select
              name="client"
              value={formData.client}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">-- Select client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
  
          {/* SUPPLIER */}
          <div>
            <label className="block mb-1 font-medium">SUPPLIER</label>
            <input
              type="text"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
  
          {/* CLIENT REF */}
          <div>
            <label className="block mb-1 font-medium">CLIENT REF</label>
            <input
              type="text"
              name="client_ref"
              value={formData.client_ref}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
  
          {/* ORIGIN */}
          <div>
            <label className="block mb-1 font-medium">ORIGIN</label>
            <input
              type="text"
              name="origin"
              value={formData.origin}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
  
          {/* CONTAINER NUMBER */}
          <div>
            <label className="block mb-1 font-medium">CONTAINER NUMBER</label>
            <input
              type="text"
              name="container_number"
              value={formData.container_number}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
  
          {/* LOCATION */}
          <div>
            <label className="block mb-1 font-medium">LOCATION</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
  
          {/* ROCHECKS REF */}
          <div>
            <label className="block mb-1 font-medium">ROCHECKS REF</label>
            <input
              type="text"
              name="rochecks_ref"
              value={formData.rochecks_ref}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
  
          {/* TOTAL PALLETS */}
          <div>
            <label className="block mb-1 font-medium">TOTAL PALLETS</label>
            <input
              type="text"
              name="total_pallets"
              value={formData.total_pallets}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
  
          {/* TYPE */}
          <div>
            <label className="block mb-1 font-medium">TYPE</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="Conventional">Conventional</option>
              <option value="Organic">Organic</option>
            </select>
          </div>
  
          {/* SURVEYOR */}
          <div>
            <label className="block mb-1 font-medium">SURVEYOR</label>
            <select
              name="surveyor"
              value={formData.surveyor}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">-- Select surveyor --</option>
              {userProfile?.role === 'admin'
                ? users.map((u) => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))
                : userProfile && (
                  <option key={userProfile.name} value={userProfile.name}>{userProfile.name}</option>
                )}
            </select>
          </div>
  
          {/* BUTTON */}
          <div className="col-span-1 md:col-span-2 text-center">
          <button
  type="submit"
  disabled={loading}
  className={`w-full py-3 rounded-md text-white font-semibold transition duration-200
    ${loading ? 'bg-gray-400 cursor-not-allowed animate-pulse' : 'bg-green-600 hover:bg-green-700'}`}
>
  {loading ? 'Kuriama...' : 'Create Report'}
</button>
            {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateReport
