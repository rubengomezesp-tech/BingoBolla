"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  DEFAULT_MASCOT_LOADOUT,
  MASCOT_LAYER_ORDER,
  REQUIRED_MASCOT_LAYERS,
  getAssetById,
  getAssetPublicUrl,
  normalizeMascotLoadout,
  type BingoAsset,
  type MascotLayerType,
  type MascotLoadout,
} from "@config/assetManifest";
import { BINGOBOLLA_ART_DIRECTION, RARITY_THEME } from "@config/artDirection";

type MascotRendererProps = {
  loadout?: Partial<MascotLoadout>;
  size?: number;
  className?: string;
  showPlatform?: boolean;
  active?: boolean;
};

export default function MascotRenderer({
  loadout,
  size = 340,
  className = "",
  showPlatform = true,
  active = false,
}: MascotRendererProps) {
  const normalized = useMemo(() => normalizeMascotLoadout(loadout ?? DEFAULT_MASCOT_LOADOUT), [loadout]);
  const layers = useMemo(() => resolveLayers(normalized), [normalized]);

  return (
    <div
      className={`bb-mascotRenderer ${className}`}
      style={{
        width: size,
        height: size,
        "--bb-mascot-radius": `${BINGOBOLLA_ART_DIRECTION.radius.mascotCanvas}px`,
      } as CSSProperties}
      data-active={active ? "true" : "false"}
    >
      <style>{CSS}</style>
      <div className="bb-mascotGlow" />
      {showPlatform && <div className="bb-mascotPlatform" />}
      {layers.map(({ layer, asset }) => (
        <MascotLayer key={`${layer}:${asset.id}`} asset={asset} layer={layer} />
      ))}
    </div>
  );
}

function resolveLayers(loadout: MascotLoadout) {
  return MASCOT_LAYER_ORDER.map((layer) => {
    const assetId = loadout[layer] ?? (REQUIRED_MASCOT_LAYERS.includes(layer) ? DEFAULT_MASCOT_LOADOUT[layer] : undefined);
    const asset = getAssetById(assetId);
    if (!asset || asset.layerType !== layer) return null;
    return { layer, asset };
  }).filter(Boolean) as Array<{ layer: MascotLayerType; asset: BingoAsset }>;
}

