import React from 'react';
import {
  SIMULATION_PRESETS,
  type InteractionMode,
  type PresetId,
  type SimulationConfig,
} from '../utils/blackholePhysics';

interface ControlDockProps {
  config: SimulationConfig;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChangeConfig: (next: Partial<SimulationConfig>) => void;
  onSelectPreset: (presetId: PresetId) => void;
  onTriggerPulse: () => void;
  pulseCount: number;
  telemetry: {
    activeParticles: number;
    horizonFlux: string;
    cursorForce: string;
  };
}

const INTERACTION_MODES: { id: InteractionMode; label: string }[] = [
  { id: 'vortex', label: 'Vortex Pull' },
  { id: 'repulse', label: 'Repulse Wave' },
  { id: 'orbit', label: 'Orbital Swirl' },
  { id: 'supernova', label: 'Supernova Scatter' },
];

const PRESET_LIST: { id: PresetId; label: string }[] = [
  { id: 'gargantua', label: 'Gargantua' },
  { id: 'hyper_luminal', label: 'Hyper-Luminal' },
  { id: 'horizon_eclipse', label: 'Horizon Eclipse' },
  { id: 'tidal_surge', label: 'Tidal Surge' },
];

export const ControlDock: React.FC<ControlDockProps> = ({
  config,
  isExpanded,
  onToggleExpand,
  onChangeConfig,
  onSelectPreset,
  onTriggerPulse,
  pulseCount,
  telemetry,
}) => {
  return (
    <aside
      aria-label="Black hole physics and particle controls"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center max-w-[92vw] pointer-events-auto"
    >
      {/* Collapse / Expand Handle */}
      <div className="flex items-center gap-2 mb-1.5">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          className="px-3.5 py-1.5 text-[11px] font-medium tracking-wider uppercase text-[#EBE6DC]/90 bg-[#0B0B0F]/92 border border-white/15 rounded-md hover:border-[#FFB84D]/60 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isExpanded ? '▾ Hide Physics Controls (H)' : '▴ Singularity Controls (H)'}
        </button>

        <button
          type="button"
          onClick={onTriggerPulse}
          className="px-3.5 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-[#090807] bg-[#FFB84D] hover:bg-[#FFD080] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Trigger Zero Pulse ({pulseCount})
        </button>
      </div>

      {/* Expandable Unified Control Dock (No backdrop-blur over WebGL per performance directive) */}
      {isExpanded && (
        <div
          role="region"
          aria-label="Singularity simulation parameters"
          className="w-full max-w-[780px] bg-[#0B0B10]/95 border border-white/15 rounded-xl px-4 py-3 shadow-2xl text-[#EBE6DC]"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-2.5 mb-2.5 border-b border-white/10">
            {/* Interaction Mode Selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-[#EBE6DC]/60 uppercase tracking-wider mr-1 whitespace-nowrap shrink-0">
                Cursor Field:
              </span>
              <div className="flex items-center gap-1 bg-[#14141D] p-1 rounded-lg border border-white/10">
                {INTERACTION_MODES.map((m) => {
                  const active = config.interactionMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onChangeConfig({ interactionMode: m.id })}
                      aria-pressed={active}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#D9531E] text-white'
                          : 'text-[#EBE6DC]/75 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-[#EBE6DC]/60 uppercase tracking-wider mr-1 whitespace-nowrap shrink-0">
                State:
              </span>
              <div className="flex items-center gap-1 bg-[#14141D] p-1 rounded-lg border border-white/10">
                {PRESET_LIST.map((preset) => {
                  const active = config.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectPreset(preset.id)}
                      aria-pressed={active}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#FFB84D] text-[#0A0908] font-semibold'
                          : 'text-[#EBE6DC]/75 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sliders & Live Telemetry Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Spin Speed */}
            <label className="flex flex-col gap-1 text-[11px] text-[#EBE6DC]/80">
              <div className="flex justify-between font-mono-tabular">
                <span>Accretion Spin</span>
                <span className="text-[#FFB84D]">{config.spinSpeed.toFixed(2)}c</span>
              </div>
              <input
                type="range"
                aria-label="Accretion Spin"
                min={0.2}
                max={3.0}
                step={0.05}
                value={config.spinSpeed}
                onChange={(e) => onChangeConfig({ spinSpeed: parseFloat(e.target.value) })}
                className="w-full accent-[#FFB84D] cursor-pointer h-1.5 bg-white/15 rounded-lg"
              />
            </label>

            {/* Relativistic Lensing */}
            <label className="flex flex-col gap-1 text-[11px] text-[#EBE6DC]/80">
              <div className="flex justify-between font-mono-tabular">
                <span>Photon Ring Lensing</span>
                <span className="text-[#FFB84D]">{config.lensingIntensity.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                aria-label="Photon Ring Lensing"
                min={0.5}
                max={2.0}
                step={0.05}
                value={config.lensingIntensity}
                onChange={(e) =>
                  onChangeConfig({ lensingIntensity: parseFloat(e.target.value) })
                }
                className="w-full accent-[#FFB84D] cursor-pointer h-1.5 bg-white/15 rounded-lg"
              />
            </label>

            {/* Telemetry Readout + Reset */}
            <div className="flex items-center justify-between gap-3 pl-1 text-[11px] font-mono-tabular text-[#EBE6DC]/75">
              <div>
                <div className="text-[10px] uppercase text-[#EBE6DC]/45">Relativistic Flux</div>
                <div className="text-[#EBE6DC] font-medium">{telemetry.horizonFlux}</div>
              </div>
              <button
                type="button"
                onClick={() => onSelectPreset('gargantua')}
                className="px-2.5 py-1 text-[11px] font-medium text-[#EBE6DC]/80 hover:text-white border border-white/15 hover:border-white/35 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
