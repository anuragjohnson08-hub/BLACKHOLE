# Mertana — Scroll-Driven Relativistic Scrollytelling

Transform the Mertana homepage into a multi-section scrollytelling journey where scrolling propels the viewer toward the black hole's event horizon, dynamically tilts the accretion plane, accelerates cosmic particles into warp streams, and reveals four editorial chapters (`01. Experience`, `02. Consistency`, `03. Quality`, `04. Dedication`).

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design and interaction choices have been confirmed from your answers and govern this implementation:

- **3D Black Hole Scroll Choreography**: Scrolling smoothly zooms the Three.js camera and shader scale closer to the Event Horizon while progressively tilting and banking the equatorial accretion disk across chapters.
- **Full Multi-Section Story**: Beneath the initial Mertana poster hero, four full-viewport scrollytelling chapters (`01. Experience`, `02. Consistency`, `03. Quality`, `04. Dedication`) plus a concluding `Zero-Point Convergence` finale unfold sequentially.
- **Scroll-Driven Visual Effects**:
  - **Hero Title Parallax Split & Fade**: The monumental `Mertana` wordmark splits horizontally (`M e r` drifting left/up, `t a n a` drifting right/up) with optical opacity fade as the user leaves the hero viewport.
  - **Warp-Speed Particle Stream**: Scroll velocity stretches and accelerates the 3D ember and trail particles toward the viewer in a relativistic warp effect that settles back into gentle orbital motion when scrolling pauses.
  - **Section-Boundary Shockwaves**: Crossing into each new chapter (`Experience`, `Consistency`, `Quality`, `Dedication`) automatically fires a golden relativistic gravitational shockwave ring from the event horizon.

---

## 1. Overview & Core Concept

- **What It Does**: Combines the iconic `Mertana` poster hero at the top of the page (`scrollProgress = 0`) with a continuous 5-stage vertical scroll narrative (`500vh` total scroll runway) over a fixed, interactive Three.js WebGL canvas.
- **Target Audience / Persona**: Visitors exploring Mertana's brand manifesto who expect a high-craft, cinema-grade WebGL storytelling experience with tactile cursor and scroll responsiveness.
- **Key Value**: Preserves the exact initial reference poster composition at the top of the page while rewarding scrolling with deep 3D spatial progression, interactive chapter navigation, and physical particle feedback.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Stage 0 — The Singularity Hero (`0% – 15%` Scroll)**: Opens on the exact Mertana poster layout (`Mertana` full-width wordmark, `IN CREDIABLE ENERGY`, interactive pillar links, `©2026`, `RIDE, BOND, GROW`). Clicking any of the four pillar links (`Experience +`, `Consistency +`, `Quality +`, `Dedication +`) smoothly scrolls directly to that chapter.
  2. **Hero Departure (`5% – 22%` Scroll)**: As the user scrolls down, the monumental `Mertana` letters parallax apart and fade smoothly using compositor-only `transform` and `opacity`, clearing the upper viewport so the black hole takes center stage.
  3. **Stages 1–4 — The Four Pillar Chapters (`20% – 88%` Scroll)**:
     - **01. Experience — Relativistic Depth**: The black hole zooms in (`1.22×`), tilting to `-14°`. Editorial card on the left presents horizon stability metrics and spatial narrative.
     - **02. Consistency — Invariant Orbital Momentum**: The black hole zooms deeper (`1.45×`), tilting to `-6°` with heightened golden ring striations. Editorial block on the right highlights angular momentum conservation (`0.998 c`).
     - **03. Quality — Photon-Ring Clarity**: Close-up inspection of the dual inner photon rings (`1.70×` zoom, `+4°` tilt) with spectral fidelity metrics (`4.21 R_s`).
     - **04. Dedication — Singularity Focus**: Deepest approach to the Event Horizon (`1.95×` zoom, `+12°` tilt) culminating in the `"It starts and ends with a zero"` manifesto and a `"Return to Singularity Origin"` action that smoothly scrolls back to top.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-contrast cosmic editorial brutalism paired with relativistic astrophysics visualization.
  - *Color Palette & Mood*: Deep obsidian void (`#050507`), warm bone ivory (`#EBE6DC`), incandescent photon gold (`#FFB84D`), Doppler amber (`#F58220`), and burnt crimson-orange (`#D94E28`).
  - *Typography & Hierarchy*: `Archivo` (800 weight) for the monumental hero wordmark and chapter numerals (`01`–`04`); `Plus Jakarta Sans` for chapter prose; `JetBrains Mono` (`tabular-nums`) for relativistic telemetry and scroll depth coordinates.
  - *Component Styling & Layout*: Alternating asymmetric chapter alignments (left-aligned vs. right-aligned editorial containers, `max-w-lg`) so the central 3D black hole and photon rings remain unobstructed throughout the entire scroll journey.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Fixed WebGL Viewport with Scroll-Linked Uniforms & Kinematics**
  - *Chosen Approach*: Keep the Three.js `<canvas>` fixed (`fixed inset-0`) while a semantic `<main>` scroll container drives normalized `scrollProgress` (`0..1`) and `scrollVelocity` into the render loop via mutable refs.
  - *Why*: Guarantees 60fps compositor-smooth scrolling with zero React re-render overhead per scroll tick, while keeping all chapter headings, metrics, and navigation links natively accessible in the DOM.
  - *Alternatives Considered*: Updating React state on every `scroll` event was rejected because high-frequency React re-renders contend with WebGL frame pacing.
