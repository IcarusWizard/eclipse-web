import React, { useState, useEffect, useMemo } from 'react';
import { GameState } from '../../engine/types/state';
import { SectorTile } from '../../engine/types/galaxy';
import { isReplayAvailable } from '../../engine/rules/replay';
import { getPlayerShortName } from '../../engine/rules/gameReducer';
import { HexGalaxyMap } from '../map/HexGalaxyMap';
import {
  History,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  X,
  Gauge,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export interface GameReplayModalProps {
  state: GameState;
  tableNumber?: number;
  onClose: () => void;
}

export const GameReplayModal: React.FC<GameReplayModalProps> = ({
  state,
  tableNumber,
  onClose,
}) => {
  const replayAvailable = isReplayAvailable(state);

  // If no replay tracking data exists (older games / backward compatibility)
  if (!replayAvailable) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-amber-500/60 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-100 flex flex-col items-center text-center relative animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 rounded-full bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-950/50">
            <History className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-amber-300 font-display mb-2">
            Replay Not Available
          </h3>
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 mb-6 leading-relaxed text-left space-y-2">
            <p className="font-semibold text-amber-200/90 flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Replay is not available for this game (created before replay tracking was enabled).</span>
            </p>
            <p className="text-slate-400 pl-5.5">
              Historical action tracking requires step snapshots recorded during gameplay. Older games created prior to action tracking do not have historical snapshots saved.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer border border-slate-700 hover:border-slate-500 shadow"
          >
            Close Replay
          </button>
        </div>
      </div>
    );
  }

  const steps = state.replaySteps || [];
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [selectedSector, setSelectedSector] = useState<SectorTile | null>(null);

  const totalSteps = steps.length;
  const currentStep = steps[stepIndex] || steps[0];

  // Reconstruct GameState from snapshot at this step
  const stepState: GameState = useMemo(() => {
    try {
      if (currentStep?.snapshot) {
        const parsed = JSON.parse(currentStep.snapshot);
        return parsed as GameState;
      }
    } catch (err) {
      console.error('Failed to parse replay step snapshot:', err);
    }
    return state;
  }, [currentStep, state]);

  // Synchronize selectedSector reference with the new stepState
  useEffect(() => {
    if (selectedSector && stepState.sectors) {
      const match = stepState.sectors.find((s) => s.id === selectedSector.id);
      if (match) setSelectedSector(match);
    }
  }, [stepState]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    if (stepIndex >= totalSteps - 1) {
      setIsPlaying(false);
      return;
    }

    const intervalMs = playbackSpeed === 4 ? 400 : playbackSpeed === 2 ? 800 : 1500;
    const timer = setTimeout(() => {
      setStepIndex((idx) => {
        if (idx + 1 >= totalSteps - 1) {
          setIsPlaying(false);
          return totalSteps - 1;
        }
        return idx + 1;
      });
    }, intervalMs);

    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, totalSteps, playbackSpeed]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setStepIndex((idx) => Math.max(0, idx - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setStepIndex((idx) => Math.min(totalSteps - 1, idx + 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((playing) => {
          if (!playing && stepIndex >= totalSteps - 1) {
            setStepIndex(0);
            return true;
          }
          return !playing;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        setIsPlaying(false);
        setStepIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setIsPlaying(false);
        setStepIndex(totalSteps - 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSteps, stepIndex, onClose]);

  const handleTogglePlay = () => {
    if (!isPlaying && stepIndex >= totalSteps - 1) {
      setStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleCycleSpeed = () => {
    if (playbackSpeed === 1) setPlaybackSpeed(2);
    else if (playbackSpeed === 2) setPlaybackSpeed(4);
    else setPlaybackSpeed(1);
  };

  const actorPlayer = stepState.players?.find((p) => p.id === currentStep?.actorPlayerId);
  const effectiveTableNum = tableNumber || (state as any).tableNumber;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <header className="h-14 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between text-slate-100 z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Exit Replay (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-indigo-950 border border-indigo-700 text-indigo-300">
              #{effectiveTableNum || 'MATCH'}
            </span>
            <div className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-400" />
              <span className="font-extrabold text-sm text-indigo-200 font-display hidden sm:inline">
                GALACTIC REPLAY
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          {/* Round & Phase Badges */}
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
              R{stepState.round}/{stepState.maxRounds}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800/80 text-cyan-300 border border-cyan-800/60 hidden sm:inline">
              {stepState.phase.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Center: Current Step Summary */}
        <div className="flex-1 max-w-xl mx-4 hidden lg:flex items-center justify-center">
          <div className="w-full px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs truncate">
            {actorPlayer && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: actorPlayer.color }}
              />
            )}
            <span className="font-bold text-slate-200 shrink-0">
              {currentStep?.actionType}:
            </span>
            <span className="text-slate-300 truncate" title={currentStep?.summary}>
              {currentStep?.summary}
            </span>
          </div>
        </div>

        {/* Right: Step Counter */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-800/90 text-amber-300 border border-slate-700">
            Step {stepIndex + 1} / {totalSteps}
          </span>
        </div>
      </header>

      {/* Main Map View Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <HexGalaxyMap
          state={stepState}
          selectedSectorId={selectedSector?.id || null}
          onSelectSector={(s) => setSelectedSector(s)}
        />

        {/* Floating Sector Detail Popup on Map Click */}
        {selectedSector && (
          <div className="absolute top-4 right-4 z-20 max-w-xs bg-slate-900/95 border border-indigo-500/40 rounded-xl shadow-2xl p-3 text-xs text-slate-200 backdrop-blur-md">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
              <span className="font-bold text-indigo-300">
                Sector {selectedSector.sectorNumber} ({selectedSector.name || 'Deep Space'})
              </span>
              <button
                onClick={() => setSelectedSector(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              <div>
                Controlled By:{' '}
                <strong className="text-white">
                  {selectedSector.discOwner
                    ? stepState.players.find((p) => p.id === selectedSector.discOwner)?.name || selectedSector.discOwner
                    : 'Unclaimed'}
                </strong>
              </div>
              <div>
                Ships Present:{' '}
                <strong className="text-white">
                  {selectedSector.ships?.length || 0}
                </strong>
              </div>
              {selectedSector.planets && selectedSector.planets.length > 0 && (
                <div>
                  Planets ({selectedSector.planets.length}):{' '}
                  <span className="text-slate-300 font-mono">
                    {selectedSector.planets
                      .map((p) => `${p.resource}${p.colonizedBy ? ' (colonized)' : ''}`)
                      .join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Console: Action Banner, Controls, Scrubber & Player Standings */}
      <footer className="bg-slate-900/95 border-t border-slate-800 p-3 flex flex-col gap-2.5 z-30 shrink-0">
        {/* Mobile/Compact Action Summary Banner */}
        <div className="lg:hidden px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs truncate">
          {actorPlayer && (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: actorPlayer.color }}
            />
          )}
          <span className="font-bold text-slate-200 shrink-0">
            {currentStep?.actionType}:
          </span>
          <span className="text-slate-300 truncate" title={currentStep?.summary}>
            {currentStep?.summary}
          </span>
        </div>

        {/* Scrubber Range Slider */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
            0 (Setup)
          </span>
          <input
            type="range"
            min={0}
            max={totalSteps - 1}
            value={stepIndex}
            onChange={(e) => {
              setStepIndex(Number(e.target.value));
              setIsPlaying(false);
            }}
            className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
          />
          <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
            {totalSteps - 1} (Latest)
          </span>
        </div>

        {/* Playback Controls & Player Strip */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Media Playback Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setIsPlaying(false);
                setStepIndex(0);
              }}
              disabled={stepIndex === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition cursor-pointer"
              title="Jump to Start (Home)"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setStepIndex((i) => Math.max(0, i - 1));
              }}
              disabled={stepIndex === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition cursor-pointer"
              title="Step Back (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleTogglePlay}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setStepIndex((i) => Math.min(totalSteps - 1, i + 1));
              }}
              disabled={stepIndex >= totalSteps - 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition cursor-pointer"
              title="Step Forward (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setStepIndex(totalSteps - 1);
              }}
              disabled={stepIndex >= totalSteps - 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition cursor-pointer"
              title="Jump to End (End)"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Speed Toggle */}
            <button
              onClick={handleCycleSpeed}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 font-mono font-bold text-xs flex items-center gap-1 transition cursor-pointer ml-1"
              title="Playback Speed"
            >
              <Gauge className="w-3 h-3 text-indigo-400" />
              <span>{playbackSpeed}x</span>
            </button>
          </div>

          {/* Mini Player Standings Strip */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
            {stepState.players?.map((p, pIdx) => {
              const isTurn = stepState.activePlayerIndex === pIdx;
              const hasPassed = p.hasPassed || stepState.passedPlayerIds?.includes(p.id);

              return (
                <div
                  key={p.id}
                  className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                    isTurn
                      ? 'bg-amber-950/60 border-amber-400 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-bold text-slate-200">
                    {getPlayerShortName(p)}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                    <span title="Credits (Money)" className="text-amber-400">💰{p.resources?.money ?? 0}</span>
                    <span title="Science" className="text-cyan-400">🔬{p.resources?.science ?? 0}</span>
                    <span title="Materials" className="text-rose-400">🔨{p.resources?.materials ?? 0}</span>
                  </div>
                  {hasPassed && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-400">
                      PASSED
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
};
