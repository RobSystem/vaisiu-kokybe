import { useState } from 'react';
import { supabase } from '../supabaseClient';

function AddUserPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      user_metadata: { name: formData.name, role: formData.role },
      email_confirm: true
    });

    if (error) {
      setMessage(`Klaida: ${error.message}`);
    } else {
      setMessage('Vartotojas sukurtas sekmingai!');
      setFormData({ name: '', email: '', password: '', role: 'user' });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Add New User</h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: '400px' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Name:</label>
          <input
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Email:</label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Password:</label>
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Role:</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.5rem', fontSize: '16px' }}>
          {loading ? 'Saving...' : 'Add User'}
        </button>
      </form>
      {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
    </div>
  );
}

export default AddUserPage;
