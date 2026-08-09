"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  Instance,
  Instances,
  OrbitControls,
  RoundedBox,
  useGLTF,
} from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import { BackSide, DoubleSide, type Group } from "three";
import { glbFor, toUnits } from "@/lib/three/manifest";
import { type Model3DParams } from "@/lib/types";

/**
 * Procedural product meshes.
 *
 * Three archetypes cover the whole catalogue because every dimension here is
 * read from `Model3DParams`, which the data modules derive from real specs. A
 * 2.6kg 16-inch gaming laptop and a 1.37kg 14-inch ultrabook are the same code
 * with different `span` and `bulk`, and they look as different as they are.
 *
 * World units are decimetres (see `CM_PER_UNIT`), so products keep their true
 * relative size when two of them share a scene on the compare page.
 */

export interface MeshProps {
  params: Model3DParams;
  /** Eases the lid open on mount. Off for reduced motion. */
  animate?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Materials                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Dark finishes on real products are soft-touch plastic or anodised aluminium —
 * matte and non-reflective. Light finishes are nearly always bare metal. Tying
 * metalness to luminance gets both right without authoring a material per SKU.
 */
function finishFor(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return {
    metalness: 0.15 + luminance * 0.65,
    roughness: 0.62 - luminance * 0.34,
  };
}

/* -------------------------------------------------------------------------- */
/* Laptop                                                                     */
/* -------------------------------------------------------------------------- */

export function LaptopMesh({ params, animate = true }: MeshProps) {
  const width = toUnits(params.span);
  const depth = width * 0.68;
  const baseHeight = 0.045 + params.bulk * 0.085;
  const lidHeight = 0.028 + params.bulk * 0.022;

  const body = finishFor(params.bodyColor);
  const vented = params.bulk > 0.45;

  // Hinge sits at the back edge of the base; the lid swings up from there.
  const hingeY = baseHeight / 2;
  const hingeZ = -depth / 2;
  const lidAngle = -(Math.PI / 2 + 0.3);

  // The lid is eased open by mutating the transform directly. Driving it from
  // React state would re-render the whole tree sixty times a second to animate
  // one rotation, which is exactly what r3f asks you not to do.
  const lid = useRef<Group>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (!lid.current) return;
    if (!animate) {
      lid.current.rotation.x = lidAngle;
      return;
    }
    if (elapsed.current >= 0.9) return;

    elapsed.current = Math.min(0.9, elapsed.current + delta);
    // Cubic ease-out over 0.9s, about how long a real hinge takes.
    const t = elapsed.current / 0.9;
    lid.current.rotation.x = lidAngle * (1 - Math.pow(1 - t, 3));
  });

  const keys = useMemo(() => {
    const cols = 15;
    const rows = 5;
    const deckWidth = width * 0.78;
    const deckDepth = depth * 0.42;
    const gapX = deckWidth / cols;
    const gapZ = deckDepth / rows;
    const layout: { id: string; position: [number, number, number] }[] = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        layout.push({
          id: `${row}-${col}`,
          position: [
            -deckWidth / 2 + gapX * (col + 0.5),
            baseHeight / 2 + 0.004,
            -depth * 0.3 + gapZ * (row + 0.5),
          ],
        });
      }
    }
    return { layout, keyX: gapX * 0.82, keyZ: gapZ * 0.78 };
  }, [width, depth, baseHeight]);

  return (
    <group>
      {/* Base */}
      <RoundedBox
        args={[width, baseHeight, depth]}
        radius={Math.min(0.03, baseHeight * 0.34)}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={params.bodyColor} {...body} />
      </RoundedBox>

      {/* Keyboard well */}
      <mesh position={[0, baseHeight / 2 + 0.001, -depth * 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 0.82, depth * 0.5]} />
        <meshStandardMaterial color="#0B0C0E" roughness={0.9} metalness={0.1} />
      </mesh>

      <Instances limit={80} range={keys.layout.length} castShadow>
        <boxGeometry args={[keys.keyX, 0.008, keys.keyZ]} />
        <meshStandardMaterial color="#17191D" roughness={0.75} metalness={0.15} />
        {keys.layout.map((key) => (
          <Instance key={key.id} position={key.position} />
        ))}
      </Instances>

      {/* Trackpad */}
      <mesh position={[0, baseHeight / 2 + 0.002, depth * 0.28]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 0.26, depth * 0.24]} />
        <meshStandardMaterial
          color={params.bodyColor}
          metalness={body.metalness + 0.12}
          roughness={Math.max(0.08, body.roughness - 0.22)}
        />
      </mesh>

      {/* Rear exhaust — only on machines thick enough to need it */}
      {vented && (
        <group position={[0, 0, -depth / 2 - 0.004]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * width * 0.24, 0, 0]}>
              <boxGeometry args={[width * 0.2, baseHeight * 0.5, 0.01]} />
              <meshStandardMaterial
                color={params.accentColor}
                emissive={params.accentColor}
                emissiveIntensity={0.25}
                roughness={0.5}
                metalness={0.4}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Lid */}
      <group ref={lid} position={[0, hingeY, hingeZ]} rotation={[animate ? 0 : lidAngle, 0, 0]}>
        <group position={[0, lidHeight / 2, depth * 0.475]}>
          <RoundedBox
            args={[width, lidHeight, depth * 0.95]}
            radius={Math.min(0.02, lidHeight * 0.4)}
            smoothness={4}
            castShadow
          >
            <meshStandardMaterial color={params.bodyColor} {...body} />
          </RoundedBox>

          {/* Panel — on the inner face, which is what you see when it is open */}
          <mesh position={[0, -lidHeight / 2 - 0.0015, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width * 0.94, depth * 0.89]} />
            <meshStandardMaterial
              color="#05070C"
              emissive={params.accentColor}
              emissiveIntensity={params.screenGlow * 0.55}
              roughness={0.24}
              metalness={0.05}
              side={DoubleSide}
            />
          </mesh>

          {/* Lid badge */}
          <mesh position={[0, lidHeight / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[width * 0.045, 24]} />
            <meshStandardMaterial
              color={params.accentColor}
              emissive={params.accentColor}
              emissiveIntensity={0.35}
              roughness={0.4}
              metalness={0.6}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Phone                                                                      */
/* -------------------------------------------------------------------------- */

export function PhoneMesh({ params }: MeshProps) {
  const height = toUnits(params.span);
  const width = height * 0.465; // ~20:9, which is close to universal now
  const thickness = 0.018 + params.bulk * 0.02;

  const body = finishFor(params.bodyColor);
  const rail = finishFor(params.accentColor);

  const islandW = width * 0.44;
  const islandH = height * 0.16;

  return (
    <group>
      {/* Rail — a hair larger than the panels, which is what reads as a frame */}
      <RoundedBox
        args={[width, height, thickness]}
        radius={width * 0.11}
        smoothness={5}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={params.accentColor} {...rail} />
      </RoundedBox>

      {/* Back panel */}
      <RoundedBox
        args={[width * 0.972, height * 0.986, thickness * 0.86]}
        radius={width * 0.1}
        smoothness={5}
        position={[0, 0, -thickness * 0.03]}
      >
        <meshStandardMaterial color={params.bodyColor} {...body} />
      </RoundedBox>

      {/* Screen */}
      <mesh position={[0, 0, thickness / 2 + 0.0008]}>
        <planeGeometry args={[width * 0.93, height * 0.955]} />
        <meshStandardMaterial
          color="#04060B"
          emissive={params.accentColor}
          emissiveIntensity={params.screenGlow * 0.6}
          roughness={0.16}
          metalness={0.04}
        />
      </mesh>

      {/* Camera island */}
      <group position={[-width * 0.24, height * 0.3, -thickness / 2 - 0.006]}>
        <RoundedBox args={[islandW, islandH, 0.012]} radius={islandW * 0.2} smoothness={4}>
          <meshStandardMaterial
            color={params.bodyColor}
            metalness={body.metalness + 0.1}
            roughness={Math.max(0.1, body.roughness - 0.15)}
          />
        </RoundedBox>

        {[
          [-islandW * 0.22, islandH * 0.2],
          [islandW * 0.22, islandH * 0.2],
          [-islandW * 0.22, -islandH * 0.22],
        ].map(([x, y], index) => (
          <group key={index} position={[x, y, -0.008]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[islandW * 0.15, islandW * 0.15, 0.008, 20]} />
              <meshStandardMaterial color="#0A0C10" roughness={0.15} metalness={0.85} />
            </mesh>
            <mesh position={[0, 0, -0.005]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[islandW * 0.09, islandW * 0.09, 0.003, 20]} />
              <meshStandardMaterial
                color="#1B2436"
                emissive="#2E4A7A"
                emissiveIntensity={0.35}
                roughness={0.05}
                metalness={0.6}
              />
            </mesh>
          </group>
        ))}

        {/* Flash */}
        <mesh position={[islandW * 0.22, -islandH * 0.22, -0.007]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[islandW * 0.07, islandW * 0.07, 0.004, 16]} />
          <meshStandardMaterial
            color="#FFE7C2"
            emissive="#FFC489"
            emissiveIntensity={0.5}
            roughness={0.3}
          />
        </mesh>
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Headphones                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * In-ears and over-ears are physically different objects, so they get different
 * geometry. The two derived `span` ranges never overlap — in-ears land near
 * 6cm, over-ears near 16-20cm — so the span alone tells them apart.
 */
const IN_EAR_SPAN_CEILING = 10;

export function HeadphoneMesh({ params }: MeshProps) {
  // `span` is in cm, the same unit the ceiling is written in.
  return params.span < IN_EAR_SPAN_CEILING ? (
    <EarbudsMesh params={params} />
  ) : (
    <OverEarMesh params={params} />
  );
}

function OverEarMesh({ params }: MeshProps) {
  const span = toUnits(params.span);
  const radius = span * 0.42;
  const cupRadius = span * 0.24;
  const cupDepth = 0.055 + params.bulk * 0.07;

  const body = finishFor(params.bodyColor);
  const accent = finishFor(params.accentColor);

  return (
    <group>
      {/* Headband */}
      <mesh rotation={[0, 0, 0]} position={[0, 0, 0]} castShadow>
        <torusGeometry args={[radius, span * 0.035, 14, 48, Math.PI]} />
        <meshStandardMaterial color={params.bodyColor} {...body} />
      </mesh>

      {/* Padding along the underside of the band */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[radius * 0.94, span * 0.022, 12, 40, Math.PI * 0.7]} />
        <meshStandardMaterial color="#101215" roughness={0.95} metalness={0.05} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side} position={[side * radius, 0, 0]}>
          {/* Yoke */}
          <mesh position={[0, span * 0.06, 0]}>
            <boxGeometry args={[span * 0.05, span * 0.16, span * 0.05]} />
            <meshStandardMaterial color={params.accentColor} {...accent} />
          </mesh>

          {/* Cup */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0, -span * 0.06, 0]} castShadow>
            <cylinderGeometry args={[cupRadius, cupRadius * 0.94, cupDepth, 32]} />
            <meshStandardMaterial color={params.bodyColor} {...body} />
          </mesh>

          {/* Ear pad */}
          <mesh
            rotation={[0, 0, Math.PI / 2]}
            position={[-side * cupDepth * 0.62, -span * 0.06, 0]}
          >
            <torusGeometry args={[cupRadius * 0.72, cupRadius * 0.26, 12, 28]} />
            <meshStandardMaterial color="#0D0F12" roughness={0.98} metalness={0.02} />
          </mesh>

          {/* Outer plate */}
          <mesh
            rotation={[0, 0, Math.PI / 2]}
            position={[side * cupDepth * 0.52, -span * 0.06, 0]}
          >
            <cylinderGeometry args={[cupRadius * 0.66, cupRadius * 0.66, 0.008, 28]} />
            <meshStandardMaterial
              color={params.accentColor}
              emissive={params.accentColor}
              emissiveIntensity={0.18}
              {...accent}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function EarbudsMesh({ params }: MeshProps) {
  const span = toUnits(params.span);
  const caseW = span * 0.95;
  const caseH = span * 0.62;
  const caseD = 0.09 + params.bulk * 0.05;

  const body = finishFor(params.bodyColor);
  const accent = finishFor(params.accentColor);

  return (
    <group>
      {/* Charging case */}
      <group position={[-span * 0.34, 0, 0]}>
        <RoundedBox
          args={[caseW, caseH, caseD]}
          radius={caseH * 0.36}
          smoothness={5}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={params.bodyColor} {...body} />
        </RoundedBox>

        {/* Lid seam */}
        <mesh position={[0, caseH * 0.16, 0]}>
          <boxGeometry args={[caseW * 1.004, 0.004, caseD * 1.004]} />
          <meshStandardMaterial color="#000000" opacity={0.5} transparent roughness={1} />
        </mesh>

        {/* Status LED */}
        <mesh position={[0, -caseH * 0.22, caseD / 2 + 0.002]}>
          <circleGeometry args={[span * 0.035, 16]} />
          <meshStandardMaterial
            color={params.accentColor}
            emissive={params.accentColor}
            emissiveIntensity={1.4}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* Buds */}
      {[
        { x: span * 0.42, y: span * 0.12, tilt: 0.3 },
        { x: span * 0.78, y: -span * 0.16, tilt: -0.2 },
      ].map((bud, index) => (
        <group key={index} position={[bud.x, bud.y, 0]} rotation={[0, 0, bud.tilt]}>
          {/* Housing */}
          <mesh castShadow>
            <sphereGeometry args={[span * 0.15, 24, 20]} />
            <meshStandardMaterial color={params.bodyColor} {...body} />
          </mesh>

          {/* Stem */}
          <mesh position={[0, -span * 0.2, 0]}>
            <capsuleGeometry args={[span * 0.048, span * 0.2, 6, 14]} />
            <meshStandardMaterial color={params.bodyColor} {...body} />
          </mesh>

          {/* Mic band on the stem */}
          <mesh position={[0, -span * 0.29, 0]}>
            <cylinderGeometry args={[span * 0.052, span * 0.052, span * 0.03, 16]} />
            <meshStandardMaterial color={params.accentColor} {...accent} />
          </mesh>

          {/* Ear tip */}
          <mesh position={[span * 0.11, span * 0.04, 0]} rotation={[0, 0, -Math.PI / 2.6]}>
            <coneGeometry args={[span * 0.075, span * 0.12, 20]} />
            <meshStandardMaterial color="#15171B" roughness={0.95} metalness={0.02} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */

export function ProceduralMesh({ params, animate }: MeshProps) {
  switch (params.archetype) {
    case "laptop":
      return <LaptopMesh params={params} animate={animate} />;
    case "phone":
      return <PhoneMesh params={params} />;
    case "headphone":
      return <HeadphoneMesh params={params} />;
  }
}

export interface ProductSceneProps {
  params: Model3DParams;
  /** Disables auto-rotation and the open animation. */
  reducedMotion?: boolean;
  /** Brand orange, threaded in so the scene never hardcodes the palette. */
  accent?: string;
}

/* -------------------------------------------------------------------------- */
/* Model source                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A Blender-authored mesh, tinted to the product's own colourway.
 *
 * The GLB supplies geometry and detail; `Model3DParams` still supplies size and
 * finish, so one exported laptop covers all 25 in the catalogue rather than
 * turning into 25 downloads.
 */
function GlbModel({ url, params }: { url: string; params: Model3DParams }) {
  const { scene } = useGLTF(url);

  const cloned = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((child) => {
      const mesh = child as unknown as {
        isMesh?: boolean;
        material?: { name?: string; color?: { set: (c: string) => void } };
        castShadow?: boolean;
        receiveShadow?: boolean;
      };
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Materials named `body` / `accent` in Blender pick up the product's real
      // colourway; anything else (screens, pads, lenses) is left as authored.
      const name = mesh.material?.name?.toLowerCase() ?? "";
      if (name.includes("accent")) mesh.material?.color?.set(params.accentColor);
      else if (name.includes("body")) mesh.material?.color?.set(params.bodyColor);
    });
    return copy;
  }, [scene, params.accentColor, params.bodyColor]);

  return <primitive object={cloned} />;
}

function Model({ params, animate }: { params: Model3DParams; animate: boolean }) {
  const url = glbFor(params.archetype);

  if (url) return <GlbModel url={url} params={params} />;
  return <ProceduralMesh params={params} animate={animate} />;
}

/**
 * A studio built from geometry rather than a downloaded HDRI.
 *
 * drei's `<Environment preset="…">` fetches its map from a CDN, which would
 * make the viewer the one part of this site that breaks offline — the rest of
 * the imagery is deliberately local for exactly that reason. Three emissive
 * planes in a dark sphere give the reflections a product render needs, cost
 * nothing to download, and let the rim stay brand orange.
 */
function LocalStudio({ accent }: { accent: string }) {
  return (
    <Environment resolution={128}>
      <mesh scale={60}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#23262C" side={BackSide} />
      </mesh>
      {/* Overhead softbox — the main specular highlight */}
      <mesh position={[0, 9, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 8, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      {/* Brand-tinted kicker from behind-left */}
      <mesh position={[-9, 2, -7]} rotation={[0, Math.PI / 3.2, 0]} scale={[9, 9, 1]}>
        <planeGeometry />
        <meshBasicMaterial color={accent} />
      </mesh>
      {/* Cool fill from the right, so the shadow side is not dead */}
      <mesh position={[10, 1, 4]} rotation={[0, -Math.PI / 2.6, 0]} scale={[8, 7, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#7C93B8" />
      </mesh>
    </Environment>
  );
}

/* -------------------------------------------------------------------------- */
/* Stage                                                                      */
/* -------------------------------------------------------------------------- */

function Stage({ params, reducedMotion, accent }: ProductSceneProps) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (reducedMotion || !group.current) return;
    group.current.rotation.y += delta * 0.28;
  });

  const span = toUnits(params.span);

  return (
    <>
      {/* Key light, warm, from the front-left */}
      <directionalLight
        position={[span * 1.4, span * 2, span * 1.6]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      {/* Brand-tinted rim light from behind, which is what makes the silhouette
          read as Lunowix rather than as a generic product render. */}
      <directionalLight position={[-span * 1.6, span * 0.8, -span * 1.8]} intensity={1.5} color={accent} />
      <ambientLight intensity={0.55} />

      <group ref={group}>
        <Model params={params} animate={!reducedMotion} />
      </group>

      <ContactShadows
        position={[0, -span * 0.52, 0]}
        opacity={0.42}
        scale={span * 3}
        blur={2.4}
        far={span}
        resolution={512}
      />

      <LocalStudio accent={accent ?? "#FF6B00"} />
    </>
  );
}

/* -------------------------------------------------------------------------- */

export function ProductScene({
  params,
  reducedMotion = false,
  accent = "#FF6B00",
}: ProductSceneProps) {
  const span = toUnits(params.span);
  // Frame every archetype the same way regardless of physical size.
  const distance = span * 2.3;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      // With reduced motion nothing animates on its own, so there is no reason
      // to burn a rAF loop — render on interaction only.
      frameloop={reducedMotion ? "demand" : "always"}
      camera={{ position: [distance * 0.55, distance * 0.42, distance], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <Stage params={params} reducedMotion={reducedMotion} accent={accent} />
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={span * 1.3}
        maxDistance={span * 4.5}
        // Stop the camera dropping under the contact shadow.
        maxPolarAngle={Math.PI * 0.52}
        minPolarAngle={Math.PI * 0.08}
        autoRotate={false}
      />
    </Canvas>
  );
}

export interface HeroSceneProps {
  /** One product per category, in display order. */
  items: Model3DParams[];
  reducedMotion?: boolean;
}

/**
 * The three archetypes on one turntable.
 *
 * Because world units are real decimetres, the phone genuinely is smaller than
 * the laptop here — the scene is not three props scaled to taste, it is the
 * catalogue's own geometry at true relative size.
 */
function Carousel({ items, reducedMotion }: HeroSceneProps) {
  const group = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (reducedMotion) {
      group.current.rotation.y = -0.35;
      return;
    }
    group.current.rotation.y += delta * 0.16;
    // A slow breathing tilt keeps the silhouette changing without the scene
    // ever feeling like it is spinning at you.
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.22) * 0.06;
  });

  const radius = 2.1;

  return (
    <group ref={group}>
      {items.map((params, index) => {
        const angle = (index / items.length) * Math.PI * 2;
        return (
          <group
            key={params.archetype}
            position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]}
            rotation={[0, angle, 0]}
          >
            <Float
              speed={reducedMotion ? 0 : 1.4}
              rotationIntensity={reducedMotion ? 0 : 0.22}
              floatIntensity={reducedMotion ? 0 : 0.5}
            >
              <ProceduralMesh params={params} animate={!reducedMotion} />
            </Float>
          </group>
        );
      })}
    </group>
  );
}

/** Local studio — no CDN HDRI, matching the product viewer. */
function Studio() {
  return (
    <Environment resolution={128}>
      <mesh scale={60}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#1C1F25" side={BackSide} />
      </mesh>
      <mesh position={[0, 9, 3]} rotation={[Math.PI / 2, 0, 0]} scale={[14, 9, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-10, 2, -8]} rotation={[0, Math.PI / 3.2, 0]} scale={[11, 11, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#FF6B00" />
      </mesh>
    </Environment>
  );
}

export function HeroScene({ items, reducedMotion = false }: HeroSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={reducedMotion ? "demand" : "always"}
      camera={{ position: [0, 1.5, 6.4], fov: 34 }}
      gl={{ antialias: true, alpha: true }}
      // Decorative: the headline beside it carries the meaning.
      aria-hidden
    >
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <directionalLight position={[-5, 2, -5]} intensity={1.6} color="#FF6B00" />
      <ambientLight intensity={0.6} />

      <Suspense fallback={null}>
        <Carousel items={items} reducedMotion={reducedMotion} />
        <Studio />
      </Suspense>

      <ContactShadows position={[0, -1.05, 0]} opacity={0.35} scale={12} blur={2.8} far={4} />
    </Canvas>
  );
}
