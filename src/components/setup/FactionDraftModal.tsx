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
import { useLanguage } from '../../i18n/LanguageContext';
import {
  translateFactionName,
  translateFactionTrait,
} from '../../i18n/catalogTranslations';

interface FactionDraftModalProps {
  state: GameState;
  currentSeat?: number | 'all' | 'spectator';
  onDraftFaction: (factionId: string) => void;
}

export const FactionDraftModal: React.FC<FactionDraftModalProps> = ({
  state,
  currentSeat = 'all',
  onDraftFaction,
}) => {
  const { language, l } = useLanguage();
  const draft = state.factionDraft;
  if (!draft) return null;

  const currentDrafterId = draft.draftOrder[draft.currentDraftIndex];
  const currentDrafter = state.players.find((p) => p.id === currentDrafterId) || state.players[0];

  const isSpectator = currentSeat === 'spectator';
  const isCurrentDrafter =
    !isSpectator &&
    (currentSeat === 'all' ||
      (typeof currentSeat === 'number' && state.players[currentSeat]?.id === currentDrafterId));

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
    if (!isCurrentDrafter) return;
    if (!selectedFactionId || !draft.availableFactionIds.includes(selectedFactionId)) return;
    onDraftFaction(selectedFactionId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border-2 border-indigo-500/80 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[94vh] text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 border-b border-indigo-950 bg-slate-950">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-indigo-300 font-display">
                  {l('OFFICIAL FACTION DRAFT', '官方规则种族轮抽')}
                </h2>
                <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700/60 text-indigo-300 text-[10px] font-mono font-bold">
                  {l(`PICK #${draft.currentDraftIndex + 1} OF ${draft.draftOrder.length}`, `第 ${draft.currentDraftIndex + 1} / ${draft.draftOrder.length} 顺位`)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {l(
                  'Seating randomly assigned on Ring 2. Turn order runs clockwise; faction drafting runs counter-clockwise from the last player.',
                  '玩家二环母星位置已随机分配。行动顺序为顺时针，而种族挑选从最后一位玩家开始逆时针进行。'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {!isCurrentDrafter && (
              <span className="px-2.5 py-1 rounded-xl bg-amber-950/70 border border-amber-600/70 text-amber-300 text-xs font-bold animate-pulse">
                {currentSeat === 'spectator'
                  ? l(`Spectator Mode (Observing Pick by ${currentDrafter.name})`, `观战模式（正观看 ${currentDrafter.name} 挑选）`)
                  : l(`Waiting for ${currentDrafter.name} to select...`, `等待 ${currentDrafter.name} 选择势力...`)}
              </span>
            )}
            <div className="px-3 py-1 rounded-xl bg-indigo-950/60 border border-indigo-600/60 flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full border border-white/40"
                style={{ backgroundColor: currentDrafter.color }}
              />
              <span className="text-xs font-bold text-indigo-200">
                {l('Turn:', '当前：')} <strong className="text-white">{currentDrafter.name}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto scrollbar-thin">
        {/* Seating & Draft Order Bar */}
        <div className="shrink-0 bg-slate-950/60 border-b border-slate-800 p-3">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {l('Table Seating & Drafting Sequence', '席位与轮抽顺序')}
            </span>
            <span className="text-slate-500">
              {l('Clockwise Turn Order ➔ Counter-Clockwise Faction Draft', '顺时针行动 ➔ 逆时针选族')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {draft.draftOrder.map((pId, draftIdx) => {
              const p = state.players.find((pl) => pl.id === pId) || {
                id: pId,
                name: pId,
                color: '#fff',
                faction: { id: 'drafting', name: 'Drafting' },
              };
              const pos = draft.assignedPositions?.[pId] ?? 0;
              const turnOrderNum = state.turnOrder.indexOf(pId) + 1;
              const isCurrent = draft.currentDraftIndex === draftIdx;
              const hasDrafted = draftIdx < draft.currentDraftIndex;
              const draftedFaction = hasDrafted && p.faction?.id !== 'drafting' ? p.faction : null;

              return (
                <div
                  key={pId}
                  className={`min-w-0 p-2 rounded-xl border text-xs flex flex-col justify-between transition ${
                    isCurrent
                      ? 'bg-indigo-950/80 border-indigo-400 ring-2 ring-indigo-500/40 shadow-md'
                      : hasDrafted
                      ? 'bg-slate-900/80 border-slate-700/80'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
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
                      <span className="shrink-0 whitespace-nowrap animate-pulse text-[9px] px-1 py-0.5 bg-indigo-500 text-slate-950 font-black rounded">
                        {l('NOW', '当前')}
                      </span>
                    )}
                    {hasDrafted && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </div>

                  <div className="space-y-0.5 text-[10px] font-mono text-slate-400">
                    <div className="flex justify-between">
                      <span>{l('Seat:', '席位：')}</span>
                      <strong className="text-slate-300">{l(`Pos ${pos + 1}`, `位置 ${pos + 1}`)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>{l('Turn:', '行动序：')}</span>
                      <strong className="text-cyan-300">#{turnOrderNum}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>{l('Draft:', '选族序：')}</span>
                      <strong className="text-amber-300">#{draftIdx + 1}</strong>
                    </div>
                  </div>

                  <div className="mt-1 pt-1 border-t border-slate-800/80 text-[10px] font-medium truncate">
                    {draftedFaction ? (
                      <span className="text-emerald-300 font-bold truncate block">
                        {translateFactionName(draftedFaction.id, draftedFaction.name, language)}
                      </span>
                    ) : isCurrent ? (
                      <span className="text-indigo-300 font-bold italic">{l('Choosing...', '挑选势力中...')}</span>
                    ) : (
                      <span className="text-slate-500 italic">{l('Waiting...', '等待中...')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Faction Filter Tabs */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {l(`All Factions (${availableFactions.length})`, `全部势力 (${availableFactions.length})`)}
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
              {l(
                `Alien Factions (${availableFactions.filter((f) => !f.isHuman).length})`,
                `异星种族 (${availableFactions.filter((f) => !f.isHuman).length})`
              )}
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
              {l(
                `Terran / Human (${availableFactions.filter((f) => f.isHuman).length})`,
                `人类势力 (${availableFactions.filter((f) => f.isHuman).length})`
              )}
            </button>
          </div>

          <span className="text-xs text-slate-400">
            {l('Available to draft:', '剩余可选：')}{' '}
            <strong className="text-indigo-300 font-bold">{draft.availableFactionIds.length}</strong>
          </span>
        </div>

        {/* Factions Grid */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 min-h-[180px] scrollbar-thin">
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

              const fName = translateFactionName(f.id, f.name, language);

              return (
                <div
                  key={f.id}
                  onClick={() => {
                    if (isAvailable && isCurrentDrafter) setSelectedFactionId(f.id);
                  }}
                  className={`p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-950/70 border-indigo-400 ring-2 ring-indigo-400/50 shadow-lg cursor-pointer'
                      : isAvailable && isCurrentDrafter
                      ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 cursor-pointer'
                      : isAvailable
                      ? 'bg-slate-950/60 border-slate-800/80 cursor-default opacity-85'
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
                        <h3 className="font-bold text-sm text-slate-100">{fName}</h3>
                      </div>
                      <span
                        className={`text-[9.5px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                          !f.isHuman
                            ? 'bg-purple-950/80 border-purple-700 text-purple-300'
                            : 'bg-sky-950/80 border-sky-700 text-sky-300'
                        }`}
                      >
                        {!f.isHuman ? l('Alien', '异星') : l('Terran', '人类')}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug mb-3">
                      {translateFactionTrait(f.id, f.traitDescription, language)}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900/90 p-2 rounded-xl border border-slate-800/80 font-mono mb-2">
                      <div>
                        <span className="text-slate-500 block">{l('Starting Discs:', '初始圆片：')}</span>
                        <strong className="text-slate-200">{f.startingDiscs}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{l('Colony Ships:', '殖民船：')}</span>
                        <strong className="text-slate-200">{f.startingColonyShips}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{l('Resources:', '初始资源：')}</span>
                        <span className="text-slate-300">
                          {f.startingResources.money}{l('M', '金')} / {f.startingResources.science}{l('S', '科')} / {f.startingResources.materials}{l('Mat', '材')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{l('Starting Tech:', '初始科技：')}</span>
                        <span className="text-slate-300 truncate block">
                          {f.startingTechIds?.length || 0} {l('Technologies', '项科技')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    {isAvailable ? (
                      isCurrentDrafter ? (
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
                              <span>{l('Selected for Pick', '已预选')}</span>
                            </>
                          ) : (
                            <span>{l(`Select ${f.shortName || f.name}`, `选择 ${fName}`)}</span>
                          )}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium italic flex items-center gap-1.5 w-full justify-center py-1">
                          {l('Available to Draft', '可选中')}
                        </span>
                      )
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium italic flex items-center gap-1.5 w-full justify-center py-1">
                        <Lock className="w-3 h-3" />
                        {draftedByPlayer
                          ? l(`Drafted by ${draftedByPlayer.name}`, `已被 ${draftedByPlayer.name} 选中`)
                          : conflictingPlayer
                          ? l(
                              `Color Taken (${conflictingPlayer.faction.name})`,
                              `阵营颜色冲突 (${translateFactionName(conflictingPlayer.faction.id, conflictingPlayer.faction.name, language)})`
                            )
                          : l('Unavailable', '不可选')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        </div>

        {/* Footer */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 border-t border-slate-800 bg-slate-950">
          <div className="text-xs text-slate-400">
            {l('Selected Pick for', '当前选择属于')} <strong className="text-white">{currentDrafter.name}</strong>:{' '}
            {selectedFaction ? (
              <span className="text-indigo-300 font-bold ml-1">
                {translateFactionName(selectedFaction.id, selectedFaction.name, language)}
              </span>
            ) : (
              <span className="text-amber-400 italic ml-1">{l('None selected', '尚未选择')}</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirmDraft}
            disabled={!isCurrentDrafter || !selectedFactionId || !draft.availableFactionIds.includes(selectedFactionId)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-950 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isCurrentDrafter ? (
              <>
                <span>
                  {l(
                    `Confirm Draft Pick (${selectedFaction?.shortName || selectedFaction?.name})`,
                    `确认选择 (${selectedFaction ? translateFactionName(selectedFaction.id, selectedFaction.name, language) : ''})`
                  )}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <span>{l(`Waiting for ${currentDrafter.name} to choose...`, `等待 ${currentDrafter.name} 做出选择...`)}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
