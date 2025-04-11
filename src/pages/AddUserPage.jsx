import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import supabaseAdmin from '../utils/supabaseAdminClient'

function AddUserPage() {
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
    const { data, error } = await supabase.auth.admin.listUsers();
    if (!error && data) setUsers(data.users);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    if (editUserId) {
      const { error } = await supabase.auth.admin.updateUserById(editUserId, {
        email: formData.email,
        password: formData.password,
        user_metadata: { name: formData.name, role: formData.role },
      });
      if (error) {
        setMessage(`Klaida: ${error.message}`);
      } else {
        setMessage('Vartotojas atnaujintas!');
      }
    } else {
      const { error } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        user_metadata: { name: formData.name, role: formData.role },
        email_confirm: true
      });
      if (error) {
        setMessage(`Klaida: ${error.message}`);
      } else {
        setMessage('Vartotojas sukurtas sekmingai!');
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
    if (window.confirm('Ar tikrai norite istrinti si vartotoja?')) {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) {
        alert('Klaida tryniant vartotoja');
      } else {
        fetchUsers();
      }
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>User Management</h2>
      <button onClick={() => setShowModal(true)}>Add User</button>

      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>{editUserId ? 'Edit User' : 'Add New User'}</h3>
            <input
              type="text"
              placeholder="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={styles.input}
            />
            <input
              type="email"
              placeholder="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={styles.input}
            />
            <input
              type="password"
              placeholder="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              style={styles.input}
            />
            <select name="role" value={formData.role} onChange={handleChange} style={styles.input}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <div style={{ marginTop: '1rem' }}>
              <button onClick={handleSubmit} style={styles.button} disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setShowModal(false); setEditUserId(null); }} style={styles.cancelButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={styles.td}>{user.user_metadata?.name || '—'}</td>
              <td style={styles.td}>{user.email}</td>
              <td style={styles.td}>{user.user_metadata?.role || 'user'}</td>
              <td style={styles.td}>
                <button onClick={() => handleEdit(user)} style={{ marginRight: '0.5rem' }}>Edit</button>
                <button onClick={() => handleDelete(user.id)} style={{ backgroundColor: '#e53935', color: 'white' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    background: 'white',
    padding: '2rem',
    borderRadius: '8px',
    width: '300px',
    display: 'flex',
    flexDirection: 'column'
  },
  input: {
    marginBottom: '1rem',
    padding: '0.5rem',
    fontSize: '14px'
  },
  button: {
    padding: '0.5rem 1rem',
    marginRight: '1rem',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px'
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ccc',
    border: 'none',
    borderRadius: '4px'
  },
  table: {
    marginTop: '2rem',
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  th: {
    borderBottom: '1px solid #ccc',
    padding: '0.75rem',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  td: {
    padding: '0.75rem',
    borderBottom: '1px solid #eee',
    textAlign: 'center',
  }
};

export default AddUserPage;