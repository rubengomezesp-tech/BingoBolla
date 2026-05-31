export const WORLDS = [
  {
    id: "miami",
    ordinal: 1,
    name: "Miami",
    subtitle: "Neon Beach",
    primary: "#FF2A6D",
    secondary: "#05D9E8",
    bg: "https://static.prod-images.emergentagent.com/jobs/0c37dffe-63b8-4546-9e18-38814e0f9d7f/images/9d22d1c315a702212a7b448d518daba2d62b451a0b8b2f91017c46238f19fda2.png",
    icons: ["🌴", "🌅", "🏖️", "🍹", "🦩", "🛼", "🕶️", "⛱️"],
    cityWords: ["MIAMI", "BEACH", "OCEAN", "PALM", "NEON", "SUNSET"],
  },
  {
    id: "vegas",
    ordinal: 2,
    name: "Las Vegas",
    subtitle: "City of Lights",
    primary: "#FFD700",
    secondary: "#E5E5E5",
    bg: "https://static.prod-images.emergentagent.com/jobs/0c37dffe-63b8-4546-9e18-38814e0f9d7f/images/9c62d1b7a475ad48eca36dd475135f72fa0c6361a796ad31e93874727e0d8b96.png",
    icons: ["🎰", "🎲", "♠️", "♥️", "💎", "🍒", "🎯", "👑"],
    cityWords: ["VEGAS", "CASINO", "LIGHTS", "LUCKY", "STRIP", "JACKPOT"],
  },
  {
    id: "la",
    ordinal: 3,
    name: "Los Angeles",
    subtitle: "Sunset Strip",
    primary: "#FF5E00",
    secondary: "#C026D3",
    bg: "https://static.prod-images.emergentagent.com/jobs/0c37dffe-63b8-4546-9e18-38814e0f9d7f/images/df9afbc5df44dd8e6ccb7243519c11087b7473ae10f0de6df19d562d253b8e8e.png",
    icons: ["🌃", "🎬", "⭐", "🎤", "🚗", "🌇", "🎥", "🌴"],
    cityWords: ["ANGEL", "STAR", "MOVIE", "BEVERLY", "SUNSET", "HOLLY"],
  },
  {
    id: "california",
    ordinal: 4,
    name: "California",
    subtitle: "Golden Coast",
    primary: "#3EB489",
    secondary: "#F4E4C1",
    bg: "https://static.prod-images.emergentagent.com/jobs/0c37dffe-63b8-4546-9e18-38814e0f9d7f/images/5d9cdd9d1c1045b83e9d6327e7cf82e2fd696c281b70e2e7ff57db9085e516ed.png",
    icons: ["🏄", "🌊", "🌲", "🌉", "☀️", "🌻", "🐻", "🥑"],
    cityWords: ["GOLDEN", "SURF", "WAVE", "BRIDGE", "REDWOOD", "COAST"],
  },
  {
    id: "newyork",
    ordinal: 5,
    name: "New York",
    subtitle: "Empire Rush",
    primary: "#FFCC00",
    secondary: "#0047AB",
    bg: "https://static.prod-images.emergentagent.com/jobs/0c37dffe-63b8-4546-9e18-38814e0f9d7f/images/10bbc99c91c15e25dafedf237e6b59b63c027efe5e9835e53954feb042db9839.png",
    icons: ["🗽", "🚖", "🏙️", "🥯", "🍕", "🍎", "🌉", "🎭"],
    cityWords: ["EMPIRE", "TAXI", "BRONX", "QUEENS", "BAGEL", "BROADWAY"],
  },
];

export const WORLDS_BY_ID = Object.fromEntries(WORLDS.map((w) => [w.id, w]));

export function gameTypeForLevel(level) {
  if (level <= 5) return "match3";
  if (level <= 10) return "memory";
  if (level <= 15) return "slide";
  return "wordsearch";
}

export const GAME_LABEL = {
  match3: "Match 3",
  memory: "Memoria",
  slide: "Slide Puzzle",
  wordsearch: "Sopa de Letras",
};
