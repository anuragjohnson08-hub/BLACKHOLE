import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  computeGentleBlackHoleRotation,
  stepCursorTrailParticle,
  stepParticleKinematics,
  type CursorTrailParticle,
  type ParticleState,
  type SimulationConfig,
} from '../utils/blackholePhysics';

interface BlackHoleCanvasProps {
  config: SimulationConfig;
  shockwaveTrigger: number;
  activePillarMultiplier: number;
  onTelemetryUpdate?: (stats: {
    activeParticles: number;
    horizonFlux: string;
    cursorForce: string;
  }) => void;
  onCanvasBurst?: () => void;
}

// Pre-allocated module-scope math helpers (Zero GC in animation loop)
const _dummyObj = new THREE.Object3D();
const _vec3A = new THREE.Vector3();
const _planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const _raycaster = new THREE.Raycaster();
const _ndcMouse = new THREE.Vector2(99, 99);

const GARGANTUA_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Render directly as a full-viewport NDC quad (-1..+1) so vUv maps 1:1 to screen pixels
    // without PerspectiveCamera frustum distortion at any aspect ratio (fullscreen or half-screen)
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

/**
 * Calibrated Relativistic Gargantua Fragment Shader with Gentle Rotating Motion
 * & Interactive Cursor Vortex Lensing:
 * - Smooth, unhurried azimuthal rotation of the gravitational lensing rings (uLensingAngle)
 * - Gentle, majestic drift of the diagonal accretion plasma filaments (uAccretionPhase)
 * - Interactive cursor swirl eddy & gravitational micro-lensing around uPointer
 * - Unobstructed bottom-right molten exoplanet limb with glowing volcanic fissures
 */
