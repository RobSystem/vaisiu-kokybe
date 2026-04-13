import { useState } from "react";
import { supabase } from "./supabaseClient";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      onLogin(data.user);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-6">
          Welcome back
        </h2>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          
          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition"
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition"
          />

          {/* Error */}
          {errorMsg && (
            <div className="text-sm text-red-500 text-center">
              {errorMsg}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-500 transition disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        {/* Footer (optional) */}
        <p className="text-xs text-slate-400 text-center mt-6">
          Quality inspection system
        </p>
      </div>
    </div>
  );
}

export default Login;