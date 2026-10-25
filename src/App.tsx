/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BlackHoleCanvas } from './components/BlackHoleCanvas';
import { ControlDock } from './components/ControlDock';
import {
  computePortalCutsceneState,
  computeScrollChoreography,
  MERTANA_PILLARS,
  SIMULATION_PRESETS,
  type PillarItem,
  type PortalCutsceneState,
  type PresetId,
  type SimulationConfig,
} from './utils/blackholePhysics';

export default function App() {
  const [config, setConfig] = useState<SimulationConfig>({
    ...SIMULATION_PRESETS.gargantua,
    interactionMode: 'vortex',
  });

  const [selectedPillarId, setSelectedPillarId] = useState<PillarItem['id'] | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
  const [heroMotion, setHeroMotion] = useState({
    splitPx: 0,
    liftPx: 0,
    opacity: 1,
  });
  const [isDockExpanded, setIsDockExpanded] = useState<boolean>(false);
  const [shockwaveTrigger, setShockwaveTrigger] = useState<number>(0);
  const [pulseCount, setPulseCount] = useState<number>(0);
  const [telemetry, setTelemetry] = useState({
    activeParticles: 2005,
    horizonFlux: '4.16 × 10⁴⁴ erg/s',
    cursorForce: 'EQUILIBRIUM',
  });

  // Portal Redirect Cutscene State & Configurable Target URL
  const [customRedirectUrl, setCustomRedirectUrl] = useState<string>('');
  const [showUrlConfig, setShowUrlConfig] = useState<boolean>(false);
  const [isDestinationOpen, setIsDestinationOpen] = useState<boolean>(false);
  const [destinationMeta, setDestinationMeta] = useState<{
    title: string;
    url: string;
  }>({
    title: 'POINT ZERO // SINGULARITY HORIZON',
    url: '#point-zero-horizon',
  });
  const [cutsceneUi, setCutsceneUi] = useState<{
    active: boolean;
    targetTitle: string;
    targetUrl: string;
    state: PortalCutsceneState;
  }>({
    active: false,
    targetTitle: 'POINT ZERO // SINGULARITY HORIZON',
    targetUrl: '',
    state: computePortalCutsceneState(0),
  });

  // Mutable refs shared with Three.js loop so scroll & cutscene progress never cause React re-render stalls
  const scrollDataRef = useRef<{ progress: number; velocity: number }>({
    progress: 0,
    velocity: 0,
  });
  const portalProgressRef = useRef<number>(0);
  const cutsceneRafRef = useRef<number>(0);
  const lastChapterRef = useRef<number>(0);
  const lastScrollYRef = useRef<number>(0);

  const activePillar =
    MERTANA_PILLARS.find((p) => p.id === selectedPillarId) ||
    (activeChapterIndex >= 1 && activeChapterIndex <= 4
      ? MERTANA_PILLARS[activeChapterIndex - 1]
      : null);

  const activePillarMultiplier = activePillar ? activePillar.resonanceMultiplier : 1.0;

  const handleUpdateConfig = useCallback((next: Partial<SimulationConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...next,
    }));
  }, []);

  const handleSelectPreset = useCallback((presetId: PresetId) => {
    const preset = SIMULATION_PRESETS[presetId];
    setConfig((prev) => ({
      ...prev,
      ...preset,
    }));
  }, []);

  const handleTriggerPulse = useCallback(() => {
    setShockwaveTrigger((prev) => prev + 1);
    setPulseCount((prev) => prev + 1);
  }, []);

  const scrollToSection = useCallback((elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handlePillarClick = useCallback(
    (pillar: PillarItem) => {
      setSelectedPillarId((prev) => (prev === pillar.id ? null : pillar.id));
      setShockwaveTrigger((prev) => prev + 1);
      setPulseCount((prev) => prev + 1);
      scrollToSection(`chapter-${pillar.id}`);
    },
    [scrollToSection]
  );

  // Trigger the 2.2-second 3D Singularity Portal Transition Cutscene before redirecting
  const triggerPortalRedirect = useCallback(
    (rawUrl?: string, label: string = 'POINT ZERO // SINGULARITY HORIZON') => {
      cancelAnimationFrame(cutsceneRafRef.current);
      const cleanUrl = (rawUrl ?? customRedirectUrl).trim();
      const displayTitle = cleanUrl ? `REDIRECT // ${cleanUrl}` : label;

      // Emit initial gravitational shockwave as cutscene begins
      setShockwaveTrigger((prev) => prev + 1);
      setPulseCount((prev) => prev + 1);

      const durationMs = 2200;
      const startTime = performance.now();

      const stepCutscene = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, Math.max(0, elapsed / durationMs));
        portalProgressRef.current = progress;
        const cState = computePortalCutsceneState(progress);

        setCutsceneUi({
          active: true,
          targetTitle: displayTitle,
          targetUrl: cleanUrl,
          state: cState,
        });

        if (progress < 1) {
          cutsceneRafRef.current = requestAnimationFrame(stepCutscene);
        } else {
          // Cutscene reached 100% white-hot singularity climax
          if (
            cleanUrl &&
            !cleanUrl.startsWith('#') &&
            (cleanUrl.startsWith('http://') ||
              cleanUrl.startsWith('https://') ||
              cleanUrl.startsWith('/'))
          ) {
            window.location.assign(cleanUrl);
          } else {
            setDestinationMeta({
              title: label,
              url: cleanUrl || '#point-zero-horizon',
            });
            setIsDestinationOpen(true);

            // Smoothly cool down the white-out flash over 550ms to reveal the new destination view
            const coolStart = performance.now();
            const stepCoolDown = (coolNow: number) => {
              const t = Math.min(1, (coolNow - coolStart) / 550);
              const reverseP = 1 - t;
              portalProgressRef.current = reverseP * 0.35;
              setCutsceneUi((prev) => ({
                ...prev,
                active: t < 1,
                state: {
                  ...computePortalCutsceneState(0),
                  flashIntensity: (1 - t) * 0.95,
                  uiFadeOut: t,
                },
              }));
              if (t < 1) {
                cutsceneRafRef.current = requestAnimationFrame(stepCoolDown);
              } else {
                portalProgressRef.current = 0;
              }
            };
            cutsceneRafRef.current = requestAnimationFrame(stepCoolDown);
          }
        }
      };

      cutsceneRafRef.current = requestAnimationFrame(stepCutscene);
    },
    [customRedirectUrl]
  );

  const handleReturnFromDestination = useCallback(() => {
    cancelAnimationFrame(cutsceneRafRef.current);
    setShockwaveTrigger((prev) => prev + 1);
    setIsDestinationOpen(false);
    portalProgressRef.current = 0;
    setCutsceneUi({
      active: false,
      targetTitle: '',
      targetUrl: '',
      state: computePortalCutsceneState(0),
    });
  }, []);

  // Intercept any anchor link with data-portal-link="true" so custom links automatically play the cutscene
  useEffect(() => {
    const onDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a[data-portal-link="true"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      const title = anchor.getAttribute('data-portal-title') || anchor.textContent || href;
      triggerPortalRedirect(href, title);
    };
    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, [triggerPortalRedirect]);

  useEffect(() => {
    return () => cancelAnimationFrame(cutsceneRafRef.current);
  }, []);

  // Passive scroll listener driving 3D camera zoom, disk tilt, core S-curve twist, hero parallax split, and section shockwaves
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const progress = Math.max(0, Math.min(1, scrollY / maxScroll));
      const deltaY = scrollY - lastScrollYRef.current;
      lastScrollYRef.current = scrollY;

      // Normalized scroll velocity
      const velocity = Math.max(-1.5, Math.min(1.5, deltaY / 65));
      scrollDataRef.current.progress = progress;
      scrollDataRef.current.velocity = velocity;

      const choreo = computeScrollChoreography(progress, velocity);

      // Update Hero parallax split & fade while in the upper 30% of the page
      if (progress <= 0.32 || heroMotion.opacity > 0) {
        setHeroMotion({
          splitPx: choreo.heroSplitPx,
          liftPx: choreo.heroLiftPx,
          opacity: choreo.heroOpacity,
        });
      }

      // Trigger an automatic gravitational shockwave whenever crossing into a new chapter
      if (choreo.chapterIndex !== lastChapterRef.current) {
        lastChapterRef.current = choreo.chapterIndex;
        setActiveChapterIndex(choreo.chapterIndex);
        if (choreo.chapterIndex > 0) {
          setShockwaveTrigger((prev) => prev + 1);
          setPulseCount((prev) => prev + 1);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [heroMotion.opacity]);

  // Keyboard shortcuts: 'H' to toggle physics dock, 'Space' to trigger zero-point pulse
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsDockExpanded((prev) => !prev);
      } else if (e.key === ' ') {
        e.preventDefault();
        handleTriggerPulse();
      } else if (e.key === 'Escape') {
        setSelectedPillarId(null);
        setIsDockExpanded(false);
        if (isDestinationOpen) {
          handleReturnFromDestination();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTriggerPulse, isDestinationOpen, handleReturnFromDestination]);

  return (
    <div
      data-state={isDestinationOpen ? 'destination-horizon' : `chapter-${activeChapterIndex}`}
      className="relative w-full min-h-[500vh] bg-[#050507] text-[#EBE6DC] select-none"
    >
      {/* 1. Fixed Interactive 3D Relativistic Black Hole & Particle Field */}
      <BlackHoleCanvas
        config={config}
        shockwaveTrigger={shockwaveTrigger}
        activePillarMultiplier={activePillarMultiplier}
        scrollDataRef={scrollDataRef}
        portalProgressRef={portalProgressRef}
        onTelemetryUpdate={setTelemetry}
        onCanvasBurst={() => setPulseCount((c) => c + 1)}
      />

      {/* 2. Discreet Right-Edge Scroll Chapter Navigator */}
      {!isDestinationOpen && (
        <nav
          aria-label="Scroll chapter progress"
          style={{ opacity: cutsceneUi.active ? cutsceneUi.state.uiFadeOut : 1 }}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-end gap-2.5 pointer-events-auto transition-opacity duration-150"
        >
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-current={activeChapterIndex === 0 ? 'step' : undefined}
            className={`group flex items-center gap-2 text-[11px] font-mono-tabular transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeChapterIndex === 0
                ? 'text-[#FFB84D] font-semibold'
                : 'text-[#EBE6DC]/45 hover:text-[#EBE6DC]/90'
            }`}
          >
            <span>00 Origin</span>
            <span
              className={`h-[2px] transition-transform duration-200 ${
                activeChapterIndex === 0
                  ? 'w-5 bg-[#FFB84D] scale-x-100'
                  : 'w-2.5 bg-white/30 group-hover:bg-white/70'
              }`}
            />
          </button>

          {MERTANA_PILLARS.map((pillar, idx) => {
            const chapterNum = idx + 1;
            const isCurrent = activeChapterIndex === chapterNum;
            return (
              <button
                key={pillar.id}
                type="button"
                onClick={() => scrollToSection(`chapter-${pillar.id}`)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`group flex items-center gap-2 text-[11px] font-mono-tabular transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isCurrent
                    ? 'text-[#FFB84D] font-semibold'
                    : 'text-[#EBE6DC]/45 hover:text-[#EBE6DC]/90'
                }`}
              >
                <span>
                  {pillar.chapterNumber} {pillar.label}
                </span>
                <span
                  className={`h-[2px] transition-transform duration-200 ${
                    isCurrent
                      ? 'w-5 bg-[#FFB84D] scale-x-100'
                      : 'w-2.5 bg-white/30 group-hover:bg-white/70'
                  }`}
                />
              </button>
            );
          })}
        </nav>
      )}

      {/* 3. Scrollytelling Narrative Container (5 Full-Viewport Stages) */}
      <main
        style={{
          opacity: isDestinationOpen
            ? 0
            : cutsceneUi.active
            ? cutsceneUi.state.uiFadeOut
            : 1,
          pointerEvents: isDestinationOpen || cutsceneUi.active ? 'none' : 'none',
        }}
        className="relative z-10 w-full transition-opacity duration-150"
      >
        {/* ===================================================================
            STAGE 0: THE SINGULARITY POSTER HERO (0vh - 100vh)
           =================================================================== */}
        <section
          id="hero-origin"
          aria-label="Mertana Singularity Hero"
          className="relative w-full h-screen flex flex-col justify-between px-[2.4vw] pt-[1.2vh] pb-[4.2vh]"
        >
          <header className="w-full">
            {/* Top-right micro kicker */}
            <div
              style={{
                opacity: heroMotion.opacity,
                transform: `translate3d(0, ${heroMotion.liftPx * 0.5}px, 0)`,
              }}
              className="w-full flex justify-end pr-[0.4vw] mb-[-0.8vw] transition-opacity duration-75"
            >
              <span className="text-[10px] sm:text-[11px] md:text-[12px] font-semibold tracking-[0.03em] uppercase text-[#EBE6DC]/95 whitespace-nowrap">
                IN CREDIABLE ENERGY
              </span>
            </div>

            {/* Giant Full-Width "Mertana" Wordmark with Parallax Split & Relativistic Lensing Mask */}
            <h1
              aria-label="Mertana"
              style={{ opacity: heroMotion.opacity }}
              className="w-full m-0 p-0 leading-none"
            >
              <span className="sr-only">Mertana</span>
              <svg
                viewBox="0 0 1400 285"
                className="w-full h-auto block overflow-visible"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient
                    id="lensingEclipseMask"
                    cx="48%"
                    cy="108%"
                    r="26%"
                    fx="46%"
                    fy="104%"
                  >
                    <stop offset="0%" stopColor="#141414" />
                    <stop offset="42%" stopColor="#353535" />
                    <stop offset="68%" stopColor="#8c8c8c" />
                    <stop offset="88%" stopColor="#e5e5e5" />
                    <stop offset="100%" stopColor="#ffffff" />
                  </radialGradient>

                  <mask id="mertanaHorizonMask">
                    <rect x="-100" y="-100" width="1600" height="500" fill="white" />
                    <ellipse
                      cx="705"
                      cy="310"
                      rx="310"
                      ry="150"
                      fill="url(#lensingEclipseMask)"
                    />
                  </mask>

                  {/* Left half clip ("Mer") and right half clip ("tana") for scroll parallax split */}
                  <clipPath id="heroLeftSplit">
                    <rect x="-100" y="-100" width="765" height="500" />
                  </clipPath>
                  <clipPath id="heroRightSplit">
                    <rect x="665" y="-100" width="850" height="500" />
                  </clipPath>
                </defs>

                <g mask="url(#mertanaHorizonMask)">
                  {/* Left Parallax Group (Mer) */}
                  <g
                    clipPath="url(#heroLeftSplit)"
                    style={{
                      transform: `translate3d(${-heroMotion.splitPx}px, ${heroMotion.liftPx}px, 0)`,
                    }}
                  >
                    <text
                      x="-8"
                      y="256"
                      fill="#EBE6DC"
                      fontFamily="Archivo, -apple-system, BlinkMacSystemFont, sans-serif"
                      fontWeight="800"
                      fontSize="338"
                      letterSpacing="-11"
                      textLength="1412"
                      lengthAdjust="spacingAndGlyphs"
                    >
                      Mertana
                    </text>
                  </g>

                  {/* Right Parallax Group (tana) */}
                  <g
                    clipPath="url(#heroRightSplit)"
                    style={{
                      transform: `translate3d(${heroMotion.splitPx}px, ${heroMotion.liftPx}px, 0)`,
                    }}
                  >
                    <text
                      x="-8"
                      y="256"
                      fill="#EBE6DC"
                      fontFamily="Archivo, -apple-system, BlinkMacSystemFont, sans-serif"
                      fontWeight="800"
                      fontSize="338"
                      letterSpacing="-11"
                      textLength="1412"
                      lengthAdjust="spacingAndGlyphs"
                    >
                      Mertana
                    </text>
                  </g>
                </g>
              </svg>
            </h1>

            {/* Sub-header row: Experience + Consistency + Quality + Dedication +  |  ©2026 */}
            <div className="w-full flex items-center justify-between mt-[0.6vh] px-[0.2vw]">
              <nav
                aria-label="Mertana core pillars"
                className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-1 pointer-events-auto"
              >
                {MERTANA_PILLARS.map((pillar, idx) => {
                  const isSelected =
                    selectedPillarId === pillar.id || activeChapterIndex === idx + 1;
                  return (
                    <button
                      key={pillar.id}
                      type="button"
                      onClick={() => handlePillarClick(pillar)}
                      aria-pressed={isSelected}
                      className={`group inline-flex items-center gap-2 text-[11px] sm:text-[13px] md:text-[14px] font-medium tracking-[0.01em] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-0.5 ${
                        isSelected
                          ? 'text-[#FFB84D]'
                          : 'text-[#EBE6DC]/90 hover:text-white'
                      }`}
                    >
                      <span className="group-hover:underline underline-offset-4">
                        {pillar.label}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`text-[11px] transition-transform duration-150 ${
                          isSelected
                            ? 'text-[#FFB84D] rotate-45 font-bold'
                            : 'text-[#EBE6DC]/55 group-hover:text-[#FFB84D]'
                        }`}
                      >
                        +
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="text-[11px] sm:text-[13px] md:text-[14px] font-medium text-[#EBE6DC]/90 font-mono-tabular whitespace-nowrap shrink-0 pr-[0.3vw]">
                ©2026
              </div>
            </div>

            {/* Interactive Pillar Quick-Inspector Card (when clicked in Hero) */}
            {selectedPillarId && activePillar && (
              <section
                aria-label={`${activePillar.label} pillar details`}
                className="mt-3 max-w-[340px] bg-[#0B0B10]/94 border border-white/15 rounded-xl p-4 text-[#EBE6DC] shadow-2xl pointer-events-auto"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#FFB84D]">
                    {activePillar.tagline}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPillarId(null)}
                    aria-label={`Close ${activePillar.label} details`}
                    className="text-xs text-[#EBE6DC]/60 hover:text-white px-1.5 py-0.5 rounded cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Close ×
                  </button>
                </div>
                <h2 className="text-base font-semibold text-white mb-1">
                  {activePillar.label}
                </h2>
                <p className="text-xs text-[#EBE6DC]/80 leading-relaxed mb-3">
                  {activePillar.description}
                </p>
                <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-[11px] font-mono-tabular">
                  <div>
                    <span className="text-[#EBE6DC]/50 block text-[10px]">
                      {activePillar.metricLabel}
                    </span>
                    <span className="text-[#FFB84D] font-semibold">
                      {activePillar.metricValue}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerPulse}
                    className="px-3 py-1 bg-white/10 hover:bg-[#FFB84D] hover:text-[#090807] text-[#EBE6DC] rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Emit Resonance Wave
                  </button>
                </div>
              </section>
            )}
          </header>

          {/* Bottom-Left Signature Manifesto (Matches Reference Image Bottom-Left) */}
          <div className="w-full flex items-end justify-between">
            <div className="flex flex-col items-start pointer-events-auto">
              <p className="text-[11px] sm:text-[12px] md:text-[13px] font-bold tracking-[0.04em] uppercase text-[#D94E28] m-0 leading-tight">
                RIDE, BOND, GROW
              </p>
              <p className="text-[11px] sm:text-[12px] md:text-[13px] font-semibold tracking-[0.03em] uppercase text-[#EBE6DC]/95 m-0 mt-1 leading-tight">
                IT STARTS ND ENDS WITH A ZERO
              </p>
            </div>

            <button
              type="button"
              onClick={() => scrollToSection('chapter-experience')}
              className="hidden sm:inline-flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#EBE6DC]/75 hover:text-[#FFB84D] transition-colors pointer-events-auto cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Scroll Into Event Horizon</span>
              <span aria-hidden="true">↓</span>
            </button>
          </div>
        </section>

        {/* ===================================================================
            STAGES 1–4: FULL-VIEWPORT EDITORIAL CHAPTERS
            (Experience, Consistency, Quality, Dedication)
           =================================================================== */}
        {MERTANA_PILLARS.map((pillar, index) => {
          const isLeft = pillar.alignment === 'left';
          const nextPillar = MERTANA_PILLARS[index + 1];
          const isFinalChapter = pillar.id === 'dedication';

          return (
            <section
              key={pillar.id}
              id={`chapter-${pillar.id}`}
              aria-labelledby={`heading-${pillar.id}`}
              className={`relative w-full min-h-screen flex items-center py-24 ${
                isLeft
                  ? 'justify-start pl-[4vw] pr-[4vw]'
                  : 'justify-end pl-[4vw] pr-[4vw] md:pr-44'
              }`}
            >
              <article className="w-full max-w-[460px] bg-[#09090E]/90 border border-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl pointer-events-auto">
                {/* Chapter Index & Tagline */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-white/10 text-xs font-mono-tabular">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#FFB84D]/15 border border-[#FFB84D]/40 text-[#FFB84D] font-semibold tracking-wide">
                    <span className="text-[#FFB84D] font-bold text-[13px]">{pillar.chapterNumber}</span>
                    <span className="text-white/30">/</span>
                    <span className="text-white font-medium">{pillar.label}</span>
                  </span>
                  <span className="text-[11px] text-[#EBE6DC]/70 uppercase tracking-widest font-medium">
                    {pillar.tagline}
                  </span>
                </div>

                {/* Chapter Display Headline */}
                <h2
                  id={`heading-${pillar.id}`}
                  style={{ textWrap: 'balance' }}
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug mb-3"
                >
                  {pillar.headline}
                </h2>

                {/* Chapter Narrative Prose */}
                <p className="text-sm sm:text-[15px] text-[#EBE6DC]/80 leading-relaxed mb-6">
                  {pillar.description}
                </p>

                {/* Quantitative Relativistic Proof Metrics */}
                <div className="grid grid-cols-2 gap-4 py-4 px-4 mb-6 bg-[#111119] rounded-xl border border-white/10 font-mono-tabular">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#EBE6DC]/50 mb-1">
                      {pillar.metricLabel}
                    </div>
                    <div className="text-base sm:text-lg font-semibold text-[#FFB84D]">
                      {pillar.metricValue}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#EBE6DC]/50 mb-1">
                      {pillar.secondaryMetricLabel}
                    </div>
                    <div className="text-base sm:text-lg font-semibold text-[#EBE6DC]">
                      {pillar.secondaryMetricValue.includes('^') ? (
                        <>
                          {pillar.secondaryMetricValue.split('^')[0]}
                          <sup className="text-[0.65em] font-bold">
                            {pillar.secondaryMetricValue.split('^')[1]?.split(' ')[0]}
                          </sup>{' '}
                          {pillar.secondaryMetricValue.split('^')[1]?.split(' ').slice(1).join(' ')}
                        </>
                      ) : (
                        pillar.secondaryMetricValue
                      )}
                    </div>
                  </div>
                </div>

                {/* Final Chapter Core Torsion Status & Singularity Portal Redirect Section */}
                {isFinalChapter && (
                  <div className="mb-6 p-4 rounded-xl bg-[#141118] border border-[#FFB84D]/35">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular mb-2">
                      <span className="text-[#FFB84D] font-semibold uppercase tracking-wider">
                        Core S-Curve Torsion: Max Pinch
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowUrlConfig((prev) => !prev)}
                        className="text-[#EBE6DC]/65 hover:text-white underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {showUrlConfig ? 'Hide Link Config' : 'Set Redirect Link'}
                      </button>
                    </div>
                    <p className="text-xs text-[#EBE6DC]/75 leading-relaxed mb-3.5">
                      Gravitational frame-dragging has compressed the equatorial core beam into a critical S-curve vortex. Trigger the portal link below to launch the 3D warp cutscene and redirect.
                    </p>

                    {showUrlConfig && (
                      <div className="mb-3.5">
                        <label
                          htmlFor="portal-redirect-url"
                          className="block text-[10px] font-mono-tabular uppercase tracking-wider text-[#EBE6DC]/60 mb-1"
                        >
                          Destination Redirect URL (Optional external or internal URL)
                        </label>
                        <input
                          id="portal-redirect-url"
                          type="url"
                          value={customRedirectUrl}
                          onChange={(e) => setCustomRedirectUrl(e.target.value)}
                          placeholder="https://example.com (leave empty for Point Zero Horizon)"
                          className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#09090D] border border-white/20 rounded-lg text-white placeholder-[#EBE6DC]/35 focus:outline-none focus:border-[#FFB84D]"
                        />
                      </div>
                    )}

                    <a
                      href={customRedirectUrl.trim() || '#point-zero-horizon'}
                      data-portal-link="true"
                      data-portal-title="POINT ZERO // BEYOND THE EVENT HORIZON"
                      data-testid="enter-singularity-portal-btn"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#090807] bg-gradient-to-r from-[#FFB84D] via-[#FFD485] to-[#F58220] hover:brightness-110 rounded-lg shadow-lg transition-all cursor-pointer whitespace-nowrap"
                    >
                      <span>Enter Singularity Portal</span>
                      <span aria-hidden="true">→</span>
                    </a>
                  </div>
                )}

                {/* Chapter Interactive Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleTriggerPulse}
                    className="px-4 py-2 text-xs font-semibold text-[#090807] bg-[#FFB84D] hover:bg-[#FFD080] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Emit Gravitational Pulse
                  </button>

                  {nextPillar ? (
                    <button
                      type="button"
                      onClick={() => scrollToSection(`chapter-${nextPillar.id}`)}
                      className="px-3.5 py-2 text-xs font-medium text-[#EBE6DC]/85 hover:text-white border border-white/15 hover:border-white/35 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Next: {nextPillar.chapterNumber}. {nextPillar.label} ↓
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="px-3.5 py-2 text-xs font-medium text-[#EBE6DC]/85 hover:text-white border border-white/15 hover:border-white/35 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Return to Origin ↑
                    </button>
                  )}
                </div>
              </article>
            </section>
          );
        })}
      </main>

      {/* 4. 3D SINGULARITY PORTAL TRANSITION CUTSCENE OVERLAY & LOADING HUD */}
      {cutsceneUi.active && (
        <div
          role="status"
          aria-live="polite"
          data-testid="portal-cutscene-hud"
          className="fixed inset-0 z-50 flex flex-col items-center justify-between p-8 pointer-events-none"
        >
          {/* Top Telemetry Bar */}
          <div
            style={{ opacity: cutsceneUi.state.hudOpacity }}
            className="w-full max-w-[680px] flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#09090E]/90 border border-[#FFB84D]/40 font-mono-tabular text-[11px] tracking-wider uppercase"
          >
            <span className="text-[#FFB84D] font-semibold">
              {cutsceneUi.state.stageLabel}
            </span>
            <span className="text-[#EBE6DC]/80">
              TORSION {(1.0 + cutsceneUi.state.twistBoost).toFixed(2)}×
            </span>
          </div>

          {/* Center Reticle & White-Out Flash Layer */}
          <div
            style={{ opacity: cutsceneUi.state.flashIntensity }}
            className="fixed inset-0 bg-[#FFFDF8] pointer-events-none"
          />

          {/* Bottom Loading Progress Bar */}
          <div
            style={{ opacity: cutsceneUi.state.hudOpacity }}
            className="w-full max-w-[540px] bg-[#09090E]/92 border border-white/15 rounded-2xl p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 mb-2 font-mono-tabular text-xs">
              <span className="text-white font-semibold truncate">
                {cutsceneUi.targetTitle}
              </span>
              <span className="text-[#FFB84D] font-bold">
                {cutsceneUi.state.percent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                style={{ width: `${cutsceneUi.state.percent}%` }}
                className="h-full bg-gradient-to-r from-[#D94E28] via-[#FFB84D] to-[#FFFDF8] transition-all duration-75"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono-tabular text-[#EBE6DC]/60 uppercase tracking-widest">
              <span>WARPING SPACETIME GEODESIC</span>
              <span>SINGULARITY LOCK</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. POINT ZERO DESTINATION HORIZON VIEW (Rendered after Portal Cutscene Completes) */}
      {isDestinationOpen && (
        <section
          aria-label="Point Zero Singularity Destination"
          data-testid="point-zero-destination-view"
          className="fixed inset-0 z-40 flex items-center justify-center px-6 py-12 pointer-events-auto"
        >
          <div className="w-full max-w-[560px] bg-[#09090E]/92 border border-[#FFB84D]/40 rounded-2xl p-7 sm:p-9 shadow-2xl text-[#EBE6DC]">
            <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-white/10 font-mono-tabular text-xs">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#FFB84D]/15 border border-[#FFB84D]/40 text-[#FFB84D] font-semibold">
                <span>∞</span>
                <span className="text-white/30">/</span>
                <span className="text-white">Point Zero Horizon</span>
              </span>
              <span className="text-[11px] text-[#FFB84D] uppercase tracking-widest">
                TRANSIT COMPLETE
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
              Welcome Beyond the Event Horizon
            </h2>
            <p className="text-sm sm:text-[15px] text-[#EBE6DC]/80 leading-relaxed mb-6">
              You have crossed the twisted S-curve singularity core into the destination sector. Any link with{' '}
              <code className="px-1.5 py-0.5 rounded bg-white/10 text-[#FFB84D] font-mono-tabular text-xs">
                data-portal-link=&quot;true&quot;
              </code>{' '}
              or a configured redirect URL automatically triggers this 3D gravitational warp cutscene while loading the next page.
            </p>

            <div className="grid grid-cols-2 gap-4 p-4 mb-6 bg-[#111119] rounded-xl border border-white/10 font-mono-tabular">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#EBE6DC]/50 mb-1">
                  ACTIVE DESTINATION
                </div>
                <div className="text-sm font-semibold text-[#FFB84D] truncate">
                  {destinationMeta.url}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#EBE6DC]/50 mb-1">
                  CORE COMPRESSION
                </div>
                <div className="text-sm font-semibold text-white">
                  0.000 Ω LOCKED
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReturnFromDestination}
                data-testid="return-wormhole-btn"
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#090807] bg-[#FFB84D] hover:bg-[#FFD080] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                ← Return Through Wormhole
              </button>

              <button
                type="button"
                onClick={handleTriggerPulse}
                className="px-3.5 py-2.5 text-xs font-medium text-[#EBE6DC]/85 hover:text-white border border-white/15 hover:border-white/35 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Emit Horizon Pulse
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 6. Unified Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <ControlDock
        config={config}
        isExpanded={isDockExpanded}
        onToggleExpand={() => setIsDockExpanded((prev) => !prev)}
        onChangeConfig={handleUpdateConfig}
        onSelectPreset={handleSelectPreset}
        onTriggerPulse={handleTriggerPulse}
        pulseCount={pulseCount}
        telemetry={telemetry}
      />
    </div>
  );
}
