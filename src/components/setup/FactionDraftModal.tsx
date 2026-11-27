import React, { useState, useEffect } from 'react';
import { GameState } from '../../engine/types/state';
import { ALL_FACTIONS, getAvailableFactions, areFactionsConflictingColor } from '../../engine/rules/setup';
import { FactionInfo } from '../../engine/types/player';
import {
  Users,
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Eye,
  X,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  translateFactionName,
  translateFactionTrait,
} from '../../i18n/catalogTranslations';
import { FactionSheetCard } from '../common/FactionSheetCard';
import { getFactionSheetData } from '../../engine/rules/factionSheets';

interface FactionDraftModalProps {
  state: GameState;
  currentSeat?: number | 'all' | 'spectator';
  onDraftFaction: (factionId: string) => void;
  initialPreviewFactionId?: string | null;
}

export const FactionDraftModal: React.FC<FactionDraftModalProps> = ({
  state,
  currentSeat = 'all',
  onDraftFaction,
  initialPreviewFactionId = null,
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
  const [previewFactionId, setPreviewFactionId] = useState<string | null>(initialPreviewFactionId);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'alien' | 'human'>('all');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Clear preview if draft advances to a new pick or if an active drafter's preview becomes unavailable
  useEffect(() => {
    setPreviewFactionId(null);
  }, [draft.currentDraftIndex]);

  const filteredFactions = availableFactions.filter((f) => {
    if (categoryFilter === 'alien') return !f.isHuman;
    if (categoryFilter === 'human') return f.isHuman;
    return true;
  });

  const previewFaction = previewFactionId
    ? ALL_FACTIONS.find((f) => f.id === previewFactionId) || null
    : null;
  const isPreviewAvailable = Boolean(
    previewFaction && draft.availableFactionIds.includes(previewFaction.id)
  );

  const handleConfirmDraft = () => {
    if (!isCurrentDrafter || !previewFaction || !isPreviewAvailable) return;
    onDraftFaction(previewFaction.id);
    setPreviewFactionId(null);
  };

  if (isMinimized) {
    return (
      <div className="fixed top-14 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-2xl animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-indigo-500 rounded-2xl sm:rounded-full shadow-2xl backdrop-blur-md text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <Compass className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-bold text-xs sm:text-sm tracking-wide text-indigo-300 font-display whitespace-nowrap">
              {l(`DRAFT PICK #${draft.currentDraftIndex + 1}/${draft.draftOrder.length}`, `轮抽第 ${draft.currentDraftIndex + 1}/${draft.draftOrder.length} 顺位`)}
            </span>
            <div className="h-4 w-px bg-slate-800 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                style={{ backgroundColor: currentDrafter.color }}
              />
              <span className="text-xs font-bold text-slate-200 truncate">
                {isCurrentDrafter
                  ? l(`Your Turn (${currentDrafter.name})`, `当前轮到你 (${currentDrafter.name})`)
                  : l(`Waiting for ${currentDrafter.name}`, `等待 ${currentDrafter.name}`)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-indigo-950/50 flex items-center gap-1.5 cursor-pointer shrink-0"
            title={l('Return to faction draft panel', '返回种族轮抽面板')}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{l('Return to Draft', '返回选族')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div
        className={`bg-slate-900 border-2 border-indigo-500/80 rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[94vh] text-slate-100 animate-in fade-in zoom-in-95 duration-150 ${
          previewFaction ? 'max-w-6xl' : 'max-w-4xl'
        }`}
      >
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
                  'Seat (Pos) is your fixed Ring 2 spot on the galaxy map. Turn order runs clockwise from a random Start Player; Faction Draft runs counter-clockwise from last in Turn order.',
                  '席位（位置 Pos）代表你在二环星图上的固定母星格。行动序从随机起始玩家顺时针排列；选族序则从末位行动玩家开始逆时针挑选。'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition cursor-pointer shadow-sm"
              title={l('Minimize draft panel to inspect the galaxy map', '最小化轮抽窗口以查看二环星图')}
            >
              <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{l('View Map', '查看星图')}</span>
            </button>
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

        {previewFaction ? (
          <>
            {/* Faction Landscape Page Preview */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewFactionId(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{l('Back to Draft List', '返回轮抽列表')}</span>
                </button>
                <span className="text-xs text-slate-400 font-medium">
                  {l(
                    'Review full species sheet below before confirming your pick.',
                    '请在下方确认该势力的完整规则面板，随后选择确认或取消。'
                  )}
                </span>
              </div>

              <FactionSheetCard faction={previewFaction} />
            </div>

            {/* Preview Footer: Cancel (Return to Draft) / Confirm Selection */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 border-t border-slate-800 bg-slate-950">
              <div className="text-xs text-slate-400">
                {l('Previewing for', '当前轮抽玩家')} <strong className="text-white">{currentDrafter.name}</strong>:{' '}
                <span className="text-indigo-300 font-bold ml-1">
                  {translateFactionName(previewFaction.id, previewFaction.name, language)}
                </span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  data-testid="draft-preview-cancel"
                  onClick={() => setPreviewFactionId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                  <span>{l('Cancel (Back to Draft)', '取消（返回选族）')}</span>
                </button>

                <button
                  type="button"
                  data-testid="draft-preview-confirm"
                  onClick={handleConfirmDraft}
                  disabled={!isCurrentDrafter || !isPreviewAvailable}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-950 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCurrentDrafter ? (
                    isPreviewAvailable ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {l(
                            `Confirm Selection (${previewFaction.shortName || previewFaction.name})`,
                            `确认选择 (${translateFactionName(previewFaction.id, previewFaction.name, language)})`
                          )}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <span>{l('Faction Already Drafted / Unavailable', '该势力已被选或不可选')}</span>
                    )
                  ) : (
                    <span>{l(`Waiting for ${currentDrafter.name} to choose...`, `等待 ${currentDrafter.name} 做出选择...`)}</span>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
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
              const draftedByPlayer = !isAvailable
                ? state.players.find((p) => p.faction?.id === f.id)
                : null;
              const conflictingPlayer = !isAvailable && !draftedByPlayer
                ? state.players.find(
                    (p) =>
                      p.faction?.id &&
                      (p.faction.id as string) !== 'drafting' &&
                      areFactionsConflictingColor(p.faction.id, f.id)
                  )
                : null;

              const fName = translateFactionName(f.id, f.name, language);
              const portraitUrl = getFactionSheetData(f).portraitUrl;

              return (
                <div
                  key={f.id}
                  onClick={() => {
                    if (isAvailable) setPreviewFactionId(f.id);
                  }}
                  className={`p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                    isAvailable && isCurrentDrafter
                      ? 'bg-slate-950/60 border-slate-800 hover:border-indigo-400/80 hover:bg-slate-900/70 cursor-pointer'
                      : isAvailable
                      ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 cursor-pointer opacity-90'
                      : 'bg-slate-950/30 border-slate-900 opacity-45 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                          style={{ backgroundColor: f.defaultColor }}
                        />
                        <h3 className="font-bold text-sm text-slate-100 truncate">{fName}</h3>
                      </div>
                      <span
                        className={`text-[9.5px] px-2 py-0.5 rounded font-mono font-bold uppercase border shrink-0 ${
                          !f.isHuman
                            ? 'bg-purple-950/80 border-purple-700 text-purple-300'
                            : 'bg-sky-950/80 border-sky-700 text-sky-300'
                        }`}
                      >
                        {!f.isHuman ? l('Alien', '异星') : l('Terran', '人类')}
                      </span>
                    </div>

                    {portraitUrl && (
                      <div className="mb-2.5 aspect-[4/3] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                        <img
                          src={portraitUrl}
                          alt={fName}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    )}

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
                          data-testid={`draft-select-${f.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFactionId(f.id);
                          }}
                          className="w-full py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-sm cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{l(`Select ${f.shortName || f.name}`, `选择 ${fName}`)}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFactionId(f.id);
                          }}
                          className="w-full py-1 px-2.5 rounded-xl text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{l('Preview Sheet', '预览面板')}</span>
                        </button>
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
            {isCurrentDrafter
              ? l(
                  `Picking for ${currentDrafter.name} — Click Select on a faction to preview its full species sheet.`,
                  `轮到 ${currentDrafter.name} 挑选势力 —— 点击「选择」预览完整势力面板并确认。`
                )
              : l(`Waiting for ${currentDrafter.name} to choose...`, `等待 ${currentDrafter.name} 做出选择...`)}
          </div>
          <span className="text-[11px] font-mono text-indigo-300 font-semibold">
            {l(`${draft.availableFactionIds.length} Factions Available`, `剩余 ${draft.availableFactionIds.length} 个可选势力`)}
          </span>
        </div>
          </>
        )}
      </div>
    </div>
  );
};
