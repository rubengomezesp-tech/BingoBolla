import { BINGOBOLLA_PROMPT_BASE, type AssetRarity } from "./artDirection";

export type AssetCategory =
  | "body"
  | "eyes"
  | "glasses"
  | "hat"
  | "clothes"
  | "aura"
  | "frontFx"
  | "ui"
  | "background";

export type UnlockType = "starter" | "level" | "event" | "vip" | "seasonal" | "admin" | "nft";

export type MascotLayerType = "AuraBack" | "Body" | "Clothes" | "Eyes" | "Glasses" | "Hat" | "FrontFX";

export type AssetTransform = {
  scale: number;
  x: number;
  y: number;
  rotation: number;
  widthPct?: number;
};

export type BingoAsset = {
  id: string;
  label: string;
  category: AssetCategory;
  bucket: "mascot-miami" | "world-assets";
  storagePath: string;
  rarity: AssetRarity;
  unlockType: UnlockType;
  layerType?: MascotLayerType;
  zIndex: number;
  previewImage: string;
  equipped: AssetTransform;
  prompt: string;
  workshop?: boolean;
  activeFrom?: string;
  activeUntil?: string;
  tags?: string[];
  nftTraits?: Record<string, string>;
  fallback: {
    kind: "body" | "emoji" | "ring" | "badge";
    value?: string;
    color?: string;
  };
};

export type MascotLoadout = Partial<Record<MascotLayerType, string>>;

export const SUPABASE_STORAGE_PUBLIC_BASE =
  "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public";

export const MASCOT_LAYER_ORDER: MascotLayerType[] = ["AuraBack", "Body", "Clothes", "Eyes", "Glasses", "Hat", "FrontFX"];

export const WORKSHOP_LAYER_ORDER: MascotLayerType[] = ["Hat", "Glasses", "Clothes", "AuraBack", "FrontFX", "Body", "Eyes"];

export const MASCOT_LAYER_LABELS: Record<MascotLayerType, string> = {
  AuraBack: "Auras",
  Body: "Base",
  Clothes: "Ropa",
  Eyes: "Ojos",
  Glasses: "Gafas",
  Hat: "Gorras",
  FrontFX: "FX",
};

export const REQUIRED_MASCOT_LAYERS: MascotLayerType[] = ["Body"];

