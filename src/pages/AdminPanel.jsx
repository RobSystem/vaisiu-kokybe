import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

function AdminPanel() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);

  useEffect(() => {
    const checkRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (user?.user_metadata?.role !== "admin") {
        navigate("/");
      } else {
        setRole("admin");
      }
    };

    checkRole();
  }, [navigate]);

  if (role !== "admin") return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Admin Panel
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage admin-only actions.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <button
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            onClick={() => navigate("/admin/clients")}
          >
            Add Client
          </button>

          <button
            className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-4 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
            onClick={() => navigate("/admin/add-user")}
          >
            Add User
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;