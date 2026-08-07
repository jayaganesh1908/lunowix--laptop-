import type { Software } from "@/lib/types/software";

/**
 * `requirement` holds the CPU score, GPU score and RAM (GB) at which the app is
 * expected to merely "Run Fine". The compatibility model in `laptops.ts`
 * compares a machine's headroom against these anchors.
 */
export const softwareCatalog: Software[] = [
  {
    id: "vs-code",
    name: "Visual Studio Code",
    category: "Development",
    vendor: "Microsoft",
    icon: "🧩",
    requirement: { cpu: 18, gpu: 0, ram: 4 },
  },
  {
    id: "android-studio",
    name: "Android Studio",
    category: "Development",
    vendor: "Google",
    icon: "🤖",
    requirement: { cpu: 46, gpu: 10, ram: 12 },
  },
  {
    id: "intellij-idea",
    name: "IntelliJ IDEA",
    category: "Development",
    vendor: "JetBrains",
    icon: "💡",
    requirement: { cpu: 40, gpu: 6, ram: 8 },
  },
  {
    id: "pycharm",
    name: "PyCharm",
    category: "Development",
    vendor: "JetBrains",
    icon: "🐍",
    requirement: { cpu: 36, gpu: 6, ram: 8 },
  },
  {
    id: "photoshop",
    name: "Adobe Photoshop",
    category: "Design",
    vendor: "Adobe",
    icon: "🖼️",
    requirement: { cpu: 45, gpu: 28, ram: 12 },
  },
  {
    id: "illustrator",
    name: "Adobe Illustrator",
    category: "Design",
    vendor: "Adobe",
    icon: "✒️",
    requirement: { cpu: 42, gpu: 22, ram: 8 },
  },
  {
    id: "premiere-pro",
    name: "Adobe Premiere Pro",
    category: "Video",
    vendor: "Adobe",
    icon: "🎬",
    requirement: { cpu: 60, gpu: 48, ram: 16 },
  },
  {
    id: "davinci-resolve",
    name: "DaVinci Resolve",
    category: "Video",
    vendor: "Blackmagic",
    icon: "🎞️",
    requirement: { cpu: 58, gpu: 54, ram: 16 },
  },
  {
    id: "blender",
    name: "Blender",
    category: "3D & CAD",
    vendor: "Blender Foundation",
    icon: "🌀",
    requirement: { cpu: 62, gpu: 58, ram: 16 },
  },
  {
    id: "autocad",
    name: "AutoCAD",
    category: "3D & CAD",
    vendor: "Autodesk",
    icon: "📐",
    requirement: { cpu: 50, gpu: 34, ram: 12 },
  },
  {
    id: "matlab",
    name: "MATLAB",
    category: "Engineering",
    vendor: "MathWorks",
    icon: "📊",
    requirement: { cpu: 48, gpu: 14, ram: 8 },
  },
];

export const softwareById = new Map(softwareCatalog.map((item) => [item.id, item]));

export const softwareByName = new Map(
  softwareCatalog.map((item) => [item.name, item]),
);

export const softwareCategories = Array.from(
  new Set(softwareCatalog.map((item) => item.category)),
);