- **Decision 2: Velocity-Coupled Warp Stream & Chapter Crossing Detector**
  - *Chosen Approach*: Compute smoothed `scrollVelocity` inside the physics module to stretch particle Z-velocities and radial outward warp during active scrolling, and trigger an automatic shockwave pulse whenever the active chapter index (`0..4`) changes.
  - *Why*: Creates a visceral sense of physical propulsion through space during scrolling while punctuating each chapter arrival with a luminous golden wave.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Scroll Container & Chapter DOM                      │
│  ┌───────────────────┐  ┌────────────────────────────────────────────┐  │
│  │ Stage 0: Hero     │  │ Stages 1–4: Editorial Chapters             │  │
│  │ • Mertana Split   │  │ • 01. Experience   • 03. Quality           │  │
│  │ • Pillar Nav ─────┼──┼─► Smooth ScrollTo  • 02. Consistency       │  │
│  │ • Manifesto       │  │                    • 04. Dedication        │  │
│  └─────────┬─────────┘  └──────────────────────┬─────────────────────┘  │
└────────────┼───────────────────────────────────┼────────────────────────┘
             │ Native Scroll Events (Passive)    │ Intersection / Threshold
             ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                Scroll Choreography & Physics Engine                     │
│  • computeScrollChoreography(scrollProgress, scrollVelocity)            │
│    ├─► Camera Zoom / Shadow Scale (1.0x ──► 1.95x)                      │
│    ├─► Disk Tilt Interpolation (-21.5° ──► +12.0°)                      │
│    ├─► Hero Title Split Offset & Opacity                                │
│    └─► Chapter Index Detection (0..4) ──► Auto Shockwave Trigger        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Mutable Ref Bridge (Zero GC)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             Fixed Three.js WebGL Canvas (BlackHoleCanvas)               │
│  • Isotropic NDC Gargantua Shader (Zoom, Tilt, Lensing, Shockwave)      │
│  • 1,500 Orbital & Ember Particles + Scroll Warp Velocity Boost         │
│  • 420 Interactive Cursor Swirl & Comet Trail Particles                 │
│  • Collapsible Bottom Physics & Telemetry Dock                          │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `ScrollState`: Tracks normalized `progress` (`0..1`), smoothed `velocity` (`-1..+1`), and `activeChapterIndex` (`0` = Hero, `1` = Experience, `2` = Consistency, `3` = Quality, `4` = Dedication).
  - `ScrollChoreographyOutput`: Pure deterministic output containing `zoomScale`, `tiltDeg`, `lensingBoost`, `warpFactor`, `heroSplitPx`, `heroOpacity`, and `chapterIndex`.
- **Interactive Component & State Mapping**:
  - **Hero Pillar Buttons (`Experience +`, `Consistency +`, `Quality +`, `Dedication +`)**: Clicking any button smoothly scrolls the viewport to that chapter's section anchor (`#chapter-experience`, etc.) and triggers a chapter resonance shockwave.
  - **Window Scroll Listener**: Updates `scrollRef` passively and updates `activeChapterIndex` only when crossing a chapter threshold (`0..4`), firing the shockwave ring and updating the chapter progress indicator.
  - **Collapsible Control Dock & Return-to-Top**: Remains accessible at the bottom center across all scroll depths, plus a clean `"Back to Origin"` button in the final chapter to glide back to `scrollProgress = 0`.