function MascotLayer({ asset, layer }: { asset: BingoAsset; layer: MascotLayerType }) {
  const [failed, setFailed] = useState(false);
  const transform = asset.equipped;
  const rarity = RARITY_THEME[asset.rarity];

  useEffect(() => {
    setFailed(false);
  }, [asset.id]);

  const style = {
    zIndex: asset.zIndex,
    width: `${transform.widthPct ?? 100}%`,
    transform: `translate(-50%, -50%) translate(${transform.x}%, ${transform.y}%) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
    "--bb-layer-glow": rarity.glow,
    "--bb-layer-color": asset.fallback.color ?? rarity.color,
  } as CSSProperties;

  return (
    <div className={`bb-mascotLayer bb-layer-${layer}`} style={style} data-layer={layer}>
      {failed || !asset.storagePath ? (
        <MascotFallback asset={asset} layer={layer} />
      ) : (
        <img
          src={getAssetPublicUrl(asset)}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function MascotFallback({ asset, layer }: { asset: BingoAsset; layer: MascotLayerType }) {
  const color = asset.fallback.color ?? RARITY_THEME[asset.rarity].color;
  const value = asset.fallback.value;

  if (asset.fallback.kind === "body" || layer === "Body") {
    return (
      <div className="bb-fallbackBody" style={{ "--bb-fallback-color": color ?? "#ffffff" } as CSSProperties}>
        <span className="eye left" />
        <span className="eye right" />
        <span className="smile" />
        <span className="shoe left" />
        <span className="shoe right" />
      </div>
    );
  }

  if (asset.fallback.kind === "ring") {
    return <div className="bb-fallbackRing" style={{ borderColor: color, boxShadow: `0 0 42px ${color}` }} />;
  }

  if (asset.fallback.kind === "badge") {
    return (
      <div className="bb-fallbackBadge" style={{ backgroundColor: color }}>
        {value ?? asset.label.slice(0, 1)}
      </div>
    );
  }

  return (
    <div className="bb-fallbackEmoji" style={{ color }}>
      {value ?? "✦"}
    </div>
  );
}

const CSS = `
.bb-mascotRenderer{position:relative;display:grid;place-items:center;isolation:isolate;border-radius:var(--bb-mascot-radius);overflow:hidden;background:radial-gradient(circle at 50% 18%,rgba(181,107,255,.34),rgba(8,3,20,.94) 64%);border:1px solid rgba(255,255,255,.1);box-shadow:0 20px 55px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12)}
.bb-mascotRenderer[data-active="true"]{animation:bbMascotPulse 2.2s ease-in-out infinite}
.bb-mascotGlow{position:absolute;inset:11%;border-radius:50%;background:radial-gradient(circle,rgba(255,77,255,.28),rgba(0,229,255,.12) 42%,transparent 70%);filter:blur(6px);z-index:1}
.bb-mascotPlatform{position:absolute;left:50%;bottom:11%;width:56%;height:10%;transform:translateX(-50%);border-radius:50%;background:rgba(0,0,0,.42);box-shadow:0 0 28px rgba(181,53,255,.38),0 0 18px rgba(255,217,61,.22);z-index:2}
.bb-mascotLayer{position:absolute;left:50%;top:50%;display:grid;place-items:center;filter:drop-shadow(0 14px 22px rgba(0,0,0,.42)) drop-shadow(0 0 16px var(--bb-layer-glow));will-change:transform}
.bb-mascotLayer img{display:block;width:100%;height:auto;object-fit:contain;user-select:none;pointer-events:none}
.bb-layer-AuraBack{top:50%}.bb-layer-Body{top:50%}.bb-layer-Clothes{top:50%}.bb-layer-Eyes{top:50%}.bb-layer-Glasses{top:50%}.bb-layer-Hat{top:50%}.bb-layer-FrontFX{top:50%;pointer-events:none}
.bb-fallbackBody{position:relative;width:100%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 33% 22%,#fff 0 20%,var(--bb-fallback-color,#ffffff) 52%,#cfd8ff 100%);border:4px solid rgba(255,255,255,.75);box-shadow:inset -14px -18px 28px rgba(59,23,117,.32),0 0 26px rgba(255,255,255,.18)}
.bb-fallbackBody .eye{position:absolute;top:31%;width:13%;height:20%;border-radius:50%;background:#071428;box-shadow:inset 3px 5px 0 #63cfff}.bb-fallbackBody .eye:after{content:"";position:absolute;left:18%;top:14%;width:32%;height:32%;border-radius:50%;background:#fff}.bb-fallbackBody .eye.left{left:31%}.bb-fallbackBody .eye.right{right:31%}
.bb-fallbackBody .smile{position:absolute;left:50%;top:54%;width:28%;height:15%;transform:translateX(-50%);border-radius:0 0 999px 999px;background:#2b0712;border-bottom:5px solid #ff3d7f}
.bb-fallbackBody .shoe{position:absolute;bottom:-5%;width:24%;height:14%;border-radius:999px;background:#ff3d3d;border:3px solid rgba(255,255,255,.85)}.bb-fallbackBody .shoe.left{left:20%;transform:rotate(-8deg)}.bb-fallbackBody .shoe.right{right:20%;transform:rotate(8deg)}
.bb-fallbackRing{width:100%;aspect-ratio:1;border-radius:50%;border:8px solid var(--bb-layer-color);background:radial-gradient(circle,transparent 56%,rgba(255,255,255,.08));animation:bbMascotSpin 8s linear infinite}
.bb-fallbackBadge{display:grid;place-items:center;min-width:34%;aspect-ratio:1;border-radius:999px;border:2px solid rgba(255,255,255,.46);color:#fff;font-weight:1000;font-size:clamp(28px,9vw,54px);box-shadow:0 0 24px var(--bb-layer-glow)}
.bb-fallbackEmoji{font-size:clamp(38px,11vw,72px);line-height:1;text-shadow:0 0 18px var(--bb-layer-glow),0 8px 18px rgba(0,0,0,.6)}
@keyframes bbMascotPulse{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes bbMascotSpin{to{transform:rotate(360deg)}}
`;
