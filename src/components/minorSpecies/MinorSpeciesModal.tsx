import React, { useState } from 'react';
import { GameState } from '../../engine/types/state';
import { PlayerState } from '../../engine/types/player';
import {
  MinorSpeciesTile,
  MinorSpeciesId,
  getAvailableAmbassadorSlotsCount,
  playerHasMinorSpecies,
} from '../../engine/rules/minorSpecies';
import {
  Users,
  Coins,
  Shield,
  Trophy,
  Hammer,
  FlaskConical,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  CheckCircle2,
  Info,
  Orbit,
} from 'lucide-react';

export interface MinorSpeciesModalProps {
  state: GameState;
  activePlayer: PlayerState;
  onClaimMinorSpecies: (speciesId: MinorSpeciesId, populationTrack?: 'money' | 'science' | 'material') => void;
  onClose: () => void;
}

export const MinorSpeciesModal: React.FC<MinorSpeciesModalProps> = ({
  state,
  activePlayer,
  onClaimMinorSpecies,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedPopulationTrack, setSelectedPopulationTrack] = useState<'money' | 'science' | 'material'>('money');

  const isCurrentTurn =
    state.phase === 'ACTION_PHASE' &&
    state.players[state.activePlayerIndex]?.id === activePlayer.id;

  const availableSlots = getAvailableAmbassadorSlotsCount(activePlayer);
  const supply = state.minorSpeciesSupply || [];

  // Find which player claimed which minor species
  const getClaimedByPlayer = (speciesId: MinorSpeciesId) => {
    return state.players.find((p) => p.ambassadorTiles?.includes(speciesId));
  };

  const getIcon = (targetType: MinorSpeciesTile['targetType']) => {
    switch (targetType) {
      case 'reputation':
      case 'ambassador':
        return <Shield className="w-5 h-5 text-indigo-400" />;
      case 'flat':
        return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'population':
        return <Users className="w-5 h-5 text-emerald-400" />;
      case 'cruiser':
      case 'dreadnought':
        return <Hammer className="w-5 h-5 text-cyan-400" />;
      case 'orbital':
        return <Orbit className="w-5 h-5 text-purple-400" />;
      case 'monolith':
        return <Sparkles className="w-5 h-5 text-yellow-400" />;
      case 'tech':
        return <FlaskConical className="w-5 h-5 text-pink-400" />;
      default:
        return <Users className="w-5 h-5 text-emerald-400" />;
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed top-20 right-4 z-50 animate-in fade-in duration-200">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/95 border-2 border-emerald-500/80 text-emerald-300 font-bold shadow-2xl backdrop-blur-md hover:bg-slate-800 transition cursor-pointer"
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span className="text-sm">Minor Species ({supply.length} Available)</span>
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 ml-1" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-18 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-135 max-w-2xl pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="relative w-full bg-slate-900/95 border-2 border-emerald-500/70 rounded-2xl shadow-2xl backdrop-blur-md p-4 sm:p-5 flex flex-col overflow-y-auto max-h-[calc(100vh-90px)]">
        {/* Glow accents */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="w-full flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-500/20 border border-emerald-400/40">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">Minor Species Embassy</h2>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
                  Expansion
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Form Diplomatic Relations by paying Money to claim Ambassador Tiles.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Minimize to inspect map"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Player Status Banner */}
        <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 mb-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Commander:</span>
            <span className="font-bold text-white" style={{ color: activePlayer.color }}>
              {activePlayer.name}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Money:</span>
              <span className="font-mono font-bold text-amber-300">{activePlayer.resources.money}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-400">Empty Amb Spaces:</span>
              <span className={`font-mono font-bold ${availableSlots > 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
                {availableSlots}
              </span>
            </div>
          </div>
        </div>

        {/* Available Supply */}
        <div className="w-full mb-3 text-left">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Available Minor Species in Galaxy ({supply.length})
          </h3>

          {supply.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-center text-xs text-slate-500">
              All Minor Species ambassador tiles have been claimed by galactic powers.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {supply.map((tile) => {
                const canAfford = activePlayer.resources.money >= tile.cost;
                const hasSlots = availableSlots > 0;
                const alreadyHas = playerHasMinorSpecies(activePlayer, tile.id);
                const canAlly = isCurrentTurn && canAfford && hasSlots && !alreadyHas;

                return (
                  <div
                    key={tile.id}
                    className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-emerald-500/50 transition flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">
                          {getIcon(tile.targetType)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            {tile.name}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 font-bold flex items-center gap-1">
                              <Coins className="w-3 h-3 text-amber-400" />
                              {tile.cost} Money
                            </span>
                          </h4>
                          <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1 mt-0.5">
                            <Trophy className="w-3 h-3" />
                            {tile.vpDescription}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                      {tile.abilityDescription}
                    </p>

                    {/* Population Track selection for Population Cube tile */}
                    {tile.id === 'minor_species_population_cube' && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50 flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold text-emerald-300">
                          Select Population Track for cube placement:
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {(['money', 'science', 'material'] as const).map((track) => (
                            <button
                              key={track}
                              type="button"
                              onClick={() => setSelectedPopulationTrack(track)}
                              className={`px-2 py-1 rounded text-xs font-bold capitalize transition border cursor-pointer ${
                                selectedPopulationTrack === track
                                  ? 'bg-emerald-600 border-emerald-400 text-white shadow'
                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              {track} ({activePlayer.population[track].cubesOnBoard} on board)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action button */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <div className="text-[11px] text-slate-400">
                        {!isCurrentTurn && <span className="text-amber-400">Can only ally during your turn</span>}
                        {isCurrentTurn && !canAfford && (
                          <span className="text-rose-400">Need {tile.cost} Money (have {activePlayer.resources.money})</span>
                        )}
                        {isCurrentTurn && canAfford && !hasSlots && (
                          <span className="text-rose-400">No empty Ambassador space on track</span>
                        )}
                        {isCurrentTurn && canAfford && hasSlots && (
                          <span className="text-emerald-400">Ready to form Diplomatic Relations</span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!canAlly}
                        onClick={() =>
                          onClaimMinorSpecies(
                            tile.id,
                            tile.id === 'minor_species_population_cube' ? selectedPopulationTrack : undefined
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                          canAlly
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        Ally (-{tile.cost} Money)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Claimed Minor Species in Galaxy */}
        {state.players.some((p) => p.ambassadorTiles?.some((id) => id.startsWith('minor_species_'))) && (
          <div className="w-full mt-2 pt-3 border-t border-slate-800 text-left">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              Allied Minor Species Across Galaxy
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {state.players.flatMap((p) =>
                (p.ambassadorTiles || [])
                  .filter((id) => id.startsWith('minor_species_'))
                  .map((id) => {
                    const tile = ALL_MINOR_SPECIES_TILES.find((m) => m.id === id);
                    if (!tile) return null;
                    return (
                      <div
                        key={`${p.id}_${id}`}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {getIcon(tile.targetType)}
                          <div>
                            <div className="font-bold text-white text-[11px]">{tile.name}</div>
                            <div className="text-[10px] text-slate-400">{tile.vpDescription}</div>
                          </div>
                        </div>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                          style={{
                            borderColor: p.color,
                            color: p.color,
                            backgroundColor: `${p.color}15`,
                          }}
                        >
                          {p.name}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* Rule note */}
        <div className="w-full mt-3 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-left flex items-start gap-2 text-[10px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
          <span>
            Minor Species tiles are placed on empty Ambassador Tile spaces ('amb_only' or 'both') on your Reputation Track and cannot be discarded. Relations can be formed at any time during your actions.
          </span>
        </div>
      </div>
    </div>
  );
};
