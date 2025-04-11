import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

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
  console.log('Vartotojo rolė:', role);
  const navItemsMain = [
    { label: 'Dashboard', path: '/' },
    { label: 'Create Report', path: '/create' },
    { label: 'All Reports', path: '/all' },
    { label: 'Done Reports', path: '/done' },
    ...(role === 'admin' ? [{ label: 'Admin Panel', path: '/admin' }] : [])
  ];

  return (
    <div style={styles.sidebar}>
      <div>
        <h2 style={styles.logo}>{userName}</h2>
        <nav style={styles.nav}>
          {navItemsMain.map(item => (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              style={styles.navItem}
            >
              {item.label}
            </div>
          ))}
        </nav>
      </div>

      <div style={styles.bottomSection}>
        <div onClick={onLogout} style={styles.navItem}>
          Log Out
        </div>
      </div>
    </div>
  );
}


const styles = {
  sidebar: {
    width: '220px',
    height: '100vh',
    background: '#ffffff',
    borderRight: '1px solid #ddd',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '1.5rem 1rem'
  },
  logo: {
    marginBottom: '2rem',
    textAlign: 'center'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  navItem: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'background 0.2s ease'
  },
  bottomSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
    marginTop: 'auto'
  }
}

export default Sidebar