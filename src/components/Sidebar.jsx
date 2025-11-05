import { useEffect, useState } from 'react';
 import { supabase } from "../supabaseClient";

function Sidebar({ navigate, onLogout }) {
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const getUserInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        setRole(user.user_metadata?.role || 'user');
        setUserName(user.user_metadata?.name || 'User');
      }
    };
    getUserInfo();
  }, []);

  const navItemsMain = [
  ...(role === 'admin' ? [{ label: 'Dashboard', path: '/dashboard' }] : []),
    { label: 'Create Report', path: '/create' },
    { label: 'All Reports', path: '/all' },
    { label: 'Done Reports', path: '/done' },
    ...(role === 'admin' ? [{ label: 'Admin Panel', path: '/admin' }] : [])
  ];

  return (
    <div className="w-56 h-screen bg-gray-100 border-r flex flex-col justify-between p-4">
      <div>
        <h2 className="text-center text-lg font-semibold mb-6">{userName}</h2>
        <nav className="flex flex-col gap-2">
          {navItemsMain.map((item) => (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              className="px-3 py-2 rounded hover:bg-gray-200 cursor-pointer font-medium transition"
            >
              {item.label}
            </div>
          ))}
        </nav>
      </div>
      <div className="flex flex-col gap-2 mt-4">
        <div
          onClick={onLogout}
          className="px-3 py-2 rounded hover:bg-red-100 text-red-600 cursor-pointer font-medium transition"
        >
          Log Out
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
