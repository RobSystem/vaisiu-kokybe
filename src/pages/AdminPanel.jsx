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

  if (role !== 'admin') return null;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-8">Admin Panel</h1>
      <div className="flex gap-4">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded"
          onClick={() => navigate('/admin/clients')}
        >
          Add Client
        </button>
        <button
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded"
          onClick={() => navigate('/admin/add-user')}
        >
          Add User
        </button>
      </div>
    </div>
  );
}

export default AdminPanel;
