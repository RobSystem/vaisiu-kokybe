// src/components/TopNav.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

// pakeisk kelią jei logo laikysi kitur
import logo from "../assets/rochecks_logo_small.png";

function cx(...cls) {
  return cls.filter(Boolean).join(" ");
}

export default function TopNav({ onLogout }) {
  const navigate = useNavigate();
  const [role, setRole] = useState("user");
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const getUserInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const r = (user.user_metadata?.role || "user").toString().trim().toLowerCase();
      setRole(r);
      setUserName(user.user_metadata?.name || "User");
    };
    getUserInfo();
  }, []);

  const items = useMemo(() => {
    const base = [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Inspections", to: "/all" },   // šiuo metu nukreipiam į AllReports
      { label: "Archive", to: "/done" },
    ];
    if (role === "admin") base.push({ label: "Admin Panel", to: "/admin" });
    return base;
  }, [role]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-brand-400/30 bg-gradient-to-r from-slate-950 via-slate-950 to-brand-900/40 backdrop-blur">

      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Left: brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="group flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-white/5"
              type="button"
            >
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-brand-500/20 blur-md opacity-0 group-hover:opacity-100 transition" />
                <img src={logo} alt="Rochecks" className="relative h-9 w-9 rounded-full" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-slate-100">Rochecks</div>
                <div className="text-xs text-slate-400">{userName}</div>
              </div>
            </button>
          </div>

          {/* Center: nav */}
          <nav className="hidden md:flex items-center gap-2">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) =>
                  cx(
                    "relative rounded-xl px-4 py-2 text-sm font-medium transition",
                    "text-slate-200 hover:text-white hover:bg-white/5",
                    isActive && "text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{it.label}</span>
                    {isActive && (
                      <span className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-brand-400 shadow-[0_0_18px_rgba(32,120,116,0.65)]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            {/* mobile: show minimal nav */}
            <div className="md:hidden flex gap-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => navigate("/all")}
                className="rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5"
              >
                Inspections
              </button>
            </div>

            <button
              onClick={onLogout}
              type="button"
              className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/15 hover:text-red-100 transition"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* subtle glow line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" />
    </header>
  );
}