const GARGANTUA_FRAGMENT_SHADER = `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform float uLensingAngle;
  uniform float uAccretionPhase;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uPointerActive;
  uniform float uSpinSpeed;
  uniform float uLensingIntensity;
  uniform float uTurbulence;
  uniform float uTiltRad;
  uniform float uShockwave;
  uniform float uResonance;

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.866, 0.5, -0.5, 0.866);
    for (int i = 0; i < 4; i++) {
      v += a * noise2D(p);
      p = rot * p * 2.05 + vec2(13.1, 7.7);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 centerUv = vec2(0.495, 0.465);
    // Because vUv spans the exact viewport [0..1], multiplying x by aspect makes 1 unit in p.x
    // equal the exact same number of pixels as 1 unit in p.y on any screen or fullscreen monitor.
    vec2 p = (vUv - centerUv) * vec2(aspect, 1.0) * 2.0;

    // Interactive cursor gravitational swirl & micro-lensing distortion
    vec2 ptr = (uPointer - centerUv) * vec2(aspect, 1.0) * 2.0;
    vec2 toPtr = p - ptr;
    float ptrDist = length(toPtr);
    if (uPointerActive > 0.01) {
      float pull = exp(-ptrDist * 3.0) * 0.042 * uPointerActive * uLensingIntensity;
      vec2 radialDir = normalize(toPtr + vec2(0.0001));
      vec2 tangentDir = vec2(-radialDir.y, radialDir.x);
      p -= (radialDir * 0.65 - tangentDir * 0.75) * pull;
    }

    // Rotate into black hole accretion frame (with gentle precession tilt)
    float c = cos(uTiltRad);
    float s = sin(uTiltRad);
    vec2 q = vec2(p.x * c + p.y * s, -p.x * s + p.y * c);

    float r = length(q);
    float angle = atan(q.y, q.x);

    // 0. Deep pitch-black cosmic background with fine pinpoint stars
    vec3 col = vec3(0.020, 0.022, 0.028);

    vec2 starCell = floor(p * 115.0);
    vec2 starFract = fract(p * 115.0) - 0.5;
    float starSeed = hash21(starCell);
    if (starSeed > 0.986 && r > 0.36) {
      float dStar = length(starFract);
      float starDot = exp(-dStar * dStar * 95.0);
      float twinkle = 0.65 + 0.35 * sin(uTime * 1.4 + starSeed * 120.0);
      col += vec3(0.96, 0.91, 0.82) * starDot * twinkle * 0.75;
    }

    // =========================================================================
    // 1. GRAVITATIONAL LENSING HALO (1:1 Circular Concentric Rotating Rings)
    // =========================================================================
    vec2 haloQ = q;
    float rHalo = length(haloQ);
    // Rotate polar coordinates smoothly around the black hole axis
    float rotatedTheta = atan(haloQ.y, haloQ.x) - uLensingAngle;

    // Periodic azimuthal coordinates so the rotating ring has zero seam
    vec2 polarUv = vec2(
      cos(rotatedTheta) * 2.2 + rHalo * 12.0,
      sin(rotatedTheta) * 2.2 - rHalo * 12.0
    );
    float azimFlow = fbm(polarUv + vec2(uAccretionPhase * 0.35, -uAccretionPhase * 0.25));
    float fineGrooves = 0.52 + 0.48 * sin(rHalo * 210.0 + azimFlow * 5.2 - uLensingAngle * 2.0);
    float medGrooves = 0.55 + 0.45 * cos(rHalo * 78.0 - azimFlow * 3.6 + uLensingAngle);
    // Subtle rotating luminous plasma wave around the ring circumference
    float orbitalWave = 0.84 + 0.16 * sin(rotatedTheta * 2.0 + rHalo * 14.0);
    float ringPattern = mix(0.35, 1.35, fineGrooves * medGrooves) * orbitalWave;

    float innerRise = smoothstep(0.415, 0.452, rHalo);
    float outerDecay = smoothstep(0.78, 0.47, rHalo) * exp(-max(0.0, rHalo - 0.46) * 7.2);
    float haloRadial = innerRise * outerDecay * uLensingIntensity;

    float innerRimBoost = exp(-pow((rHalo - 0.455) / 0.036, 2.0)) * 0.55;
    float haloEnergy = (haloRadial * ringPattern + innerRimBoost * innerRise) * uResonance;

    vec3 darkAmber = vec3(0.62, 0.24, 0.06);
    vec3 warmGold = vec3(0.98, 0.72, 0.34);
    vec3 ivoryWhite = vec3(1.0, 0.97, 0.90);

    vec3 haloCol = mix(darkAmber, warmGold, clamp(haloEnergy * 0.95, 0.0, 1.0));
    haloCol = mix(haloCol, ivoryWhite, pow(clamp(haloEnergy * 0.78, 0.0, 1.0), 2.2));

    col += haloCol * haloEnergy * 1.25;

    // =========================================================================
    // 2. EVENT HORIZON SHADOW & GENTLY ROTATING INNER PHOTON RINGS
    // =========================================================================
    float shadowMask = smoothstep(0.412, 0.428, r);
    col *= shadowMask;
    col = mix(vec3(0.012, 0.012, 0.015), col, shadowMask);

    float photonShimmer = 0.85 + 0.15 * sin(angle * 3.0 - uLensingAngle * 2.5);
    float photonRingOuter = exp(-pow((r - 0.420) / 0.0046, 2.0)) * 1.35 * photonShimmer;
    float photonRingInner = exp(-pow((r - 0.372) / 0.0035, 2.0)) * 0.78 * (0.8 + 0.2 * cos(angle * 2.0 - uLensingAngle * 1.8));
    col += vec3(1.0, 0.94, 0.82) * (photonRingOuter + photonRingInner) * uLensingIntensity;

    // =========================================================================
    // 3. DIAGONAL EQUATORIAL ACCRETION DISK (Smooth, Unhurried Plasma Flow)
    // =========================================================================
    float diskY = q.y + 0.052 - 0.010 * q.x * q.x;

    float wingSpread = smoothstep(0.32, 1.35, abs(q.x));
    float shoulderFlare = exp(-pow((abs(q.x) - 0.49) / 0.16, 2.0));
    float halfThick = 0.021 + 0.078 * wingSpread + 0.025 * shoulderFlare;

    float coreBeam = exp(-pow(diskY / (halfThick * 0.52), 2.0));
    float wingSheet = exp(-pow(diskY / (halfThick * 1.65), 2.0)) * (0.32 + 0.55 * wingSpread);

    // Gentle, hypnotic orbital drift along the accretion plane
    vec2 flowCoord = vec2(
      q.x * 3.2 - uAccretionPhase * 1.15,
      diskY / max(halfThick, 0.015) * 2.2 + fbm(vec2(q.x * 4.2 - uAccretionPhase * 0.65, diskY * 12.0)) * 1.15
    );
    float filaments = fbm(flowCoord * vec2(2.4, 5.0));
    float fineFibers = noise2D(flowCoord * vec2(7.5, 18.0) - vec2(uAccretionPhase * 1.5, 0.0));
    float fiberMod = mix(0.40, 1.40, filaments * 0.65 + fineFibers * 0.35);

    float reachMask = exp(-pow(abs(q.x) / (max(1.35, aspect * 0.98)), 2.4));

    float knotLeft = exp(-pow((q.x + 0.455) / 0.115, 2.0) - pow((diskY + 0.008) / 0.046, 2.0));
    float knotRight = exp(-pow((q.x - 0.465) / 0.125, 2.0) - pow((diskY - 0.008) / 0.050, 2.0));
    float shoulderFlares = (knotLeft * 1.45 + knotRight * 1.65) * uLensingIntensity;

    float cuspBend = exp(-pow((abs(q.x) - 0.50) / 0.14, 2.0)) * exp(-pow(abs(q.y) / 0.21, 2.0)) * 0.48;

    float diskIntensity =
      ((coreBeam * 1.15 + wingSheet * fiberMod) * reachMask + shoulderFlares + cuspBend) *
      uResonance;

    vec3 wingRust = vec3(0.58, 0.18, 0.04);
    vec3 midAmber = vec3(0.98, 0.62, 0.20);
    vec3 coreWhite = vec3(1.0, 0.98, 0.92);

    vec3 diskColor = mix(wingRust, midAmber, clamp(diskIntensity * 0.82, 0.0, 1.0));
    diskColor = mix(diskColor, coreWhite, pow(clamp(diskIntensity * 0.62, 0.0, 1.0), 2.0));

    col += diskColor * diskIntensity;

    // =========================================================================
    // 4. LOWER-RIGHT TIDAL DUST NEBULA, EMBER SPARKS & ORGANIC DEBRIS SILHOUETTES
    // =========================================================================
    vec2 sprayVec = p - vec2(0.44, -0.48);
    float sprayEnv = exp(-dot(sprayVec * vec2(0.80, 1.10), sprayVec * vec2(0.80, 1.10)) * 2.1);
    float smokyDust = fbm(p * 6.5 + vec2(-uAccretionPhase * 0.25, uAccretionPhase * 0.18));
    col += vec3(0.88, 0.56, 0.28) * sprayEnv * smokyDust * 0.45;

    for (int layer = 0; layer < 2; layer++) {
      float scale = layer == 0 ? 72.0 : 128.0;
      vec2 drift = vec2(-uAccretionPhase * (0.35 + float(layer) * 0.2), uAccretionPhase * 0.22);
      vec2 gridP = p * scale + drift;
      vec2 cell = floor(gridP);
      vec2 local = fract(gridP) - 0.5;
      float h = hash21(cell + float(layer) * 19.7);
      if (h > 0.72 && sprayEnv > 0.08) {
        vec2 jitter = vec2(hash21(cell + 3.1) - 0.5, hash21(cell + 7.3) - 0.5) * 0.55;
        float dSpark = length(local - jitter);
        float spark = exp(-dSpark * dSpark * 55.0) * smoothstep(0.72, 0.99, h);
        vec3 sparkCol = mix(vec3(1.0, 0.52, 0.15), vec3(1.0, 0.95, 0.85), fract(h * 13.7));
        col += sparkCol * spark * sprayEnv * 2.1;
      }
    }

    if (q.y < -0.05 && rHalo > 0.42 && rHalo < 0.72 && q.x > -0.15) {
      vec2 dustGrid = q * 95.0 + vec2(uAccretionPhase * 1.1, -uAccretionPhase * 0.65);
      vec2 dCell = floor(dustGrid);
      vec2 dLocal = fract(dustGrid) - 0.5;
      float dh = hash21(dCell);
      float clusterMask = fbm(q * 18.0);
      if (dh > 0.78 && clusterMask > 0.44) {
        float distDot = length(dLocal * vec2(1.0, 1.4));
        float silhouette = smoothstep(0.12, 0.36, distDot);
        col *= mix(0.18, 1.0, silhouette);
      }
    }

    // =========================================================================
    // 5. FOREGROUND MOLTEN EXOPLANET LIMB (Anchored to Bottom-Right Corner)
    // =========================================================================
    vec2 planetCenter = vec2(aspect * 0.90 + 0.36, -1.34);
    float planetRadius = 1.12;
    vec2 toPlanet = p - planetCenter;
    float distPlanet = length(toPlanet);

    if (distPlanet < planetRadius + 0.05) {
      float rimHaze = exp(-pow((distPlanet - planetRadius) / 0.026, 2.0));
      col += vec3(0.92, 0.34, 0.10) * rimHaze * 0.45;

      if (distPlanet < planetRadius) {
        vec2 lp = toPlanet / planetRadius;
        float pz = sqrt(max(0.0, 1.0 - dot(lp, lp)));
        vec3 n = normalize(vec3(lp.x, lp.y, pz));

        vec2 bandUv = vec2(lp.x * 0.74 + lp.y * 0.67, -lp.x * 0.67 + lp.y * 0.74);
        float bands = fbm(bandUv * vec2(4.2, 18.0) + vec2(-uAccretionPhase * 0.09, 0.0));
        float cracks = fbm(bandUv * vec2(14.0, 38.0) - vec2(uAccretionPhase * 0.15, 0.0));

        vec3 lightDir = normalize(vec3(-0.78, 0.58, 0.24));
        float ndotl = max(0.0, dot(n, lightDir));

        vec3 obsidianCrust = vec3(0.035, 0.015, 0.010);
        vec3 burntSienna = vec3(0.52, 0.18, 0.06);
        vec3 brightMagma = vec3(0.98, 0.42, 0.11);

        float magmaStreak = smoothstep(0.38, 0.72, bands * 0.72 + cracks * 0.45);
        vec3 surf = mix(obsidianCrust, burntSienna, ndotl * 0.9 + bands * 0.38);
        surf = mix(surf, brightMagma, magmaStreak * (0.42 + 0.65 * ndotl));

        float hotspot = smoothstep(0.68, 0.90, cracks) * smoothstep(-0.55, -0.98, p.y);
        surf += vec3(1.0, 0.62, 0.18) * hotspot * 1.15;

        float limbEdge = smoothstep(planetRadius, planetRadius - 0.014, distPlanet);
        col = mix(col, surf, limbEdge);
      }
    }

    // =========================================================================
    // 6. SHOCKWAVE PULSE & INTERACTIVE CURSOR SWIRL VORTEX GLOW
    // =========================================================================
    if (uShockwave > 0.001 && uShockwave < 0.999) {
      float waveR = 0.35 + uShockwave * 1.25;
      float ringWave = exp(-pow((r - waveR) / 0.028, 2.0)) * (1.0 - uShockwave);
      col += vec3(1.0, 0.85, 0.48) * ringWave * 1.15;
    }

    if (uPointerActive > 0.01) {
      float ptrAngle = atan(toPtr.y, toPtr.x);
      float spiralArms = 0.6 + 0.4 * sin(ptrAngle * 3.0 - ptrDist * 18.0 + uTime * 4.5);
      float vortexRing = exp(-pow((ptrDist - 0.08) / 0.055, 2.0)) * spiralArms;
      float cursorCore = exp(-ptrDist * 14.0);
      col += mix(vec3(1.0, 0.68, 0.25), vec3(1.0, 0.96, 0.88), cursorCore) *
             (cursorCore * 0.35 + vortexRing * 0.28) * uPointerActive;
    }

    col = col / (1.0 + col * 0.22);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const PARTICLE_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aHeat;
  attribute float aPhase;

  varying float vHeat;
  varying float vAlpha;

  uniform float uTime;
  uniform float uPixelRatio;

  void main() {
    vHeat = aHeat;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = max(1.0, -mvPosition.z);

    float twinkle = 0.78 + 0.22 * sin(uTime * 3.2 + aPhase * 6.2831);
    vAlpha = twinkle * smoothstep(22.0, 3.0, dist);

    gl_PointSize = clamp((aSize * uPixelRatio * 22.0) / dist, 1.2, 18.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT_SHADER = `
  precision mediump float;

  varying float vHeat;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;

    float core = exp(-d * d * 28.0);
    float halo = smoothstep(0.5, 0.0, d) * 0.45;
    float intensity = core + halo;

    vec3 coolEmber = vec3(0.85, 0.28, 0.07);
    vec3 warmGold = vec3(1.0, 0.76, 0.34);
    vec3 whiteHot = vec3(1.0, 0.98, 0.92);

    vec3 color = mix(coolEmber, warmGold, smoothstep(0.0, 0.65, vHeat));
    color = mix(color, whiteHot, smoothstep(0.65, 1.0, vHeat));

    gl_FragColor = vec4(color * intensity * 1.25, intensity * vAlpha);
  }
