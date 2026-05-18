"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Crown, Eye, Glasses, Loader2, Palette, Save, Shirt, Sparkles, WandSparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import MascotRenderer from "@/components/mascot/MascotRenderer";
import {
  DEFAULT_MASCOT_LOADOUT,
  MASCOT_LAYER_LABELS,
  REQUIRED_MASCOT_LAYERS,
  getAssetPreviewUrl,
  getAssetsByLayer,
  getWorkshopLayers,
  normalizeMascotLoadout,
  type BingoAsset,
  type MascotLayerType,
  type MascotLoadout,
} from "@config/assetManifest";
import { RARITY_THEME } from "@config/artDirection";

const STORAGE_KEY = "bb_mascot_loadout_v2";

export default function MascotaClient() {
  const supabase = useMemo(() => createClient(), []);
  const workshopLayers = useMemo(() => getWorkshopLayers(), []);
  const [layer, setLayer] = useState<MascotLayerType>(workshopLayers[0] ?? "Hat");
  const [loadout, setLoadout] = useState<MascotLoadout>(DEFAULT_MASCOT_LOADOUT);
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
      const payload = (data ?? {}) as { ok?: boolean; loadout?: Partial<MascotLoadout> };
      if (payload.ok && payload.loadout && Object.keys(payload.loadout).length > 0) {
        const next = normalizeMascotLoadout(payload.loadout);
        setLoadout(next);
        setSource("cloud");
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function updateLoadout(next: MascotLoadout) {
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

  function equip(asset: BingoAsset) {
    if (!asset.layerType) return;
    void updateLoadout({ ...loadout, [asset.layerType]: asset.id });
  }

  function clearLayer(targetLayer: MascotLayerType) {
    const next = { ...loadout };
    delete next[targetLayer];
    void updateLoadout(next);
  }

  const activeAssets = getAssetsByLayer(layer);
  const layerRequired = REQUIRED_MASCOT_LAYERS.includes(layer);

  return (
    <div className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
      <section className="rounded-[30px] border border-[#b56bff]/38 bg-black/52 p-6 backdrop-blur-md">
        <MascotRenderer loadout={loadout} size={340} active />
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
          {workshopLayers.map((tab) => (
            <button
              key={tab}
              onClick={() => setLayer(tab)}
              className={`flex h-14 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-black transition ${
                layer === tab
                  ? "border-[#b56bff]/70 bg-[#b56bff]/24 text-white shadow-[0_0_20px_rgba(181,107,255,.22)]"
                  : "border-white/10 bg-white/[0.05] text-white/66 hover:text-white"
              }`}
            >
              {layerIcon(tab)}
              {MASCOT_LAYER_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {!layerRequired && (
            <button
              onClick={() => clearLayer(layer)}
              className={`group rounded-[24px] border p-5 text-left transition hover:-translate-y-1 ${
                !loadout[layer] ? "border-[#ffd93d]/70 bg-[#ffd93d]/10" : "border-white/10 bg-black/46"
              }`}
            >
              <div className="grid h-20 w-20 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-4xl font-black text-white/46">
                ·
              </div>
              <div className="mt-4 text-xl font-black">Sin {MASCOT_LAYER_LABELS[layer].toLowerCase()}</div>
              <div className="mt-2 text-xs font-semibold leading-5 text-white/42">Opcion limpia sin capa visual.</div>
              <div className="mt-5 inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-black text-[#16051d]">
                {!loadout[layer] ? "Activo" : "Quitar"}
              </div>
            </button>
          )}

          {activeAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} equipped={loadout[layer] === asset.id} onEquip={() => equip(asset)} />
          ))}
        </div>

        <section className="rounded-[26px] border border-white/10 bg-black/46 p-5">
          <div className="mb-3 flex items-center gap-2 text-lg font-black">
            <Palette className="text-[#00e5ff]" />
            Pipeline de assets
          </div>
          <p className="text-sm font-semibold leading-6 text-white/60">
            El taller lee el manifest central. Para sumar una gorra, gafas o aura nueva, solo se agrega una entrada con su path,
            rarity y offsets; aparece aqui sin tocar el JSX.
          </p>
        </section>
      </section>
    </div>
  );
}

function AssetCard({ asset, equipped, onEquip }: { asset: BingoAsset; equipped: boolean; onEquip: () => void }) {
  const [failed, setFailed] = useState(false);
  const rarity = RARITY_THEME[asset.rarity];

  useEffect(() => {
    setFailed(false);
  }, [asset.id]);

  return (
    <button
      onClick={onEquip}
      className={`group rounded-[24px] border p-5 text-left transition hover:-translate-y-1 ${
        equipped ? "border-[#ffd93d]/70 bg-[#ffd93d]/10" : "border-white/10 bg-black/46"
      }`}
      style={{ boxShadow: equipped ? `0 0 28px ${rarity.glow}` : undefined }}
    >
      <div
        className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border bg-white/[0.05]"
        style={{ borderColor: rarity.ring }}
      >
        {failed ? (
          <span className="text-4xl font-black" style={{ color: rarity.color }}>
            {asset.fallback.value ?? asset.label.slice(0, 1)}
          </span>
        ) : (
          <img src={getAssetPreviewUrl(asset)} alt="" className="h-full w-full object-contain p-2" onError={() => setFailed(true)} />
        )}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className="text-xl font-black">{asset.label}</div>
        <span className="rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em]" style={{ backgroundColor: `${rarity.color}22`, color: rarity.color }}>
          {rarity.label}
        </span>
      </div>
      <div className="mt-2 break-all text-xs font-semibold leading-5 text-white/42">
        {asset.bucket}/{asset.storagePath}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] font-black uppercase tracking-[0.08em] text-white/42">
        <span>x {asset.equipped.x}</span>
        <span>y {asset.equipped.y}</span>
        <span>s {asset.equipped.scale}</span>
        <span>r {asset.equipped.rotation}</span>
      </div>
      <div className="mt-5 inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-black text-[#16051d]">
        {equipped ? "Equipado" : "Equipar"}
      </div>
    </button>
  );
}

function layerIcon(layer: MascotLayerType) {
  if (layer === "Hat") return <Crown size={18} />;
  if (layer === "Glasses") return <Glasses size={18} />;
  if (layer === "Clothes") return <Shirt size={18} />;
  if (layer === "Eyes") return <Eye size={18} />;
  if (layer === "FrontFX") return <WandSparkles size={18} />;
  return <Sparkles size={18} />;
}

function readLocalLoadout() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem("bb_mascot_loadout_v1");
    return raw ? normalizeMascotLoadout(JSON.parse(raw) as Partial<MascotLoadout> & Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
