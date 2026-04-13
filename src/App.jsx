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
import SettingsPage from "./pages/SettingsPage";

import { Toaster } from "react-hot-toast";

import Login from "./Login";

  
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
    <div className="min-h-screen w-full bg-white text-slate-900">
      <TopNav onLogout={onLogout} />

      <main className="w-full p-0">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/create" element={<CreateReport />} />
          <Route
            path="/all"
            element={<AllReports setSelectedReport={setSelectedReport} setActivePage={() => {}} />}
          />
          <Route path="/edit/:reportId" element={<EditReport />} />
          <Route path="/create-sample/:reportId" element={<CreateSample />} />
          <Route path="/create-sample/:reportId/:sampleId" element={<CreateSample />} />
          <Route path="/upload-photos/:sampleId" element={<UploadPhotos />} />

          <Route path="/done" element={<DoneReports />} />

          <Route
            path="/settings"
            element={
              <AdminRoute>
                <SettingsPage />
              </AdminRoute>
            }
          />

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
