// Tailwind-based App.jsx (priderinta prie DoneReports stiliaus)
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Sidebar from './components/Sidebar';
import CreateReport from './pages/CreateReport';
import AllReports from './pages/AllReports';
import DoneReports from './pages/DoneReports';
import EditReport from './pages/EditReport';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import CreateSample from './pages/CreateSample';
import UploadPhotos from './pages/UploadPhotos';
import ViewReport from './pages/ViewReport';
import AdminPanel from './pages/AdminPanel';
import AdminClients from './pages/AdminClients';
import AddUserPage from './pages/AddUserPage';
import { Toaster } from 'react-hot-toast';
import Dashboard from "./pages/Dashboard";


function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg(error.message);
    } else {
      onLogin(data.user);
    }
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm">
        <h2 className="text-xl font-bold text-center mb-4">Prisijungimas</h2>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="El. paštas"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="p-3 text-base border rounded-lg"
          />
          <input
            type="password"
            placeholder="Slaptažodis"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="p-3 text-base border rounded-lg"
          />
          <button type="submit" className="bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition">
            Prisijungti
          </button>
        </form>
        {errorMsg && <p className="text-red-600 text-center mt-4">{errorMsg}</p>}
      </div>
    </div>
  );
}

function MainApp({ user, onLogout }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row w-screen h-screen overflow-hidden">
      <Sidebar onLogout={onLogout} navigate={navigate} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Routes>
          <Route path="/" element={<h1 className="text-center text-2xl font-bold mt-4">DASHBOARD</h1>} />
          <Route path="/create" element={<CreateReport />} />
          <Route path="/all" element={<AllReports setSelectedReport={setSelectedReport} setActivePage={() => {}} />} />
          <Route path="/done" element={<DoneReports />} />
          <Route path="/edit/:reportId" element={<EditReport />} />
          <Route path="/create-sample/:reportId" element={<CreateSample />} />
          <Route path="/create-sample/:reportId/:sampleId" element={<CreateSample />} />
          <Route path="/upload-photos/:sampleId" element={<UploadPhotos />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/clients" element={<AdminClients />} />
          <Route path="/viewreport/:reportId" element={<ViewReport />} />
          <Route path="/admin/add-user" element={<AddUserPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
  <Router>
    <Routes>
      {/* Viešas kelias prieinamas be prisijungimo */}
      <Route path="/viewreport/:reportId" element={<ViewReport />} />

      {/* Visi kiti maršrutai tik prisijungus */}
      <Route
        path="*"
        element={
          loading ? null : !user ? (
            <Login onLogin={setUser} />
          ) : (
            <MainApp user={user} onLogout={handleLogout} />
          )
        }
      />
    </Routes>

    {/* 👇 Čia įdėk Toaster, kad veiktų visuose puslapiuose */}
    <Toaster position="bottom-right" />
  </Router>
);
}

export default App;
