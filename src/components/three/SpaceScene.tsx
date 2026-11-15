"use client";

import { Html, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const SUN_POS = new THREE.Vector3(-90, 18, 30);

/* ---------- shared GLSL noise ---------- */
const NOISE = /* glsl */ `
float h3(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i+vec3(0,0,0)),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float v=0.0; float a=0.5; for(int i=0;i<6;i++){ v+=a*n3(p); p*=2.03; a*=0.5; } return v; }
`;

const VERT = /* glsl */ `
varying vec3 vN; varying vec3 vP; varying vec3 vW;
void main(){ vN = normalize(mat3(modelMatrix)*normal); vP = position; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz;
  gl_Position = projectionMatrix*viewMatrix*w; }
`;

type Kind = "earth" | "moon" | "mars" | "clouds";

const FRAG: Record<Kind, string> = {
  earth: `
    vec3 n = normalize(vP);
    float c = fbm(n*2.2 + 3.1);
    float land = smoothstep(0.49, 0.52, c);
    float lat = abs(n.y);
    vec3 ocean = mix(vec3(0.01,0.06,0.18), vec3(0.02,0.16,0.35), fbm(n*8.0));
    vec3 ground = mix(vec3(0.10,0.25,0.08), vec3(0.42,0.33,0.18), fbm(n*6.0+1.0));
    ground = mix(ground, vec3(0.55,0.45,0.30), smoothstep(0.62,0.75,c));
    vec3 col = mix(ocean, ground, land);
    col = mix(col, vec3(0.92), smoothstep(0.9, 0.95, lat + fbm(n*5.0)*0.08));
    float spec = land < 0.5 ? pow(max(dot(reflect(-sunDir, nW), normalize(cameraPosition - vW)),0.0), 40.0)*0.6 : 0.0;
    // city lights on night side
    float night = smoothstep(0.05, -0.25, dif0);
    float city = land * step(0.82, n3(n*80.0)) * night;
    base = col; extra = vec3(spec) + vec3(1.0,0.75,0.35)*city*0.9;`,
  clouds: `
    vec3 n = normalize(vP);
    float cl = smoothstep(0.56, 0.78, fbm(n*4.5 + vec3(time*0.01,0.0,0.0)));
    base = vec3(1.0); alpha = cl*0.7;`,
  moon: `
    vec3 n = normalize(vP);
    float m = fbm(n*3.0);
    vec3 col = mix(vec3(0.32), vec3(0.62), m);
    col = mix(col, vec3(0.20), smoothstep(0.55,0.6,fbm(n*1.6+7.0))*0.6); // maria
    float cr = n3(n*22.0); col *= 0.85 + 0.3*smoothstep(0.75,0.95,cr) - 0.25*smoothstep(0.85,0.98,1.0-cr);
    base = col;`,
  mars: `
    vec3 n = normalize(vP);
    float m = fbm(n*3.0+2.0);
    vec3 col = mix(vec3(0.45,0.16,0.07), vec3(0.78,0.38,0.18), m);
    col = mix(col, vec3(0.3,0.1,0.06), smoothstep(0.55,0.62,fbm(n*2.0+11.0))*0.7);
    col = mix(col, vec3(0.95,0.92,0.9), smoothstep(0.86,0.9,abs(n.y)));
    base = col;`,
};

export function planetMaterial(kind: Kind) {
  return new THREE.ShaderMaterial({
    uniforms: { sunDirW: { value: SUN_POS.clone().normalize() }, time: { value: 0 } },
    vertexShader: VERT,
    transparent: kind === "clouds",
    depthWrite: kind !== "clouds",
    fragmentShader: /* glsl */ `
      uniform vec3 sunDirW; uniform float time;
      varying vec3 vN; varying vec3 vP; varying vec3 vW;
      ${NOISE}
      void main(){
        vec3 sunDir = normalize(sunDirW);
        vec3 nW = normalize(vN);
        float dif0 = dot(nW, sunDir);
        vec3 base = vec3(0.5); vec3 extra = vec3(0.0); float alpha = 1.0;
        ${FRAG[kind]}
        float dif = smoothstep(-0.15, 1.0, dif0);
        vec3 outc = base*(0.035 + dif*1.1) + extra;
        gl_FragColor = vec4(outc, alpha * (0.15 + dif));
        ${kind === "clouds" ? "" : "gl_FragColor.a = 1.0;"}
      }`,
  });
}

export function atmosphere(color: string, power = 3.0, intensity = 1.2) {
  return new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(color) }, p: { value: power }, k: { value: intensity } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 c; uniform float p; uniform float k; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),p); gl_FragColor=vec4(c*f*k, f); }`,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
}

/* ---------- positions (stylised, not to scale) ---------- */
export const POS = {
  sun: SUN_POS,
  earth: new THREE.Vector3(0, 0, 0),
  moon: new THREE.Vector3(13, 1.2, -7),
  mars: new THREE.Vector3(30, -1.5, -26),
};
const ISS_R = 3.9;

function Label({ text, sub, onClick, active }: { text: string; sub?: string; onClick?: () => void; active?: boolean }) {
  return (
    <Html center distanceFactor={undefined} zIndexRange={[10, 0]} style={{ pointerEvents: "auto" }}>
      <button
        onClick={onClick}
        className={`group flex translate-x-[56%] -translate-y-6 items-center gap-2 whitespace-nowrap text-[12px] font-semibold transition ${active ? "text-ink" : "text-white/80 hover:text-white"}`}
      >
        <span className={`h-px w-5 ${active ? "bg-white" : "bg-white/40"}`} />
        <span className={`rounded-full px-2.5 py-1 backdrop-blur-md ${active ? "bg-white" : "bg-[#0c101e]/60 ring-1 ring-white/15 group-hover:bg-[#0c101e]/80"}`}>
          {text}
          {sub && <span className={`ml-1.5 font-normal ${active ? "text-ink-3" : "text-white/50"}`}>{sub}</span>}
        </span>
      </button>
    </Html>
  );
}

function Sun() {
  const glow = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `varying vec2 vUv; void main(){ float d=length(vUv-0.5)*2.0; float g=exp(-d*3.2)*1.2 + exp(-d*12.0); gl_FragColor=vec4(vec3(1.0,0.78,0.45)*g, g); }`,
      }),
    [],
  );
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => ref.current?.lookAt(camera.position));
  return (
    <group position={POS.sun}>
      <mesh>
        <sphereGeometry args={[7, 48, 48]} />
        <meshBasicMaterial color="#fff2d6" />
      </mesh>
      <mesh ref={ref} material={glow}>
        <planeGeometry args={[80, 80]} />
      </mesh>
    </group>
  );
}

export function ISS({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const gold = <meshStandardMaterial color="#b8924a" metalness={0.6} roughness={0.35} emissive="#2a1a05" />;
  const panel = <meshStandardMaterial color="#1b2b5a" metalness={0.4} roughness={0.3} emissive="#0a1230" />;
  const white = <meshStandardMaterial color="#d9dde4" metalness={0.3} roughness={0.5} />;
  return (
    <group ref={groupRef} scale={0.14}>
      {/* truss */}
      <mesh>
        <boxGeometry args={[6, 0.18, 0.18]} />
        {white}
      </mesh>
      {/* solar arrays */}
      {[-2.6, -1.7, 1.7, 2.6].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0, 1.5]}>
            <boxGeometry args={[0.7, 0.02, 2.6]} />
            {panel}
          </mesh>
          <mesh position={[0, 0, -1.5]}>
            <boxGeometry args={[0.7, 0.02, 2.6]} />
            {panel}
          </mesh>
        </group>
      ))}
      {/* modules */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 2.4, 16]} />
        {white}
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, -0.25, 0.9]}>
        <cylinderGeometry args={[0.2, 0.2, 1.4, 16]} />
        {white}
      </mesh>
      <mesh position={[0, -0.25, -1.1]}>
        <boxGeometry args={[0.6, 0.3, 0.3]} />
        {gold}
      </mesh>
      {/* radiators */}
      <mesh position={[0.6, 0.6, 0]}>
        <boxGeometry args={[0.5, 1, 0.02]} />
        {white}
      </mesh>
    </group>
  );
}

export function Rover() {
  const body = <meshStandardMaterial color="#e6e8ec" metalness={0.4} roughness={0.4} />;
  const dark = <meshStandardMaterial color="#222831" roughness={0.8} />;
  return (
    <group scale={0.05}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[2.4, 0.9, 1.3]} />
        {body}
      </mesh>
      <mesh position={[0.9, 1.05, 0]}>
        <boxGeometry args={[0.6, 0.4, 1.1]} />
        <meshStandardMaterial color="#4fc3ff" emissive="#1b6fa8" emissiveIntensity={0.6} />
      </mesh>
      {[-0.9, 0, 0.9].flatMap((x) =>
        [-0.75, 0.75].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.15, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.25, 14]} />
            {dark}
          </mesh>
        )),
      )}
      <mesh position={[-0.8, 1.5, 0.3]}>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
        {body}
      </mesh>
      <mesh position={[-0.8, 2.1, 0.3]} rotation={[0.4, 0, 0.3]}>
        <coneGeometry args={[0.35, 0.2, 16, 1, true]} />
        {body}
      </mesh>
    </group>
  );
}

export function Habitat({ color = "#e8ecf2" }: { color?: string }) {
  return (
    <group scale={0.06}>
      {[
        [0, 0, 0, 1],
        [1.8, 0, 0.4, 0.7],
        [-1.4, 0, 0.9, 0.6],
      ].map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} scale={s}>
          <sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color} metalness={0.2} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0.9, 0.25, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 1.2, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#ffd9a0" intensity={2} distance={3} />
    </group>
  );
}

/* Places a child on a planet surface at a given direction. */
function OnSurface({ radius, dir, children }: { radius: number; dir: [number, number, number]; children: React.ReactNode }) {
  const { q, p } = useMemo(() => {
    const d = new THREE.Vector3(...dir).normalize();
    return { q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d), p: d.multiplyScalar(radius * 0.995) };
  }, [radius, dir]);
  return (
    <group position={p} quaternion={q}>
      {children}
    </group>
  );
}

export const SURFACE_DIR = {
  moonBase: [0.15, 1, 0.55] as [number, number, number],
  rover: [0.45, 0.9, 0.6] as [number, number, number],
  mars: [0.1, 1, 0.5] as [number, number, number],
};

interface ShotDef {
  pos: (t: Targets) => THREE.Vector3;
  look: (t: Targets) => THREE.Vector3;
}
interface Targets {
  iss: THREE.Vector3;
}

const surf = (center: THREE.Vector3, r: number, dir: [number, number, number], lift: number) => center.clone().add(new THREE.Vector3(...dir).normalize().multiplyScalar(r + lift));

const SHOTS: Record<string, ShotDef> = {
  overview: { pos: () => new THREE.Vector3(-9, 4, 17), look: () => new THREE.Vector3(-3, 0, -8) },
  earth: { pos: () => new THREE.Vector3(-2.5, 1.5, 8.5), look: () => new THREE.Vector3(1.2, 0, 0) },
  iss: { pos: (t) => t.iss.clone().multiplyScalar(1.28).add(new THREE.Vector3(0, 0.35, 0)), look: (t) => t.iss.clone() },
  suit: { pos: (t) => t.iss.clone().multiplyScalar(1.12).add(new THREE.Vector3(0, 0.12, 0)), look: (t) => t.iss.clone() },
  "moon-base": { pos: () => surf(POS.moon, 0.9, SURFACE_DIR.moonBase, 0.9).add(new THREE.Vector3(0.6, 0.2, 0.9)), look: () => surf(POS.moon, 0.9, SURFACE_DIR.moonBase, 0) },
  rover: { pos: () => surf(POS.moon, 0.9, SURFACE_DIR.rover, 0.35).add(new THREE.Vector3(0.35, 0.05, 0.35)), look: () => surf(POS.moon, 0.9, SURFACE_DIR.rover, 0) },
  mars: { pos: () => surf(POS.mars, 1.6, SURFACE_DIR.mars, 1.6).add(new THREE.Vector3(1, 0.3, 1.6)), look: () => surf(POS.mars, 1.6, SURFACE_DIR.mars, 0) },
};

function Rig({ shot, issRef }: { shot: string; issRef: React.RefObject<THREE.Group | null> }) {
  const { camera, pointer } = useThree();
  const look = useRef(new THREE.Vector3(-3, 0, -8));
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const iss = issRef.current ? issRef.current.getWorldPosition(tmp).clone() : new THREE.Vector3(ISS_R, 0, 0);
    const def = SHOTS[shot] ?? SHOTS.overview;
    const target = def.pos({ iss });
    const near = shot !== "overview";
    target.x += pointer.x * (near ? 0.15 : 1.2);
    target.y += pointer.y * (near ? 0.1 : 0.8);
    const k = 1 - Math.pow(0.0025, dt);
    camera.position.lerp(target, k);
    look.current.lerp(def.look({ iss }), k * 1.2);
    camera.lookAt(look.current);
  });
  return null;
}

function World({ shot, onPick }: { shot: string; onPick: (id: string) => void }) {
  const earthMat = useMemo(() => planetMaterial("earth"), []);
  const cloudMat = useMemo(() => planetMaterial("clouds"), []);
  const moonMat = useMemo(() => planetMaterial("moon"), []);
  const marsMat = useMemo(() => planetMaterial("mars"), []);
  const earthAtmo = useMemo(() => atmosphere("#4fa8ff", 2.6, 1.4), []);
  const marsAtmo = useMemo(() => atmosphere("#ff8a5c", 3.5, 0.8), []);
  const earthRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const issOrbit = useRef<THREE.Group>(null);
  const issRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Mesh>(null);
  const marsRef = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    const slow = shot === "iss" || shot === "suit" ? 0.15 : 1;
    if (earthRef.current) earthRef.current.rotation.y += dt * 0.03;
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.012;
    if (issOrbit.current) issOrbit.current.rotation.y += dt * 0.12 * slow;
    if (issRef.current) issRef.current.rotation.y += dt * 0.05;
    cloudMat.uniforms.time.value += dt;
  });

  return (
    <>
      <ambientLight intensity={0.08} />
      <directionalLight position={POS.sun} intensity={2.6} color="#fff4e0" />
      <Stars radius={180} depth={60} count={6000} factor={4} saturation={0} fade speed={0.4} />
      <Sun />

      {/* Earth */}
      <group position={POS.earth}>
        <group ref={earthRef} rotation={[0.41, 0, 0]}>
          <mesh material={earthMat} onClick={() => onPick("earth")}>
            <sphereGeometry args={[3, 96, 96]} />
          </mesh>
          <mesh ref={cloudRef} material={cloudMat} scale={1.012}>
            <sphereGeometry args={[3, 64, 64]} />
          </mesh>
        </group>
        <mesh material={earthAtmo} scale={1.08}>
          <sphereGeometry args={[3, 64, 64]} />
        </mesh>
        <Label text="Earth" sub="1 g · 21% O₂" onClick={() => onPick("earth")} active={shot === "earth"} />
        {/* ISS orbit ring + station */}
        <mesh rotation={[Math.PI / 2 + 0.5, 0, 0]}>
          <torusGeometry args={[ISS_R, 0.004, 4, 200]} />
          <meshBasicMaterial color="#4fc3ff" transparent opacity={0.35} />
        </mesh>
        <group rotation={[0.5, 0, 0]}>
          <group ref={issOrbit}>
            <group position={[ISS_R, 0, 0]} onClick={() => onPick("iss")}>
              <ISS groupRef={issRef} />
              <Label text="ISS" sub="µg · 21% O₂" onClick={() => onPick("iss")} active={shot === "iss" || shot === "suit"} />
            </group>
          </group>
        </group>
      </group>

      {/* Moon */}
      <group position={POS.moon}>
        <mesh ref={moonRef} material={moonMat} onClick={() => onPick("moon-base")}>
          <sphereGeometry args={[0.9, 96, 96]} />
        </mesh>
        <OnSurface radius={0.9} dir={SURFACE_DIR.moonBase}>
          <Habitat />
        </OnSurface>
        <OnSurface radius={0.9} dir={SURFACE_DIR.rover}>
          <Rover />
        </OnSurface>
        <Label text="Moon" sub="0.17 g · ≥30% O₂" onClick={() => onPick("moon-base")} active={shot === "moon-base" || shot === "rover"} />
      </group>

      {/* Mars */}
      <group position={POS.mars}>
        <mesh ref={marsRef} material={marsMat} onClick={() => onPick("mars")}>
          <sphereGeometry args={[1.6, 96, 96]} />
        </mesh>
        <mesh material={marsAtmo} scale={1.05}>
          <sphereGeometry args={[1.6, 48, 48]} />
        </mesh>
        <OnSurface radius={1.6} dir={SURFACE_DIR.mars}>
          <Habitat color="#f1e6dc" />
        </OnSurface>
        <Label text="Mars" sub="0.38 g" onClick={() => onPick("mars")} active={shot === "mars"} />
      </group>

      <Rig shot={shot} issRef={issRef} />
    </>
  );
}

export default function SpaceScene({ shot, onPick }: { shot: string; onPick: (id: string) => void }) {
  return (
    <Canvas dpr={[1, 1.6]} camera={{ position: [-12, 6, 28], fov: 42, near: 0.01, far: 1000 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <color attach="background" args={["#000000"]} />
      <World shot={shot} onPick={onPick} />
    </Canvas>
  );
}
