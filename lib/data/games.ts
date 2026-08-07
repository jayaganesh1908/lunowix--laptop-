import type { Game } from "@/lib/types/game";

/**
 * `demand` is the GPU score (0-100, see `GPU_SCORES` in `laptops.ts`) needed to
 * hold roughly 60fps at the High preset in 1080p. The benchmark model scales
 * frame rates around that anchor.
 */
export const games: Game[] = [
  {
    id: "valorant",
    name: "Valorant",
    genre: "Tactical Shooter",
    releaseYear: 2020,
    icon: "🎯",
    demand: 11,
    cpuBound: true,
  },
  {
    id: "cs2",
    name: "Counter-Strike 2",
    genre: "Tactical Shooter",
    releaseYear: 2023,
    icon: "🔫",
    demand: 16,
    cpuBound: true,
  },
  {
    id: "minecraft",
    name: "Minecraft",
    genre: "Sandbox",
    releaseYear: 2011,
    icon: "⛏️",
    demand: 10,
    cpuBound: true,
  },
  {
    id: "fortnite",
    name: "Fortnite",
    genre: "Battle Royale",
    releaseYear: 2017,
    icon: "🏗️",
    demand: 27,
    cpuBound: false,
  },
  {
    id: "apex-legends",
    name: "Apex Legends",
    genre: "Battle Royale",
    releaseYear: 2019,
    icon: "🛰️",
    demand: 31,
    cpuBound: false,
  },
  {
    id: "gta-v",
    name: "GTA V",
    genre: "Open World",
    releaseYear: 2015,
    icon: "🚗",
    demand: 24,
    cpuBound: false,
  },
  {
    id: "ea-fc-25",
    name: "EA Sports FC 25",
    genre: "Sports",
    releaseYear: 2024,
    icon: "⚽",
    demand: 29,
    cpuBound: false,
  },
  {
    id: "forza-horizon-5",
    name: "Forza Horizon 5",
    genre: "Racing",
    releaseYear: 2021,
    icon: "🏁",
    demand: 44,
    cpuBound: false,
  },
  {
    id: "call-of-duty",
    name: "Call of Duty: Warzone",
    genre: "Battle Royale",
    releaseYear: 2023,
    icon: "🎖️",
    demand: 52,
    cpuBound: false,
  },
  {
    id: "cyberpunk-2077",
    name: "Cyberpunk 2077",
    genre: "Action RPG",
    releaseYear: 2020,
    icon: "🌆",
    demand: 70,
    cpuBound: false,
  },
];

export const gamesById = new Map(games.map((game) => [game.id, game]));

export function getGame(id: string) {
  return gamesById.get(id);
}
