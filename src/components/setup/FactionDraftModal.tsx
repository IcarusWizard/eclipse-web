import React, { useState, useEffect } from 'react';
import { GameState } from '../../engine/types/state';
import { ALL_FACTIONS, getAvailableFactions, areFactionsConflictingColor } from '../../engine/rules/setup';
import { FactionInfo } from '../../engine/types/faction';
import {
  Sparkles,
  Users,
  Compass,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Shield,
  Zap,
} from 'lucide-react';

interface FactionDraftModalProps {
  state: GameState;
  onDraftFaction: (factionId: string) => void;
}

export const FactionDraftModal: React.FC<FactionDraftModalProps> = ({
  state,
  onDraftFaction,
}) => {
  const draft = state.factionDraft;
  if (!draft) return null;

  const currentDrafterId = draft.draftOrder[draft.currentDraftIndex];
  const currentDrafter = state.players.find((p) => p.id === currentDrafterId) || state.players[0];

  const availableFactions = getAvailableFactions(state.expansions || []);
  const [selectedFactionId, setSelectedFactionId] = useState<string>(
    draft.availableFactionIds[0] || availableFactions[0]?.id || ''
  );
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'alien' | 'human'>('all');

  useEffect(() => {
    if (!draft.availableFactionIds.includes(selectedFactionId)) {
      setSelectedFactionId(draft.availableFactionIds[0] || '');
    }
  }, [draft.currentDraftIndex, draft.availableFactionIds, selectedFactionId]);

  const filteredFactions = availableFactions.filter((f) => {
    if (categoryFilter === 'alien') return !f.isHuman;
    if (categoryFilter === 'human') return f.isHuman;
    return true;
  });

  const selectedFaction = ALL_FACTIONS.find((f) => f.id === selectedFactionId);

  const handleConfirmDraft = () => {
    if (!selectedFactionId || !draft.availableFactionIds.includes(selectedFactionId)) return;
    onDraftFaction(selectedFactionId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border-2 border-indigo-500/80 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-indigo-950 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-indigo-300 font-display">
                  OFFICIAL FACTION DRAFT
                </h2>
                <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700/60 text-indigo-300 text-[10px] font-mono font-bold">
                  PICK #{draft.currentDraftIndex + 1} OF {draft.draftOrder.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Seating randomly assigned on Ring 2. Turn order runs clockwise; faction drafting runs counter-clockwise from the last player.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-indigo-950/60 border border-indigo-600/60 flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full border border-white/40"
                style={{ backgroundColor: currentDrafter.color }}
              />
              <span className="text-xs font-bold text-indigo-200">
                Turn: <strong className="text-white">{currentDrafter.name}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Seating & Draft Order Bar */}
        <div className="bg-slate-950/60 border-b border-slate-800 p-3 overflow-x-auto">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Table Seating & Drafting Sequence
            </span>
            <span className="text-slate-500">
              Clockwise Turn Order ➔ Counter-Clockwise Faction Draft
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {draft.draftOrder.map((pId, draftIdx) => {
              const p = state.players.find((pl) => pl.id === pId) || {
                id: pId,
                name: pId,
                color: '#fff',
                faction: { id: 'drafting', name: 'Drafting' },
              };
              const pos = draft.assignedPositions[pId] ?? 0;
              const turnOrderNum = state.turnOrder.indexOf(pId) + 1;
              const isCurrent = draft.currentDraftIndex === draftIdx;
              const hasDrafted = draftIdx < draft.currentDraftIndex;
              const draftedFaction = hasDrafted && p.faction?.id !== 'drafting' ? p.faction : null;

              return (
                <div
                  key={pId}
                  className={`p-2 rounded-xl border text-xs flex flex-col justify-between transition ${
                    isCurrent
                      ? 'bg-indigo-950/80 border-indigo-400 ring-2 ring-indigo-500/40 shadow-md'
                      : hasDrafted
                      ? 'bg-slate-900/80 border-slate-700/80'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/30"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-bold truncate text-[11px] text-slate-200">
                        {p.name}
                      </span>
                    </div>
                    {isCurrent && (
                      <span className="animate-pulse text-[9px] px-1 py-0.2 bg-indigo-500 text-slate-950 font-black rounded">
                        NOW
                      </span>
                    )}
                    {hasDrafted && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </div>

                  <div className="space-y-0.5 text-[10px] font-mono text-slate-400">
                    <div className="flex justify-between">
                      <span>Seat:</span>
                      <strong className="text-slate-300">Pos {pos + 1}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Turn:</span>
                      <strong className="text-cyan-300">#{turnOrderNum} in Turn</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Draft:</span>
                      <strong className="text-amber-300">Pick #{draftIdx + 1}</strong>
                    </div>
                  </div>

                  <div className="mt-1 pt-1 border-t border-slate-800/80 text-[10px] font-medium truncate">
                    {draftedFaction ? (
                      <span className="text-emerald-300 font-bold truncate block">
                        {draftedFaction.name}
                      </span>
                    ) : isCurrent ? (
                      <span className="text-indigo-300 font-bold italic">Choosing...</span>
                    ) : (
                      <span className="text-slate-500 italic">Waiting...</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Faction Filter Tabs */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Factions ({availableFactions.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('alien')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                categoryFilter === 'alien'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alien Factions ({availableFactions.filter((f) => !f.isHuman).length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('human')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                categoryFilter === 'human'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Terran / Human ({availableFactions.filter((f) => f.isHuman).length})
            </button>
          </div>

          <span className="text-xs text-slate-400">
            Available to draft:{' '}
            <strong className="text-indigo-300 font-bold">{draft.availableFactionIds.length}</strong>
          </span>
        </div>

        {/* Factions Grid */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFactions.map((f) => {
              const isAvailable = draft.availableFactionIds.includes(f.id);
              const isSelected = selectedFactionId === f.id && isAvailable;
              const draftedByPlayer = !isAvailable
                ? state.players.find((p) => p.faction?.id === f.id)
                : null;
              const conflictingPlayer = !isAvailable && !draftedByPlayer
                ? state.players.find(
                    (p) =>
                      p.faction?.id &&
                      p.faction.id !== 'drafting' &&
                      areFactionsConflictingColor(p.faction.id, f.id)
                  )
                : null;

              return (
                <div
                  key={f.id}
                  onClick={() => {
                    if (isAvailable) setSelectedFactionId(f.id);
                  }}
                  className={`p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-950/70 border-indigo-400 ring-2 ring-indigo-400/50 shadow-lg cursor-pointer'
                      : isAvailable
                      ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 cursor-pointer'
                      : 'bg-slate-950/30 border-slate-900 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                          style={{ backgroundColor: f.defaultColor }}
                        />
                        <h3 className="font-bold text-sm text-slate-100">{f.name}</h3>
                      </div>
                      <span
                        className={`text-[9.5px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                          !f.isHuman
                            ? 'bg-purple-950/80 border-purple-700 text-purple-300'
                            : 'bg-sky-950/80 border-sky-700 text-sky-300'
                        }`}
                      >
                        {!f.isHuman ? 'Alien' : 'Terran'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug mb-3">
                      {f.traitDescription}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900/90 p-2 rounded-xl border border-slate-800/80 font-mono mb-2">
                      <div>
                        <span className="text-slate-500 block">Starting Discs:</span>
                        <strong className="text-slate-200">{f.startingDiscs}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Colony Ships:</span>
                        <strong className="text-slate-200">{f.startingColonyShips}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Resources:</span>
                        <span className="text-slate-300">
                          {f.startingResources.money}M / {f.startingResources.science}S / {f.startingResources.materials}Mat
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Starting Tech:</span>
                        <span className="text-slate-300 truncate block">
                          {f.startingTechIds?.length || 0} Technologies
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    {isAvailable ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFactionId(f.id);
                        }}
                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Selected for Pick</span>
                          </>
                        ) : (
                          <span>Select {f.shortName || f.name}</span>
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium italic flex items-center gap-1.5 w-full justify-center py-1">
                        <Lock className="w-3 h-3" />
                        {draftedByPlayer
                          ? `Drafted by ${draftedByPlayer.name}`
                          : conflictingPlayer
                          ? `Color Taken (${conflictingPlayer.faction.name})`
                          : 'Unavailable'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950">
          <div className="text-xs text-slate-400">
            Selected Pick for <strong className="text-white">{currentDrafter.name}</strong>:{' '}
            {selectedFaction ? (
              <span className="text-indigo-300 font-bold ml-1">{selectedFaction.name}</span>
            ) : (
              <span className="text-amber-400 italic ml-1">None selected</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirmDraft}
            disabled={!selectedFactionId || !draft.availableFactionIds.includes(selectedFactionId)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-950 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Confirm Draft Pick ({selectedFaction?.shortName || selectedFaction?.name})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
