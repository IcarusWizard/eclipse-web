import React, { useState, useEffect } from 'react';
import { ALL_FACTIONS, HUMAN_FACTIONS, ALIEN_FACTIONS } from '../../engine/rules/setup';
import { FactionInfo } from '../../engine/types/player';
import {
  Users,
  Play,
  Radio,
  Shield,
  Sparkles,
  Shuffle,
  ChevronLeft,
  Check,
  RotateCcw,
  Coins,
  FlaskConical,
  Hammer,
  CircleDot,
  Compass,
} from 'lucide-react';

interface NewGameModalProps {
  onStartGame: (playerCount: number, selectedFactionIds?: string[]) => void;
  onClose?: () => void;
}

export const NewGameModal: React.FC<NewGameModalProps> = ({ onStartGame, onClose }) => {
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [draftedFactions, setDraftedFactions] = useState<string[]>([]);
  const [currentDrafterIndex, setCurrentDrafterIndex] = useState<number>(0);
  const [filterCategory, setFilterCategory] = useState<'all' | 'alien' | 'human'>('all');

  // When player count changes, clamp / reset drafting
  useEffect(() => {
    setDraftedFactions((prev) => prev.slice(0, playerCount));
    setCurrentDrafterIndex((prev) => Math.min(prev, playerCount - 1));
  }, [playerCount]);

  const allDrafted = draftedFactions.length === playerCount;

  const handleSelectFaction = (factionId: string) => {
    const newDraft = [...draftedFactions];
    newDraft[currentDrafterIndex] = factionId;
    setDraftedFactions(newDraft);

    if (currentDrafterIndex < playerCount - 1) {
      setCurrentDrafterIndex(currentDrafterIndex + 1);
    }
  };

  const handleBackStep = () => {
    if (currentDrafterIndex > 0) {
      setCurrentDrafterIndex(currentDrafterIndex - 1);
    }
  };

  const handleResetDraft = () => {
    setDraftedFactions([]);
    setCurrentDrafterIndex(0);
  };

  const handleRandomize = () => {
    // Pick N unique factions randomly across all available factions
    const shuffled = [...ALL_FACTIONS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, playerCount).map((f) => f.id);
    setDraftedFactions(selected);
    setCurrentDrafterIndex(playerCount - 1);
  };

  const handleLaunch = () => {
    if (draftedFactions.length === playerCount) {
      onStartGame(playerCount, draftedFactions);
    }
  };

  const filteredFactions = ALL_FACTIONS.filter((f) => {
    if (filterCategory === 'alien') return !f.isHuman;
    if (filterCategory === 'human') return f.isHuman;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl p-5 text-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-700/80 text-cyan-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-cyan-300 tracking-wide">
                COMMENCE NEW EXPEDITION
              </h2>
              <p className="text-xs text-slate-400">
                Turn-by-turn civilization drafting for hotseat commanders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRandomize}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-700/70 text-xs font-semibold transition"
              title="Randomly assign distinct factions to all commanders"
            >
              <Shuffle className="w-3.5 h-3.5" /> Quick Randomize
            </button>
            <button
              onClick={handleResetDraft}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition"
              title="Reset drafting from Player 1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>

        {/* Player Count & Turn-by-Turn Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 border-b border-slate-800/80 bg-slate-950/40 px-2 rounded-xl my-2">
          {/* Player Count Selector */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" /> Number of Commanders:
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  onClick={() => setPlayerCount(count)}
                  className={`py-1.5 rounded-lg font-bold text-xs border transition-all ${
                    playerCount === count
                      ? 'bg-cyan-600 border-cyan-400 text-slate-950 shadow shadow-cyan-950 font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {count}P
                </button>
              ))}
            </div>
          </div>

          {/* Commander Stepper Chips */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Draft Progress:
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: playerCount }).map((_, pIdx) => {
                const isCurrent = pIdx === currentDrafterIndex;
                const draftedId = draftedFactions[pIdx];
                const factionObj = ALL_FACTIONS.find((f) => f.id === draftedId);

                return (
                  <button
                    key={pIdx}
                    onClick={() => setCurrentDrafterIndex(pIdx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                      isCurrent
                        ? 'border-cyan-400 bg-cyan-950/70 text-cyan-200 ring-1 ring-cyan-400/50'
                        : factionObj
                        ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-300'
                        : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-mono text-[10px]">P{pIdx + 1}:</span>
                    {factionObj ? (
                      <span className="font-bold flex items-center gap-1 text-[11px]">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: factionObj.defaultColor }}
                        />
                        {factionObj.name}
                      </span>
                    ) : (
                      <span className="italic text-slate-500 text-[10px]">Unselected</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drafter Active Banner & Filter Tabs */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Commander {currentDrafterIndex + 1}
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {draftedFactions[currentDrafterIndex]
                ? `Currently chosen: ${
                    ALL_FACTIONS.find((f) => f.id === draftedFactions[currentDrafterIndex])?.name
                  }`
                : 'Select your civilization from the available factions below:'}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                filterCategory === 'all'
                  ? 'bg-slate-800 text-slate-100 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All (12)
            </button>
            <button
              onClick={() => setFilterCategory('alien')}
              className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                filterCategory === 'alien'
                  ? 'bg-purple-900/60 text-purple-200 font-bold border border-purple-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alien Species (6)
            </button>
            <button
              onClick={() => setFilterCategory('human')}
              className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                filterCategory === 'human'
                  ? 'bg-cyan-900/60 text-cyan-200 font-bold border border-cyan-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Terran Factions (6)
            </button>
          </div>
        </div>

        {/* Faction Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredFactions.map((faction) => {
            const claimedPlayerIndex = draftedFactions.findIndex(
              (id, idx) => id === faction.id && idx !== currentDrafterIndex
            );
            const isClaimedByOther = claimedPlayerIndex !== -1;
            const isSelectedByCurrent = draftedFactions[currentDrafterIndex] === faction.id;

            return (
              <div
                key={faction.id}
                onClick={() => {
                  if (!isClaimedByOther) {
                    handleSelectFaction(faction.id);
                  }
                }}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all select-none ${
                  isSelectedByCurrent
                    ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-950 ring-2 ring-cyan-400/60 cursor-pointer'
                    : isClaimedByOther
                    ? 'border-slate-800/80 bg-slate-950/40 opacity-45 cursor-not-allowed'
                    : 'border-slate-800 bg-slate-900/90 hover:border-slate-600 hover:bg-slate-850 cursor-pointer'
                }`}
              >
                <div>
                  {/* Faction Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/30"
                        style={{ backgroundColor: faction.defaultColor }}
                      />
                      <span className="font-bold text-xs text-slate-100 font-display">
                        {faction.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                          faction.isHuman
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
                            : 'bg-purple-950 text-purple-300 border border-purple-800/80'
                        }`}
                      >
                        {faction.isHuman ? 'Terran' : 'Alien'}
                      </span>
                      <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 font-mono">
                        Sec {faction.startingSectorNumber}
                      </span>
                    </div>
                  </div>

                  {/* Resources & Initial Assets */}
                  <div className="grid grid-cols-5 gap-1 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/70 text-center font-mono text-[10px] mb-2">
                    <div title="Starting Money">
                      <span className="text-[8px] text-slate-500 block font-sans">Money</span>
                      <span className="text-yellow-400 font-bold">{faction.startingResources.money}</span>
                    </div>
                    <div title="Starting Science">
                      <span className="text-[8px] text-slate-500 block font-sans">Sci</span>
                      <span className="text-pink-400 font-bold">{faction.startingResources.science}</span>
                    </div>
                    <div title="Starting Materials">
                      <span className="text-[8px] text-slate-500 block font-sans">Mat</span>
                      <span className="text-amber-400 font-bold">{faction.startingResources.materials}</span>
                    </div>
                    <div title="Starting Colony Ships">
                      <span className="text-[8px] text-slate-500 block font-sans">Colony</span>
                      <span className="text-emerald-400 font-bold">{faction.startingColonyShips}</span>
                    </div>
                    <div title="Starting Discs">
                      <span className="text-[8px] text-slate-500 block font-sans">Discs</span>
                      <span className="text-indigo-400 font-bold">{faction.startingDiscs}</span>
                    </div>
                  </div>

                  {/* Starting Techs & Trade */}
                  <div className="text-[10px] space-y-1 mb-2">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Trade Ratio:</span>
                      <span className="font-mono font-bold text-slate-200">{faction.tradeRatio}:1</span>
                    </div>
                    <div className="flex items-start justify-between gap-1 text-slate-400">
                      <span className="shrink-0">Starting Techs:</span>
                      <span className="font-mono text-slate-300 text-right font-medium">
                        {faction.startingTechIds.length > 0
                          ? faction.startingTechIds
                              .map((t) => t.replace(/_/g, ' ').toUpperCase())
                              .join(', ')
                          : 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Traits Description */}
                  <p className="text-[10.5px] text-slate-400 leading-snug line-clamp-3">
                    {faction.traitDescription}
                  </p>
                </div>

                {/* Bottom Status / Selection Button */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                  {isClaimedByOther ? (
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center py-1 bg-slate-950/60 rounded">
                      Claimed by Player {claimedPlayerIndex + 1}
                    </div>
                  ) : isSelectedByCurrent ? (
                    <div className="flex items-center justify-center gap-1 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 text-xs font-bold">
                      <Check className="w-3.5 h-3.5" /> Selected for Player {currentDrafterIndex + 1}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectFaction(faction.id);
                      }}
                      className="w-full py-1 text-center rounded bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 text-slate-300 text-[11px] font-bold uppercase tracking-wider transition"
                    >
                      Draft Faction
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentDrafterIndex > 0 && (
              <button
                onClick={handleBackStep}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous Player
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
              >
                Cancel
              </button>
            )}
          </div>

          <button
            disabled={!allDrafted}
            onClick={handleLaunch}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg ${
              allDrafted
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-950 cursor-pointer animate-pulse'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Play className="w-4 h-4 fill-current" /> Launch Galaxy ({draftedFactions.length} / {playerCount} Drafted)
          </button>
        </div>
      </div>
    </div>
  );
};
