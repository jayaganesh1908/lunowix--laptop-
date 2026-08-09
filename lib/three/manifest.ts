import { type ProductCategory } from "@/lib/types";

/**
 * Which archetypes have a Blender-authored mesh in `public/models`.
 *
 * The viewer has two sources for every product: a GLB listed here, or the
 * procedural mesh in `components/three/ProductMeshes.tsx`. Both are driven by
 * the same `Model3DParams`, so a product looks like *itself* either way — the
 * GLB simply carries more surface detail.
 *
 * This is a static map rather than a runtime probe on purpose: a `HEAD` request
 * per viewer mount to discover whether a file exists would cost a round trip on
 * every product page to answer a question that is fixed at build time.
 *
 * To adopt a Blender export, drop `<archetype>.glb` into `public/models` and add
 * the entry here. Nothing else needs to change.
 */
export const GLB_MODELS: Partial<Record<ProductCategory, string>> = {
  // laptop: "/models/laptop.glb",
  // phone: "/models/phone.glb",
  // headphone: "/models/headphone.glb",
};

export function glbFor(category: ProductCategory): string | null {
  return GLB_MODELS[category] ?? null;
}

/** World units are decimetres: 1 unit = 10cm, so a 35cm laptop spans 3.5. */
export const CM_PER_UNIT = 10;

export const toUnits = (cm: number) => cm / CM_PER_UNIT;
