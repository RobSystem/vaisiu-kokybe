import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

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
};

function CreateReport() {
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase.from('clients').select('id, name');
      if (!error) setClients(data);
    };

    const fetchUsers = async () => {
      const { data, error } = await supabase.from('user_profiles').select('id, name');
      if (!error) setUsers(data);
    };

    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('name, role')
        .eq('id', user.id)
        .single();
      if (!error && data) setUserProfile(data);
    };

    fetchClients();
    fetchUsers();
    fetchUserProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    <div className="w-full max-w-4xl mx-auto px-6 py-12">
      <h2 className="text-3xl font-bold text-center mb-8">Create Report</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">DATE</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">VARIETY</label>
          <input type="text" name="variety" value={formData.variety} onChange={handleChange} required className="w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">CLIENT</label>
          <select name="client" value={formData.client} onChange={handleChange} required className="w-full border border-gray-300 rounded-md p-2">
            <option value="">-- Select client --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">SUPPLIER</label>
          <input type="text" name="supplier" value={formData.supplier} onChange={handleChange} required className="w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">CONTAINER NUMBER</label>
          <input type="text" name="container_number" value={formData.container_number} onChange={handleChange} required className="w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">ORIGIN</label>
          <input type="text" name="origin" value={formData.origin} onChange={handleChange} required className="w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">ROCHECKS REF</label>
          <input type="text" name="rochecks_ref" value={formData.rochecks_ref} onChange={handleChange} required className="w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">LOCATION</label>
          <input type="text" name="location" value={formData.location} onChange={handleChange} required className="w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">TYPE</label>
          <select name="type" value={formData.type} onChange={handleChange} className="w-full border border-gray-300 rounded-md p-2">
            <option value="Conventional">Conventional</option>
            <option value="Organic">Organic</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">TOTAL PALLETS</label>
          <input type="text" name="total_pallets" value={formData.total_pallets} onChange={handleChange} required className="w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">SURVEYOR</label>
          <select name="surveyor" value={formData.surveyor} onChange={handleChange} required className="w-full border border-gray-300 rounded-md p-2">
            <option value="">-- Select surveyor --</option>
            {userProfile?.role === 'admin'
              ? users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)
              : userProfile && (
                  <option key={userProfile.name} value={userProfile.name}>{userProfile.name}</option>
                )}
          </select>
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-md">
            {loading ? 'Kuriama...' : 'Create Report'}
          </button>
        </div>
        {message && <p className="md:col-span-2 text-green-600 text-sm mt-2">{message}</p>}
      </form>
    </div>
  );
}

export default CreateReport;
