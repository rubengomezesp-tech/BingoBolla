import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../AuthContext";
import { Mail, Lock, User } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await register(email, password, name);
      nav("/", { replace: true });
    } catch (e) {
      const d = e.response?.data?.detail;
      setError(typeof d === "string" ? d : "No se pudo registrar");
    } finally { setBusy(false); }
  };

  return (
    <div className="phone stars-bg relative px-6 pt-16 pb-10 flex flex-col" data-testid="register-page">
      <motion.h1 initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="h-display text-3xl font-black">
        Crea tu cuenta
      </motion.h1>
      <p className="text-zinc-400 mt-1">Tu progreso se guarda en la nube.</p>

      <motion.form onSubmit={onSubmit} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .1 }} className="mt-8 glass-card p-6 space-y-4">
        <label className="block">
          <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1"><User size={12}/> Nombre</div>
          <input data-testid="register-name-input" className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Tu nombre"/>
        </label>
        <label className="block">
          <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1"><Mail size={12}/> Email</div>
          <input data-testid="register-email-input" className="input" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com"/>
        </label>
        <label className="block">
          <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1"><Lock size={12}/> Contraseña</div>
          <input data-testid="register-password-input" className="input" type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"/>
        </label>
        {error && <div data-testid="register-error" className="text-sm text-red-400">{error}</div>}
        <button data-testid="register-submit-btn" type="submit" disabled={busy} className="btn btn-primary">{busy ? "Creando…" : "Crear cuenta"}</button>
        <div className="text-center text-sm text-zinc-400">
          ¿Ya tienes cuenta? <Link to="/login" data-testid="register-login-link" className="text-white underline-offset-4 underline decoration-[#05D9E8]">Inicia sesión</Link>
        </div>
      </motion.form>
    </div>
  );
}
