import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { ArrowLeft, Star, LogOut, Trophy } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/worlds").then(({ data }) => setData(data)).catch(()=>{});
  }, []);

  const totalLevels = (data?.worlds || []).reduce((a,w)=>a+w.levels_completed, 0);
  const totalStars = data?.total_stars ?? 0;

  return (
    <div className="phone stars-bg relative flex flex-col" data-testid="profile-page">
      <header className="px-5 pt-5 flex items-center gap-3">
        <button onClick={() => nav(-1)} data-testid="profile-back-btn" className="w-10 h-10 rounded-full bg-white/10 border border-white/10 grid place-items-center">
          <ArrowLeft size={18}/>
        </button>
        <h1 className="h-display text-xl font-black">Perfil</h1>
        <button onClick={() => { logout(); nav("/login"); }} data-testid="profile-logout-btn" className="ml-auto w-10 h-10 rounded-full bg-white/10 border border-white/10 grid place-items-center"><LogOut size={16}/></button>
      </header>

      <div className="px-6 mt-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF2A6D] to-[#05D9E8] grid place-items-center text-2xl font-black">
          {(user?.name || "U").slice(0,1).toUpperCase()}
        </div>
        <div>
          <div className="h-display text-2xl font-black">{user?.name}</div>
          <div className="text-zinc-400 text-sm">{user?.email}</div>
        </div>
      </div>

      <div className="px-5 mt-6 grid grid-cols-2 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider"><Star size={12}/> Estrellas</div>
          <div data-testid="profile-total-stars" className="h-display text-3xl font-black mt-1">{totalStars}</div>
          <div className="text-xs text-zinc-500">de 300</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider"><Trophy size={12}/> Niveles</div>
          <div data-testid="profile-total-levels" className="h-display text-3xl font-black mt-1">{totalLevels}</div>
          <div className="text-xs text-zinc-500">de 100</div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-3 pb-6 overflow-y-auto scrollbar-hide">
        {data?.worlds?.map((w) => (
          <div key={w.id} className="glass-card p-4 flex items-center justify-between">
            <div>
              <div className="h-display font-black">{w.name}</div>
              <div className="text-xs text-zinc-400">{w.levels_completed}/{w.levels_total} · {w.stars_earned}/{w.stars_max}★</div>
            </div>
            <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(w.levels_completed / w.levels_total) * 100}%`, background: `linear-gradient(90deg, ${w.primary}, ${w.secondary})` }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
