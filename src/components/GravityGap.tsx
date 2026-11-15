"use client";

import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, Check, Rotate3d } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Investigation } from "@/data/investigations";
import { atmosphere, ISS, planetMaterial } from "./three/SpaceScene";
import { Section } from "./ui";

type BodyId = "iss" | "moon" | "mars" | "earth";
const BODIES: { id: BodyId; name: string; g: number; pos: [number, number, number]; r: number; data: "full" | "none" | "ground"; note: string }[] = [
  { id: "iss", name: "Space station", g: 0, pos: [-7.4, 1.4, -6], r: 1, data: "full", note: "All 20 PSI investigations flew here." },
  { id: "moon", name: "Moon", g: 0.166, pos: [-3.9, -0.6, -8], r: 1.1, data: "none", note: "No combustion data yet. LUCI and FM2 are planned." },
  { id: "mars", name: "Mars", g: 0.38, pos: [3.9, 1.5, -8.5], r: 1.3, data: "none", note: "No combustion data at Martian gravity." },
  { id: "earth", name: "Earth", g: 1, pos: [7.8, -0.4, -7], r: 1.9, data: "ground", note: "Decades of 1 g testing (NASA-STD-6001)." },
];

const FLAME_VERT = /* glsl */ `
uniform float g; uniform float t; uniform float k;
varying float vH; varying vec3 vN; varying vec3 vV;
void main(){
  vec3 p = position * k;
  float up = clamp(position.y, 0.0, 1.0);
  float stretch = 1.0 + g * 2.1;
  p.y = position.y > 0.0 ? p.y * stretch : p.y * (1.0 - g * 0.45);
  float taper = 1.0 - g * 0.78 * smoothstep(0.0, 1.0, up);
  p.xz *= taper;
  float fl = sin(t * 9.0 + position.y * 5.0) * 0.06 * g + sin(t * 2.1 + position.x * 3.0) * 0.015;
  p.x += fl * up * 2.0;
  p.z += cos(t * 7.0 + position.y * 4.0) * 0.03 * g * up;
  p *= 1.0 + sin(t * 1.7) * 0.012 * (1.0 - g);
  vH = clamp((position.y + 1.0) * 0.5, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const FLAME_FRAG = /* glsl */ `
