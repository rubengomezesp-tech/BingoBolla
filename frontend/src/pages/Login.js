import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../AuthContext";
import { Mail, Lock, Sparkles } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await login(email, password);
      nav("/", { replace: true });
    } catch (e) {
      const d = e.response?.data?.detail;
      setError(typeof d === "string" ? d : "No se pudo iniciar sesión");
    } finally { setBusy(false); }
  };

  return (
    <div className="phone stars-bg relative px-6 pt-16 pb-10 flex flex-col" data-testid="login-page">
      <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest text-zinc-300">
          <Sparkles size={14} className="text-[#FF2A6D]" /> Puzzle Tour
        </div>
        <h1 className="h-display mt-5 text-4xl font-black leading-tight">
          USA <span className="bg-gradient-to-r from-[#FF2A6D] via-[#FFD700] to-[#05D9E8] bg-clip-text text-transparent">Puzzle</span> Tour
        </h1>
        <p className="text-zinc-400 mt-2">5 ciudades. 100 niveles. Una aventura.</p>
      </motion.div>

      <motion.form
        onSubmit={onSubmit}
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .1 }}
        className="mt-10 glass-card p-6 space-y-4"
      >
        <h2 className="h-display text-xl font-bold">Iniciar sesión</h2>
        <label className="block">
          <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1"><Mail size={12}/> Email</div>
          <input data-testid="login-email-input" className="input" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
        </label>
        <label className="block">
          <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1"><Lock size={12}/> Contraseña</div>
          <input data-testid="login-password-input" className="input" type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
        </label>
        {error && <div data-testid="login-error" className="text-sm text-red-400">{error}</div>}
        <button data-testid="login-submit-btn" type="submit" disabled={busy} className="btn btn-primary mt-2">
          {busy ? "Entrando…" : "Entrar y jugar"}
        </button>
        <div className="text-center text-sm text-zinc-400">
          ¿Sin cuenta? <Link to="/register" data-testid="login-register-link" className="text-white underline-offset-4 underline decoration-[#FF2A6D]">Regístrate gratis</Link>
        </div>
      </motion.form>
    </div>
  );
}
