import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Sidebar from './components/Sidebar'
import CreateReport from './pages/CreateReport'
import AllReports from './pages/AllReports'
import DoneReports from './pages/DoneReports'
import EditReport from './pages/EditReport'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import CreateSample from './pages/CreateSample'
import UploadPhotos from './pages/UploadPhotos'
import ViewReport from './pages/ViewReport'
import AdminPanel from './pages/AdminPanel'
import AdminClients from './pages/AdminClients'


function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrorMsg(error.message)
    } else {
      onLogin(data.user)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Prisijungimas</h2>
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="email"
            placeholder="El. paštas"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Slaptažodis"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" style={styles.button}>Prisijungti</button>
        </form>
        {errorMsg && <p style={styles.error}>{errorMsg}</p>}
      </div>
    </div>
  )
}

function MainApp({ user, onLogout }) {
  const [selectedReport, setSelectedReport] = useState(null)
  const navigate = useNavigate()

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      <Sidebar onLogout={onLogout} navigate={navigate} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<h1>DASHBOARD</h1>} />
          <Route path="/create" element={<CreateReport />} />
          <Route path="/all" element={
            <AllReports
              setSelectedReport={setSelectedReport}
              setActivePage={() => {}}
            />
          } />
          <Route path="/done" element={<DoneReports />} />
          <Route path="/edit/:reportId" element={<EditReport />} />
          <Route path="/create-sample/:reportId" element={<CreateSample />} />
          <Route path="/create-sample/:reportId/:sampleId" element={<CreateSample />} />
          <Route path="/upload-photos/:sampleId" element={<UploadPhotos />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/clients" element={<AdminClients />} />
                </Routes>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <Router>
  <Routes>
    {/* VISIEMS prieinamas viešas maršrutas */}
    <Route path="/viewreport/:reportId" element={<ViewReport />} />

    {/* Visi kiti maršrutai valdomi per loginą */}
    <Route path="*" element={
      loading ? null : !user
        ? <Login onLogin={setUser} />
        : <MainApp user={user} onLogout={handleLogout} />
    } />
  </Routes>
</Router>
  )
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#f5f5f5'
  },
  card: {
    background: '#fff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    minWidth: '300px'
  },
  title: {
    marginBottom: '1.5rem',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  input: {
    padding: '0.75rem',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #ccc'
  },
  button: {
    padding: '0.75rem',
    background: '#4caf50',
    color: 'white',
    fontSize: '1rem',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  error: {
    marginTop: '1rem',
    color: 'red',
    textAlign: 'center'
  },
  wrapper: {
    padding: '2rem',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    overflowX: 'auto'
  }
}

export default App