# Mertana — Relativistic Core Torsion & Singularity Portal Transition Cutscene

As the viewer scrolls from the opening **Mertana** poster hero down toward the final **04 / Dedication** chapter, gravitational frame-dragging twists the central equatorial accretion beam into a tight **S-curve vortex pinch** under extreme pressure—and clicking any destination link triggers a **3D Event Horizon Warp Cutscene** while loading and redirecting to the new page.

## User Review & Confirmed Decisions

> [!IMPORTANT]
> The plan has been updated to include the **Singularity Portal Transition Cutscene** when navigating to a link or new page:

- **Smooth Scroll-Driven Torsion Progression**: The core accretion line twist builds smoothly from `0%` at `00 Origin` to `100%` maximum S-curve torsion at `04 / Dedication`.
- **Tight S-Curve Vortex Pinch & Pressure Effects**: Differential rotational frame-dragging bends the inner core line into a tight S-curve vortex pinch with a **white-hot core compression glow** and **subtle high-pressure camera micro-tremor** at the final chapter, while keeping the outer photon rings a `1:1` circle.
- **3D Transition Cutscene on Link Redirect (New)**:
  - Intercepts link clicks to play a **2.2-second 3D Singularity Crossing Cutscene** before completing the redirect (or transitioning into an internal destination page).
  - Includes a prominent **"Enter Singularity Portal →"** action button on the final **04 / Dedication** chapter (plus a customizable destination URL field in the controls and a reusable `triggerPortalRedirect(url, label)` helper so you can attach the cutscene to any link).

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Scroll Pressure Climax**: Progressively twists the black hole's equatorial core beam into a high-pressure S-curve vortex pinch as the user reaches the final page.
  2. **Cinematic Link Transition Cutscene**: When a user clicks a link to visit a new page, the 3D camera dives straight through the twisted S-curve core into a relativistic warp tunnel with loading telemetry (`0% – 100%`), culminating in a white-hot singularity flash right as the new page loads.
- **Target Audience / Persona**: Visitors and creators who want seamless, movie-grade WebGL continuity between the 3D landing experience and downstream pages or external links.
- **Key Value**: Eliminates abrupt browser page jumps by turning every link navigation into an interactive 3D wormhole transit sequence.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Scroll Descent (`0% -> 100%` Scroll)**: The central accretion line gradually twists into a tight S-curve vortex pinch with a white-hot core flare and subtle high-pressure tremor at **04 / Dedication**.
  2. **Triggering a Link Redirect Cutscene**:
     - The user clicks **"Enter Singularity Portal →"** on the final chapter (or any portal link in the header/chapters).
     - **Stage 1 — Core Overdrive (`0.0s – 0.7s`)**: UI overlays smoothly retract; the S-curve core twist tightens rapidly (`180%+` torsion) and emits an inward gravitational implosion wave.
     - **Stage 2 — Relativistic Warp Plunge (`0.7s – 1.7s`)**: The 3D camera accelerates rapidly into the event horizon (`1.96x -> 6.8x` zoom), stretching 3D orbital debris and stars into golden-white hyper-streaks while a minimal HUD displays `SINGULARITY TRANSIT // LOADING DESTINATION [0% → 100%]`.
     - **Stage 3 — White-Hot Horizon Flash & Redirect (`1.7s – 2.2s`)**: The white-hot pinch core expands into a full-screen ivory-gold flash and seamlessly redirects to the target URL (or opens the built-in Destination Portal view with a one-click return cutscene).
- **Visual Identity & Theme**:
  - *Color Palette*:
    - `--background`: `#030201` (Abyssal Obsidian Void)
    - `--primary`: `#FFB84D` (Relativistic Photon Gold)
    - `--accent`: `#F58220` (Accretion Plasma Orange)
    - `--core-pinch`: `#FFFDF9` (White-Hot Singularity Flash)
  - *Typography*: `Archivo` display headers, `Plus Jakarta Sans` body prose, and `JetBrains Mono` tabular cutscene telemetry.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Differential Frame-Dragging on Accretion Coordinates Only**
  - *Chosen Approach*: Apply the radially decaying S-curve rotational warp (`thetaTwist(r)`) and transverse pinch exclusively to the inner accretion disk coordinates (`r < 0.42`), keeping the outer photon ring coordinates unwarped.
  - *Why*: Matches the exact S-curve core twist in your reference image while keeping the black hole's outer silhouette an exact `1:1` circle.
- **Decision 2: Universal Portal Link Interceptor & Custom URL Support**
  - *Chosen Approach*: Provide a `triggerPortalRedirect(targetUrl, destinationTitle)` handler wired to the chapter CTA buttons and a configurable destination URL setting in the Singularity Controls drawer, plus an interactive in-app Destination Horizon view when no external URL is specified.
  - *Why*: Lets you immediately test and experience the full transition cutscene right inside the preview AND easily point any link to an external URL or subpage.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Cutscene State Machine Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│             Scroll Listener  &  Portal Link Click Interceptor           │
│   • Scroll Progress (0..1) ──► S-Curve Core Twist & Pressure Tremor     │
│   • Link Click (targetUrl) ──► Starts 2.2s Warp Transition Cutscene     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Choreography & Cutscene Kinematics Engine                 │
│  • coreTwist:        0.00 ──► 1.00 (Scroll) ──► 1.85 (Cutscene Surge)   │
│  • zoomScale:        1.00 ──► 1.96 (Scroll) ──► 6.80 (Horizon Plunge)   │
│  • warpFactor:       0.00 ──► 2.60 (Scroll) ──► 4.80 (Hyper-Streaks)    │
│  • portalFlash:      0.00 ────────────────────► 1.00 (White-Out Peak)   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            Three.js WebGL Shader & Cutscene HUD Overlay                 │
│  1. S-Curve Vortex Pinch Shader (uCoreTwist, uCorePressure, uPortal)    │
│  2. Cutscene Telemetry Overlay (Destination Label + 0–100% Progress)    │
│  3. Completion Handler ──► window.location.assign(url) or Portal View   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Interactive State & Physics Verification
- **Pure Unit-Tested Functions**: Both `computeScrollChoreography` (for the S-curve twist, pinch glow, and tremor) and `computePortalCutsceneState(progress)` (for the 3-stage warp transition cutscene) will be implemented as pure deterministic functions with unit tests.
- **Zero-Allocation Render Loop**: All shader uniforms (`uCoreTwist`, `uCorePressure`, `uPortalFlash`) update in-place inside the `requestAnimationFrame` loop for locked 60fps performance during both scrolling and link transitions.
