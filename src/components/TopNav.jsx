// src/components/TopNav.jsx
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
    <header className="sticky top-0 z-50 w-full border-b border-[#2B7A78]/25 bg-[#2B7A78] shadow-[0_8px_30px_rgba(43,122,120,0.18)]">
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3 py-3">
          <button
            onClick={() => handleNavigate("/dashboard")}
            className="flex min-w-0 items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-white/10"
            type="button"
          >
            <img
              src={logo}
              alt="Rochecks"
              className="h-10 w-10 rounded-full border border-white/20 bg-white object-cover"
            />

            <div className="min-w-0 text-left">
              <div className="truncate text-sm font-semibold text-white">
                Rochecks
              </div>
              <div className="truncate text-xs text-white/75">{userName}</div>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-2">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) =>
                  cx(
                    "rounded-2xl px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-white text-[#2B7A78] shadow-sm"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  )
                }
              >
                {it.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex lg:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => handleNavigate("/dashboard")}
                className="rounded-2xl px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => handleNavigate("/all")}
                className="rounded-2xl px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                Inspections
              </button>
            </div>

            <button
              onClick={handleLogoutClick}
              type="button"
              className="hidden sm:inline-flex h-11 items-center rounded-2xl bg-white px-4 text-sm font-semibold text-[#2B7A78] transition hover:bg-white/90"
            >
              Log out
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white transition hover:bg-white/15 lg:hidden"
              aria-label="Open menu"
            >
              <span className="text-lg">{mobileOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#2B7A78] lg:hidden">
          <div className="space-y-2 px-4 py-4 sm:px-6">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <div className="text-sm font-semibold text-white">Rochecks</div>
              <div className="text-xs text-white/75">{userName}</div>
            </div>

            <nav className="flex flex-col gap-2">
              {items.map((it) => (
                <button
                  key={it.to}
                  type="button"
                  onClick={() => handleNavigate(it.to)}
                  className="flex h-11 items-center rounded-2xl px-4 text-left text-sm font-medium text-white transition hover:bg-white/10"
                >
                  {it.label}
                </button>
              ))}
            </nav>

            <div className="pt-2">
              <button
                onClick={handleLogoutClick}
                type="button"
                className="flex h-11 w-full items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-[#2B7A78] transition hover:bg-white/90"
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