uniform float g; uniform float core;
varying float vH; varying vec3 vN; varying vec3 vV;
void main(){
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  vec3 blue = vec3(0.22, 0.5, 1.0);
  vec3 orange = vec3(1.0, 0.42, 0.08);
  vec3 yellow = vec3(1.0, 0.86, 0.45);
  float b = smoothstep(0.02, 0.6, g);
  vec3 hot = mix(yellow, orange, smoothstep(0.25, 1.0, vH));
  hot = mix(blue, hot, smoothstep(0.05, 0.3, vH));
  vec3 col = mix(blue, hot, b);
  float c = 1.0 - f;
  float a = core > 0.5
    ? pow(c, 2.0) * mix(0.35, 1.0, b) * (1.0 - vH * 0.55)
    : pow(c, 1.3) * mix(0.5, 0.85, b) * (1.0 - vH * 0.35 * b) + pow(f, 2.5) * 0.35 * (1.0 - b);
  vec3 cc = core > 0.5 ? mix(col, vec3(1.0, 0.95, 0.85), 0.35 * b) : col;
  gl_FragColor = vec4(cc * 1.25, clamp(a, 0.0, 1.0));
}`;

function Flame({ g }: { g: number }) {
  const cur = useRef(g);
  const mats = useMemo(
    () =>
      [0, 1].map(
        (c) =>
          new THREE.ShaderMaterial({
            uniforms: { g: { value: g }, t: { value: 0 }, k: { value: c ? 0.62 : 1 }, core: { value: c } },
            vertexShader: FLAME_VERT,
            fragmentShader: FLAME_FRAG,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const light = useRef<THREE.PointLight>(null);
  const embers = useRef<THREE.Points>(null);
  const emberGeo = useMemo(() => {
    const n = 90;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.6;
      pos[i * 3 + 1] = Math.random() * 3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    return geo;
  }, []);

  useFrame((s, dt) => {
    cur.current += (g - cur.current) * Math.min(1, dt * 3.2);
    const gg = cur.current;
    mats.forEach((m) => {
      m.uniforms.g.value = gg;
      m.uniforms.t.value = s.clock.elapsedTime;
    });
    if (light.current) {
      light.current.color.setRGB(0.3 + gg * 0.7, 0.5 + gg * 0.1, 1 - gg * 0.8);
      light.current.intensity = 6 + Math.sin(s.clock.elapsedTime * 11) * gg * 1.5;
    }
    const pa = emberGeo.attributes.position as THREE.BufferAttribute;
    const sd = emberGeo.attributes.seed as THREE.BufferAttribute;
    for (let i = 0; i < pa.count; i++) {
      let y = pa.getY(i) + dt * (0.15 + gg * 2.4) * (0.5 + sd.getX(i));
      if (y > 1.2 + gg * 3) y = 0.3;
      pa.setY(i, y);
    }
    pa.needsUpdate = true;
    if (embers.current) (embers.current.material as THREE.PointsMaterial).opacity = 0.15 + gg * 0.6;
  });

  return (
    <group position={[0, -0.2, 1.5]} scale={0.8}>
      <mesh material={mats[0]}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
      <mesh material={mats[1]}>
        <sphereGeometry args={[1, 48, 48]} />
      </mesh>
      <points ref={embers} geometry={emberGeo}>
        <pointsMaterial color="#ffb070" size={0.05} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <pointLight ref={light} position={[0, 0.3, 0.6]} distance={8} decay={1.4} />
      {/* wick and candle */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />
        <meshStandardMaterial color="#1a1410" roughness={1} />
      </mesh>
      <mesh position={[0, -1.6, 0]}>
        <cylinderGeometry args={[0.32, 0.34, 2.2, 40]} />
        <meshStandardMaterial color="#eef0f5" roughness={0.6} emissive="#1a2440" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

function Body({ b, active, onPick }: { b: (typeof BODIES)[number]; active: boolean; onPick: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const issRef = useRef<THREE.Group>(null);
  const mat = useMemo(() => (b.id === "iss" ? null : planetMaterial(b.id)), [b.id]);
  const clouds = useMemo(() => (b.id === "earth" ? planetMaterial("clouds") : null), [b.id]);
  const atmo = useMemo(() => (b.id === "earth" ? atmosphere("#5aa8ff", 3, 1.4) : b.id === "mars" ? atmosphere("#ff8a5a", 4, 0.8) : null), [b.id]);
  const ring = useRef<THREE.Mesh>(null);
  useFrame((s, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * (b.id === "iss" ? 0.4 : 0.08);
      const target = active ? 1.12 : 1;
      ref.current.scale.lerp(new THREE.Vector3(target, target, target), Math.min(1, dt * 5));
    }
    if (ring.current) {
      ring.current.rotation.z += dt * 0.5;
      const m = ring.current.material as THREE.MeshBasicMaterial;
      m.opacity += ((active ? 0.9 : 0) - m.opacity) * Math.min(1, dt * 6);
    }
    if (mat) mat.uniforms.time.value = s.clock.elapsedTime;
    if (clouds) clouds.uniforms.time.value = s.clock.elapsedTime;
  });
  return (
    <group position={b.pos}>
      <group
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        {b.id === "iss" ? (
          <group scale={5.5}>
            <ISS groupRef={issRef} />
          </group>
        ) : (
          <>
            <mesh material={mat!}>
              <sphereGeometry args={[b.r, 64, 64]} />
            </mesh>
            {clouds && (
              <mesh material={clouds} scale={1.015}>
                <sphereGeometry args={[b.r, 48, 48]} />
              </mesh>
            )}
            {atmo && (
              <mesh material={atmo} scale={1.12}>
                <sphereGeometry args={[b.r, 48, 48]} />
              </mesh>
            )}
          </>
        )}
      </group>
      <mesh ref={ring} rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[b.r * 1.45, 0.015, 8, 96]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} />
      </mesh>
      <Html position={[0, -b.r - 0.55, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "auto" }}>
        <button onClick={onPick} className={`flex flex-col items-center whitespace-nowrap rounded-2xl px-3 py-1.5 text-center backdrop-blur-md transition ${active ? "bg-white text-ink" : "bg-[#0c101e]/70 text-white ring-1 ring-white/15 hover:bg-[#0c101e]/90"}`}>
          <span className="text-[12px] font-semibold">
            {b.name} · {b.g} g
          </span>
          <span className={`text-[11px] font-medium ${b.data === "none" ? "text-[#ff8a5a]" : active ? "text-[#0c8f68]" : "text-[#5fe3b4]"}`}>{b.data === "full" ? "20 experiments" : b.data === "ground" ? "Ground tests" : "No data"}</span>
        </button>
      </Html>
    </group>
  );
}

function Scene({ g, setG, sel }: { g: number; setG: (g: number) => void; sel: BodyId | null }) {
  // Pull the worlds inward on narrow (tablet/phone) canvases so none fall off the edge.
  const { size } = useThree();
  const k = Math.max(0.5, Math.min(1, size.width / size.height / 1.75));
  return (
    <>
      <color attach="background" args={["#070a14"]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-90, 18, 30]} intensity={2.4} />
      <Stars radius={60} depth={30} count={2500} factor={3} fade speed={0.4} />
      <group position={[0, 1.3, 0]}>
        {BODIES.map((b) => (
          <Body key={b.id} b={{ ...b, pos: [b.pos[0] * k, b.pos[1], b.pos[2]] }} active={sel === b.id} onPick={() => setG(b.g)} />
        ))}
        <Flame g={g} />
      </group>
      <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 2.7} maxPolarAngle={Math.PI / 1.8} minAzimuthAngle={-0.5} maxAzimuthAngle={0.5} rotateSpeed={0.5} />
    </>
  );
}

const regime = (g: number) =>
  g < 0.02
    ? { t: "Spherical blue flame", d: "With no buoyancy, hot gas does not rise. Oxygen reaches the flame only by slow diffusion, so it becomes a dim blue sphere that is hard to see and spreads in unexpected ways." }
    : g < 0.5
      ? { t: "Weak, lazy plume", d: "Partial gravity gives a little buoyancy. The flame lengthens and starts to flicker, but airflow is weak. Nobody has measured how materials burn here yet." }
      : { t: "Buoyant teardrop", d: "Hot gas rises quickly and pulls in fresh air below. This is the yellow, sooty, flickering flame that every fire safety standard on Earth is based on." };

export default function GravityGap({ investigations, onOpen }: { investigations: Investigation[]; onOpen: (id: string) => void }) {
  const [g, setG] = useState(0.166);
  const sel = BODIES.find((b) => Math.abs(b.g - g) < 0.005)?.id ?? null;
  const r = regime(g);
  const blind = g > 0.02 && g < 0.9;
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const efield = investigations.find((i) => i.id === "e-field");

  return (
    <Section
      id="gravity"
      eyebrow="The gravity gap"
      title={
        <>
          The Moon sits in a <span className="text-flame">data blind spot.</span>
        </>
      }
      intro="Gravity decides what a flame looks like and how fast it spreads. NASA has flame data for microgravity and for Earth, but nothing in between. Drag the slider or click a world to change gravity."
    >
      <div ref={wrap} className="panel-dark relative overflow-hidden">
        <div className="relative h-[400px] sm:h-[480px] md:h-[640px]">
          <Canvas camera={{ position: [0, 0.4, 10.5], fov: 50 }} dpr={[1, 1.75]} frameloop={visible ? "always" : "never"} gl={{ antialias: true }}>
            <Scene g={g} setG={setG} sel={sel} />
          </Canvas>
          <div className="pointer-events-none absolute right-5 top-5 hidden items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-[0.78rem] text-snow-2 ring-1 ring-white/10 sm:inline-flex">
            <Rotate3d size={14} /> Drag to rotate
          </div>
        </div>

        {/* control overlay */}
        <div className="relative p-3 sm:p-5 md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0">
          <div className="pointer-events-auto frost mx-auto grid max-w-[980px] gap-5 rounded-[26px] p-5 text-snow md:grid-cols-[1fr_1.3fr] md:p-6">
            <div className="min-w-0">
              <div className="flex items-baseline gap-3">
                <span className="display tnum text-[2.6rem] font-semibold leading-none">{g.toFixed(2)}</span>
                <span className="text-snow-3">g</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={blind ? "b" : "d"}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${blind ? "bg-flame/15 text-flame" : "bg-go/15 text-[#5fe3b4]"}`}
                  >
                    {blind ? <AlertTriangle size={13} /> : <Check size={13} />}
                    {blind ? "No data" : "Data exists"}
                  </motion.span>
                </AnimatePresence>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={r.t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <div className="mt-2 font-semibold">{r.t}</div>
                  <p className="mt-1 text-[0.86rem] leading-relaxed text-snow-2">{r.d}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex flex-col justify-center">
              <div className="relative pt-2">
                <div className="pointer-events-none absolute top-[13px] h-3 rounded-full bg-[repeating-linear-gradient(135deg,rgba(255,106,43,0.55)_0_5px,transparent_5px_10px)]" style={{ left: "2%", width: "88%" }} />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.005}
                  value={g}
                  onChange={(e) => setG(Number(e.target.value))}
                  className="slider on-dark relative w-full"
                  style={{ ["--p" as string]: `${g * 100}%` }}
                  aria-label="Gravity"
                />
                <div className="relative mt-3 h-10">
                  {BODIES.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setG(b.g)}
                      className={`absolute top-0 flex -translate-x-1/2 flex-col items-center text-[0.75rem] font-semibold transition ${sel === b.id ? "text-white" : "text-snow-3 hover:text-snow"}`}
                      style={{ left: `${b.g * 100}%`, transform: `translateX(${b.g === 0 ? "-10%" : b.g === 1 ? "-90%" : "-50%"})` }}
                    >
                      <span className={`mb-1 h-1.5 w-1.5 rounded-full ${b.data === "none" ? "bg-flame" : "bg-[#5fe3b4]"}`} />
                      {b.id === "iss" ? "ISS" : b.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] text-snow-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-sm bg-[repeating-linear-gradient(135deg,rgba(255,106,43,0.8)_0_3px,transparent_3px_6px)]" /> Blind spot
                </span>
                {efield && (
                  <button onClick={() => onOpen("e-field")} className="inline-flex items-center gap-1 font-semibold text-sky hover:underline">
                    Closest proxy: {efield.acronym} <ArrowUpRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {BODIES.map((b) => (
          <button key={b.id} onClick={() => setG(b.g)} className={`rounded-3xl p-4 text-left transition ${sel === b.id ? "bg-ink text-white" : "bg-white ring-1 ring-line hover:ring-ink"}`}>
            <div className={`text-[0.78rem] ${sel === b.id ? "text-snow-3" : "text-ink-3"}`}>{b.g} g</div>
            <div className="mt-0.5 font-semibold">{b.name}</div>
            <div className={`mt-1 text-[0.82rem] leading-snug ${sel === b.id ? "text-snow-2" : "text-ink-2"}`}>{b.note}</div>
          </button>
        ))}
      </div>
    </Section>
  );
}
