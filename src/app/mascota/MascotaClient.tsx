"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, Crown, Glasses, Loader2, Palette, Save, Shirt, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Category = "glasses" | "hat" | "outfit" | "aura";
type Loadout = Record<Category, string>;

type CosmeticItem = {
  key: string;
  label: string;
  icon: string;
  assetPath: string;
  color?: string;
};

const STORAGE_KEY = "bb_mascot_loadout_v1";
const MASCOT_URL = "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/mascot-miami/mascot-miami.PNG";
const DEFAULT_LOADOUT: Loadout = {
  glasses: "neon-shades",
  hat: "flower-cap",
  outfit: "miami-hoodie",
  aura: "pink-spark",
};

const ITEMS: Record<Category, CosmeticItem[]> = {
  glasses: [
    { key: "none", label: "Sin gafas", icon: "·", assetPath: "mascot-miami/accessories/none.png" },
    { key: "neon-shades", label: "Gafas neon", icon: "😎", assetPath: "mascot-miami/accessories/glasses-neon.png", color: "#ff3dff" },
    { key: "star-glasses", label: "Estrellas", icon: "⭐", assetPath: "mascot-miami/accessories/glasses-stars.png", color: "#ffd93d" },
  ],
  hat: [
    { key: "none", label: "Sin gorra", icon: "·", assetPath: "mascot-miami/accessories/none.png" },
    { key: "flower-cap", label: "Gorra tropical", icon: "🌺", assetPath: "mascot-miami/accessories/hat-flower-cap.png", color: "#ff7ab0" },
    { key: "royal-crown", label: "Corona", icon: "👑", assetPath: "mascot-miami/accessories/hat-crown.png", color: "#ffd93d" },
  ],
  outfit: [
    { key: "none", label: "Base", icon: "B", assetPath: "mascot-miami/accessories/none.png" },
    { key: "miami-hoodie", label: "Hoodie Bolla", icon: "B", assetPath: "mascot-miami/accessories/outfit-hoodie.png", color: "#7b2ff7" },
    { key: "gold-jacket", label: "Chaqueta oro", icon: "✦", assetPath: "mascot-miami/accessories/outfit-gold-jacket.png", color: "#ffd93d" },
  ],
  aura: [
    { key: "none", label: "Sin aura", icon: "·", assetPath: "mascot-miami/effects/none.png" },
    { key: "pink-spark", label: "Spark rosa", icon: "✦", assetPath: "mascot-miami/effects/aura-pink-spark.png", color: "#ff3d7f" },
    { key: "cyan-ring", label: "Anillo cyan", icon: "◎", assetPath: "mascot-miami/effects/aura-cyan-ring.png", color: "#00e5ff" },
  ],
};

const CATEGORIES: Array<{ key: Category; label: string; icon: ReactNode }> = [
  { key: "glasses", label: "Gafas", icon: <Glasses size={18} /> },
  { key: "hat", label: "Gorra", icon: <Crown size={18} /> },
  { key: "outfit", label: "Ropa", icon: <Shirt size={18} /> },
  { key: "aura", label: "Aura", icon: <Sparkles size={18} /> },
];

