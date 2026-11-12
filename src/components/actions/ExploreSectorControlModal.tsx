import React, { useState } from 'react';
import { GameState, PendingExploreControl } from '../../engine/types/state';
import { CircleDot, Check, X, Sparkles, Minimize2, Undo2 } from 'lucide-react';

interface ExploreSectorControlModalProps {
  state: GameState;
  pendingControl: PendingExploreControl;
  currentSeat?: number | 'all' | 'spectator';
  onConfirm: (claimInfluence: boolean) => void;
  onBack?: () => void;
}

export const ExploreSectorControlModal: React.FC<ExploreSectorControlModalProps> = ({
  state,
  pendingControl,
  currentSeat = 'all',
  onConfirm,
  onBack,
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
            SECTOR CONTROL: Sector {sector.sectorNumber || sector.id} ({player.name})
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => setIsMinimized(false)}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-full text-xs transition shadow cursor-pointer"
          >
            Decide Control
          </button>
        </div>
      </div>
    );
  }

  const discsAvailable = player.influenceTrack.discsOnTrack;
  const canPlaceDisc = discsAvailable > 0;

  return (
    <div className="fixed top-18 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-84 max-w-sm pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-150">
      <div className="relative w-full bg-slate-900/95 border border-cyan-500/70 rounded-xl shadow-xl backdrop-blur-md p-3.5 flex flex-col gap-2.5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-bold text-xs sm:text-sm text-slate-100">
              Sector Control Decision
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[11px] font-semibold border border-rose-800/80 transition cursor-pointer"
                title="Revert to discovery choice (+2 VP or reward)"
              >
                <Undo2 className="w-3 h-3 text-rose-400 shrink-0" />
                <span>Revert</span>
              </button>
            )}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Minimize to view map"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Prompt description */}
        <p className="text-[11px] text-slate-300 text-left leading-normal">
          Place 1 Influence Disc to take control of Sector {sector.sectorNumber || sector.id}?
          <span className="ml-1 text-cyan-300 font-mono font-semibold">
            ({discsAvailable} disc{discsAvailable === 1 ? '' : 's'} on track)
          </span>
        </p>

        {/* Decision buttons */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            disabled={!canPlaceDisc}
            onClick={() => onConfirm(true)}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition shadow cursor-pointer ${
              canPlaceDisc
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50'
                : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Control Sector</span>
          </button>

          <button
            type="button"
            onClick={() => onConfirm(false)}
            className="px-3 py-2 rounded-lg font-bold text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition shadow cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
            <span>Leave Uncontrolled</span>
          </button>
        </div>
      </div>
    </div>
  );
};
