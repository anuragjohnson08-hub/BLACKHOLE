/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BlackHoleCanvas } from './components/BlackHoleCanvas';
import { ControlDock } from './components/ControlDock';
import {
  MERTANA_PILLARS,
  SIMULATION_PRESETS,
  type PillarItem,
  type PresetId,
  type SimulationConfig,
} from './utils/blackholePhysics';

export default function App() {
  const [config, setConfig] = useState<SimulationConfig>({
    ...SIMULATION_PRESETS.gargantua,
    interactionMode: 'vortex',
  });

  const [selectedPillarId, setSelectedPillarId] = useState<PillarItem['id'] | null>(null);
  const [isDockExpanded, setIsDockExpanded] = useState<boolean>(false);
  const [shockwaveTrigger, setShockwaveTrigger] = useState<number>(0);
  const [pulseCount, setPulseCount] = useState<number>(0);
  const [telemetry, setTelemetry] = useState({
    activeParticles: 1585,
    horizonFlux: '5.54 × 10^44 erg/s',
    cursorForce: 'EQUILIBRIUM',
  });

  const activePillar = MERTANA_PILLARS.find((p) => p.id === selectedPillarId) || null;
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

  const handlePillarClick = useCallback((pillar: PillarItem) => {
    setSelectedPillarId((prev) => {
      const nextId = prev === pillar.id ? null : pillar.id;
      return nextId;
    });
    setShockwaveTrigger((prev) => prev + 1);
  }, []);

  // Keyboard shortcut 'H' to toggle physics dock, 'Space' to trigger zero-point pulse
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
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTriggerPulse]);

  return (
    <main
      data-state={selectedPillarId ? `pillar-${selectedPillarId}` : 'singularity-active'}
      className="relative w-screen h-screen overflow-hidden bg-[#050507] select-none"
    >
      {/* 1. Interactive 3D Relativistic Black Hole & Particle Field */}
      <BlackHoleCanvas
        config={config}
        shockwaveTrigger={shockwaveTrigger}
        activePillarMultiplier={activePillarMultiplier}
        onTelemetryUpdate={setTelemetry}
        onCanvasBurst={() => setPulseCount((c) => c + 1)}
      />

      {/* 2. Poster Editorial Overlay Architecture (Matches Reference Composition) */}
      <div className="relative z-10 w-full h-full pointer-events-none flex flex-col justify-between px-[2.4vw] pt-[1.2vh] pb-[4.2vh]">
        {/* Top Section: IN CREDIABLE ENERGY + Monumental Mertana Wordmark + Pillar Bar */}
        <header className="w-full">
          {/* Top-right micro kicker */}
          <div className="w-full flex justify-end pr-[0.4vw] mb-[-0.8vw]">
            <span className="text-[10px] sm:text-[11px] md:text-[12px] font-semibold tracking-[0.03em] uppercase text-[#EBE6DC]/95 whitespace-nowrap">
              IN CREDIABLE ENERGY
            </span>
          </div>

          {/* Giant Full-Width "Mertana" Wordmark with Relativistic Lensing Overlap */}
          <h1 aria-label="Mertana" className="w-full m-0 p-0 leading-none">
            <span className="sr-only">Mertana</span>
            <svg
              viewBox="0 0 1400 285"
              className="w-full h-auto block overflow-visible"
              aria-hidden="true"
            >
              <defs>
                {/* Mask that creates the gravitational shadow eclipse on lower 'r' and translucent lensing blend on 't', 'a', 'n' */}
                <radialGradient id="lensingEclipseMask" cx="48%" cy="108%" r="26%" fx="46%" fy="104%">
                  <stop offset="0%" stopColor="#141414" />
                  <stop offset="42%" stopColor="#353535" />
                  <stop offset="68%" stopColor="#8c8c8c" />
                  <stop offset="88%" stopColor="#e5e5e5" />
                  <stop offset="100%" stopColor="#ffffff" />
                </radialGradient>

                <mask id="mertanaHorizonMask">
                  <rect x="-100" y="-100" width="1600" height="500" fill="white" />
                  {/* Dark inner shadow notch biting into lower-right of 'r' and translucent lensing blend across 't', 'a', 'n' */}
                  <ellipse cx="705" cy="310" rx="310" ry="150" fill="url(#lensingEclipseMask)" />
                </mask>
              </defs>

              <g mask="url(#mertanaHorizonMask)">
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
            </svg>
          </h1>

          {/* Sub-header row: Experience + Consistency + Quality + Dedication +  |  ©2026 */}
          <div className="w-full flex items-center justify-between mt-[0.6vh] px-[0.2vw]">
            <nav
              aria-label="Mertana core pillars"
              className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-1 pointer-events-auto"
            >
              {MERTANA_PILLARS.map((pillar) => {
                const isSelected = selectedPillarId === pillar.id;
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

          {/* Interactive Pillar Inspector Card (Appears cleanly on left when a pillar is clicked) */}
          {activePillar && (
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
        <footer className="w-full flex items-end justify-between">
          <div className="flex flex-col items-start pointer-events-auto">
            <p className="text-[11px] sm:text-[12px] md:text-[13px] font-bold tracking-[0.04em] uppercase text-[#D94E28] m-0 leading-tight">
              RIDE, BOND, GROW
            </p>
            <p className="text-[11px] sm:text-[12px] md:text-[13px] font-semibold tracking-[0.03em] uppercase text-[#EBE6DC]/95 m-0 mt-1 leading-tight">
              IT STARTS ND ENDS WITH A ZERO
            </p>
          </div>
        </footer>
      </div>

      {/* 3. Unified Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
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
    </main>
  );
}
