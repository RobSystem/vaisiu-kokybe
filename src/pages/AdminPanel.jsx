import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function AdminPanel() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user?.user_metadata?.role !== 'admin') {
        navigate('/'); // arba '/unauthorized'
      } else {
        setRole('admin');
      }
    };
    checkRole();
  }, [navigate]);

  if (role !== 'admin') return null; // rodo tuščią kol tikrinama

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
