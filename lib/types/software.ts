export type CompatibilityStatus =
  | "Runs Smoothly"
  | "Runs Fine"
  | "Limited"
  | "Not Recommended";

export type SoftwareCategory =
  | "Development"
  | "Design"
  | "Video"
  | "3D & CAD"
  | "Engineering";

export interface Software {
  id: string;
  name: string;
  category: SoftwareCategory;
  vendor: string;
  /** Emoji stand-in for the app icon. */
  icon: string;
  /** Scores/GB needed for a comfortable "Runs Fine" experience. */
  requirement: {
    cpu: number;
    gpu: number;
    ram: number;
  };
}

/** Keyed by `Software["name"]` so it renders directly in tables. */
export type SoftwareCompatibilityMap = Record<string, CompatibilityStatus>;
