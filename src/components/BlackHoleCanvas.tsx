import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  stepParticleKinematics,
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
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Calibrated Relativistic Gargantua Fragment Shader matching the Mertana reference:
 * - Deep pitch-black cosmic background (#050508) around top-left, top-right, and bottom-left text
 * - Central Black Hole Shadow at uv ~(0.495, 0.46) with radius R_shadow = 0.34 in aspect-corrected space
 * - Dual razor-thin inner Photon Rings inside the shadow edge
 * - Concentric striated Gravitational Lensing arches (top arch rises into 'r t a' of Mertana; bottom arch has dark asteroid dust)
 * - Focused, fibrous diagonal Accretion Disk (-21.5 deg) slicing across the lower-center of the shadow with bright limb flares
 * - Lower-right tidal ember & dust spray + bottom-right curved molten exoplanet limb
 */
const GARGANTUA_FRAGMENT_SHADER = `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
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
    // p.y spans [-1.0, +1.0], centered slightly below vertical midpoint (0.465)
    vec2 centerUv = vec2(0.495, 0.465);
    vec2 p = (vUv - centerUv) * vec2(aspect, 1.0) * 2.0;

    // Subtle pointer gravitational lensing warp
    vec2 ptr = (uPointer - centerUv) * vec2(aspect, 1.0) * 2.0;
    vec2 toPtr = p - ptr;
    float ptrDist = length(toPtr);
    if (uPointerActive > 0.01) {
      float pull = exp(-ptrDist * 3.2) * 0.038 * uPointerActive * uLensingIntensity;
      p -= normalize(toPtr + vec2(0.0001)) * pull;
    }

    // Rotate into black hole accretion frame (+21.5 deg: bottom-left to top-right)
    float c = cos(uTiltRad);
    float s = sin(uTiltRad);
    vec2 q = vec2(p.x * c + p.y * s, -p.x * s + p.y * c);

    float r = length(q);
    float angle = atan(q.y, q.x);
    float t = uTime * uSpinSpeed;

    // 0. Deep pitch-black cosmic background with fine pinpoint stars
    vec3 col = vec3(0.020, 0.022, 0.028);

    // Subtle pinpoint starfield outside the shadow
    vec2 starCell = floor(p * 115.0);
    vec2 starFract = fract(p * 115.0) - 0.5;
    float starSeed = hash21(starCell);
    if (starSeed > 0.986 && r > 0.36) {
      float dStar = length(starFract);
      float starDot = exp(-dStar * dStar * 95.0);
      float twinkle = 0.6 + 0.4 * sin(uTime * 2.5 + starSeed * 120.0);
      col += vec3(0.96, 0.91, 0.82) * starDot * twinkle * 0.75;
    }

    // =========================================================================
    // 1. GRAVITATIONAL LENSING HALO (Upper & Lower Concentric Warped Rings)
    // =========================================================================
    // Shadow radius R_s = 0.355. The lensed halo wraps tightly from r = 0.355 to r = 0.62
    vec2 haloQ = vec2(q.x * 0.97, q.y * 1.0);
    float rHalo = length(haloQ);
    float haloTheta = atan(haloQ.y, haloQ.x);

    // Concentric multi-ring striations matching the reference image's fine golden grooves
    float azimFlow = fbm(vec2(rHalo * 22.0, haloTheta * 3.0 - t * 1.2));
    float fineGrooves = 0.52 + 0.48 * sin(rHalo * 240.0 + azimFlow * 5.0 - t * 1.6);
    float medGrooves = 0.55 + 0.45 * cos(rHalo * 88.0 - azimFlow * 3.5);
    float ringPattern = mix(0.35, 1.35, fineGrooves * medGrooves);

    // Tight radial envelope: peaks between r = 0.37 and r = 0.53, fades cleanly to black by r = 0.64
    float innerRise = smoothstep(0.350, 0.382, rHalo);
    float outerDecay = smoothstep(0.66, 0.40, rHalo) * exp(-max(0.0, rHalo - 0.39) * 8.5);
    float haloRadial = innerRise * outerDecay * uLensingIntensity;

    // Brightest near the inner rim and upper-left / right shoulders
    float innerRimBoost = exp(-pow((rHalo - 0.385) / 0.032, 2.0)) * 0.55;
    float haloEnergy = (haloRadial * ringPattern + innerRimBoost * innerRise) * uResonance;

    vec3 darkAmber = vec3(0.62, 0.24, 0.06);
    vec3 warmGold = vec3(0.98, 0.72, 0.34);
    vec3 ivoryWhite = vec3(1.0, 0.97, 0.90);

    vec3 haloCol = mix(darkAmber, warmGold, clamp(haloEnergy * 0.95, 0.0, 1.0));
    haloCol = mix(haloCol, ivoryWhite, pow(clamp(haloEnergy * 0.78, 0.0, 1.0), 2.2));

    col += haloCol * haloEnergy * 1.25;

    // =========================================================================
    // 2. EVENT HORIZON SHADOW (Pure Pitch-Black Void) & INNER PHOTON RINGS
    // =========================================================================
    float shadowMask = smoothstep(0.348, 0.362, r);
    col *= shadowMask;
    // Deep pure black interior inside r < 0.348
    col = mix(vec3(0.012, 0.012, 0.015), col, shadowMask);

    // Outer razor-thin photon ring right at the shadow rim (r = 0.354)
    float photonRingOuter = exp(-pow((r - 0.354) / 0.0042, 2.0)) * 1.35;
    // Secondary ultra-thin inner photon ring inside the shadow (r = 0.312) matching reference image!
    float photonRingInner = exp(-pow((r - 0.312) / 0.0032, 2.0)) * 0.78;
    col += vec3(1.0, 0.94, 0.82) * (photonRingOuter + photonRingInner) * uLensingIntensity;

    // =========================================================================
    // 3. DIAGONAL EQUATORIAL ACCRETION DISK (Bottom-Left to Top-Right)
    // =========================================================================
    // Passes slightly below center (q.y ~ -0.048) so both upper and lower black semicircles are distinct
    float diskY = q.y + 0.048 - 0.010 * q.x * q.x;

    // Tight blade across the black shadow (0.018), widening into fibrous wings outside |q.x| > 0.38
    float wingSpread = smoothstep(0.28, 1.15, abs(q.x));
    float shoulderFlare = exp(-pow((abs(q.x) - 0.42) / 0.14, 2.0));
    float halfThick = 0.019 + 0.072 * wingSpread + 0.022 * shoulderFlare;

    // Core beam + fibrous outer plasma sheet
    float coreBeam = exp(-pow(diskY / (halfThick * 0.52), 2.0));
    float wingSheet = exp(-pow(diskY / (halfThick * 1.65), 2.0)) * (0.32 + 0.55 * wingSpread);

    // Fibrous turbulent streaks streaming along the disk
    vec2 flowCoord = vec2(
      q.x * 3.6 - t * 1.5,
      diskY / max(halfThick, 0.015) * 2.2 + fbm(vec2(q.x * 5.0 - t * 0.8, diskY * 12.0)) * 1.2
    );
    float filaments = fbm(flowCoord * vec2(2.4, 5.2));
    float fineFibers = noise2D(flowCoord * vec2(8.0, 20.0) - vec2(t * 2.2, 0.0));
    float fiberMod = mix(0.38, 1.42, filaments * 0.65 + fineFibers * 0.35);

    // Taper smoothly toward the screen edges so bottom-left text has high contrast
    float reachMask = exp(-pow(abs(q.x) / 1.48, 2.4));

    // White-hot Doppler knots where the disk intersects the left and right photon ring shoulders (|q.x| ~ 0.39)
    float knotLeft = exp(-pow((q.x + 0.385) / 0.105, 2.0) - pow((diskY + 0.008) / 0.042, 2.0));
    float knotRight = exp(-pow((q.x - 0.395) / 0.115, 2.0) - pow((diskY - 0.008) / 0.046, 2.0));
    float shoulderFlares = (knotLeft * 1.45 + knotRight * 1.65) * uLensingIntensity;

    // Cusp curves bending from the shoulders into the upper/lower lensing arches
    float cuspBend = exp(-pow((abs(q.x) - 0.43) / 0.12, 2.0)) * exp(-pow(abs(q.y) / 0.18, 2.0)) * 0.48;

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
    vec2 sprayVec = p - vec2(0.36, -0.44);
    float sprayEnv = exp(-dot(sprayVec * vec2(0.85, 1.15), sprayVec * vec2(0.85, 1.15)) * 2.4);
    float smokyDust = fbm(p * 6.5 + vec2(-t * 0.2, t * 0.15));
    col += vec3(0.88, 0.56, 0.28) * sprayEnv * smokyDust * 0.45;

    // Multi-scale glowing golden/white cosmic sparks in the lower-right spray
    for (int layer = 0; layer < 2; layer++) {
      float scale = layer == 0 ? 72.0 : 128.0;
      vec2 drift = vec2(-t * (0.35 + float(layer) * 0.2), t * 0.22);
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

    // Organic rounded dark dust silhouettes across the lower-right gravitational lensing arch
    if (q.y < -0.05 && rHalo > 0.36 && rHalo < 0.62 && q.x > -0.15) {
      vec2 dustGrid = q * 95.0 + vec2(t * 1.4, -t * 0.8);
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
    // 5. FOREGROUND MOLTEN EXOPLANET LIMB (Bottom-Right Corner matching Reference)
    // =========================================================================
    vec2 planetCenter = vec2(1.42, -1.18);
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

        // Sweeping diagonal volcanic ridges parallel to the limb curvature
        vec2 bandUv = vec2(lp.x * 0.74 + lp.y * 0.67, -lp.x * 0.67 + lp.y * 0.74);
        float bands = fbm(bandUv * vec2(4.2, 18.0) + vec2(-t * 0.08, 0.0));
        float cracks = fbm(bandUv * vec2(14.0, 38.0) - vec2(t * 0.14, 0.0));

        vec3 lightDir = normalize(vec3(-0.78, 0.58, 0.24));
        float ndotl = max(0.0, dot(n, lightDir));

        vec3 obsidianCrust = vec3(0.035, 0.015, 0.010);
        vec3 burntSienna = vec3(0.52, 0.18, 0.06);
        vec3 brightMagma = vec3(0.98, 0.42, 0.11);

        float magmaStreak = smoothstep(0.38, 0.72, bands * 0.72 + cracks * 0.45);
        vec3 surf = mix(obsidianCrust, burntSienna, ndotl * 0.9 + bands * 0.38);
        surf = mix(surf, brightMagma, magmaStreak * (0.42 + 0.65 * ndotl));

        // Glowing volcanic hotspots near the bottom edge of the planet limb
        float hotspot = smoothstep(0.68, 0.90, cracks) * smoothstep(-0.55, -0.98, p.y);
        surf += vec3(1.0, 0.62, 0.18) * hotspot * 1.15;

        float limbEdge = smoothstep(planetRadius, planetRadius - 0.014, distPlanet);
        col = mix(col, surf, limbEdge);
      }
    }

    // =========================================================================
    // 6. SHOCKWAVE PULSE & CURSOR INTERACTION GLOW
    // =========================================================================
    if (uShockwave > 0.001 && uShockwave < 0.999) {
      float waveR = 0.35 + uShockwave * 1.25;
      float ringWave = exp(-pow((r - waveR) / 0.028, 2.0)) * (1.0 - uShockwave);
      col += vec3(1.0, 0.85, 0.48) * ringWave * 1.15;
    }

    if (uPointerActive > 0.01) {
      float cursorGlow = exp(-ptrDist * 11.0) * 0.38 * uPointerActive;
      col += vec3(1.0, 0.76, 0.38) * cursorGlow;
    }

    // Gentle tone compression so highlights stay creamy ivory rather than harsh clipping
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

    float twinkle = 0.75 + 0.25 * sin(uTime * 4.5 + aPhase * 6.2831);
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
    const gargantuaUniforms = {
      uTime: { value: 1.4 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPointerActive: { value: 0.0 },
      uSpinSpeed: { value: configRef.current.spinSpeed },
      uLensingIntensity: { value: configRef.current.lensingIntensity },
      uTurbulence: { value: configRef.current.particleTurbulence },
      uTiltRad: { value: (21.5 * Math.PI) / 180 },
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

    const backdropGeo = new THREE.PlaneGeometry(32, 18);
    const backdropMesh = new THREE.Mesh(backdropGeo, backdropMat);
    backdropMesh.position.set(0, 0, -2.0);
    backdropMesh.renderOrder = 0;
    scene.add(backdropMesh);

    // =========================================================================
    // B. COMPOSITE 3D FOREGROUND MOLTEN EXOPLANET & DEBRIS CLUSTER (THREE.Group)
    // =========================================================================
    const exoplanetGroup = new THREE.Group();
    exoplanetGroup.position.set(5.4, -4.1, -0.6);
    scene.add(exoplanetGroup);

    const crustGeo = new THREE.SphereGeometry(2.4, 32, 32);
    const crustMat = new THREE.MeshStandardMaterial({
      color: 0x1c0a05,
      emissive: 0x4a1606,
      emissiveIntensity: 0.45,
      roughness: 0.85,
      metalness: 0.15,
    });
    const crustMesh = new THREE.Mesh(crustGeo, crustMat);
    exoplanetGroup.add(crustMesh);

    const magmaRimGeo = new THREE.TorusGeometry(2.42, 0.03, 16, 64);
    const magmaRimMat = new THREE.MeshStandardMaterial({
      color: 0xff5a1f,
      emissive: 0xff4500,
      emissiveIntensity: 1.2,
      roughness: 0.4,
      metalness: 0.5,
      transparent: true,
      opacity: 0.35,
    });
    const magmaRimMesh = new THREE.Mesh(magmaRimGeo, magmaRimMat);
    magmaRimMesh.rotation.x = 0.6;
    magmaRimMesh.rotation.y = -0.5;
    exoplanetGroup.add(magmaRimMesh);

    const satelliteShardGeo = new THREE.DodecahedronGeometry(0.12, 1);
    const satelliteShardMat = new THREE.MeshStandardMaterial({
      color: 0x261109,
      roughness: 0.6,
      metalness: 0.45,
    });
    const satelliteShard = new THREE.Mesh(satelliteShardGeo, satelliteShardMat);
    satelliteShard.position.set(-2.6, 1.5, 0.4);
    exoplanetGroup.add(satelliteShard);

    // =========================================================================
    // C. 3D ROCKY ASTEROID & TIDAL DEBRIS SHARDS (THREE.InstancedMesh, 85 instances)
    // Fine meteoroid fragments silhouetted against the lower-right lensing arch
    // =========================================================================
    const shardCount = 85;
    const shardGeo = new THREE.DodecahedronGeometry(0.026, 0);
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

      const s = 0.35 + Math.pow(r3, 1.6) * 1.15;
      const scaleVec = new THREE.Vector3(s * (0.7 + r1 * 0.6), s * (0.5 + r2 * 0.5), s);

      shards.push({
        baseX: (r1 - 0.5) * 1.1,
        baseY: (r2 - 0.5) * 0.9,
        baseZ: 0.4 + r3 * 1.2,
        orbitAngle,
        orbitRadius,
        orbitSpeed: (0.16 + r1 * 0.32) * (isTidalSpray ? 0.7 : 1.0),
        rotSpeedX: (r2 - 0.5) * 2.5,
        rotSpeedY: (r3 - 0.5) * 2.5,
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

      // 60% in the lower-right tidal ember spray, 40% in the diagonal accretion stream
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
        angularSpeed: 0.5,
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

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // =========================================================================
    // E. POINTER INTERACTION & SHOCKWAVE BURST HANDLERS
    // =========================================================================
    const pointerState = {
      normX: 0.5,
      normY: 0.5,
      worldX: 0,
      worldY: 0,
      worldZ: 0,
      active: false,
      targetActive: 0,
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
        pointerState.worldX = _vec3A.x;
        pointerState.worldY = _vec3A.y;
        pointerState.worldZ = _vec3A.z;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      updatePointerFromClient(e.clientX, e.clientY);
    };

    const onPointerLeave = () => {
      pointerState.active = false;
      pointerState.targetActive = 0.0;
    };

    const onPointerDown = (e: PointerEvent) => {
      updatePointerFromClient(e.clientX, e.clientY);
      shockwaveRef.current = 0.005;

      for (let i = 0; i < particleCount; i++) {
        const p = particleStates[i];
        const dx = p.x - pointerState.worldX;
        const dy = p.y - pointerState.worldY;
        const dist = Math.sqrt(dx * dx + dy * dy + 0.25);
        if (dist < 4.5) {
          const strength = (1.0 - dist / 4.5) * 2.2;
          p.vx += (dx / dist) * strength - (dy / dist) * strength * 0.6;
          p.vy += (dy / dist) * strength + (dx / dist) * strength * 0.6;
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
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      gargantuaUniforms.uResolution.value.set(w, h);
    };
    window.addEventListener('resize', onResize);

    // =========================================================================
    // F. ANIMATION LOOP WITH SOFTWARE-WEBGL `afterDraw` PACING
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
        shockwaveRef.current += dt * 0.85;
        if (shockwaveRef.current >= 1.0) {
          shockwaveRef.current = 0;
        }
      }

      gargantuaUniforms.uTime.value = elapsedTotal;
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
      const targetTiltRad = (-cfg.diskTiltDeg * Math.PI) / 180;
      gargantuaUniforms.uTiltRad.value = THREE.MathUtils.damp(
        gargantuaUniforms.uTiltRad.value,
        targetTiltRad,
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

      // Subtle camera parallax
      const targetCamX = pointerState.active ? (pointerState.normX - 0.5) * 0.35 : 0;
      const targetCamY = pointerState.active ? (pointerState.normY - 0.5) * 0.24 : 0;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 4, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 4, dt);
      camera.lookAt(0, 0, 0);

      // Rotate composite foreground exoplanet group
      exoplanetGroup.rotation.z = elapsedTotal * 0.04 * cfg.spinSpeed;
      satelliteShard.rotation.x += dt * 0.8;
      satelliteShard.rotation.y += dt * 0.6;

      // Update 3D Rocky Debris Shards (InstancedMesh)
      const tiltR = (cfg.diskTiltDeg * Math.PI) / 180;
      const cosT = Math.cos(tiltR);
      const sinT = Math.sin(tiltR);

      for (let i = 0; i < shardCount; i++) {
        const s = shards[i];
        s.orbitAngle += dt * s.orbitSpeed * cfg.spinSpeed;

        if (s.isTidalSpray) {
          // Concentrated in the lower-right tidal disruption zone between the ring and planet
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

      // Update Interactive 3D Particle System
      particlesMat.uniforms.uTime.value = elapsedTotal;
      const ptrInfo = {
        x: pointerState.worldX,
        y: pointerState.worldY,
        z: pointerState.worldZ,
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
          // Lower-right tidal ember spray between lensing arch and bottom-right molten planet
          const sprayBias = i / (particleCount * 0.6);
          const spreadX = Math.sin(i * 17.3) * (0.35 + sprayBias * 0.95);
          const spreadY = Math.cos(i * 23.1) * (0.35 + sprayBias * 0.75);
          const sx = nextP.x * 0.25 + 0.55 + sprayBias * 2.85 + spreadX;
          const sy = nextP.y * 0.25 - 0.85 - sprayBias * 1.75 + spreadY;
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

      renderer.render(scene, camera);

      if (elapsedTotal - lastTelemetryTime > 0.35) {
        lastTelemetryTime = elapsedTotal;
        const fluxVal = (4.82 * cfg.spinSpeed * cfg.lensingIntensity * resMult).toFixed(2);
        telemetryCbRef.current?.({
          activeParticles: particleCount + shardCount,
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
      window.removeEventListener('resize', onResize);
      domElem.removeEventListener('pointermove', onPointerMove);
      domElem.removeEventListener('pointerleave', onPointerLeave);
      domElem.removeEventListener('pointerdown', onPointerDown);

      backdropGeo.dispose();
      backdropMat.dispose();
      crustGeo.dispose();
      crustMat.dispose();
      magmaRimGeo.dispose();
      magmaRimMat.dispose();
      satelliteShardGeo.dispose();
      satelliteShardMat.dispose();
      shardGeo.dispose();
      shardMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
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
