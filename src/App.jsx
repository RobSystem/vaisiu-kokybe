// src/App.jsx
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from "react-router-dom";

import TopNav from "./components/TopNav";

import CreateReport from "./pages/CreateReport";
import AllReports from "./pages/AllReports";
import DoneReports from "./pages/DoneReports";
import EditReport from "./pages/EditReport";
import CreateSample from "./pages/CreateSample";
import UploadPhotos from "./pages/UploadPhotos";
import ViewReport from "./pages/ViewReport";
import AdminPanel from "./pages/AdminPanel";
import AdminClients from "./pages/AdminClients";
import AddUserPage from "./pages/AddUserPage";
import Dashboard from "./pages/Dashboard";

import { Toaster } from "react-hot-toast";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErrorMsg(error.message);
    else onLogin(data.user);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)] backdrop-blur">
        <h2 className="text-xl font-bold text-slate-100 text-center mb-4">Prisijungimas</h2>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="El. paštas"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl border border-white/10 bg-black/20 p-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-brand-400/60"
          />
          <input
            type="password"
            placeholder="Slaptažodis"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-xl border border-white/10 bg-black/20 p-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-brand-400/60"
          />
          <button
            type="submit"
            className="rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-500 transition"
          >
            Prisijungti
          </button>
        </form>
        {errorMsg && <p className="text-red-300 text-center mt-4">{errorMsg}</p>}
      </div>
    </div>
  );
}

function AdminRoute({ children }) {
  const [status, setStatus] = useState("loading"); // 'loading' | 'allow' | 'deny'
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!alive) return;
          setStatus("deny");
          navigate("/all");
          return;
        }

        const metaRole =
          (user.user_metadata?.role || user.app_metadata?.role || "")
            .toString()
            .trim()
            .toLowerCase();

        if (metaRole === "admin") {
          if (!alive) return;
          setStatus("allow");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const dbRole = (profile?.role || "").toString().trim().toLowerCase();

        if (!alive) return;

        if (dbRole === "admin") setStatus("allow");
        else {
          setStatus("deny");
          navigate("/all");
        }
      } catch (e) {
        console.warn("AdminRoute check failed:", e);
        if (!alive) return;
        setStatus("deny");
        navigate("/all");
      }
    })();

    return () => {
      alive = false;
    };
  }, [navigate]);

  if (status === "loading") return null;
  return status === "allow" ? children : null;
}

function MainApp({ onLogout }) {
  const [selectedReport, setSelectedReport] = useState(null);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <TopNav onLogout={onLogout} />

      <main className="mx-auto w-full max-w-[1400px] px-4 py-6">
        <Routes>
          {/* default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard (visiems prisijungusiems) */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Inspections */}
          <Route path="/create" element={<CreateReport />} />
          <Route
            path="/all"
            element={<AllReports setSelectedReport={setSelectedReport} setActivePage={() => {}} />}
          />
          <Route path="/edit/:reportId" element={<EditReport />} />
          <Route path="/create-sample/:reportId" element={<CreateSample />} />
          <Route path="/create-sample/:reportId/:sampleId" element={<CreateSample />} />
          <Route path="/upload-photos/:sampleId" element={<UploadPhotos />} />

          {/* Archive */}
          <Route path="/done" element={<DoneReports />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/clients"
            element={
              <AdminRoute>
                <AdminClients />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/add-user"
            element={
              <AdminRoute>
                <AddUserPage />
              </AdminRoute>
            }
          />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
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
              <MainApp onLogout={handleLogout} />
            )
          }
        />
      </Routes>

      <Toaster position="bottom-right" />
    </Router>
  );
}
