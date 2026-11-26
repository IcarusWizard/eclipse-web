import React, { useState, useEffect } from 'react';
import { GameState, PendingCombatConquest } from '../../engine/types/state';
import { canColonizePlanetSlot } from '../../engine/rules/gameReducer';
import {
  Trophy,
  CircleDot,
  Rocket,
  Coins,
  FlaskConical,
  Hammer,
  CheckCircle2,
  Lock,
  ChevronRight,
  ShieldAlert,
  Shield,
  Crosshair,
  Flame,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateResourceType, translateShipType } from '../../i18n/catalogTranslations';
import { CombatDieFaceGraphic } from '../common/PhysicalTileIconography';

interface CombatConquestModalProps {
  state: GameState;
  conquest: PendingCombatConquest;
  currentSeat?: number | 'all' | 'spectator';
  canControl?: boolean;
  onConfirm: (
    claimInfluence: boolean,
    colonizePlanetIndices: number[],
    planetResourceChoices?: Record<number, 'money' | 'science' | 'material'>
  ) => void;
  onRerollBombardmentDie?: (rollIndex: number) => void;
  onConfirmBombardment?: () => void;
  onSelectBombardmentTargets?: (targetPlanetIndices: number[]) => void;
}

export const CombatConquestModal: React.FC<CombatConquestModalProps> = ({
  state,
  conquest,
  currentSeat = 'all',
  canControl: canControlProp,
  onConfirm,
  onRerollBombardmentDie,
  onConfirmBombardment,
  onSelectBombardmentTargets,
}) => {
  const { l, language } = useLanguage();
  const sector = state.sectors.find((s) => s.id === conquest.sectorId);
  const winner = state.players.find((p) => p.id === conquest.winnerPlayerId);

  if (!sector || !winner) return null;

  const isSpectator = currentSeat === 'spectator';
  const defaultCanControl =
    !isSpectator &&
    (currentSeat === 'all' ||
      (typeof currentSeat === 'number' && state.players[currentSeat]?.id === winner.id));
  const canControl = canControlProp ?? defaultCanControl;

  const [currentStep, setCurrentStep] = useState<'bombardment' | 'conquest'>(
    conquest.bombardmentSummary ? 'bombardment' : 'conquest'
  );

  // Non-controlling players & spectators observe Bombardment reports just like fleet combat;
  // once solely in the post-combat Sector Control/Conquest decision step, show the waiting banner.
  if (!canControl && (!conquest.bombardmentSummary || currentStep !== 'bombardment')) {
    return (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-indigo-500/80 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-3 backdrop-blur text-sm text-slate-200 pointer-events-none animate-bounce">
        <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
        <span>
          {l('Waiting for ', '正在等待 ')}
          <strong className="text-indigo-300">{winner.name}</strong>
          {l(` to decide whether to control Sector ${sector.sectorNumber || sector.id}...`, ` 决定是否控制星区 ${sector.sectorNumber || sector.id}...`)}
        </span>
      </div>
    );
  }

  const alreadyControls = sector.discOwner === winner.id;
  const hasDiscsAvailable = winner.influenceTrack.discsOnTrack > 0;
  const canClaim = conquest.canClaimInfluence !== false;

  // Default to true if user has available discs, can claim, and doesn't already control the sector
  const [claimInfluence, setClaimInfluence] = useState<boolean>(
    canClaim && (alreadyControls || hasDiscsAvailable)
  );

  useEffect(() => {
    setClaimInfluence(canClaim && (alreadyControls || hasDiscsAvailable));
  }, [conquest.sectorId, canClaim, alreadyControls, hasDiscsAvailable]);

  const [selectedPlanetIndices, setSelectedPlanetIndices] = useState<number[]>([]);
  const [planetResourceChoices, setPlanetResourceChoices] = useState<
    Record<number, 'money' | 'science' | 'material'>
  >({});

  const isPendingTargets = Boolean(conquest.bombardmentSummary?.isPendingTargetSelection);
  const nonPlantaOppPlanets = React.useMemo(() => {
    return sector.planets
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => {
        if (!p.colonizedBy || p.colonizedBy === winner.id) return false;
        const owner = state.players.find((pl) => pl.id === p.colonizedBy);
        return owner?.faction.id !== 'planta';
      });
  }, [sector.planets, winner.id, state.players]);
  const requiredBombardTargets = isPendingTargets
    ? Math.min(conquest.bombardmentSummary?.totalDamage || 0, nonPlantaOppPlanets.length)
    : 0;

  const computeDefaultBombardmentTargets = () => {
    if (!isPendingTargets || requiredBombardTargets <= 0) return [];
    const order: Record<string, number> = { money: 1, material: 2, science: 3, any: 4 };
    return [...nonPlantaOppPlanets]
      .sort((a, b) => {
        const resA = a.p.colonizedResource || a.p.resource;
        const resB = b.p.colonizedResource || b.p.resource;
        return (order[resA] || 5) - (order[resB] || 5);
      })
      .slice(0, requiredBombardTargets)
      .map(({ idx }) => idx);
  };

  const [selectedBombardTargets, setSelectedBombardTargets] = useState<number[]>(
    computeDefaultBombardmentTargets
  );

  useEffect(() => {
    setSelectedBombardTargets(computeDefaultBombardmentTargets());
  }, [conquest.sectorId, isPendingTargets, requiredBombardTargets]);

  const handleToggleBombardTarget = (idx: number) => {
    if (!canControl) return;
    if (selectedBombardTargets.includes(idx)) {
      setSelectedBombardTargets(selectedBombardTargets.filter((i) => i !== idx));
    } else if (selectedBombardTargets.length < requiredBombardTargets) {
      setSelectedBombardTargets([...selectedBombardTargets, idx]);
    }
  };

  const hasAdvancedEconomy = winner.techTrack.researched.some(
    (t) => t.id === 'advanced_economy' || t.id === 'metasynthesis'
  );
  const hasAdvancedLabs = winner.techTrack.researched.some(
    (t) => t.id === 'advanced_labs' || t.id === 'metasynthesis'
  );
  const hasAdvancedMining = winner.techTrack.researched.some(
    (t) => t.id === 'advanced_mining' || t.id === 'metasynthesis'
  );

  const readyColonyShips = winner.colonyShips.ready;
  const remainingColonyShips = readyColonyShips - selectedPlanetIndices.length;

  const handleTogglePlanet = (idx: number) => {
    if (!canControl) return;
    if (selectedPlanetIndices.includes(idx)) {
      setSelectedPlanetIndices(selectedPlanetIndices.filter((i) => i !== idx));
    } else {
      if (remainingColonyShips > 0) {
        setSelectedPlanetIndices([...selectedPlanetIndices, idx]);
      }
    }
  };

  const handleConfirm = () => {
    if (!canControl) return;
    // If not claiming influence or cannot claim, clear planet colonization
    const effectivePlanets = canClaim && (claimInfluence || alreadyControls) ? selectedPlanetIndices : [];
    onConfirm(
      canClaim && !alreadyControls ? claimInfluence : false,
      effectivePlanets,
      planetResourceChoices
    );
  };

  const handleDeclineAll = () => {
    if (!canControl) return;
    onConfirm(false, []);
  };

  const willControl = canClaim && (alreadyControls || claimInfluence);

  return (
    <div className="fixed top-18 right-4 z-40 w-full max-w-lg pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 flex flex-col max-h-[calc(100vh-90px)]">
        {/* Victory / Bombardment Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-950 bg-slate-950">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                currentStep === 'bombardment'
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-rose-950/40'
                  : 'bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-amber-950/40'
              }`}
            >
              {currentStep === 'bombardment' ? (
                <Crosshair className="w-5 h-5 text-rose-400" />
              ) : (
                <Trophy className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-amber-300 font-display">
                  {currentStep === 'bombardment'
                    ? l(`BOMBARDMENT REPORT: SECTOR ${sector.sectorNumber}`, `轨道轰炸报告：星区 ${sector.sectorNumber}`)
                    : l(`SECTOR CONQUEST: SECTOR ${sector.sectorNumber}`, `星区征服：星区 ${sector.sectorNumber}`)}
                </h2>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    canClaim
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-rose-950 text-rose-300 border-rose-800'
                  }`}
                >
                  {canClaim ? `${sector.victoryPoints} VP` : l('CONTESTED', '争夺中')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentStep === 'bombardment' ? (
                  <>
                    {l('Commander ', '指挥官 ')}
                    <span className="text-slate-200 font-bold">{winner.name}</span>
                    {l(' assaulted defender planetary population.', ' 对防守方行星人口发起了轨道轰炸。')}
                  </>
                ) : canClaim ? (
                  <>
                    {l('Commander ', '指挥官 ')}
                    <span className="text-slate-200 font-bold">{winner.name}</span>
                    {l(' emerged victorious! Choose sector control and colonization.', ' 赢得了战斗！请选择星区控制与殖民行动。')}
                  </>
                ) : (
                  <>
                    <span className="text-slate-200 font-bold">{winner.name}</span>
                    {l(' cleared hostile ships, but defender population survived.', ' 清除了敌方舰船，但防守方人口得以幸存。')}
                  </>
                )}
              </p>
            </div>
          </div>

          {!canControl && (
            <div
              data-testid="combat-conquest-observer-badge"
              className="px-3 py-1.5 rounded-xl bg-amber-950/70 border border-amber-600/70 text-amber-300 text-xs font-bold animate-pulse shrink-0"
            >
              {currentSeat === 'spectator'
                ? currentStep === 'bombardment'
                  ? l(`Spectator Mode (Observing Bombardment by ${winner.name})`, `旁观模式（正在观察 ${winner.name} 的轰炸结算）`)
                  : l(`Spectator Mode (Observing Conquest by ${winner.name})`, `旁观模式（正在观察 ${winner.name} 的征服行动）`)
                : currentStep === 'bombardment'
                ? l(`Waiting for ${winner.name} to confirm bombardment...`, `等待 ${winner.name} 确认轰炸结果...`)
                : l(`Waiting for ${winner.name} to choose control options...`, `等待 ${winner.name} 选择控制选项...`)}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Bombardment Summary Panel */}
          {currentStep === 'bombardment' && conquest.bombardmentSummary && (
            <div className="bg-slate-950/80 rounded-xl border border-slate-800/90 p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
                  <Crosshair className="w-4 h-4 text-rose-400" />
                  <span>{l('Planetary Bombardment & Population Assault', '行星轰炸与人口打击')}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {l('Attacker:', '进攻方：')} <strong className="text-slate-200">{conquest.bombardmentSummary.attackerName}</strong>{' '}
                  {l('vs', '对阵')}{' '}
                  <strong className="text-slate-200">{conquest.bombardmentSummary.defenderName}</strong>
                </div>
              </div>

              {conquest.bombardmentSummary.neutronAbsorberActive && (
                <div className="p-3 rounded-lg bg-teal-950/40 border border-teal-600/60 flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-teal-300">{l('Neutron Absorber Active', '中子吸收器生效')}</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {l(
                        `${conquest.bombardmentSummary.defenderName}'s Neutron Absorber completely nullified enemy Neutron Bombs! Attacker was forced to bombard with conventional non-missile cannons.`,
                        `${conquest.bombardmentSummary.defenderName} 的中子吸收器完全抵消了敌方的中子炸弹！进攻方只能使用常规非导弹火炮进行轰炸。`
                      )}
                    </p>
                  </div>
                </div>
              )}

              {conquest.bombardmentSummary.hasNeutronBombs ? (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-700/40 flex items-start gap-2.5">
                  <Flame className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-emerald-300">{l('Neutron Bombs Active', '中子炸弹生效')}</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {l(
                        'Planetary shields and surface structures bypassed! All defender population cubes were eliminated automatically without rolling dice.',
                        '无视行星护盾与地表防御！无需掷骰，防守方所有人口方块已被自动消灭。'
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {l('Bombardment Rolls (Non-missile weapons vs 0 Shield):', '轰炸掷骰（非导弹武器对 0 护盾）：')}
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {l(
                        `Total Damage: ${conquest.bombardmentSummary.totalDamage} pts (1 dmg = 1 cube)`,
                        `总伤害：${conquest.bombardmentSummary.totalDamage} 点（1 伤害 = 1 人口）`
                      )}
                    </span>
                  </div>

                  {conquest.bombardmentSummary.rolls.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {conquest.bombardmentSummary.rolls.map((r, i) => (
                        <div
                          key={i}
                          className="bg-slate-900 border border-slate-800/80 rounded-lg p-2 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <CombatDieFaceGraphic
                              color={r.diceColor}
                              roll={r.roll}
                              size="sm"
                              title={
                                r.diceColor === 'purple'
                                  ? l(
                                      `Rift Cannon Die: ${
                                        r.roll === 1 || r.roll === 2
                                          ? 'Blank (Miss)'
                                          : r.roll === 3
                                          ? '1 Hit'
                                          : r.roll === 4
                                          ? '2 Hits'
                                          : r.roll === 5
                                          ? '3 Hits + 1 Self-Damage'
                                          : '1 Self-Damage'
                                      }`,
                                      `裂隙炮骰：${
                                        r.roll === 1 || r.roll === 2
                                          ? '空面（未命中）'
                                          : r.roll === 3
                                          ? '1 命中'
                                          : r.roll === 4
                                          ? '2 命中'
                                          : r.roll === 5
                                          ? '3 命中 + 1 自伤'
                                          : '1 自伤'
                                      }`
                                    )
                                  : l(`Cannon Die Roll: ${r.roll}`, `火炮掷骰：${r.roll}`)
                              }
                            />
                            <span className="text-[11px] capitalize text-slate-300 font-medium">
                              {translateShipType(r.shipType, language)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {r.diceColor === 'purple' && (r.selfDamage || 0) > 0 && !r.isHit ? (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-700/60 text-purple-300">
                                {l('BACKFIRE (💥)', '反噬 (💥)')}
                              </span>
                            ) : r.isHit ? (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300">
                                {l(`HIT (+${r.damage})`, `命中 (+${r.damage})`)}
                                {r.diceColor === 'purple' && (r.selfDamage || 0) > 0 ? ' 💥' : ''}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-500 px-1 py-0.5">
                                {l('MISS', '未命中')}
                              </span>
                            )}
                            {conquest.bombardmentSummary?.isPendingConfirm &&
                              winner.faction.id === 'enlightened_of_lyra' &&
                              winner.colonyShips.ready > 0 &&
                              canControl &&
                              onRerollBombardmentDie && (
                                <button
                                  type="button"
                                  data-testid={`bombardment-reroll-btn-${i}`}
                                  onClick={() => onRerollBombardmentDie(i)}
                                  title={l(
                                    `Lyra Ability: Flip 1 Colony Ship (${winner.colonyShips.ready} ready) to reroll this die`,
                                    `天琴座能力：横置 1 艘殖民船（可用 ${winner.colonyShips.ready}）重掷此骰`
                                  )}
                                  className="px-1.5 py-0.5 rounded bg-orange-600/30 hover:bg-orange-500/50 border border-orange-500 text-orange-200 text-[9px] font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <RotateCcw className="w-2.5 h-2.5 text-orange-300" />
                                  <span>{l('Reroll', '重掷')}</span>
                                </button>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      {l('No non-missile weapons available to bombard.', '没有可用于轰炸的非导弹武器。')}
                    </div>
                  )}
                </div>
              )}

              {/* Casualty Slot Callout */}
              {(conquest.bombardmentSummary.cubesDestroyed?.length || 0) > 0 && (
                <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-800/40 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-300 font-bold uppercase tracking-wider text-[11px]">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>{l('Casualty Slot Rule', '伤亡槽规则')}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    <strong className="text-purple-300 font-semibold">
                      {l(
                        `${conquest.bombardmentSummary.cubesDestroyed.length} cube(s)`,
                        `${conquest.bombardmentSummary.cubesDestroyed.length} 枚人口方块`
                      )}
                    </strong>{' '}
                    (
                    {conquest.bombardmentSummary.cubesDestroyed
                      .map((c) => translateResourceType(c.resource, language))
                      .join(', ')}
                    ){' '}
                    {l('destroyed and placed in ', '被消灭并移至 ')}
                    <strong className="text-slate-200">{conquest.bombardmentSummary.defenderName}</strong>
                    {l(
                      `'s Casualty Slot. Their round income is preserved for this round, and cubes will return to their tracks during Cleanup (preventing mid-round bankruptcy).`,
                      ' 的伤亡槽。其本轮产出保持不变，且方块将在清理阶段返回对应轨道（防止回合中意外破产）。'
                    )}
                  </p>
                </div>
              )}

              {/* Status Outcome */}
              {conquest.bombardmentSummary.isPendingConfirm ? (
                <div className="p-3 rounded-lg bg-orange-950/40 border border-orange-500/60 text-xs flex items-center gap-2.5 text-orange-200">
                  <RotateCcw className="w-4 h-4 text-orange-300 shrink-0" />
                  <span>
                    {l(
                      `Lyra Colony Ship Reroll Available (${winner.colonyShips.ready} ready): You may flip Colony Ships to reroll any bombardment die (including Rift Cannons) before damage and Rift backfire are applied.`,
                      `天琴座殖民船重掷（可用 ${winner.colonyShips.ready} 艘）：可在伤害与裂隙炮反噬生效前，横置殖民船重掷任意轰炸骰子。`
                    )}
                  </span>
                </div>
              ) : isPendingTargets ? (
                <div
                  data-testid="bombardment-target-selection-panel"
                  className="p-3 rounded-lg bg-rose-950/35 border border-rose-500/60 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-200 uppercase tracking-wider">
                      {l(
                        `Choose Population Cubes to Destroy (${selectedBombardTargets.length} / ${requiredBombardTargets})`,
                        `选择要摧毁的敌方人口方块（已选 ${selectedBombardTargets.length} / ${requiredBombardTargets}）`
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {l(
                      `Your cannons dealt ${requiredBombardTargets} damage against ${nonPlantaOppPlanets.length} population cubes. Select exactly ${requiredBombardTargets} cube(s) to destroy:`,
                      `你的火炮造成了 ${requiredBombardTargets} 点伤害（敌方共有 ${nonPlantaOppPlanets.length} 枚人口方块）。请选择要摧毁的 ${requiredBombardTargets} 枚人口方块：`
                    )}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {nonPlantaOppPlanets.map(({ p, idx }) => {
                      const isSel = selectedBombardTargets.includes(idx);
                      const isOrb = Boolean(p.isOrbital);
                      const isWild = p.resource === 'any';
                      const label = isOrb
                        ? l('Orbital', '轨道站')
                        : isWild
                        ? l('Wild Planet', '万能行星')
                        : translateResourceType(p.resource, language);
                      const prodLabel = p.colonizedResource
                        ? translateResourceType(p.colonizedResource, language)
                        : '';
                      const ownerPlayer = state.players.find((pl) => pl.id === p.colonizedBy);
                      return (
                        <button
                          key={p.id || idx}
                          type="button"
                          disabled={!canControl}
                          data-testid={`bombard-target-planet-${idx}`}
                          onClick={() => handleToggleBombardTarget(idx)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition ${
                            !canControl ? 'cursor-not-allowed opacity-85' : 'cursor-pointer'
                          } ${
                            isSel
                              ? 'bg-rose-950/80 border-rose-400 text-white ring-1 ring-rose-400/60'
                              : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          <div className="text-xs">
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{label}</span>
                              {p.isAdvanced && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 border border-purple-500/60 text-purple-300">
                                  {l('Adv', '高阶')}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {ownerPlayer?.name || conquest.bombardmentSummary?.defenderName}
                              {(isOrb || isWild) && prodLabel ? ` • ${prodLabel}` : ''}
                            </div>
                          </div>
                          {isSel && <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : conquest.bombardmentSummary.attackerFleetWipedOut ? (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-600/60 text-xs flex items-center gap-2.5 text-rose-200">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    {l(
                      `All attacking ships were destroyed by Rift Cannon backfire during bombardment! Sector ${sector.sectorNumber} cannot be claimed.`,
                      `所有进攻舰船都在轰炸期间因裂隙炮反噬被摧毁！无法占领星区 ${sector.sectorNumber}。`
                    )}
                  </span>
                </div>
              ) : conquest.bombardmentSummary.cubesRemaining > 0 ? (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-600/50 text-xs flex items-center gap-2.5 text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>
                      {l(
                        `${conquest.bombardmentSummary.cubesRemaining} defender cube(s) survived!`,
                        `${conquest.bombardmentSummary.cubesRemaining} 枚防守方人口幸存！`
                      )}
                    </strong>{' '}
                    {l(`Defender retains control of Sector ${sector.sectorNumber}.`, `防守方保留对星区 ${sector.sectorNumber} 的控制权。`)}
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-600/40 text-xs flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {l(
                      'All defender population neutralized. Sector control is overthrown and ready for conquest!',
                      '所有防守方人口已被清除。星区控制权已被瓦解，现可占领！'
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* If canClaim is true: show Step 1 and Step 2 during conquest step */}
          {currentStep === 'conquest' && canClaim && (
            <>
              {/* Step 1: Claim Sector Influence */}
              <div className="bg-slate-950/70 rounded-xl border border-slate-800/90 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <CircleDot className="w-4 h-4 text-cyan-400" />
                    <span>{l('1. Sector Control (Influence Disc)', '1. 星区控制（影响力圆片）')}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {l('Discs on Track:', '轨道剩余圆片：')}{' '}
                    <strong className="text-cyan-300 font-bold">{winner.influenceTrack.discsOnTrack}</strong> /{' '}
                    {winner.influenceTrack.totalDiscs}
                  </div>
                </div>

                {alreadyControls ? (
                  <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{l('You already control this sector with an Influence Disc.', '你已通过影响力圆片控制此星区。')}</span>
                  </div>
                ) : hasDiscsAvailable ? (
                  <label
                    onClick={() => {
                      if (canControl) setClaimInfluence(!claimInfluence);
                    }}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                      !canControl ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                    } ${
                      claimInfluence
                        ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/50'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={claimInfluence}
                      disabled={!canControl}
                      onChange={(e) => canControl && setClaimInfluence(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 accent-cyan-500 shrink-0"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        {l(
                          `Place an Influence Disc to take control of Sector ${sector.sectorNumber}`,
                          `放置影响力圆片以控制星区 ${sector.sectorNumber}`
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {l(
                          `Establishes territory control, unlocks sector colonization, and awards ${sector.victoryPoints} Victory Points at game end.`,
                          `确立领地控制权、解锁星区殖民，并在游戏结束时提供 ${sector.victoryPoints} 点胜利分。`
                        )}
                      </p>
                    </div>
                  </label>
                ) : (
                  <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{l('No Influence Discs remaining on track. Sector remains uninfluenced.', '轨道上无剩余影响力圆片，该星区将保持无主状态。')}</span>
                  </div>
                )}
              </div>

              {/* Step 2: Planetary Colonization */}
              <div className="bg-slate-950/70 rounded-xl border border-slate-800/90 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Rocket className="w-4 h-4 text-indigo-400" />
                    <span>{l('2. Planetary Colonization (Optional)', '2. 行星殖民（可选）')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                    <span>{l('Colony Ships:', '殖民船：')}</span>
                    <span className="text-indigo-300 font-bold">
                      {l(`${remainingColonyShips} / ${readyColonyShips} Ready`, `就绪 ${remainingColonyShips} / ${readyColonyShips}`)}
                    </span>
                  </div>
                </div>

                {!willControl ? (
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                    {l(
                      'You must take control of this sector with an Influence Disc to deploy Colony Ships and colonize its habitats.',
                      '必须先放置影响力圆片控制该星区，才能派遣殖民船进驻其中的居住位。'
                    )}
                  </div>
                ) : (() => {
                  const conquestPlanets =
                    winner.faction.id === 'remnants_of_ra' &&
                    sector.hasArtifact &&
                    willControl &&
                    !sector.planets.some((p) => p.isRaArtifactSlot)
                      ? [
                          ...sector.planets,
                          {
                            id: `${sector.id}_ra_artifact_wild`,
                            resource: 'any' as const,
                            isAdvanced: false,
                            isRaArtifactSlot: true,
                          },
                        ]
                      : sector.planets;
                  return conquestPlanets.length === 0 ? (
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                      {l(`There are no planetary habitats in Sector ${sector.sectorNumber}.`, `星区 ${sector.sectorNumber} 没有行星居住位。`)}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {conquestPlanets.map((planet, pIdx) => {
                        const isColonized = !!planet.colonizedBy;
                        const isSelected = selectedPlanetIndices.includes(pIdx);
                        const check = canColonizePlanetSlot(winner, planet);
                        const canSelect = isSelected || (check.canColonize && remainingColonyShips > 0);

                        const isWild = planet.resource === 'any';
                        const isOrb = !!planet.isOrbital;

                        // Default resource selection if not chosen yet
                        const defaultRes: 'money' | 'science' | 'material' = isOrb
                          ? winner.population.money.cubesOnBoard > 0
                            ? 'money'
                            : 'science'
                          : winner.population.money.cubesOnBoard > 0
                          ? 'money'
                          : winner.population.science.cubesOnBoard > 0
                          ? 'science'
                          : 'material';

                        const chosenRes = planetResourceChoices[pIdx] || defaultRes;
                        const displayResource = isWild || isOrb ? chosenRes : planet.resource;

                        return (
                          <div
                            key={planet.id || pIdx}
                            onClick={() => {
                              if (canControl && !isColonized && canSelect) {
                                handleTogglePlanet(pIdx);
                              }
                            }}
                            className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                              isColonized
                                ? 'bg-slate-900/40 border-slate-900 opacity-60 cursor-not-allowed'
                                : isSelected
                                ? 'bg-indigo-950/70 border-indigo-500 shadow ring-1 ring-indigo-500/60 cursor-pointer'
                                : canSelect
                                ? 'bg-slate-900 border-slate-800 hover:border-slate-700 cursor-pointer'
                                : 'bg-slate-950/40 border-slate-900 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Resource Icon badge */}
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center border font-bold text-xs shrink-0 ${
                                  displayResource === 'money'
                                    ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                                    : displayResource === 'science'
                                    ? 'bg-pink-500/20 border-pink-400 text-pink-300'
                                    : displayResource === 'material'
                                    ? 'bg-amber-800/30 border-amber-600 text-amber-500'
                                    : 'bg-slate-800 border-slate-700 text-slate-300'
                                }`}
                              >
                                {displayResource === 'money' && <Coins className="w-3.5 h-3.5" />}
                                {displayResource === 'science' && <FlaskConical className="w-3.5 h-3.5" />}
                                {displayResource === 'material' && <Hammer className="w-3.5 h-3.5" />}
                              </div>

                              <div className="flex flex-col text-left min-w-0">
                                <span className="font-bold text-xs capitalize text-slate-200 flex items-center gap-1.5 flex-wrap">
                                  {planet.isRaArtifactSlot
                                    ? l('[A] Power of the Ancients', '[A] 先祖力场遗物格位')
                                    : isOrb
                                    ? l('Orbital Station', '轨道站')
                                    : isWild
                                    ? l('Wild Habitat', '全能居住位')
                                    : l(`${planet.resource} Planet`, `${translateResourceType(planet.resource, language)}星球`)}
                                  {planet.isAdvanced && (
                                    <span className="text-[9px] font-mono px-1 rounded bg-slate-800 border border-slate-700 text-slate-400">
                                      {l('Adv', '高级')}
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {isColonized
                                    ? l('Already Colonized', '已被殖民')
                                    : isSelected
                                    ? l(
                                        `Deploying Colony Ship (${chosenRes.toUpperCase()})`,
                                        `部署殖民船 (${translateResourceType(chosenRes, language)})`
                                      )
                                    : !check.canColonize
                                    ? check.reason
                                    : l('Ready to Colonize', '可殖民')}
                                </span>

                                {/* Resource Selector for Wild / Orbital Habitats */}
                                {(isWild || isOrb) && !isColonized && (
                                  <div
                                    className="flex items-center gap-1 mt-1.5 flex-wrap"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {/* Money Button */}
                                    <button
                                      type="button"
                                      disabled={!canControl || winner.population.money.cubesOnBoard <= 0 || (planet.isAdvanced && !hasAdvancedEconomy)}
                                      onClick={() => {
                                        setPlanetResourceChoices((prev) => ({ ...prev, [pIdx]: 'money' }));
                                        if (!selectedPlanetIndices.includes(pIdx) && remainingColonyShips > 0) {
                                          setSelectedPlanetIndices((prev) => [...prev, pIdx]);
                                        }
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all flex items-center gap-1 ${
                                        chosenRes === 'money'
                                          ? 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-sm'
                                          : 'bg-slate-800 text-yellow-400 border-slate-700 hover:border-yellow-500/50'
                                      } disabled:opacity-30 disabled:pointer-events-none`}
                                      title={l('Colonize with Money Cube', '使用信用点人口殖民')}
                                    >
                                      <Coins className="w-2.5 h-2.5" />
                                      <span>{l('Money', '信用点')} ({winner.population.money.cubesOnBoard})</span>
                                    </button>

                                    {/* Science Button */}
                                    <button
                                      type="button"
                                      disabled={!canControl || winner.population.science.cubesOnBoard <= 0 || (planet.isAdvanced && !hasAdvancedLabs)}
                                      onClick={() => {
                                        setPlanetResourceChoices((prev) => ({ ...prev, [pIdx]: 'science' }));
                                        if (!selectedPlanetIndices.includes(pIdx) && remainingColonyShips > 0) {
                                          setSelectedPlanetIndices((prev) => [...prev, pIdx]);
                                        }
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all flex items-center gap-1 ${
                                        chosenRes === 'science'
                                          ? 'bg-pink-500 text-white border-pink-400 shadow-sm'
                                          : 'bg-slate-800 text-pink-400 border-slate-700 hover:border-pink-500/50'
                                      } disabled:opacity-30 disabled:pointer-events-none`}
                                      title={l('Colonize with Science Cube', '使用科研人口殖民')}
                                    >
                                      <FlaskConical className="w-2.5 h-2.5" />
                                      <span>{l('Science', '科研')} ({winner.population.science.cubesOnBoard})</span>
                                    </button>

                                    {/* Material Button (only if not orbital) */}
                                    {!isOrb && (
                                      <button
                                        type="button"
                                        disabled={!canControl || winner.population.material.cubesOnBoard <= 0 || (planet.isAdvanced && !hasAdvancedMining)}
                                        onClick={() => {
                                          setPlanetResourceChoices((prev) => ({ ...prev, [pIdx]: 'material' }));
                                          if (!selectedPlanetIndices.includes(pIdx) && remainingColonyShips > 0) {
                                            setSelectedPlanetIndices((prev) => [...prev, pIdx]);
                                          }
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all flex items-center gap-1 ${
                                          chosenRes === 'material'
                                            ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                                            : 'bg-slate-800 text-amber-400 border-slate-700 hover:border-amber-500/50'
                                        } disabled:opacity-30 disabled:pointer-events-none`}
                                        title={l('Colonize with Material Cube', '使用材料人口殖民')}
                                      >
                                        <Hammer className="w-2.5 h-2.5" />
                                        <span>{l('Materials', '材料')} ({winner.population.material.cubesOnBoard})</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Checkbox / Lock */}
                            <div className="shrink-0 ml-2">
                              {isColonized ? (
                                <span className="text-[10px] text-slate-500">{l('Taken', '已占领')}</span>
                              ) : !check.canColonize && !isSelected ? (
                                <Lock className="w-3.5 h-3.5 text-slate-600" />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={!canControl || !canSelect}
                                  onChange={() => handleTogglePlanet(pIdx)}
                                  className="w-4 h-4 rounded border-slate-700 text-indigo-500 focus:ring-indigo-400 accent-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800/80 bg-slate-950">
          {currentStep === 'bombardment' ? (
            <div className="flex items-center justify-between w-full">
              {conquest.bombardmentSummary?.isPendingConfirm ? (
                <>
                  <div className="text-xs text-orange-300">
                    {l(
                      'Review or reroll bombardment dice, then apply damage.',
                      '查看或重掷轰炸骰子，然后确认生效。'
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid="confirm-bombardment-btn"
                    onClick={() => onConfirmBombardment?.()}
                    disabled={!canControl}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-cyan-950 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{l('Confirm Bombardment & Apply Damage', '确认轰炸并结算伤害')}</span>
                  </button>
                </>
              ) : isPendingTargets ? (
                <>
                  <div className="text-xs text-rose-300">
                    {l(
                      `Select ${requiredBombardTargets} population cube(s) to destroy.`,
                      `请选择 ${requiredBombardTargets} 枚要摧毁的人口方块。`
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid="confirm-bombard-targets-btn"
                    onClick={() => onSelectBombardmentTargets?.(selectedBombardTargets)}
                    disabled={!canControl || selectedBombardTargets.length !== requiredBombardTargets}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-rose-950 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>
                      {l(
                        `Destroy Selected (${selectedBombardTargets.length}/${requiredBombardTargets})`,
                        `确认摧毁 (${selectedBombardTargets.length}/${requiredBombardTargets})`
                      )}
                    </span>
                  </button>
                </>
              ) : !canClaim ? (
                <>
                  <div className="text-xs text-amber-400">
                    {conquest.bombardmentSummary?.attackerFleetWipedOut
                      ? l(
                          `Attacking fleet destroyed during bombardment in Sector ${sector.sectorNumber}.`,
                          `进攻舰队在星区 ${sector.sectorNumber} 轰炸中全灭。`
                        )
                      : l(`Defender retained control of Sector ${sector.sectorNumber}.`, `防守方保留了星区 ${sector.sectorNumber} 的控制权。`)}
                  </div>
                  <button
                    onClick={handleDeclineAll}
                    disabled={!canControl}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-950 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>
                      {canControl
                        ? l('Acknowledge & Continue', '确认并继续')
                        : l(`Waiting for ${winner.name}...`, `等待 ${winner.name}...`)}
                    </span>
                    {canControl && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-xs text-emerald-400">
                    {l('All defenders neutralized! Ready for sector conquest.', '敌方守军已清除！准备占领星区。')}
                  </div>
                  <button
                    onClick={() => canControl && setCurrentStep('conquest')}
                    disabled={!canControl}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-emerald-950 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>
                      {canControl
                        ? l('Proceed to Sector Control', '前往星区控制')
                        : l(`Waiting for ${winner.name}...`, `等待 ${winner.name}...`)}
                    </span>
                    {canControl && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {conquest.bombardmentSummary && (
                  <button
                    onClick={() => setCurrentStep('bombardment')}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
                  >
                    {l('← Review Bombardment', '← 查看轰炸结果')}
                  </button>
                )}
                {!alreadyControls && (
                  <button
                    onClick={handleDeclineAll}
                    disabled={!canControl}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {l('Leave Unclaimed', '放弃控制')}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirm}
                  disabled={!canControl}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-950 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {canControl ? (
                    <>
                      <span>{l('Confirm Conquest', '确认占领')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <span>{l(`Waiting for ${winner.name}...`, `等待 ${winner.name}...`)}</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
