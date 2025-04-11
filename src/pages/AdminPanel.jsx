import { useNavigate } from 'react-router-dom';

function AdminPanel() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Admin Panel</h1>
      <button
        style={{ padding: '0.75rem 1.5rem', fontSize: '16px', cursor: 'pointer' }}
        onClick={() => navigate('/admin/clients')}
      >
        Add Client
      </button>
      <button
  style={{ padding: '0.75rem 1.5rem', fontSize: '16px', cursor: 'pointer', marginLeft: '1rem' }}
  onClick={() => navigate('/admin/add-user')}
>
  Add User
</button>
    </div>
  );
}

export default AdminPanel;