import React, { useState, useEffect } from 'react';
import {
  ALL_FACTIONS,
  HUMAN_FACTIONS,
  ALIEN_FACTIONS,
  areFactionsConflictingColor,
  FACTION_COLOR_GROUP,
  FactionColorGroup,
  isFactionAvailable,
  getAvailableFactions,
} from '../../engine/rules/setup';
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
  Dices,
} from 'lucide-react';
import { AVAILABLE_EXPANSIONS } from '../../engine/rules/expansions';
import {
  NeutralShipType,
  NeutralShipSelection,
  NeutralShipSelectionConfig,
} from '../../engine/rules/neutralShips';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  translateFactionName,
  translateFactionTrait,
  translateExpansionName,
  translateTechName,
} from '../../i18n/catalogTranslations';

interface NewGameModalProps {
  onStartGame: (
    playerCount: number,
    selectedFactionIds?: string[],
    expansions?: string[],
    neutralShips?: NeutralShipSelectionConfig,
    isDraftMode?: boolean,
    botSeats?: boolean[]
  ) => void;
  onClose?: () => void;
}

export const NewGameModal: React.FC<NewGameModalProps> = ({ onStartGame, onClose }) => {
  const { language, l } = useLanguage();
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [isDraftMode, setIsDraftMode] = useState<boolean>(false);
  const [draftedFactions, setDraftedFactions] = useState<string[]>([]);
  const [botSeats, setBotSeats] = useState<boolean[]>([false, false, false, false, false, false]);
  const [currentDrafterIndex, setCurrentDrafterIndex] = useState<number>(0);
  const [filterCategory, setFilterCategory] = useState<'all' | 'alien' | 'human'>('all');
  const [selectedExpansions, setSelectedExpansions] = useState<string[]>([]);
  const [neutralShipSelections, setNeutralShipSelections] = useState<NeutralShipSelectionConfig>({
    ancient: 'default',
    guardian: 'default',
    gcds: 'default',
  });

  const allExpansionIds = AVAILABLE_EXPANSIONS.map((e) => e.id);
  const allExpansionsSelected = allExpansionIds.every((id) => selectedExpansions.includes(id));

  const toggleAllExpansions = () => {
    if (allExpansionsSelected) {
      setSelectedExpansions([]);
      setNeutralShipSelections((cur) => ({
        ancient: cur.ancient === 'expert' ? 'default' : cur.ancient,
        guardian: cur.guardian === 'expert' ? 'default' : cur.guardian,
        gcds: cur.gcds === 'expert' ? 'default' : cur.gcds,
      }));
      setDraftedFactions((cur) => cur.filter((fid) => isFactionAvailable(fid, [])));
    } else {
      setSelectedExpansions(allExpansionIds);
    }
  };

  const toggleExpansion = (id: string) => {
    setSelectedExpansions((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!next.includes('remnants_of_worlds_afar')) {
        setNeutralShipSelections((cur) => ({
          ancient: cur.ancient === 'expert' ? 'default' : cur.ancient,
          guardian: cur.guardian === 'expert' ? 'default' : cur.guardian,
          gcds: cur.gcds === 'expert' ? 'default' : cur.gcds,
        }));
      }
      setDraftedFactions((cur) => cur.filter((fid) => isFactionAvailable(fid, next)));
      return next;
    });
  };

  // When player count changes, clamp / reset drafting
  useEffect(() => {
    setDraftedFactions((prev) => prev.slice(0, playerCount));
    setCurrentDrafterIndex((prev) => Math.min(prev, playerCount - 1));
  }, [playerCount]);

  useEffect(() => {
    setCurrentDrafterIndex((prev) => Math.min(prev, Math.max(0, Math.min(draftedFactions.length, playerCount - 1))));
  }, [draftedFactions.length, playerCount]);

  const allDrafted = isDraftMode || draftedFactions.length === playerCount;

  const handleSelectFaction = (factionId: string) => {
    if (!availableFactions.some((f) => f.id === factionId)) return;
    const conflictingPlayerIndex = draftedFactions.findIndex(
      (id, idx) => idx !== currentDrafterIndex && areFactionsConflictingColor(id, factionId)
    );
    if (conflictingPlayerIndex !== -1) return;

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

  const availableFactions = getAvailableFactions(selectedExpansions);

  const handleRandomize = () => {
    // Pick N factions with distinct colors randomly across all available factions
    const colorGroups: FactionColorGroup[] = ['red', 'blue', 'green', 'yellow', 'white', 'black'];
    if (selectedExpansions.includes('seekers')) {
      colorGroups.push('purple', 'orange');
    }
    if (selectedExpansions.includes('outcasts')) {
      colorGroups.push('teal', 'amber');
    }
    if (selectedExpansions.includes('community_factions')) {
      colorGroups.push('cyan', 'indigo', 'magenta');
    }
    const shuffledColors = [...colorGroups].sort(() => Math.random() - 0.5).slice(0, playerCount);
    const selected: string[] = [];
    for (const color of shuffledColors) {
      const candidates = availableFactions.filter((f) => FACTION_COLOR_GROUP[f.id] === color);
      if (candidates.length > 0) {
        const chosen = candidates[Math.floor(Math.random() * candidates.length)]!;
        selected.push(chosen.id);
      }
    }
    setDraftedFactions(selected);
    setCurrentDrafterIndex(playerCount - 1);
  };

  const handleLaunch = () => {
    const hasRemnants = selectedExpansions.includes('remnants_of_worlds_afar');
    const sanitizedNeutralShips: NeutralShipSelectionConfig = {
      ancient: !hasRemnants && neutralShipSelections.ancient === 'expert' ? 'default' : neutralShipSelections.ancient,
      guardian: !hasRemnants && neutralShipSelections.guardian === 'expert' ? 'default' : neutralShipSelections.guardian,
      gcds: !hasRemnants && neutralShipSelections.gcds === 'expert' ? 'default' : neutralShipSelections.gcds,
    };
    if (isDraftMode) {
      onStartGame(playerCount, undefined, selectedExpansions, sanitizedNeutralShips, true, botSeats.slice(0, playerCount));
      return;
    }
    if (draftedFactions.length === playerCount) {
      if (draftedFactions.some((fid) => !availableFactions.some((f) => f.id === fid))) {
        return;
      }
      onStartGame(playerCount, draftedFactions, selectedExpansions, sanitizedNeutralShips, false, botSeats.slice(0, playerCount));
    }
  };

  const filteredFactions = availableFactions.filter((f) => {
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
                {l('COMMENCE NEW EXPEDITION', '开启新银河远征')}
              </h2>
              <p className="text-xs text-slate-400">
                {l('Turn-by-turn civilization drafting for hotseat commanders', '热座模式指挥官逐轮选择势力')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRandomize}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-700/70 text-xs font-semibold transition"
              title={l('Randomly assign distinct factions to all commanders', '为所有指挥官随机分配不重复的势力')}
            >
              <Shuffle className="w-3.5 h-3.5" /> {l('Quick Randomize', '一键随机')}
            </button>
            <button
              onClick={handleResetDraft}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition"
              title={l('Reset drafting from Player 1', '从玩家 1 重新选择')}
            >
              <RotateCcw className="w-3.5 h-3.5" /> {l('Reset', '重置')}
            </button>
          </div>
        </div>

        {/* Player Count & Turn-by-Turn Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 border-b border-slate-800/80 bg-slate-950/40 px-2 rounded-xl my-2">
          {/* Player Count Selector */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" /> {l('Number of Commanders:', '指挥官人数：')}
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
                  {count}{l('P', '人')}
                </button>
              ))}
            </div>
          </div>

          {/* Commander Stepper Chips */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {isDraftMode ? l('Faction Selection:', '势力选择：') : l('Draft Progress:', '选择进度：')}
            </div>
            {isDraftMode ? (
              <div className="text-xs text-indigo-300 font-medium py-1">
                {l('Drafted in-game in reverse turn order.', '开局后按逆行动顺序轮抽势力。')}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                {Array.from({ length: playerCount }).map((_, pIdx) => {
                  const isCurrent = pIdx === currentDrafterIndex;
                  const draftedId = draftedFactions[pIdx];
                  const factionObj = ALL_FACTIONS.find((f) => f.id === draftedId);

                  return (
                    <div key={pIdx} className="flex items-center gap-1">
                      <button
                        type="button"
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
                            {translateFactionName(factionObj.id, factionObj.name, language)}
                          </span>
                        ) : (
                          <span className="italic text-slate-500 text-[10px]">{l('Unselected', '未选')}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        data-testid={`newgame-seat-ai-toggle-${pIdx}`}
                        onClick={() => {
                          const nextIsBot = !botSeats[pIdx];
                          setBotSeats((prev) => {
                            const next = [...prev];
                            next[pIdx] = nextIsBot;
                            return next;
                          });
                          if (nextIsBot && (!factionObj || !factionObj.isHuman)) {
                            const freeTerran = availableFactions.find(
                              (f) =>
                                f.isHuman &&
                                !draftedFactions.some((id, idx) => idx !== pIdx && areFactionsConflictingColor(id, f.id))
                            );
                            if (freeTerran) {
                              setDraftedFactions((prev) => {
                                const next = [...prev];
                                next[pIdx] = freeTerran.id;
                                return next;
                              });
                            }
                          }
                        }}
                        className={`px-1.5 py-1 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                          botSeats[pIdx]
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/70'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'
                        }`}
                        title={l('Toggle Terran AI Bot for this seat', '切换此席位为人族 AI')}
                      >
                        {botSeats[pIdx] ? '🤖' : '👤'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Faction Draft Mode Toggle */}
          <div className="md:col-span-2 flex items-center justify-between p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/50 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <Compass className="w-5 h-5 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-200 block text-xs">
                    {l('Faction Draft Mode', '种族轮抽模式')}
                  </span>
                  {isDraftMode && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-500 text-white">
                      {l('Active', '已激活')}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">
                  {l(
                    'Seat commanders randomly on Ring 2 and draft factions in-game in reverse turn order.',
                    '二环位置随机落座，进入游戏后按逆行动顺序轮抽种族。'
                  )}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDraftMode((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer shrink-0 ${
                isDraftMode
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
              }`}
            >
              {isDraftMode ? l('Draft Mode ON', '轮抽已开启') : l('Enable Faction Draft', '启用种族轮抽')}
            </button>
          </div>
        </div>

        {/* Expansions Module Selector */}
        <div className="flex items-center justify-between px-3 py-2 bg-purple-950/20 border border-purple-900/40 rounded-xl mb-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-purple-200 uppercase tracking-wide text-[11px]">
              {l('Expansions:', '扩展模块：')}
            </span>
            <button
              type="button"
              onClick={toggleAllExpansions}
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/50 text-purple-200 cursor-pointer"
            >
              {allExpansionsSelected ? l('Disable All', '全部关闭') : l('Enable All', '全部启用')}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {AVAILABLE_EXPANSIONS.map((exp) => {
                const active = selectedExpansions.includes(exp.id);
                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => toggleExpansion(exp.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                      active
                        ? 'bg-purple-900/60 border-purple-500 text-purple-200 shadow-sm shadow-purple-950'
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <span>{translateExpansionName(exp.id, exp.name, language)}</span>
                    <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-950 border border-purple-600/40 text-purple-300">
                      {exp.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <span className="text-[10px] text-slate-400">
            {selectedExpansions.length} {l('active', '个已启用')}
          </span>
        </div>

        {/* Neutral Ship Blueprints (NPCs) Selector */}
        <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl mb-2 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-200 uppercase tracking-wide text-[11px]">
                {l('Neutral Ship Blueprints:', '中立飞船蓝图 (NPC)：')}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {l('Ancients • Guardians • GCDS', '远古舰船 • 守卫舰 • 银河核心防御系统')}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(
              [
                {
                  type: 'ancient' as const,
                  label: l('Ancient', '远古舰船'),
                  def: 'Init 2, 2H, 2Y (+1)',
                  adv: 'Init 1, 3H, 1O (+1)',
                  exp: 'Init 3, 2H, 1Y (+2)',
                },
                {
                  type: 'guardian' as const,
                  label: l('Guardian', '守卫舰'),
                  def: 'Init 3, 3H, 3Y (+2/-1)',
                  adv: 'Init 1, 4H, 2O Msl + 1R (+1)',
                  exp: 'Init 3, 4H, 2O (+1/-1)',
                },
                {
                  type: 'gcds' as const,
                  label: l('GCDS', '核心防御系统'),
                  def: 'Init 0, 7H, 4Y (+2)',
                  adv: 'Init 2, 4H, 4Y Msl + 1R (+2)',
                  exp: 'Init 3, 5H, 2O (+2/-2)',
                },
              ]
            ).map(({ type, label, def, adv, exp }) => {
              const currentSel = neutralShipSelections[type];
              return (
                <div
                  key={type}
                  className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">{label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setNeutralShipSelections((prev) => ({ ...prev, [type]: 'default' }))
                        }
                        title={`${l('Default', '标准')} (${def})`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          currentSel === 'default'
                            ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400'
                            : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800'
                        }`}
                      >
                        {l('Def', '标准')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNeutralShipSelections((prev) => ({ ...prev, [type]: 'advanced' }))
                        }
                        title={`${l('Advanced', '进阶')} (${adv})`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          currentSel === 'advanced'
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-400'
                            : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800'
                        }`}
                      >
                        {l('Adv', '进阶')}
                      </button>
                      <button
                        type="button"
                        disabled={!selectedExpansions.includes('remnants_of_worlds_afar')}
                        onClick={() => {
                          if (selectedExpansions.includes('remnants_of_worlds_afar')) {
                            setNeutralShipSelections((prev) => ({ ...prev, [type]: 'expert' }));
                          }
                        }}
                        title={
                          selectedExpansions.includes('remnants_of_worlds_afar')
                            ? `${l('Remnants', '遗迹')} (${exp})`
                            : l('Remnants Blueprint requires Remnants of Worlds Afar expansion', '遗迹蓝图需要“远方世界遗迹”扩展')
                        }
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                          !selectedExpansions.includes('remnants_of_worlds_afar')
                            ? 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed opacity-40'
                            : currentSel === 'expert'
                            ? 'bg-rose-500/25 text-rose-300 border border-rose-400 cursor-pointer'
                            : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800 cursor-pointer'
                        }`}
                      >
                        {l('Rem', '遗迹')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNeutralShipSelections((prev) => ({ ...prev, [type]: 'random' }))
                        }
                        title={
                          selectedExpansions.includes('remnants_of_worlds_afar')
                            ? l('Random (Default / Advanced / Remnants)', '随机（标准 / 进阶 / 遗迹）')
                            : l('Random (50% Default / 50% Advanced)', '随机（50% 标准 / 50% 进阶）')
                        }
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-0.5 ${
                          currentSel === 'random'
                            ? 'bg-purple-500/25 text-purple-300 border border-purple-400'
                            : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800'
                        }`}
                      >
                        <Dices className="w-2.5 h-2.5" />
                        <span>{l('Rnd', '随机')}</span>
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    {currentSel === 'default' && <span className="text-slate-400">{def}</span>}
                    {currentSel === 'advanced' && <span className="text-amber-300">{adv}</span>}
                    {currentSel === 'expert' && <span className="text-rose-300">{exp}</span>}
                    {currentSel === 'random' && (
                      <span className="text-purple-300 italic">
                        🎲 {l('Random', '随机')}{' '}
                        {selectedExpansions.includes('remnants_of_worlds_afar') ? l('(Def/Adv/Exp)', '(标/进/遗)') : '(50/50)'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isDraftMode ? (
          <div className="p-8 rounded-2xl bg-indigo-950/20 border-2 border-dashed border-indigo-700/60 text-center space-y-3 my-4">
            <Compass className="w-10 h-10 text-indigo-400 mx-auto animate-pulse" />
            <h3 className="font-bold text-base text-indigo-200 uppercase tracking-wide">
              {l('IN-GAME FACTION DRAFT ENABLED', '已开启局内种族轮抽模式')}
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              {l(
                `Factions will not be selected now. When launched, all ${playerCount} commanders will be randomly assigned starting positions on Ring 2. A random first player is chosen, turn order runs clockwise, and commanders draft their faction in reverse turn order directly in the galaxy interface!`,
                `此处无需预先挑选势力。开局后，系统将为全部 ${playerCount} 位指挥官随机分配二环初始星区，随机确定起始玩家（行动顺时针），并按逆行动顺序在星图界面中轮流挑选种族！`
              )}
            </p>
          </div>
        ) : (
          <>
            {/* Drafter Active Banner & Filter Tabs */}
            <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {l(`Commander ${currentDrafterIndex + 1}`, `指挥官 ${currentDrafterIndex + 1}`)}
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {draftedFactions[currentDrafterIndex]
                ? l('Currently chosen: ', '当前已选：') +
                  (() => {
                    const f = ALL_FACTIONS.find((fac) => fac.id === draftedFactions[currentDrafterIndex]);
                    return f ? translateFactionName(f.id, f.name, language) : '';
                  })()
                : l('Select your civilization from the available factions below:', '请从下方可选势力中选择你的文明：')}
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
              {l(`All (${availableFactions.length})`, `全部 (${availableFactions.length})`)}
            </button>
            <button
              onClick={() => setFilterCategory('alien')}
              className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                filterCategory === 'alien'
                  ? 'bg-purple-900/60 text-purple-200 font-bold border border-purple-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {l(
                `Alien Species (${availableFactions.filter((f) => !f.isHuman).length})`,
                `异星种族 (${availableFactions.filter((f) => !f.isHuman).length})`
              )}
            </button>
            <button
              onClick={() => setFilterCategory('human')}
              className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                filterCategory === 'human'
                  ? 'bg-cyan-900/60 text-cyan-200 font-bold border border-cyan-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {l('Terran Factions (6)', '人类势力 (6)')}
            </button>
          </div>
        </div>

        {/* Faction Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredFactions.map((faction) => {
            const conflictingPlayerIndex = draftedFactions.findIndex(
              (id, idx) => idx !== currentDrafterIndex && areFactionsConflictingColor(id, faction.id)
            );
            const isClaimedByOther = conflictingPlayerIndex !== -1;
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
                        {translateFactionName(faction.id, faction.name, language)}
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
                        {faction.isHuman ? l('Terran', '人类') : l('Alien', '异星')}
                      </span>
                      <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 font-mono">
                        {l(`Sec ${faction.startingSectorNumber}`, `${faction.startingSectorNumber}区`)}
                      </span>
                    </div>
                  </div>

                  {/* Resources & Initial Assets */}
                  <div className="grid grid-cols-5 gap-1 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/70 text-center font-mono text-[10px] mb-2">
                    <div title={l('Starting Money', '起始信用点')}>
                      <span className="text-[8px] text-slate-500 block font-sans">{l('Money', '信用')}</span>
                      <span className="text-yellow-400 font-bold">{faction.startingResources.money}</span>
                    </div>
                    <div title={l('Starting Science', '起始科研')}>
                      <span className="text-[8px] text-slate-500 block font-sans">{l('Sci', '科研')}</span>
                      <span className="text-pink-400 font-bold">{faction.startingResources.science}</span>
                    </div>
                    <div title={l('Starting Materials', '起始材料')}>
                      <span className="text-[8px] text-slate-500 block font-sans">{l('Mat', '材料')}</span>
                      <span className="text-amber-400 font-bold">{faction.startingResources.materials}</span>
                    </div>
                    <div title={l('Starting Colony Ships', '起始殖民船')}>
                      <span className="text-[8px] text-slate-500 block font-sans">{l('Colony', '殖民')}</span>
                      <span className="text-emerald-400 font-bold">{faction.startingColonyShips}</span>
                    </div>
                    <div title={l('Starting Discs', '起始影响力圆片')}>
                      <span className="text-[8px] text-slate-500 block font-sans">{l('Discs', '圆片')}</span>
                      <span className="text-indigo-400 font-bold">{faction.startingDiscs}</span>
                    </div>
                  </div>

                  {/* Starting Techs & Trade */}
                  <div className="text-[10px] space-y-1 mb-2">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>{l('Trade Ratio:', '交易汇率：')}</span>
                      <span className="font-mono font-bold text-slate-200">{faction.tradeRatio}:1</span>
                    </div>
                    <div className="flex items-start justify-between gap-1 text-slate-400">
                      <span className="shrink-0">{l('Starting Techs:', '起始科技：')}</span>
                      <span className="font-mono text-slate-300 text-right font-medium">
                        {faction.startingTechIds.length > 0
                          ? faction.startingTechIds
                              .map((t) => translateTechName(t, t.replace(/_/g, ' ').toUpperCase(), language))
                              .join(', ')
                          : l('None', '无')}
                      </span>
                    </div>
                  </div>

                  {/* Traits Description */}
                  <p className="text-[10.5px] text-slate-400 leading-snug line-clamp-3">
                    {translateFactionTrait(faction.id, faction.traitDescription, language)}
                  </p>
                </div>

                {/* Bottom Status / Selection Button */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                  {isClaimedByOther ? (
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center py-1 bg-slate-950/60 rounded">
                      {draftedFactions[conflictingPlayerIndex] === faction.id
                        ? l(`Claimed by Player ${conflictingPlayerIndex + 1}`, `已被玩家 ${conflictingPlayerIndex + 1} 选择`)
                        : l(`Color In Use (Player ${conflictingPlayerIndex + 1})`, `阵营颜色冲突（玩家 ${conflictingPlayerIndex + 1}）`)}
                    </div>
                  ) : isSelectedByCurrent ? (
                    <div className="flex items-center justify-center gap-1 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 text-xs font-bold">
                      <Check className="w-3.5 h-3.5" /> {l(`Selected for Player ${currentDrafterIndex + 1}`, `已为玩家 ${currentDrafterIndex + 1} 选定`)}
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
                      {l('Draft Faction', '选择该势力')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    )}

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isDraftMode && currentDrafterIndex > 0 && (
              <button
                onClick={handleBackStep}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> {l('Previous Player', '上一位玩家')}
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
              >
                {l('Cancel', '取消')}
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
            <Play className="w-4 h-4 fill-current" />{' '}
            {isDraftMode
              ? l(`Launch Faction Draft (${playerCount}P)`, `开启种族轮抽 (${playerCount}人)`)
              : l(`Launch Galaxy (${draftedFactions.length} / ${playerCount} Drafted)`, `开启银河战役 (${draftedFactions.length} / ${playerCount} 已选)`)}
          </button>
        </div>
      </div>
    </div>
  );
};
