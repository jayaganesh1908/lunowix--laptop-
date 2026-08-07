export type GraphicsPreset = "Low" | "Medium" | "High" | "Ultra";

export type GamePerformanceTier =
  | "Flawless"
  | "Excellent"
  | "Playable"
  | "Struggles";

export interface Game {
  id: string;
  name: string;
  genre: string;
  releaseYear: number;
  /** Emoji stand-in for cover art so the demo ships without external assets. */
  icon: string;
  /**
   * GPU score required to hold ~60fps at the High preset. Used by the
   * benchmark model in `lib/data/laptops.ts`.
   */
  demand: number;
  /** Some engines are notably CPU bound; raises the CPU weight of the model. */
  cpuBound: boolean;
}

export interface GameBenchmark {
  id: string;
  name: string;
  icon: string;
  fps: number;
  graphics: GraphicsPreset;
  tier: GamePerformanceTier;
}