`;

/**
 * Shaders for the Interactive Cursor Swirl & Trail Particle Ribbon
 */
const TRAIL_VERTEX_SHADER = `
  attribute float aLife;
  attribute float aSize;

  varying float vLife;

  uniform float uPixelRatio;

  void main() {
    vLife = aLife;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = max(1.0, -mvPosition.z);

    // Trail particles bloom when freshly spawned and taper smoothly as they swirl
    float lifeScale = sin(clamp(aLife, 0.0, 1.0) * 3.14159);
    gl_PointSize = clamp((aSize * (0.4 + 0.9 * lifeScale) * uPixelRatio * 26.0) / dist, 0.0, 24.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const TRAIL_FRAGMENT_SHADER = `
  precision mediump float;

  varying float vLife;

  void main() {
    if (vLife <= 0.01) discard;
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;

    float core = exp(-d * d * 26.0);
    float glow = smoothstep(0.5, 0.0, d) * 0.6;
    float intensity = (core + glow) * smoothstep(0.0, 0.2, vLife);

    // Color transitions from incandescent diamond-ivory at cursor to golden-amber to warm crimson ember
    vec3 tailEmber = vec3(0.92, 0.32, 0.08);
    vec3 midGold = vec3(1.0, 0.78, 0.32);
    vec3 headIvory = vec3(1.0, 0.98, 0.92);

    vec3 col = mix(tailEmber, midGold, smoothstep(0.0, 0.55, vLife));
    col = mix(col, headIvory, smoothstep(0.55, 1.0, vLife));

    gl_FragColor = vec4(col * intensity * 1.45, intensity * 0.92);
  }
`;

export const BlackHoleCanvas: React.FC<BlackHoleCanvasProps> = ({
  config,
  shockwaveTrigger,
  activePillarMultiplier,
  onTelemetryUpdate,
  onCanvasBurst,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const configRef = useRef<SimulationConfig>(config);
  const pillarMultRef = useRef<number>(activePillarMultiplier);
  const telemetryCbRef = useRef(onTelemetryUpdate);
  const burstCbRef = useRef(onCanvasBurst);
  const shockwaveRef = useRef<number>(0);
  const lastShockwaveTriggerRef = useRef<number>(shockwaveTrigger);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    pillarMultRef.current = activePillarMultiplier;
  }, [activePillarMultiplier]);

  useEffect(() => {
    telemetryCbRef.current = onTelemetryUpdate;
    burstCbRef.current = onCanvasBurst;
  }, [onTelemetryUpdate, onCanvasBurst]);

  useEffect(() => {
    if (shockwaveTrigger !== lastShockwaveTriggerRef.current) {
      lastShockwaveTriggerRef.current = shockwaveTrigger;
      shockwaveRef.current = 0.005;
    }
  }, [shockwaveTrigger]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    const pixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050507);
    scene.fog = new THREE.FogExp2(0x050507, 0.032);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 11.5);
    camera.lookAt(0, 0, 0);

    // 3-Point Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xffcf8b, 0x161c2e, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffa94d, 2.4);
    keyLight.position.set(-3.5, 2.5, 4.0);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xff5e1a, 2.8, 18);
    rimLight.position.set(2.2, -1.8, 2.5);
    scene.add(rimLight);

    // =========================================================================
    // A. RELATIVISTIC GARGANTUA SHADER BACKDROP
    // =========================================================================
    const initialRot = computeGentleBlackHoleRotation(
      1.4,
      configRef.current.spinSpeed,
      configRef.current.diskTiltDeg
    );

    const gargantuaUniforms = {
      uTime: { value: 1.4 },
      uLensingAngle: { value: initialRot.lensingAngle },
      uAccretionPhase: { value: initialRot.accretionPhase },
      uResolution: { value: new THREE.Vector2(width, height) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPointerActive: { value: 0.0 },
      uSpinSpeed: { value: configRef.current.spinSpeed },
      uLensingIntensity: { value: configRef.current.lensingIntensity },
      uTurbulence: { value: configRef.current.particleTurbulence },
      uTiltRad: { value: initialRot.precessionTiltRad },
      uShockwave: { value: 0.0 },
      uResonance: { value: pillarMultRef.current },
    };

    const backdropMat = new THREE.ShaderMaterial({
      uniforms: gargantuaUniforms,
      vertexShader: GARGANTUA_VERTEX_SHADER,
      fragmentShader: GARGANTUA_FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
    });

    const backdropGeo = new THREE.PlaneGeometry(2, 2);
    const backdropMesh = new THREE.Mesh(backdropGeo, backdropMat);
    backdropMesh.frustumCulled = false;
    backdropMesh.renderOrder = 0;
    scene.add(backdropMesh);

    // =========================================================================
    // B. COMPOSITE 3D TIDAL METEOROID CLUSTER (THREE.Group, 4 distinct parts)
    // Positioned in the lower-right tidal stream without occluding the planet limb
    // =========================================================================
    const meteoroidGroup = new THREE.Group();
    meteoroidGroup.position.set(1.65, -1.45, 0.35);
    scene.add(meteoroidGroup);

    const primaryRockGeo = new THREE.DodecahedronGeometry(0.065, 1);
    const primaryRockMat = new THREE.MeshStandardMaterial({
      color: 0x1c0a05,
      emissive: 0x4a1606,
      emissiveIntensity: 0.35,
      roughness: 0.82,
      metalness: 0.18,
    });
    const primaryRockMesh = new THREE.Mesh(primaryRockGeo, primaryRockMat);
    meteoroidGroup.add(primaryRockMesh);

    const emberVeinGeo = new THREE.DodecahedronGeometry(0.042, 0);
    const emberVeinMat = new THREE.MeshStandardMaterial({
      color: 0xff5a1f,
      emissive: 0xff4500,
      emissiveIntensity: 0.95,
      roughness: 0.45,
      metalness: 0.5,
    });
    const emberVeinMesh = new THREE.Mesh(emberVeinGeo, emberVeinMat);
    emberVeinMesh.position.set(0.28, -0.18, 0.12);
    meteoroidGroup.add(emberVeinMesh);

    const satelliteShardGeo = new THREE.DodecahedronGeometry(0.032, 0);
    const satelliteShardMat = new THREE.MeshStandardMaterial({
      color: 0x261109,
      roughness: 0.55,
      metalness: 0.45,
    });
    const satelliteShard = new THREE.Mesh(satelliteShardGeo, satelliteShardMat);
    satelliteShard.position.set(-0.24, 0.15, 0.08);
    meteoroidGroup.add(satelliteShard);

    // =========================================================================
    // C. 3D ROCKY ASTEROID & TIDAL DEBRIS SHARDS (THREE.InstancedMesh, 85 instances)
    // =========================================================================
    const shardCount = 85;
    const shardGeo = new THREE.DodecahedronGeometry(0.025, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x160b06,
      emissive: 0x381205,
      emissiveIntensity: 0.3,
      roughness: 0.78,
      metalness: 0.25,
    });
    const shardInstanced = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
    shardInstanced.frustumCulled = false;
    shardInstanced.renderOrder = 2;
    scene.add(shardInstanced);

    interface ShardData {
      baseX: number;
      baseY: number;
      baseZ: number;
      orbitAngle: number;
      orbitRadius: number;
      orbitSpeed: number;
      rotSpeedX: number;
      rotSpeedY: number;
      scale: THREE.Vector3;
      isTidalSpray: boolean;
    }

    const shards: ShardData[] = [];
    const instanceColor = new THREE.Color();
    for (let i = 0; i < shardCount; i++) {
      const seed1 = Math.sin(i * 12.9898 + 1.23) * 43758.5453;
      const r1 = seed1 - Math.floor(seed1);
      const seed2 = Math.sin(i * 78.233 + 4.56) * 23421.631;
      const r2 = seed2 - Math.floor(seed2);
      const seed3 = Math.sin(i * 39.346 + 7.89) * 19283.471;
      const r3 = seed3 - Math.floor(seed3);

      const isTidalSpray = i < 65;
      const orbitRadius = isTidalSpray ? 1.8 + r1 * 2.8 : 2.2 + r1 * 4.2;
      const orbitAngle = isTidalSpray ? -1.25 + r2 * 1.25 : r2 * Math.PI * 2;

      const s = 0.35 + Math.pow(r3, 1.6) * 1.1;
      const scaleVec = new THREE.Vector3(s * (0.7 + r1 * 0.6), s * (0.5 + r2 * 0.5), s);

      shards.push({
        baseX: (r1 - 0.5) * 1.1,
        baseY: (r2 - 0.5) * 0.9,
        baseZ: 0.4 + r3 * 1.2,
        orbitAngle,
        orbitRadius,
        orbitSpeed: (0.09 + r1 * 0.18) * (isTidalSpray ? 0.7 : 1.0),
        rotSpeedX: (r2 - 0.5) * 1.4,
        rotSpeedY: (r3 - 0.5) * 1.4,
        scale: scaleVec,
        isTidalSpray,
      });

      if (r3 > 0.82) {
        instanceColor.setHex(0xff7a29);
      } else if (r3 > 0.45) {
        instanceColor.setHex(0x2e150a);
      } else {
        instanceColor.setHex(0x0b0604);
      }
      shardInstanced.setColorAt(i, instanceColor);
    }
    if (shardInstanced.instanceColor) {
      shardInstanced.instanceColor.needsUpdate = true;
    }

    // =========================================================================
    // D. INTERACTIVE 3D PARTICLE FIELD (Orbital Accretion + Lower-Right Tidal Spray)
    // =========================================================================
    const particleCount = 1500;
    const particleStates: ParticleState[] = [];
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const heats = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const s1 = Math.sin(i * 91.13 + 0.7) * 43758.5453;
      const u1 = s1 - Math.floor(s1);
      const s2 = Math.sin(i * 47.71 + 2.3) * 19834.123;
      const u2 = s2 - Math.floor(s2);
      const s3 = Math.sin(i * 19.37 + 5.1) * 31942.881;
      const u3 = s3 - Math.floor(s3);

      const isTidalCluster = i < particleCount * 0.6;
      const radius = isTidalCluster ? 1.7 + Math.pow(u1, 1.2) * 4.5 : 1.75 + Math.pow(u1, 1.5) * 7.2;
      const angle = isTidalCluster ? -1.35 + u2 * 1.35 : u2 * Math.PI * 2;
      const size = isTidalCluster ? 0.65 + Math.pow(u3, 2.4) * 2.8 : 0.5 + Math.pow(u3, 2.2) * 2.1;
      const heat = isTidalCluster ? 0.35 + u3 * 0.65 : Math.max(0.15, 1.0 - (radius - 1.7) / 7.5);

      const pState: ParticleState = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.22,
        z: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        vz: 0,
        radius,
        angle,
        angularSpeed: 0.35,
        size,
        heat,
      };
      particleStates.push(pState);

      positions[i * 3] = pState.x;
      positions[i * 3 + 1] = pState.y;
      positions[i * 3 + 2] = pState.z;
      sizes[i] = size;
      heats[i] = heat;
      phases[i] = u1;
    }

    const particlesGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const heatAttr = new THREE.BufferAttribute(heats, 1);
    heatAttr.setUsage(THREE.DynamicDrawUsage);

    particlesGeo.setAttribute('position', posAttr);
    particlesGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    particlesGeo.setAttribute('aHeat', heatAttr);
    particlesGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const particlesMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
      },
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particlePoints = new THREE.Points(particlesGeo, particlesMat);
    particlePoints.renderOrder = 3;
    scene.add(particlePoints);

    // =========================================================================
    // E. INTERACTIVE CURSOR SWIRL & COMET TRAIL SYSTEM (420 Particles)
    // =========================================================================
    const trailCount = 420;
    const trailParticles: CursorTrailParticle[] = [];
    const trailPositions = new Float32Array(trailCount * 3);
    const trailLifes = new Float32Array(trailCount);
    const trailSizes = new Float32Array(trailCount);

    for (let i = 0; i < trailCount; i++) {
      const maxLife = 0.55 + (i % 9) * 0.14;
      const sz = 0.9 + (i % 7) * 0.32;
      trailParticles.push({
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0, // Staggered activation when pointer moves
        maxLife,
        size: sz,
        swirlPhase: i * 0.45,
      });
      trailSizes[i] = sz;
      trailLifes[i] = 0;
    }

    const trailGeo = new THREE.BufferGeometry();
    const trailPosAttr = new THREE.BufferAttribute(trailPositions, 3);
    trailPosAttr.setUsage(THREE.DynamicDrawUsage);
    const trailLifeAttr = new THREE.BufferAttribute(trailLifes, 1);
    trailLifeAttr.setUsage(THREE.DynamicDrawUsage);

    trailGeo.setAttribute('position', trailPosAttr);
    trailGeo.setAttribute('aLife', trailLifeAttr);
    trailGeo.setAttribute('aSize', new THREE.BufferAttribute(trailSizes, 1));

    const trailMat = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: pixelRatio },
      },
      vertexShader: TRAIL_VERTEX_SHADER,
      fragmentShader: TRAIL_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const trailPoints = new THREE.Points(trailGeo, trailMat);
    trailPoints.renderOrder = 4;
    scene.add(trailPoints);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // =========================================================================
    // F. POINTER INTERACTION, VELOCITY TRACKING & TRAIL SPAWNING
    // =========================================================================
    const pointerState = {
      normX: 0.5,
      normY: 0.5,
      worldX: 0,
      worldY: 0,
      worldZ: 0,
      vx: 0,
      vy: 0,
      active: false,
      targetActive: 0,
      spawnCursor: 0,
    };

    const emitCursorTrailBurst = (count: number, boostSpeed: number) => {
      for (let k = 0; k < count; k++) {
        const idx = pointerState.spawnCursor % trailCount;
        pointerState.spawnCursor++;
        const tp = trailParticles[idx];
        const angle = idx * 2.39996 + tp.swirlPhase;
        const rad = 0.04 + (k % 6) * 0.05;
        const speed = (1.35 + (k % 5) * 0.35) * boostSpeed;
        tp.x = pointerState.worldX + Math.cos(angle) * rad;
        tp.y = pointerState.worldY + Math.sin(angle) * rad;
        tp.z = 0.65;
        tp.vx = -Math.sin(angle) * speed + pointerState.vx * 0.28;
        tp.vy = Math.cos(angle) * speed + pointerState.vy * 0.28;
        tp.vz = ((k % 3) - 1) * 0.15;
        tp.life = 1.0;
      }
    };

    const updatePointerFromClient = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const nx = (clientX - rect.left) / rect.width;
      const ny = 1.0 - (clientY - rect.top) / rect.height;
      pointerState.normX = nx;
      pointerState.normY = ny;
      pointerState.active = true;
      pointerState.targetActive = 1.0;

      _ndcMouse.set(nx * 2 - 1, ny * 2 - 1);
      _raycaster.setFromCamera(_ndcMouse, camera);
      if (_raycaster.ray.intersectPlane(_planeZ0, _vec3A)) {
        const dx = _vec3A.x - pointerState.worldX;
        const dy = _vec3A.y - pointerState.worldY;
        pointerState.vx = THREE.MathUtils.clamp(dx * 18.0, -14.0, 14.0);
        pointerState.vy = THREE.MathUtils.clamp(dy * 18.0, -14.0, 14.0);
        pointerState.worldX = _vec3A.x;
        pointerState.worldY = _vec3A.y;
        pointerState.worldZ = _vec3A.z;

        // Immediately spawn swirling trail particles along the cursor trajectory
        emitCursorTrailBurst(14, 1.0);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      updatePointerFromClient(e.clientX, e.clientY);
    };

    const onPointerLeave = () => {
      pointerState.active = false;
      pointerState.targetActive = 0.0;
      pointerState.vx = 0;
      pointerState.vy = 0;
    };

    const onPointerDown = (e: PointerEvent) => {
      updatePointerFromClient(e.clientX, e.clientY);
      shockwaveRef.current = 0.005;

      // Spawn a rich swirlingnova burst of trail particles on click
      emitCursorTrailBurst(64, 2.1);

      for (let i = 0; i < particleCount; i++) {
        const p = particleStates[i];
        const dx = p.x - pointerState.worldX;
        const dy = p.y - pointerState.worldY;
        const dist = Math.sqrt(dx * dx + dy * dy + 0.25);
        if (dist < 4.8) {
          const strength = (1.0 - dist / 4.8) * 2.4;
          p.vx += (dx / dist) * strength - (dy / dist) * strength * 0.85;
          p.vy += (dy / dist) * strength + (dx / dist) * strength * 0.85;
          p.heat = 1.0;
        }
      }
      burstCbRef.current?.();
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointermove', onPointerMove, { passive: true });
    domElem.addEventListener('pointerleave', onPointerLeave, { passive: true });
    domElem.addEventListener('pointerdown', onPointerDown);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      gargantuaUniforms.uResolution.value.set(w, h);
    };
    window.addEventListener('resize', onResize);
    const resizeObserver = new ResizeObserver(() => onResize());
    resizeObserver.observe(container);

    // =========================================================================
    // G. ANIMATION LOOP WITH GENTLE ROTATION & SOFTWARE-WEBGL `afterDraw` PACING
    // =========================================================================
    let frameId = 0;
    let isDisposed = false;
    const clock = new THREE.Clock();
    let elapsedTotal = 1.4;
    let lastTelemetryTime = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (isDisposed) return;
      const rawDelta = clock.getDelta();
      const dt = Math.min(Math.max(rawDelta, 0.004), 0.045);
      elapsedTotal += dt;

      const cfg = configRef.current;
      const resMult = pillarMultRef.current;

      if (shockwaveRef.current > 0) {
        shockwaveRef.current += dt * 0.75;
        if (shockwaveRef.current >= 1.0) {
          shockwaveRef.current = 0;
        }
      }

      // Compute smooth, gentle rotation & precession for the black hole
      const rotState = computeGentleBlackHoleRotation(
        elapsedTotal,
        cfg.spinSpeed,
        cfg.diskTiltDeg
      );

      gargantuaUniforms.uTime.value = elapsedTotal;
      gargantuaUniforms.uLensingAngle.value = rotState.lensingAngle;
      gargantuaUniforms.uAccretionPhase.value = rotState.accretionPhase;
      gargantuaUniforms.uSpinSpeed.value = THREE.MathUtils.damp(
        gargantuaUniforms.uSpinSpeed.value,
        cfg.spinSpeed,
        6,
        dt
      );
      gargantuaUniforms.uLensingIntensity.value = THREE.MathUtils.damp(
        gargantuaUniforms.uLensingIntensity.value,
        cfg.lensingIntensity,
        6,
        dt
      );
      gargantuaUniforms.uTurbulence.value = THREE.MathUtils.damp(
        gargantuaUniforms.uTurbulence.value,
        cfg.particleTurbulence,
        6,
        dt
      );
      gargantuaUniforms.uTiltRad.value = THREE.MathUtils.damp(
        gargantuaUniforms.uTiltRad.value,
        rotState.precessionTiltRad,
        6,
        dt
      );
      gargantuaUniforms.uPointer.value.x = THREE.MathUtils.damp(
        gargantuaUniforms.uPointer.value.x,
        pointerState.normX,
        10,
        dt
      );
      gargantuaUniforms.uPointer.value.y = THREE.MathUtils.damp(
        gargantuaUniforms.uPointer.value.y,
        pointerState.normY,
        10,
        dt
      );
      gargantuaUniforms.uPointerActive.value = THREE.MathUtils.damp(
        gargantuaUniforms.uPointerActive.value,
        pointerState.targetActive,
        8,
        dt
      );
      gargantuaUniforms.uShockwave.value = shockwaveRef.current;
      gargantuaUniforms.uResonance.value = THREE.MathUtils.damp(
        gargantuaUniforms.uResonance.value,
        resMult,
        5,
        dt
      );

      // Decay pointer velocity smoothly when cursor is stationary
      pointerState.vx *= 0.88;
      pointerState.vy *= 0.88;

      // Subtle camera parallax
      const targetCamX = pointerState.active ? (pointerState.normX - 0.5) * 0.32 : 0;
      const targetCamY = pointerState.active ? (pointerState.normY - 0.5) * 0.22 : 0;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 4, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 4, dt);
      camera.lookAt(0, 0, 0);

      // Gentle rotation of composite 3D meteoroid cluster
      meteoroidGroup.rotation.z = elapsedTotal * 0.12 * cfg.spinSpeed;
      satelliteShard.rotation.x += dt * 0.45;
      satelliteShard.rotation.y += dt * 0.35;

      // Update 3D Rocky Debris Shards (InstancedMesh)
      const tiltR = (cfg.diskTiltDeg * Math.PI) / 180;
      const cosT = Math.cos(tiltR);
      const sinT = Math.sin(tiltR);

      for (let i = 0; i < shardCount; i++) {
        const s = shards[i];
        s.orbitAngle += dt * s.orbitSpeed * cfg.spinSpeed;

        if (s.isTidalSpray) {
          const localProgress = (Math.sin(s.orbitAngle * 1.1 + i) + 1) * 0.5;
          const px = 0.45 + localProgress * 2.8 + s.baseX;
          const py = -0.85 - localProgress * 1.9 + s.baseY;
          const pz = s.baseZ;
          _dummyObj.position.set(px, py, pz);
        } else {
          const lx = Math.cos(s.orbitAngle) * s.orbitRadius;
          const ly = Math.sin(s.orbitAngle) * s.orbitRadius * 0.16;
          const lz = Math.sin(s.orbitAngle) * 0.9;
          _dummyObj.position.set(lx * cosT - ly * sinT, lx * sinT + ly * cosT - 0.2, lz);
        }

        _dummyObj.rotation.x = elapsedTotal * s.rotSpeedX + i;
        _dummyObj.rotation.y = elapsedTotal * s.rotSpeedY + i * 0.5;
        _dummyObj.scale.copy(s.scale);
        _dummyObj.updateMatrix();
        shardInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      shardInstanced.instanceMatrix.needsUpdate = true;

      // Update Interactive 3D Ambient Particle System
      particlesMat.uniforms.uTime.value = elapsedTotal;
      const ptrInfo = {
        x: pointerState.worldX,
        y: pointerState.worldY,
        z: pointerState.worldZ,
        vx: pointerState.vx,
        vy: pointerState.vy,
        active: pointerState.active,
      };

      const posArr = posAttr.array as Float32Array;
      const heatArr = heatAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const nextP = stepParticleKinematics(
          particleStates[i],
          dt,
          cfg,
          ptrInfo,
          shockwaveRef.current
        );
        particleStates[i] = nextP;

        if (i < particleCount * 0.6) {
          // Lower-right tidal ember spray + interactive cursor swirl offset
          const sprayBias = i / (particleCount * 0.6);
          const spreadX = Math.sin(i * 17.3) * (0.35 + sprayBias * 0.95);
          const spreadY = Math.cos(i * 23.1) * (0.35 + sprayBias * 0.75);
          const sx = nextP.x * 0.28 + 0.55 + sprayBias * 2.85 + spreadX + nextP.vx * 0.75;
          const sy = nextP.y * 0.28 - 0.85 - sprayBias * 1.75 + spreadY + nextP.vy * 0.75;
          posArr[i * 3] = sx;
          posArr[i * 3 + 1] = sy;
          posArr[i * 3 + 2] = nextP.z * 0.25 + 0.5;
        } else {
          posArr[i * 3] = nextP.x * 0.85;
          posArr[i * 3 + 1] = nextP.y * 0.85 - 0.22;
          posArr[i * 3 + 2] = nextP.z * 0.35;
        }
        heatArr[i] = nextP.heat;
      }
      posAttr.needsUpdate = true;
      heatAttr.needsUpdate = true;

      // Update Interactive Cursor Swirl & Trail Particle System
      const tPosArr = trailPosAttr.array as Float32Array;
      const tLifeArr = trailLifeAttr.array as Float32Array;
      for (let i = 0; i < trailCount; i++) {
        const nextTp = stepCursorTrailParticle(
          trailParticles[i],
          i,
          dt,
          ptrInfo,
          cfg.spinSpeed
        );
        trailParticles[i] = nextTp;
        tPosArr[i * 3] = nextTp.x;
        tPosArr[i * 3 + 1] = nextTp.y;
        tPosArr[i * 3 + 2] = nextTp.z;
        tLifeArr[i] = nextTp.life;
      }
      trailPosAttr.needsUpdate = true;
      trailLifeAttr.needsUpdate = true;

      renderer.render(scene, camera);

      if (elapsedTotal - lastTelemetryTime > 0.35) {
        lastTelemetryTime = elapsedTotal;
        const fluxVal = (4.82 * cfg.spinSpeed * cfg.lensingIntensity * resMult).toFixed(2);
        telemetryCbRef.current?.({
          activeParticles: particleCount + trailCount + shardCount,
          horizonFlux: `${fluxVal} × 10^44 erg/s`,
          cursorForce: pointerState.active ? cfg.interactionMode.toUpperCase() : 'EQUILIBRIUM',
        });
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      domElem.removeEventListener('pointermove', onPointerMove);
      domElem.removeEventListener('pointerleave', onPointerLeave);
      domElem.removeEventListener('pointerdown', onPointerDown);

      backdropGeo.dispose();
      backdropMat.dispose();
      primaryRockGeo.dispose();
      primaryRockMat.dispose();
      emberVeinGeo.dispose();
      emberVeinMat.dispose();
      satelliteShardGeo.dispose();
      satelliteShardMat.dispose();
      shardGeo.dispose();
      shardMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      trailGeo.dispose();
      trailMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="blackhole-webgl-canvas"
      className="absolute inset-0 w-full h-full cursor-crosshair"
      aria-label="Interactive 3D Mertana relativistic black hole and particle simulation canvas"
    />
  );
};
