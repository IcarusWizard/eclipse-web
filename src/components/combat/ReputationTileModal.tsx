import React, { useState } from 'react';
import { GameState, PendingReputationDraw } from '../../engine/types/state';
import { Trophy, Shield, CheckCircle2, ArrowRight, RotateCcw, X } from 'lucide-react';

interface ReputationTileModalProps {
  state: GameState;
  pendingDraw: PendingReputationDraw;
  onClaimTile: (selectedTileIndex?: number, replaceTrackIndex?: number) => void;
}

export const ReputationTileModal: React.FC<ReputationTileModalProps> = ({
  state,
  pendingDraw,
  onClaimTile,
}) => {
  const player = state.players.find((p) => p.id === pendingDraw.playerId);
  const sector = state.sectors.find((s) => s.id === pendingDraw.sectorId);
  if (!player) return null;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    pendingDraw.drawnTiles.length > 0 ? 0 : null
  );
  const [replaceIndex, setReplaceIndex] = useState<number | null>(0);

  const maxTrackCapacity = player.faction.reputationSlots ?? 5;
  const isTrackFull = player.reputationTiles.length >= maxTrackCapacity;

  const handleConfirm = () => {
    if (selectedIndex === null) {
      onClaimTile(undefined, undefined);
    } else {
      onClaimTile(
        selectedIndex,
        isTrackFull && replaceIndex !== null ? replaceIndex : undefined
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/70 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-amber-900/50 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-300 font-display">
                REPUTATION TILE DRAW
              </h2>
              <p className="text-xs text-slate-400">
                Battle rewards in Sector {sector?.sectorNumber || 'Unknown'} for{' '}
                <strong className="text-slate-200">{player.name}</strong>
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-amber-300">
            {pendingDraw.drawnTiles.length} Drawn
          </span>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Rules Explanation Banner */}
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3 text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-amber-300">
              Select up to ONE tile to place on your Reputation Track:
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Earned for participating in fleet combat and destroying enemy vessels. Unselected tiles will be returned to the Reputation Bag.
            </p>
          </div>

          {/* Drawn Tiles Options */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Drawn Reputation Tiles (Choose 1)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pendingDraw.drawnTiles.map((vp, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/60 border-amber-400 shadow-lg shadow-amber-950/60 ring-2 ring-amber-400/80'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-2xl font-black font-display text-amber-300">
                      {vp} VP
                    </span>
                    <span className="text-[10px] uppercase font-mono text-slate-400">
                      Reputation Tile
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 uppercase tracking-tight">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Option to decline taking any tile */}
              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedIndex === null
                    ? 'bg-slate-800 border-slate-500 ring-2 ring-slate-400'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <X className="w-6 h-6 text-slate-400" />
                <span className="text-xs font-bold text-slate-300">Decline All</span>
                <span className="text-[9px] text-slate-500">Keep nothing</span>
              </button>
            </div>
          </div>

          {/* Current Player Reputation Track */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan-400" /> Current Reputation Track
              </span>
              <span className="font-mono text-slate-400">
                Capacity: <strong className="text-amber-300">{player.reputationTiles.length}</strong> / {maxTrackCapacity}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: maxTrackCapacity }).map((_, slotIdx) => {
                const currentTileVP = player.reputationTiles[slotIdx];
                const isOccupied = currentTileVP !== undefined;
                const isSelectedToReplace = isTrackFull && replaceIndex === slotIdx;

                return (
                  <div
                    key={slotIdx}
                    onClick={() => {
                      if (isTrackFull) setReplaceIndex(slotIdx);
                    }}
                    className={`h-16 rounded-xl border flex flex-col items-center justify-center p-1 relative transition-all ${
                      isSelectedToReplace
                        ? 'bg-rose-950/50 border-rose-400 shadow ring-1 ring-rose-400 cursor-pointer'
                        : isOccupied
                        ? 'bg-slate-900 border-amber-700/60 shadow'
                        : 'bg-slate-950 border-dashed border-slate-800 text-slate-600'
                    } ${isTrackFull ? 'cursor-pointer hover:border-rose-400/80' : ''}`}
                  >
                    <span className="text-[9px] text-slate-500 font-mono absolute top-1 left-1.5">
                      #{slotIdx + 1}
                    </span>
                    {isOccupied ? (
                      <span className="text-sm font-black font-display text-amber-300">
                        {currentTileVP} VP
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600 italic">Empty</span>
                    )}

                    {isSelectedToReplace && (
                      <span className="text-[8px] font-black uppercase tracking-tighter px-1 py-0.2 rounded bg-rose-500 text-white absolute bottom-1">
                        Replace
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {isTrackFull && selectedIndex !== null && (
              <p className="text-[11px] text-amber-400/90 italic">
                * Your track is full. Click one of your existing tiles above to replace it, or decline the drawn tile.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onClaimTile(undefined, undefined)}
            className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
          >
            Decline & Return All
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-950 transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            {selectedIndex !== null ? 'Confirm Reputation Tile' : 'Decline All Tiles'}
          </button>
        </div>
      </div>
    </div>
  );
};
