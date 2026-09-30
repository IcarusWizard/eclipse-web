import React, { useState } from 'react';
import { GameState, PendingReputationDraw } from '../../engine/types/state';
import { Trophy, Shield, CheckCircle2, ArrowRight, RotateCcw, X, Users } from 'lucide-react';
import {
  getMaxReputationTilesForPlayer,
  getPlayerReputationTrackSlots,
} from '../../engine/rules/setup';

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

  // Default selection to the drawn tile with the highest VP
  const defaultSelectedIdx = React.useMemo(() => {
    if (!pendingDraw.drawnTiles.length) return null;
    let bestIdx = 0;
    let maxVp = pendingDraw.drawnTiles[0] ?? 0;
    for (let i = 1; i < pendingDraw.drawnTiles.length; i++) {
      const val = pendingDraw.drawnTiles[i] ?? 0;
      if (val > maxVp) {
        maxVp = val;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [pendingDraw.drawnTiles]);

  // Default replacement to the tile on player's track with the lowest VP
  const defaultReplaceIdx = React.useMemo(() => {
    if (!player.reputationTiles.length) return 0;
    let worstIdx = 0;
    let minVp = player.reputationTiles[0] ?? 0;
    for (let i = 1; i < player.reputationTiles.length; i++) {
      const val = player.reputationTiles[i] ?? 0;
      if (val < minVp) {
        minVp = val;
        worstIdx = i;
      }
    }
    return worstIdx;
  }, [player.reputationTiles]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(defaultSelectedIdx);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(defaultReplaceIdx);

  const maxRepTiles = getMaxReputationTilesForPlayer(player);
  const isTrackFull = player.reputationTiles.length >= maxRepTiles;
  const trackSlots = getPlayerReputationTrackSlots(player, state.players);

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

          {/* Current Player Reputation Track (Bug 78) */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan-400" /> Current Reputation Track
              </span>
              <span className="font-mono text-slate-400">
                Rep Capacity: <strong className="text-amber-300">{player.reputationTiles.length}</strong> / {maxRepTiles}
                {(player.ambassadorTiles?.length || 0) > 0 && (
                  <span className="text-indigo-400 ml-1.5 font-sans font-semibold">
                    ({player.ambassadorTiles.length} Ambassador{player.ambassadorTiles.length > 1 ? 's' : ''})
                  </span>
                )}
              </span>
            </div>

            <div className={`grid ${trackSlots.length === 4 ? 'grid-cols-4' : 'grid-cols-5'} gap-2`}>
              {trackSlots.map((slot) => {
                const isAmbassador = slot.tile?.type === 'ambassador';
                const isReputation = slot.tile?.type === 'reputation';
                const isSelectedToReplace =
                  isTrackFull && isReputation && replaceIndex === slot.tile?.repIndex;

                return (
                  <div
                    key={slot.slotIndex}
                    onClick={() => {
                      if (isTrackFull && isReputation) {
                        setReplaceIndex(slot.tile!.repIndex);
                      }
                    }}
                    className={`min-h-[72px] rounded-xl border flex flex-col items-center justify-between p-1.5 relative transition-all ${
                      isSelectedToReplace
                        ? 'bg-rose-950/60 border-rose-400 shadow ring-2 ring-rose-400 cursor-pointer'
                        : isAmbassador
                        ? 'bg-indigo-950/40 border-indigo-500/70 shadow'
                        : isReputation
                        ? 'bg-slate-900 border-amber-600/70 shadow'
                        : 'bg-slate-950 border-dashed border-slate-800 text-slate-600'
                    } ${isTrackFull && isReputation ? 'cursor-pointer hover:border-rose-400/80' : ''}`}
                  >
                    <div className="w-full flex items-center justify-between text-[9px] text-slate-500 font-mono">
                      <span>#{slot.slotIndex + 1}</span>
                      <span className="text-[8px] uppercase font-bold text-slate-400">
                        {slot.slotType === 'amb_only'
                          ? 'Amb Only'
                          : slot.slotType === 'rep_only'
                          ? 'Rep Only'
                          : 'Amb / Rep'}
                      </span>
                    </div>

                    {isAmbassador ? (
                      <div className="flex flex-col items-center justify-center my-0.5 text-center">
                        <div className="flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full border border-white/40 shrink-0"
                            style={{ backgroundColor: slot.tile?.allyColor }}
                          />
                          <span className="text-[10px] font-bold text-indigo-300 truncate max-w-[65px]">
                            {slot.tile?.allyName}
                          </span>
                        </div>
                        <span className="text-[9px] font-black text-indigo-400 font-mono">
                          +1 VP Amb
                        </span>
                      </div>
                    ) : isReputation ? (
                      <div className="flex flex-col items-center justify-center my-0.5">
                        <span className="text-base font-black font-display text-amber-300">
                          {slot.tile?.vp} VP
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-600 italic my-auto">Empty</span>
                    )}

                    <div className="w-full flex justify-center min-h-[14px]">
                      {isSelectedToReplace ? (
                        <span className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-rose-500 text-white shadow">
                          Replace
                        </span>
                      ) : isAmbassador ? (
                        <span className="text-[7.5px] font-semibold text-indigo-400/90 uppercase tracking-tight">
                          Pact (Locked)
                        </span>
                      ) : isTrackFull && isReputation ? (
                        <span className="text-[7.5px] text-slate-400">
                          Click to swap
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {isTrackFull && selectedIndex !== null && (
              <p className="text-[11px] text-amber-400/90 italic">
                * Your reputation capacity is reached. Click one of your existing reputation tiles above to replace it (ambassador pacts cannot be replaced), or decline the drawn tile.
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
