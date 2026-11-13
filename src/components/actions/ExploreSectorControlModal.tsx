import React, { useState } from 'react';
import { GameState, PendingExploreControl } from '../../engine/types/state';
import { CircleDot, Check, X, Sparkles, Minimize2, Maximize2 } from 'lucide-react';

interface ExploreSectorControlModalProps {
  state: GameState;
  pendingControl: PendingExploreControl;
  currentSeat?: number | 'all' | 'spectator';
  onConfirm: (claimInfluence: boolean) => void;
}

export const ExploreSectorControlModal: React.FC<ExploreSectorControlModalProps> = ({
  state,
  pendingControl,
  currentSeat = 'all',
  onConfirm,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const sector = state.sectors.find((s) => s.id === pendingControl.sectorId);
  const player = state.players.find((p) => p.id === pendingControl.playerId);

  if (!sector || !player) return null;

  const isSpectator = currentSeat === 'spectator';
  const canAct =
    !isSpectator &&
    (currentSeat === 'all' ||
      (typeof currentSeat === 'number' && state.players[currentSeat]?.id === player.id));

  if (!canAct) {
    return (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-cyan-500/80 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-3 backdrop-blur text-sm text-slate-200 pointer-events-none animate-bounce">
        <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
        <span>
          Waiting for <strong className="text-cyan-300">{player.name}</strong> to decide whether to control Sector {sector.sectorNumber || sector.id}...
        </span>
      </div>
    );
  }

  // Minimized floating banner at top (allows inspecting map completely unobstructed)
  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-cyan-500 rounded-full shadow-2xl backdrop-blur-md text-white">
          <CircleDot className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-xs sm:text-sm tracking-wide text-cyan-300 font-display">
            SECTOR CONTROL: SECTOR {sector.sectorNumber || sector.id} ({player.name})
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold rounded-full text-xs transition-all shadow-md shadow-cyan-950/50 flex items-center gap-1.5 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Decide Control</span>
          </button>
        </div>
      </div>
    );
  }

  const discsAvailable = player.influenceTrack.discsOnTrack;
  const canPlaceDisc = discsAvailable > 0;

  return (
    <div className="fixed top-18 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-120 max-w-lg pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="relative bg-slate-900/95 border-2 border-cyan-500/80 rounded-2xl shadow-2xl shadow-cyan-950/50 backdrop-blur-md overflow-hidden text-slate-100 flex flex-col max-h-[calc(100vh-90px)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-900/50 bg-slate-950 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-950/40">
              <CircleDot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-cyan-300 font-display uppercase tracking-wide truncate">
                Sector Control Decision
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                <span
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: player.color }}
                />
                <span>
                  Sector {sector.sectorNumber || sector.id} &bull;{' '}
                  <strong className="text-slate-200">{player.name}</strong>
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors shadow-sm cursor-pointer shrink-0"
            title="Minimize window to inspect galaxy map"
          >
            <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
            <span>View Map</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-200 leading-relaxed font-medium text-left">
              Place 1 Influence Disc to take control of Sector {sector.sectorNumber || sector.id}?
            </p>
            <span
              className={`shrink-0 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold ${
                canPlaceDisc
                  ? 'bg-cyan-950/70 border-cyan-700/70 text-cyan-300'
                  : 'bg-rose-950/70 border-rose-800 text-rose-300'
              }`}
            >
              {discsAvailable} disc{discsAvailable === 1 ? '' : 's'} left
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => onConfirm(false)}
            className="px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
            <span>Leave Uncontrolled</span>
          </button>

          <button
            type="button"
            disabled={!canPlaceDisc}
            onClick={() => onConfirm(true)}
            className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow-lg ${
              canPlaceDisc
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-950/60 cursor-pointer'
                : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Control Sector</span>
          </button>
        </div>
      </div>
    </div>
  );
};