export const BINGOBOLLA_ASSET_MANIFEST: BingoAsset[] = [
  {
    id: "body-classic-bolla",
    label: "Bolla clásico",
    category: "body",
    bucket: "mascot-miami",
    storagePath: "mascot-miami.PNG",
    rarity: "common",
    unlockType: "starter",
    layerType: "Body",
    zIndex: 20,
    previewImage: "mascot-miami.PNG",
    equipped: { scale: 1, x: 0, y: 4, rotation: 0, widthPct: 78 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Cute round bingo ball mascot, happy face, white glossy body, red shoes, friendly gloves, full body centered, transparent background.`,
    workshop: true,
    tags: ["base", "starter", "character"],
    nftTraits: { trait_type: "Body", value: "Classic Bolla" },
    fallback: { kind: "body" },
  },
  {
    id: "body-purple-miami",
    label: "Bolla Miami",
    category: "body",
    bucket: "mascot-miami",
    storagePath: "body/body-purple-miami.png",
    rarity: "rare",
    unlockType: "level",
    layerType: "Body",
    zIndex: 20,
    previewImage: "body/body-purple-miami.png",
    equipped: { scale: 1, x: 0, y: 4, rotation: 0, widthPct: 78 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Purple glossy round bingo ball mascot body, Miami neon reflections, happy premium collectible avatar, transparent background.`,
    workshop: true,
    tags: ["base", "miami", "level"],
    nftTraits: { trait_type: "Body", value: "Purple Miami" },
    fallback: { kind: "body", color: "#b535ff" },
  },
  {
    id: "eyes-happy-blue",
    label: "Ojos felices",
    category: "eyes",
    bucket: "mascot-miami",
    storagePath: "face/eyes-happy-blue.png",
    rarity: "common",
    unlockType: "starter",
    layerType: "Eyes",
    zIndex: 35,
    previewImage: "face/eyes-happy-blue.png",
    equipped: { scale: 1, x: 0, y: -19, rotation: 0, widthPct: 34 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Large happy blue cartoon eyes only, glossy highlights, transparent background, accessory face layer for round mascot.`,
    workshop: true,
    tags: ["face", "starter"],
    nftTraits: { trait_type: "Eyes", value: "Happy Blue" },
    fallback: { kind: "emoji", value: "◕‿◕", color: "#8fdcff" },
  },
  {
    id: "glasses-neon-shades",
    label: "Gafas neon",
    category: "glasses",
    bucket: "mascot-miami",
    storagePath: "accessories/glasses-neon.png",
    rarity: "rare",
    unlockType: "starter",
    layerType: "Glasses",
    zIndex: 46,
    previewImage: "accessories/glasses-neon.png",
    equipped: { scale: 1, x: 0, y: -12, rotation: 0, widthPct: 43 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Oversized black sunglasses with neon magenta and cyan rim glow, accessory only, front view, transparent background, designed to fit a round mascot face.`,
    workshop: true,
    tags: ["glasses", "neon", "miami"],
    nftTraits: { trait_type: "Glasses", value: "Neon Shades" },
    fallback: { kind: "emoji", value: "😎", color: "#ff4dff" },
  },
  {
    id: "glasses-star-gold",
    label: "Estrellas doradas",
    category: "glasses",
    bucket: "mascot-miami",
    storagePath: "accessories/glasses-stars.png",
    rarity: "epic",
    unlockType: "event",
    layerType: "Glasses",
    zIndex: 46,
    previewImage: "accessories/glasses-stars.png",
    equipped: { scale: 1, x: 0, y: -13, rotation: 0, widthPct: 45 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Gold star-shaped glasses, glossy casino prize accessory, transparent background, front view, no text.`,
    workshop: true,
    tags: ["glasses", "gold", "event"],
    nftTraits: { trait_type: "Glasses", value: "Golden Stars" },
    fallback: { kind: "emoji", value: "⭐", color: "#ffd93d" },
  },
  {
    id: "hat-flower-cap",
    label: "Gorra tropical",
    category: "hat",
    bucket: "mascot-miami",
    storagePath: "accessories/hat-flower-cap.png",
    rarity: "rare",
    unlockType: "starter",
    layerType: "Hat",
    zIndex: 56,
    previewImage: "accessories/hat-flower-cap.png",
    equipped: { scale: 1, x: 0, y: -52, rotation: -5, widthPct: 48 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Purple baseball cap with golden B emblem and tropical hibiscus flower, accessory only, front three-quarter view, transparent background.`,
    workshop: true,
    tags: ["hat", "miami", "flower"],
    nftTraits: { trait_type: "Hat", value: "Tropical Cap" },
    fallback: { kind: "emoji", value: "🌺", color: "#ff7ab0" },
  },
  {
    id: "hat-royal-crown",
    label: "Corona jackpot",
    category: "hat",
    bucket: "mascot-miami",
    storagePath: "accessories/hat-crown.png",
    rarity: "legendary",
    unlockType: "vip",
    layerType: "Hat",
    zIndex: 57,
    previewImage: "accessories/hat-crown.png",
    equipped: { scale: 1, x: 0, y: -58, rotation: -8, widthPct: 42 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Golden royal crown with purple jewels, glossy casino jackpot accessory, transparent background, front view.`,
    workshop: true,
    tags: ["hat", "vip", "jackpot"],
    nftTraits: { trait_type: "Hat", value: "Jackpot Crown" },
    fallback: { kind: "emoji", value: "👑", color: "#ffd93d" },
  },
  {
    id: "clothes-miami-hoodie",
    label: "Hoodie Bolla",
    category: "clothes",
    bucket: "mascot-miami",
    storagePath: "accessories/outfit-hoodie.png",
    rarity: "common",
    unlockType: "starter",
    layerType: "Clothes",
    zIndex: 32,
    previewImage: "accessories/outfit-hoodie.png",
    equipped: { scale: 1, x: 0, y: 38, rotation: 0, widthPct: 54 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Cropped purple hoodie outfit with gold BingoBolla B emblem, accessory only for round mascot lower body, transparent background.`,
    workshop: true,
    tags: ["clothes", "starter"],
    nftTraits: { trait_type: "Clothes", value: "Bolla Hoodie" },
    fallback: { kind: "badge", value: "B", color: "#7b2ff7" },
  },
  {
    id: "clothes-gold-jacket",
    label: "Chaqueta oro",
    category: "clothes",
    bucket: "mascot-miami",
    storagePath: "accessories/outfit-gold-jacket.png",
    rarity: "epic",
    unlockType: "level",
    layerType: "Clothes",
    zIndex: 33,
    previewImage: "accessories/outfit-gold-jacket.png",
    equipped: { scale: 1, x: 0, y: 39, rotation: 0, widthPct: 56 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Cropped golden bomber jacket for a round mascot, purple trim, premium casino collectible clothing layer, transparent background.`,
    workshop: true,
    tags: ["clothes", "gold", "level"],
    nftTraits: { trait_type: "Clothes", value: "Gold Jacket" },
    fallback: { kind: "badge", value: "✦", color: "#ffd93d" },
  },
  {
    id: "aura-pink-spark",
    label: "Spark rosa",
    category: "aura",
    bucket: "mascot-miami",
    storagePath: "effects/aura-pink-spark.png",
    rarity: "rare",
    unlockType: "starter",
    layerType: "AuraBack",
    zIndex: 5,
    previewImage: "effects/aura-pink-spark.png",
    equipped: { scale: 1, x: 0, y: 2, rotation: 0, widthPct: 94 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Pink magenta sparkle aura ring, soft neon particles, circular character background effect, transparent background.`,
    workshop: true,
    tags: ["aura", "neon"],
    nftTraits: { trait_type: "Aura", value: "Pink Spark" },
    fallback: { kind: "ring", color: "#ff3d7f" },
  },
  {
    id: "aura-cyan-ring",
    label: "Anillo cyan",
    category: "aura",
    bucket: "mascot-miami",
    storagePath: "effects/aura-cyan-ring.png",
    rarity: "epic",
    unlockType: "event",
    layerType: "AuraBack",
    zIndex: 5,
    previewImage: "effects/aura-cyan-ring.png",
    equipped: { scale: 1, x: 0, y: 2, rotation: 0, widthPct: 94 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Cyan neon aura ring with tiny electric particles, clean circular effect for character, transparent background.`,
    workshop: true,
    tags: ["aura", "cyan", "event"],
    nftTraits: { trait_type: "Aura", value: "Cyan Ring" },
    fallback: { kind: "ring", color: "#00e5ff" },
  },
  {
    id: "frontfx-confetti-win",
    label: "Confeti win",
    category: "frontFx",
    bucket: "mascot-miami",
    storagePath: "effects/frontfx-confetti-win.png",
    rarity: "legendary",
    unlockType: "event",
    layerType: "FrontFX",
    zIndex: 70,
    previewImage: "effects/frontfx-confetti-win.png",
    equipped: { scale: 1, x: 0, y: 0, rotation: 0, widthPct: 96 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Celebration confetti burst foreground layer, gold coins and magenta sparkles around edges, transparent center, transparent background.`,
    workshop: true,
    tags: ["front-fx", "win", "event"],
    nftTraits: { trait_type: "Front FX", value: "Confetti Win" },
    fallback: { kind: "emoji", value: "✦", color: "#ffd93d" },
  },
  {
    id: "ui-chest-daily",
    label: "Cofre diario",
    category: "ui",
    bucket: "world-assets",
    storagePath: "ui/chest-daily.png",
    rarity: "common",
    unlockType: "starter",
    zIndex: 0,
    previewImage: "ui/chest-daily.png",
    equipped: { scale: 1, x: 0, y: 0, rotation: 0 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Treasure chest full of gold coins and bingo balls, purple wood, golden trim, magical sparkles, front view, transparent background.`,
    tags: ["ui", "chest", "daily"],
    fallback: { kind: "emoji", value: "🎁", color: "#ffd93d" },
  },
  {
    id: "ui-chest-vip",
    label: "Cofre VIP",
    category: "ui",
    bucket: "world-assets",
    storagePath: "ui/chest-vip.png",
    rarity: "legendary",
    unlockType: "vip",
    zIndex: 0,
    previewImage: "ui/chest-vip.png",
    equipped: { scale: 1, x: 0, y: 0, rotation: 0 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Luxury VIP treasure chest with diamonds, gold trim, cyan glow, premium casino reward, front view, transparent background.`,
    tags: ["ui", "chest", "vip"],
    fallback: { kind: "emoji", value: "💎", color: "#00e5ff" },
  },
  {
    id: "ui-roulette-wheel",
    label: "Ruleta",
    category: "ui",
    bucket: "world-assets",
    storagePath: "ui/roulette-wheel.png",
    rarity: "rare",
    unlockType: "starter",
    zIndex: 0,
    previewImage: "ui/roulette-wheel.png",
    equipped: { scale: 1, x: 0, y: 0, rotation: 0 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Bright prize wheel with gold rim, magenta cyan purple segments, coin and diamond icons, centered front view, transparent background.`,
    tags: ["ui", "roulette"],
    fallback: { kind: "emoji", value: "🎡", color: "#ff3d7f" },
  },
  {
    id: "bg-worlds-hub",
    label: "Mundos hub",
    category: "background",
    bucket: "world-assets",
    storagePath: "bg-worlds-hub.png",
    rarity: "mythic",
    unlockType: "admin",
    zIndex: 0,
    previewImage: "bg-worlds-hub.png",
    equipped: { scale: 1, x: 0, y: 0, rotation: 0 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Wide panoramic Bingo World island hub at night, Miami beach foreground, Vegas and Tokyo islands in distance, glowing dotted path, yachts, palm trees, city skyline, no UI, no text.`,
    tags: ["background", "worlds", "hub"],
    fallback: { kind: "badge", value: "BG", color: "#7b2ff7" },
  },
  {
    id: "bg-home-lobby",
    label: "Home lobby",
    category: "background",
    bucket: "world-assets",
    storagePath: "bg-home-lobby.png",
    rarity: "mythic",
    unlockType: "admin",
    zIndex: 0,
    previewImage: "bg-home-lobby.png",
    equipped: { scale: 1, x: 0, y: 0, rotation: 0 },
    prompt:
      `${BINGOBOLLA_PROMPT_BASE}. Vertical mobile home lobby background, tropical Miami night, bingo balls characters, neon city, casino party energy, open center area for UI panels, no text.`,
    tags: ["background", "home", "lobby"],
    fallback: { kind: "badge", value: "BG", color: "#00e5ff" },
  },
];

export const DEFAULT_MASCOT_LOADOUT: MascotLoadout = {
  AuraBack: "aura-pink-spark",
  Body: "body-classic-bolla",
  Clothes: "clothes-miami-hoodie",
  Glasses: "glasses-neon-shades",
  Hat: "hat-flower-cap",
};

export function getAssetById(id: string | null | undefined) {
  if (!id) return undefined;
  return BINGOBOLLA_ASSET_MANIFEST.find((asset) => asset.id === id);
}

export function getAssetsByLayer(layer: MascotLayerType) {
  return BINGOBOLLA_ASSET_MANIFEST.filter((asset) => asset.workshop && asset.layerType === layer);
}

export function getWorkshopLayers() {
  return WORKSHOP_LAYER_ORDER.filter((layer) => getAssetsByLayer(layer).length > 0);
}

export function getAssetPublicUrl(asset: Pick<BingoAsset, "bucket" | "storagePath">) {
  return `${SUPABASE_STORAGE_PUBLIC_BASE}/${asset.bucket}/${asset.storagePath}`;
}

export function getAssetPreviewUrl(asset: BingoAsset) {
  return `${SUPABASE_STORAGE_PUBLIC_BASE}/${asset.bucket}/${asset.previewImage}`;
}

export function normalizeMascotLoadout(value: Partial<MascotLoadout> & Record<string, unknown> = {}): MascotLoadout {
  const legacy: MascotLoadout = {
    AuraBack: typeof value.aura === "string" ? legacyId("AuraBack", value.aura) : undefined,
    Clothes: typeof value.outfit === "string" ? legacyId("Clothes", value.outfit) : undefined,
    Glasses: typeof value.glasses === "string" ? legacyId("Glasses", value.glasses) : undefined,
    Hat: typeof value.hat === "string" ? legacyId("Hat", value.hat) : undefined,
  };

  const next: MascotLoadout = { Body: DEFAULT_MASCOT_LOADOUT.Body };
  for (const layer of MASCOT_LAYER_ORDER) {
    const candidate = value[layer] ?? legacy[layer];
    if (typeof candidate === "string" && getAssetById(candidate)?.layerType === layer) {
      next[layer] = candidate;
    }
  }
  return next;
}

function legacyId(layer: MascotLayerType, oldId: string) {
  const legacyMap: Partial<Record<MascotLayerType, Record<string, string>>> = {
    AuraBack: { "pink-spark": "aura-pink-spark", "cyan-ring": "aura-cyan-ring" },
    Clothes: { "miami-hoodie": "clothes-miami-hoodie", "gold-jacket": "clothes-gold-jacket" },
    Glasses: { "neon-shades": "glasses-neon-shades", "star-glasses": "glasses-star-gold" },
    Hat: { "flower-cap": "hat-flower-cap", "royal-crown": "hat-royal-crown" },
  };
  return legacyMap[layer]?.[oldId] ?? oldId;
}
