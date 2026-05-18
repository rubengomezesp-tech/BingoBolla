export const BINGOBOLLA_ART_DIRECTION = {
  brand: "BingoBolla",
  visualNorthStar:
    "Miami neon casino premium mobile game: collectible, friendly, glossy, celebratory, and readable at phone size.",
  promptBase:
    "BingoBolla mobile game asset, Miami neon casino world, premium Candy Crush style, glossy 3D cartoon render, vibrant magenta, purple, cyan and gold lighting, clean readable silhouette, polished mobile game UI, joyful collectible character universe, transparent background for isolated assets, no watermark",
  palette: {
    ink: "#05020d",
    night: "#09031a",
    deepPurple: "#18062f",
    royalPurple: "#7b2ff7",
    neonPurple: "#b535ff",
    magenta: "#ff3d7f",
    hotPink: "#ff4dff",
    cyan: "#00e5ff",
    lagoon: "#20f2d6",
    gold: "#ffd93d",
    orangeGold: "#ff9f1c",
    success: "#2fca45",
    white: "#ffffff",
  },
  glowColors: {
    purple: "rgba(181, 53, 255, .55)",
    magenta: "rgba(255, 61, 127, .5)",
    cyan: "rgba(0, 229, 255, .45)",
    gold: "rgba(255, 217, 61, .52)",
    softWhite: "rgba(255, 255, 255, .22)",
  },
  renderRules: [
    "Assets must read clearly at 64px, 128px and 256px.",
    "Use chunky silhouettes, glossy highlights and thick casino-toy proportions.",
    "Keep accessories centered and front-facing unless the asset manifest says otherwise.",
    "Transparent PNGs should have generous padding so glows are not clipped.",
    "No baked UI labels inside isolated character assets.",
    "World backgrounds can be cinematic, but interactive items need clean silhouettes.",
  ],
  forbiddenStyles: [
    "flat vector",
    "realistic gambling ad",
    "dark horror casino",
    "muddy low-contrast colors",
    "tiny thin-line details",
    "stock-photo realism",
    "AI text inside art",
    "watermarks",
    "brown/beige dominant palette",
  ],
  mascotProportions: {
    canvas: "1024x1024 transparent PNG",
    body: "round bingo ball body, about 72% of canvas height",
    face: "large eyes and smile, centered in upper half",
    hands: "oversized friendly gloves, readable over clothing",
    feet: "short chunky shoes, bottom 18% of canvas",
    accessoryPadding: "15% transparent padding minimum around hats, glasses and FX",
  },
  uiShadowRules: {
    card: "0 18px 45px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.12)",
    neonButton: "0 0 22px var(--bb-glow), inset 0 2px 0 rgba(255,255,255,.28)",
    floatingAsset: "0 18px 38px rgba(0,0,0,.38), 0 0 28px var(--bb-glow)",
    textGlow: "0 0 18px currentColor, 0 4px 16px rgba(0,0,0,.65)",
  },
  neonIntensity: {
    background: 0.32,
    cards: 0.22,
    buttons: 0.48,
    activeItem: 0.62,
    hero: 0.74,
  },
  radius: {
    xs: 8,
    sm: 12,
    md: 18,
    lg: 24,
    xl: 28,
    mascotCanvas: 34,
    pill: 999,
  },
  seasonalSupport: {
    spine: "Reserve layer ids and z-indexes; animation renderer can replace static PNG by asset type.",
    lottie: "FrontFX and AuraBack can later point to lottie json instead of PNG.",
    particles: "Renderer exposes layer hooks for sparkle bursts and win states.",
    temporarySkins: "unlockType seasonal + activeFrom/activeUntil can gate event cosmetics.",
    nftMetadata: "Every manifest item has stable id, rarity, image path and trait metadata.",
    multiplayerSync: "The saved loadout json is compact enough to broadcast by player id.",
  },
} as const;

export const BINGOBOLLA_PROMPT_BASE = BINGOBOLLA_ART_DIRECTION.promptBase;

export const RARITY_THEME = {
  common: {
    label: "Common",
    color: "#ffffff",
    glow: "rgba(255,255,255,.22)",
    ring: "rgba(255,255,255,.24)",
  },
  rare: {
    label: "Rare",
    color: "#00e5ff",
    glow: "rgba(0,229,255,.38)",
    ring: "rgba(0,229,255,.55)",
  },
  epic: {
    label: "Epic",
    color: "#b535ff",
    glow: "rgba(181,53,255,.42)",
    ring: "rgba(181,53,255,.62)",
  },
  legendary: {
    label: "Legendary",
    color: "#ffd93d",
    glow: "rgba(255,217,61,.45)",
    ring: "rgba(255,217,61,.7)",
  },
  mythic: {
    label: "Mythic",
    color: "#ff3d7f",
    glow: "rgba(255,61,127,.5)",
    ring: "rgba(255,61,127,.72)",
  },
} as const;

export type AssetRarity = keyof typeof RARITY_THEME;
