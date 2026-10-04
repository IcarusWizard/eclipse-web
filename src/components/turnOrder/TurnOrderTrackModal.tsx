import React from 'react';
import { X, ListOrdered, ArrowRight, Sparkles, CheckCircle2, Clock, Coins, Info } from 'lucide-react';
import { GameState } from '../../engine/types/state';

interface TurnOrderTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
}

export const TurnOrderTrackModal: React.FC<TurnOrderTrackModalProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  if (!isOpen) return null;

  // Order of players on the Turn Order Track this round
  const currentOrderPlayerIds = state.turnOrder && state.turnOrder.length > 0
    ? state.turnOrder
    : state.players.map((p) => p.id);

  const playersInCurrentOrder = currentOrderPlayerIds
    .map((pid) => state.players.find((p) => p.id === pid))
    .filter(Boolean) as GameState['players'];

  // Pass order: who claimed Next Turn Order Tiles 1, 2, 3...
  const passedPlayerIds = state.passedPlayerIds || [];

  // Active player taking their turn right now
  const activePlayer = state.players[state.activePlayerIndex];

  // Projected next round turn order
  const projectedNextOrderPlayerIds: string[] = [];
  // 1. Players who passed in sequence
  for (const pid of passedPlayerIds) {
    if (!projectedNextOrderPlayerIds.includes(pid)) {
      projectedNextOrderPlayerIds.push(pid);
    }
  }
  // 2. Remaining players who haven't passed yet
  for (const pid of currentOrderPlayerIds) {
    if (!projectedNextOrderPlayerIds.includes(pid)) {
      projectedNextOrderPlayerIds.push(pid);
    }
  }

  const nextAvailableTileNum = passedPlayerIds.length + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-700/50 text-purple-400">
              <ListOrdered className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider font-display">
                  Turn Order Track
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-900/60 text-purple-300 border border-purple-600/40">
                  Expansion Module
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {`Round ${state.round} Action Order & Next Round Order Determined by Pass Sequence`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Track Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                {`Current Round ${state.round} Turn Order Track`}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Actions proceed from left to right (Position 1 ➔ {playersInCurrentOrder.length})
              </span>
            </div>

            {/* Track Spaces Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {playersInCurrentOrder.map((player, slotIndex) => {
                const isFirstSpace = slotIndex === 0;
                const isCurrentTurn = activePlayer?.id === player.id;
                const passIndex = passedPlayerIds.indexOf(player.id);
                const hasPassed = passIndex !== -1;
                const nextTileNum = hasPassed ? passIndex + 1 : null;

                return (
                  <div
                    key={player.id}
                    className={`relative p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                      isFirstSpace
                        ? 'border-white/80 ring-2 ring-white/20 bg-slate-900/90 shadow-lg'
                        : 'border-slate-800 bg-slate-900/40'
                    } ${
                      isCurrentTurn
                        ? 'ring-2 ring-cyan-400/80 shadow-cyan-950/50 shadow-md bg-cyan-950/20'
                        : ''
                    }`}
                  >
                    {/* Top: Space Position & White-Border Start Player Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                            isFirstSpace
                              ? 'bg-white text-slate-950 font-black ring-2 ring-white/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {slotIndex + 1}
                        </span>
                        {isFirstSpace && (
                          <span className="text-[9px] uppercase font-bold text-white tracking-widest bg-slate-800 px-1.5 py-0.5 rounded border border-white/40">
                            Start Player Space
                          </span>
                        )}
                      </div>

                      {/* Current Turn indicator */}
                      {isCurrentTurn && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500 text-slate-950 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                          Active Turn
                        </span>
                      )}
                    </div>

                    {/* Turn Order Marker (Player details) */}
                    <div className="flex items-center gap-2.5 my-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow ring-2 ring-white/20 shrink-0"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-slate-100 truncate flex items-center gap-1.5">
                          <span>{player.name}</span>
                          {player.isEliminated && (
                            <span className="text-[9px] text-rose-400 uppercase font-mono font-bold">
                              Eliminated
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {player.factionName || 'Terran Directorate'}
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Next Turn Order Tile Status */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">
                        Next Round Tile:
                      </span>
                      {hasPassed ? (
                        <div
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-mono font-bold text-xs ${
                            nextTileNum === 1
                              ? 'bg-amber-950/80 border-amber-500/70 text-amber-200'
                              : 'bg-purple-950/60 border-purple-600/50 text-purple-200'
                          }`}
                          title={`Claimed Next Turn Order Tile #${nextTileNum}`}
                        >
                          <span className="text-[9px] uppercase tracking-wider">Tile</span>
                          <span className="text-sm font-black text-white">#{nextTileNum}</span>
                          {nextTileNum === 1 && (
                            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 italic font-mono">
                          <span>Pending (next: #{nextAvailableTileNum})</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Round Projected Turn Order Preview */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowRight className="w-4 h-4 text-purple-400" />
                {`Projected Round ${state.round + 1} Turn Order`}
              </span>
              <span className="text-[10px] text-slate-400">
                Updates in real-time as players pass
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {projectedNextOrderPlayerIds.map((pid, idx) => {
                const player = state.players.find((p) => p.id === pid);
                if (!player) return null;
                const hasPassed = passedPlayerIds.includes(pid);
                const tileNum = hasPassed ? passedPlayerIds.indexOf(pid) + 1 : null;

                return (
                  <React.Fragment key={pid}>
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                        idx === 0
                          ? 'bg-amber-950/50 border-amber-500/60 text-amber-200 ring-1 ring-amber-500/30'
                          : hasPassed
                          ? 'bg-slate-900 border-purple-500/50 text-slate-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 border-dashed'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="truncate max-w-[120px]">{player.name}</span>
                      {hasPassed ? (
                        <span className="text-[10px] font-mono font-bold px-1 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
                          Tile #{tileNum}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400 italic">
                          (unpassed)
                        </span>
                      )}
                    </div>
                    {idx < projectedNextOrderPlayerIds.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Rulebook Quick Guide */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs text-purple-200/90 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-purple-300 uppercase tracking-wide text-[11px]">
              <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              Turn Order Variant Rules Reference
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <li>
                <strong>Action Phase Order:</strong> Players take actions strictly in the order displayed on the Turn Order Track (Space 1 to {playersInCurrentOrder.length}), looping until all commanders pass.
              </li>
              <li>
                <strong>Passing:</strong> When a player Passes, they claim the lowest available Next Turn Order Tile (1st to pass gets #1, 2nd gets #2, etc.).
              </li>
              <li>
                <strong>First to Pass Bonus:</strong> The first player to pass receives Next Turn Order Tile #1 (Start Player next round) and immediately collects the +2 Credits bonus!
              </li>
              <li>
                <strong>Cleanup Reordering:</strong> At the end of Cleanup, Turn Order Markers are reordered in ascending sequence of their Next Turn Order Tiles.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Close Track
          </button>
        </div>
      </div>
    </div>
  );
};
