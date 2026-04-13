import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import logo from "../assets/rochecks_logo_small.png";

function cx(...cls) {
  return cls.filter(Boolean).join(" ");
}

export default function TopNav({ onLogout }) {
  const navigate = useNavigate();
  const [role, setRole] = useState("user");
  const [userName, setUserName] = useState("User");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const getUserInfo = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;
      if (!user) return;

      const r = (user.user_metadata?.role || "user")
        .toString()
        .trim()
        .toLowerCase();

      setRole(r);
      setUserName(user.user_metadata?.name || "User");
    };

    getUserInfo();
  }, []);

  const items = useMemo(() => {
    const base = [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Inspections", to: "/all" },
      { label: "Archive", to: "/done" },
    ];

    if (role === "admin") {
      base.push(
        { label: "Admin Panel", to: "/admin" },
        { label: "Settings", to: "/settings" }
      );
    }

    return base;
  }, [role]);

  const handleNavigate = (to) => {
    navigate(to);
    setMobileOpen(false);
  };

  const handleLogoutClick = async () => {
    setMobileOpen(false);
    await onLogout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3 py-3">
          {/* Brand */}
          <button
            onClick={() => handleNavigate("/dashboard")}
            className="flex min-w-0 items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-slate-100"
            type="button"
          >
            <img
              src={logo}
              alt="Rochecks"
              className="h-10 w-10 rounded-full border border-slate-200 bg-white object-cover"
            />

            <div className="min-w-0 text-left">
              <div className="truncate text-sm font-semibold text-slate-900">
                Rochecks
              </div>
              <div className="truncate text-xs text-slate-500">{userName}</div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-2">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) =>
                  cx(
                    "rounded-2xl px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )
                }
              >
                {it.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Tablet quick nav */}
            <div className="hidden md:flex lg:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => handleNavigate("/dashboard")}
                className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => handleNavigate("/all")}
                className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Inspections
              </button>
            </div>

            {/* Desktop logout */}
            <button
              onClick={handleLogoutClick}
              type="button"
              className="hidden sm:inline-flex h-11 items-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Log out
            </button>

            {/* Mobile / tablet menu button */}
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <span className="text-lg">{mobileOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / tablet dropdown */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="space-y-2 px-4 py-4 sm:px-6">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">Rochecks</div>
              <div className="text-xs text-slate-500">{userName}</div>
            </div>

            <nav className="flex flex-col gap-2">
              {items.map((it) => (
                <button
                  key={it.to}
                  type="button"
                  onClick={() => handleNavigate(it.to)}
                  className="flex h-11 items-center rounded-2xl px-4 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {it.label}
                </button>
              ))}
            </nav>

            <div className="pt-2">
              <button
                onClick={handleLogoutClick}
                type="button"
                className="flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}