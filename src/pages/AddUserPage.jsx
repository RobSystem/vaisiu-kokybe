import { useState, useEffect } from 'react';
import supabaseAdmin from '../supabaseAdminClient';
import { supabase } from '../supabaseClient';

export default function AddUserPage() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editUserId, setEditUserId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (!error && data) setUsers(data.users);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);

    if (editUserId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(editUserId, {
        email: formData.email,
        password: formData.password,
        user_metadata: { name: formData.name, role: formData.role },
      });

      setMessage(error ? `Klaida: ${error.message}` : 'Vartotojas atnaujintas!');
    } else {
      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        user_metadata: { name: formData.name, role: formData.role },
        email_confirm: true
      });

      if (error) {
        setMessage(`Klaida: ${error.message}`);
      } else {
        setMessage('Vartotojas sukurtas sėkmingai!');
        await supabase.from('user_profiles').insert({
          id: newUser.user.id,
          name: formData.name,
          role: formData.role
        });
      }
    }

    setFormData({ name: '', email: '', password: '', role: 'user' });
    setEditUserId(null);
    fetchUsers();
    setShowModal(false);
    setLoading(false);
  };

  const handleEdit = (user) => {
    setFormData({
      name: user.user_metadata?.name || '',
      email: user.email,
      password: '',
      role: user.user_metadata?.role || 'user'
    });
    setEditUserId(user.id);
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Ar tikrai norite ištrinti šį vartotoją?')) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabase.from('user_profiles').delete().eq('id', userId);
      fetchUsers();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">User Management</h2>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add User</button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 shadow-sm">
          <thead className="bg-gray-100 text-gray-700 text-sm">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t text-sm text-gray-800">
                <td className="px-4 py-2">{user.user_metadata?.name || '—'}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">{user.user_metadata?.role || 'user'}</td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => handleEdit(user)} className="text-blue-600 hover:underline mr-3">Edit</button>
                  <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && <p className="text-sm text-green-600 mt-4">{message}</p>}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80 space-y-3">
            <h3 className="text-lg font-semibold">{editUserId ? 'Edit User' : 'Add New User'}</h3>
            <input
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            />
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={handleSubmit} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setShowModal(false); setEditUserId(null); }} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