export default function MascotaClient() {
  const supabase = useMemo(() => createClient(), []);
  const [category, setCategory] = useState<Category>("glasses");
  const [loadout, setLoadout] = useState<Loadout>(DEFAULT_LOADOUT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [source, setSource] = useState<"local" | "cloud">("local");

  useEffect(() => {
    const local = readLocalLoadout();
    if (local) setLoadout(local);

    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("get_player_cosmetics");
      if (!active || error) return;
      const payload = (data ?? {}) as { ok?: boolean; loadout?: Partial<Loadout> };
      if (payload.ok && payload.loadout) {
        const next = normalizeLoadout(payload.loadout);
        setLoadout(next);
        setSource("cloud");
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function equip(item: CosmeticItem) {
    const next = { ...loadout, [category]: item.key };
    setLoadout(next);
    setSaved(false);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    setSaving(true);
    const { error } = await supabase.rpc("save_player_cosmetics", { p_loadout: next });
    setSaving(false);
    setSource(error ? "local" : "cloud");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  const activeItems = ITEMS[category];

  return (
    <div className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
      <section className="rounded-[30px] border border-[#b56bff]/38 bg-black/52 p-6 backdrop-blur-md">
        <MascotPreview loadout={loadout} />
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/44">Estado</div>
              <div className="mt-1 text-lg font-black">{source === "cloud" ? "Sincronizado" : "Guardado local"}</div>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#b56bff]/14 text-[#dcb9ff]">
              {saving ? <Loader2 className="animate-spin" /> : saved ? <Check /> : <Save />}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCategory(tab.key)}
              className={`flex h-14 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-black transition ${
                category === tab.key
                  ? "border-[#b56bff]/70 bg-[#b56bff]/24 text-white shadow-[0_0_20px_rgba(181,107,255,.22)]"
                  : "border-white/10 bg-white/[0.05] text-white/66 hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {activeItems.map((item) => (
            <button
              key={item.key}
              onClick={() => equip(item)}
              className={`group rounded-[24px] border p-5 text-left transition hover:-translate-y-1 ${
                loadout[category] === item.key ? "border-[#ffd93d]/70 bg-[#ffd93d]/10" : "border-white/10 bg-black/46"
              }`}
            >
              <div
                className="grid h-16 w-16 place-items-center rounded-2xl text-3xl font-black"
                style={{ backgroundColor: `${item.color ?? "#ffffff"}22`, color: item.color ?? "#ffffff" }}
              >
                {item.icon}
              </div>
              <div className="mt-4 text-xl font-black">{item.label}</div>
              <div className="mt-2 break-all text-xs font-semibold leading-5 text-white/42">{item.assetPath}</div>
              <div className="mt-5 inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-black text-[#16051d]">
                {loadout[category] === item.key ? "Equipado" : "Equipar"}
              </div>
            </button>
          ))}
        </div>

        <section className="rounded-[26px] border border-white/10 bg-black/46 p-5">
          <div className="mb-3 flex items-center gap-2 text-lg font-black">
            <Palette className="text-[#00e5ff]" />
            Assets que reemplazan estos básicos
          </div>
          <p className="text-sm font-semibold leading-6 text-white/60">
            Los paths de cada tarjeta son los nombres exactos recomendados para Supabase Storage. Cuando subas PNG transparentes ahí,
            cambiamos los overlays básicos por imágenes reales y el taller queda clavado al estilo pro.
          </p>
        </section>
      </section>
    </div>
  );
}

function MascotPreview({ loadout }: { loadout: Loadout }) {
  const glasses = findItem("glasses", loadout.glasses);
  const hat = findItem("hat", loadout.hat);
  const outfit = findItem("outfit", loadout.outfit);
  const aura = findItem("aura", loadout.aura);

  return (
    <div className="relative mx-auto grid h-[360px] max-w-[340px] place-items-center overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_50%_22%,rgba(181,107,255,.34),rgba(8,3,20,.94)_62%)]">
      {aura?.key !== "none" && (
        <div
          className="absolute h-64 w-64 rounded-full border-4 opacity-80 blur-[1px]"
          style={{ borderColor: aura?.color ?? "#ff3d7f", boxShadow: `0 0 42px ${aura?.color ?? "#ff3d7f"}` }}
        />
      )}
      <img src={MASCOT_URL} alt="Mascota BingoBolla" className="relative z-10 h-64 w-64 object-contain drop-shadow-[0_0_28px_rgba(255,61,255,.55)]" />
      {hat?.key !== "none" && (
        <div className="absolute left-1/2 top-[72px] z-20 -translate-x-1/2 -rotate-6 text-5xl drop-shadow-[0_0_14px_rgba(0,0,0,.75)]">
          {hat?.icon}
        </div>
      )}
      {glasses?.key !== "none" && (
        <div className="absolute left-1/2 top-[142px] z-20 -translate-x-1/2 text-5xl drop-shadow-[0_0_14px_rgba(0,0,0,.75)]">
          {glasses?.icon}
        </div>
      )}
      {outfit?.key !== "none" && (
        <div
          className="absolute bottom-20 z-20 rounded-full border border-white/30 px-8 py-3 text-3xl font-black text-white shadow-[0_0_22px_rgba(0,0,0,.5)]"
          style={{ backgroundColor: outfit?.color ?? "#7b2ff7" }}
        >
          {outfit?.icon}
        </div>
      )}
    </div>
  );
}

function findItem(category: Category, key: string) {
  return ITEMS[category].find((item) => item.key === key) ?? ITEMS[category][0];
}

function readLocalLoadout() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeLoadout(JSON.parse(raw) as Partial<Loadout>) : null;
  } catch {
    return null;
  }
}

function normalizeLoadout(value: Partial<Loadout>): Loadout {
  return {
    glasses: value.glasses && findItem("glasses", value.glasses) ? value.glasses : DEFAULT_LOADOUT.glasses,
    hat: value.hat && findItem("hat", value.hat) ? value.hat : DEFAULT_LOADOUT.hat,
    outfit: value.outfit && findItem("outfit", value.outfit) ? value.outfit : DEFAULT_LOADOUT.outfit,
    aura: value.aura && findItem("aura", value.aura) ? value.aura : DEFAULT_LOADOUT.aura,
  };
}
