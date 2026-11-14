import React, { useState, useMemo, useEffect } from 'react';
import {
  SimulatorSideConfig,
  SimulationResult,
  SimulatorSideValidation,
  validateSimulatorSide,
  createDefaultSimulatorSide,
  runCombatSimulation,
  findSectorsWithPendingCombat,
  loadBattleFromSector,
} from '../../engine/rules/combatSimulator';
import { GameState } from '../../engine/types/state';
import { ShipBlueprint, ShipPart } from '../../engine/types/blueprints';
import { SHIP_PARTS } from '../../engine/rules/partData';
import { calculateBlueprintStats } from '../../engine/rules/shipValidation';
import { ShipBlueprintSlotsLayout } from '../blueprints/ShipBlueprintSlotsLayout';
import { useLanguage, AppLanguage } from '../../i18n/LanguageContext';
import {
  translateFactionName,
  translateNeutralBlueprintTitle,
  translateShipType,
  translatePartName,
} from '../../i18n/catalogTranslations';
import {
  ALL_FACTIONS,
  HUMAN_FACTIONS,
  ALIEN_FACTIONS,
} from '../../engine/rules/setup';
import {
  NeutralShipType,
  NeutralShipVariant,
  NEUTRAL_SHIP_BLUEPRINTS,
} from '../../engine/rules/neutralShips';
import {
  Swords,
  X,
  Play,
  RotateCcw,
  Shield,
  Crosshair,
  Zap,
  Heart,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Layers,
  BarChart3,
  Flame,
  Check,
  HelpCircle,
  Navigation,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';

interface CombatSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState?: GameState | null;
}

const getPartGroups = (communityBalance: boolean, language: AppLanguage = 'en') => [
  {
    category: language === 'zh' ? '加农炮' : 'Cannons',
    parts: [
      { id: 'ion_cannon', name: `${translatePartName('ion_cannon', 'Ion Cannon', language)} (1🟡, 1⚡)` },
      { id: 'plasma_cannon', name: `${translatePartName('plasma_cannon', 'Plasma Cannon', language)} (1🟠, 2⚡)` },
      { id: 'soliton_cannon', name: `${translatePartName('soliton_cannon', 'Soliton Cannon', language)} (1🔵, 3⚡)` },
      { id: 'antimatter_cannon', name: `${translatePartName('antimatter_cannon', 'Antimatter Cannon', language)} (1🔴, 4⚡)` },
      { id: 'ion_disruptor', name: `${translatePartName('ion_disruptor', 'Ion Disruptor', language)} (1🟡, +3 ${language === 'zh' ? '先攻' : 'Init'})` },
      { id: 'ion_turret', name: `${translatePartName('ion_turret', 'Ion Turret', language)} (2🟡)` },
      { id: 'plasma_turret', name: `${translatePartName('plasma_turret', 'Plasma Turret', language)} (2🟠, 3⚡)` },
      { id: 'soliton_charger', name: `${translatePartName('soliton_charger', 'Soliton Charger', language)} (1🔵, 1⚡)` },
      { id: 'rift_cannon', name: `${translatePartName('rift_cannon', 'Rift Cannon', language)} (1🟣, 2⚡)` },
      { id: 'rift_conductor', name: `${translatePartName('rift_conductor', 'Rift Conductor', language)} (1🟣, +1❤️, 1⚡)` },
    ],
  },
  {
    category: language === 'zh' ? '导弹' : 'Missiles',
    parts: [
      { id: 'plasma_missile', name: `${translatePartName('plasma_missile', 'Plasma Missile', language)} (2🟠, 1⚡)` },
      { id: 'ion_missile', name: `${translatePartName('ion_missile', 'Ion Missile', language)} (3🟡)` },
      { id: 'soliton_missile', name: `${translatePartName('soliton_missile', 'Soliton Missile', language)} (1🔵, +1 ${language === 'zh' ? '先攻' : 'Init'})` },
      { id: 'antimatter_missile', name: `${translatePartName('antimatter_missile', 'Antimatter Missile', language)} (1🔴)` },
      { id: 'flux_missile', name: `${translatePartName('flux_missile', 'Flux Missile', language)} (2🟡, +1 ${language === 'zh' ? '先攻' : 'Init'})` },
    ],
  },
  {
    category: language === 'zh' ? '计算机' : 'Computers',
    parts: [
      { id: 'electron_computer', name: `${translatePartName('electron_computer', 'Electron Computer', language)} (+1🎯)` },
      { id: 'positron_computer', name: `${translatePartName('positron_computer', 'Positron Computer', language)} (+2🎯, 1⚡)` },
      { id: 'gluon_computer', name: `${translatePartName('gluon_computer', 'Gluon Computer', language)} (+3🎯, 2⚡)` },
      { id: 'axion_computer', name: `${translatePartName('axion_computer', 'Axion Computer', language)} (+2🎯, +1 ${language === 'zh' ? '先攻' : 'Init'})` },
      { id: 'sentient_hull', name: `${translatePartName('sentient_hull', 'Sentient Hull', language)} (+1🎯, +1❤️)` },
    ],
  },
  {
    category: language === 'zh' ? '护盾' : 'Shields',
    parts: [
      { id: 'gauss_shield', name: `${translatePartName('gauss_shield', 'Gauss Shield', language)} (-1🛡️)` },
      {
        id: 'phase_shield',
        name: communityBalance
          ? `${translatePartName('phase_shield', 'Phase Shield', language)} (-2🛡️, +1 ${language === 'zh' ? '先攻' : 'Init'}, 1⚡)`
          : `${translatePartName('phase_shield', 'Phase Shield', language)} (-2🛡️, 1⚡)`,
      },
      { id: 'flux_shield', name: `${translatePartName('flux_shield', 'Flux Shield', language)} (-3🛡️, +1 ${language === 'zh' ? '先攻' : 'Init'}, 2⚡)` },
      { id: 'inversion_shield', name: `${translatePartName('inversion_shield', 'Inversion Shield', language)} (-2🛡️, +2🔋)` },
      { id: 'absorption_shield', name: `${translatePartName('absorption_shield', 'Absorption Shield', language)} (-1🛡️, +4🔋)` },
      { id: 'morph_shield', name: `${translatePartName('morph_shield', 'Morph Shield', language)} (-1🛡️, ${language === 'zh' ? '每轮回复1' : 'Heals 1/rnd'})` },
    ],
  },
  {
    category: language === 'zh' ? '船体' : 'Hulls',
    parts: [
      { id: 'hull', name: `${translatePartName('hull', 'Hull', language)} (+1❤️)` },
      {
        id: 'improved_hull',
        name: communityBalance
          ? `${translatePartName('improved_hull', 'Improved Hull', language)} (+2❤️, -1 ${language === 'zh' ? '先攻' : 'Init'})`
          : `${translatePartName('improved_hull', 'Improved Hull', language)} (+2❤️)`,
      },
      { id: 'shard_hull', name: `${translatePartName('shard_hull', 'Shard Hull', language)} (+3❤️)` },
      { id: 'conifold_field', name: `${translatePartName('conifold_field', 'Conifold Field', language)} (+3❤️, 2⚡)` },
    ],
  },
  {
    category: language === 'zh' ? '引擎' : 'Drives',
    parts: [
      { id: 'nuclear_drive', name: `${translatePartName('nuclear_drive', 'Nuclear Drive', language)} (1 ${language === 'zh' ? '速' : 'Spd'}, +1 ${language === 'zh' ? '先攻' : 'Init'}, 1⚡)` },
      { id: 'fusion_drive', name: `${translatePartName('fusion_drive', 'Fusion Drive', language)} (2 ${language === 'zh' ? '速' : 'Spd'}, +2 ${language === 'zh' ? '先攻' : 'Init'}, 2⚡)` },
      { id: 'tachyon_drive', name: `${translatePartName('tachyon_drive', 'Tachyon Drive', language)} (3 ${language === 'zh' ? '速' : 'Spd'}, +3 ${language === 'zh' ? '先攻' : 'Init'}, 3⚡)` },
      { id: 'transition_drive', name: `${translatePartName('transition_drive', 'Transition Drive', language)} (3 ${language === 'zh' ? '速' : 'Spd'}, 0⚡)` },
      { id: 'conformal_drive', name: `${translatePartName('conformal_drive', 'Conformal Drive', language)} (4 ${language === 'zh' ? '速' : 'Spd'}, +2 ${language === 'zh' ? '先攻' : 'Init'}, 2⚡)` },
      { id: 'nonlinear_drive', name: `${translatePartName('nonlinear_drive', 'Nonlinear Drive', language)} (2 ${language === 'zh' ? '速' : 'Spd'}, +2🔋)` },
      { id: 'jump_drive', name: `${translatePartName('jump_drive', 'Jump Drive', language)} (${language === 'zh' ? '跳跃' : 'Jump'}, 2⚡)` },
    ],
  },
  {
    category: language === 'zh' ? '能源核心 / 反应堆' : 'Reactors / Power',
    parts: [
      { id: 'nuclear_source', name: `${translatePartName('nuclear_source', 'Nuclear Source', language)} (+3🔋)` },
      { id: 'fusion_source', name: `${translatePartName('fusion_source', 'Fusion Source', language)} (+6🔋)` },
      { id: 'tachyon_source', name: `${translatePartName('tachyon_source', 'Tachyon Source', language)} (+9🔋)` },
      { id: 'zero_point_source', name: `${translatePartName('zero_point_source', 'Zero-Point Source', language)} (+12🔋)` },
      { id: 'hypergrid_source', name: `${translatePartName('hypergrid_source', 'Hypergrid Source', language)} (+11🔋)` },
    ],
  },
];

export const CombatSimulatorModal: React.FC<CombatSimulatorModalProps> = ({
  isOpen,
  onClose,
  gameState,
}) => {
  const { l, language } = useLanguage();
  // Attacker configuration
  const [attacker, setAttacker] = useState<SimulatorSideConfig>(() =>
    createDefaultSimulatorSide('terran_federation')
  );

  // Defenders configuration (Wave sequence for multi-faction battles)
  const [defenders, setDefenders] = useState<SimulatorSideConfig[]>([
    createDefaultSimulatorSide('ancient', {
      isNpc: true,
    }),
  ]);
  const [targetDefenderIndexForBp, setTargetDefenderIndexForBp] = useState<number>(0);

  // Simulation settings & results
  const [iterations, setIterations] = useState<number>(1000);
  const [includeCommunityBalance, setIncludeCommunityBalance] = useState<boolean>(() =>
    Boolean(gameState?.expansions?.includes('community_balance'))
  );
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeTabAttackerShip, setActiveTabAttackerShip] = useState<string>('cruiser');
  const [activeTabDefenderShips, setActiveTabDefenderShips] = useState<Record<number, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync Community Balance toggle when gameState expansions update
  useEffect(() => {
    if (gameState?.expansions) {
      setIncludeCommunityBalance(gameState.expansions.includes('community_balance'));
    }
  }, [gameState?.expansions]);

  // Auto-clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Sectors with pending combat or fleets in game
  const pendingCombatSectors = useMemo(() => {
    if (!gameState) return [];
    return findSectorsWithPendingCombat(gameState);
  }, [gameState]);

  // Handle Sector Import (supports Nebula subsectors)
  const handleLoadSector = (val: string) => {
    if (!gameState) return;
    const [sectorId, subStr] = val.split('__sub_');
    const subsector = subStr ? (Number(subStr) as 1 | 2 | 3) : undefined;
    const loaded = loadBattleFromSector(gameState, sectorId!, subsector);
    if (loaded) {
      setAttacker(loaded.attacker);
      setDefenders(
        loaded.defenders && loaded.defenders.length > 0 ? loaded.defenders : [loaded.defender]
      );
      setSimulationResult(null);
      const secTile = gameState.sectors.find((s) => s.id === sectorId);
      const secNum = secTile?.sectorNumber || sectorId;
      const subText = subsector ? l(` (Nebula Subsector ${subsector})`, ` (星云子星区 ${subsector})`) : '';
      setToastMessage(
        l(
          `Loaded battle from Sector #${secNum}${subText} with ${loaded.defenders.length} defender${loaded.defenders.length > 1 ? 's' : ''}!`,
          `已从星区 #${secNum}${subText}载入战斗（共 ${loaded.defenders.length} 个防守方）！`
        )
      );
    }
  };

  // Handle Player Blueprints Import for Attacker
  const handleLoadPlayerForAttacker = (playerId: string) => {
    if (!gameState) return;
    const p = gameState.players.find((player) => player.id === playerId);
    if (!p) return;

    const clonedBps: Record<string, ShipBlueprint> = {};
    for (const [k, v] of Object.entries(p.blueprints)) {
      clonedBps[k] = {
        ...v,
        slots: [...v.slots],
        externalParts: v.externalParts ? [...v.externalParts] : [],
      };
    }

    setAttacker((prev) => ({
      ...prev,
      factionId: p.faction.id,
      name: p.faction.name,
      isNpc: false,
      blueprints: clonedBps,
      hasAntimatterSplitter: p.techTrack.researched.some((t) => t.id === 'antimatter_splitter'),
    }));
    const fname = translateFactionName(p.faction.id, p.faction.name, language);
    setToastMessage(l(`Loaded current blueprints from ${p.faction.name} for Attacker!`, `已为攻击方载入 ${fname} 的当前蓝图！`));
  };

  // Handle Player Blueprints Import for Defender (specific wave index)
  const handleLoadPlayerForDefender = (playerId: string, defIndex: number = targetDefenderIndexForBp) => {
    if (!gameState) return;
    const p = gameState.players.find((player) => player.id === playerId);
    if (!p) return;

    const clonedBps: Record<string, ShipBlueprint> = {};
    for (const [k, v] of Object.entries(p.blueprints)) {
      clonedBps[k] = {
        ...v,
        slots: [...v.slots],
        externalParts: v.externalParts ? [...v.externalParts] : [],
      };
    }

    setDefenders((prev) => {
      const next = [...prev];
      const idx = Math.min(Math.max(0, defIndex), next.length - 1);
      next[idx] = {
        ...next[idx]!,
        factionId: p.faction.id,
        name: p.faction.name,
        isNpc: false,
        blueprints: clonedBps,
        hasAntimatterSplitter: p.techTrack.researched.some((t) => t.id === 'antimatter_splitter'),
      };
      return next;
    });
    const fname = translateFactionName(p.faction.id, p.faction.name, language);
    setToastMessage(l(`Loaded current blueprints from ${p.faction.name} for Defender #${(defIndex ?? 0) + 1}!`, `已为防守方 #${(defIndex ?? 0) + 1} 载入 ${fname} 的当前蓝图！`));
  };

  // Defender Management: Add Defender
  const handleAddDefender = () => {
    setDefenders((prev) => [
      ...prev,
      createDefaultSimulatorSide('ancient', {
        isNpc: true,
      }),
    ]);
    setToastMessage(l(`Added Defender #${defenders.length + 1} to wave sequence!`, `已将防守方 #${defenders.length + 1} 加入波次序列！`));
  };

  // Defender Management: Remove Defender
  const handleRemoveDefender = (index: number) => {
    if (defenders.length <= 1) return;
    setDefenders((prev) => prev.filter((_, i) => i !== index));
    setSimulationResult(null);
    setToastMessage(l(`Removed Defender #${index + 1}!`, `已移除防守方 #${index + 1}！`));
  };

  // Defender Management: Reorder Defenders (Move Up / Down)
  const handleMoveDefender = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= defenders.length) return;
    setDefenders((prev) => {
      const next = [...prev];
      const temp = next[index]!;
      next[index] = next[targetIndex]!;
      next[targetIndex] = temp;
      return next;
    });
    setSimulationResult(null);
    setToastMessage(
      l(
        `Moved Defender #${index + 1} ${direction === 'up' ? 'earlier' : 'later'} in wave sequence!`,
        `已将防守方 #${index + 1} 移至${direction === 'up' ? '更前' : '更后'}波次！`
      )
    );
  };

  // Defender Management: Swap Defender with Attacker
  const handleSwapWithAttacker = (defenderIndex: number) => {
    const targetDefender = defenders[defenderIndex];
    if (!targetDefender) return;
    setAttacker((prevAttacker) => {
      setDefenders((prevDefenders) => {
        const nextDefenders = [...prevDefenders];
        nextDefenders[defenderIndex] = prevAttacker;
        return nextDefenders;
      });
      return targetDefender;
    });
    setSimulationResult(null);
    setToastMessage(l(`Swapped Attacker with Defender #${defenderIndex + 1}!`, `已互换攻击方与防守方 #${defenderIndex + 1}！`));
  };

  const activeExpansions = useMemo(
    () => (includeCommunityBalance ? ['community_balance'] : []),
    [includeCommunityBalance]
  );

  // Blueprint validation across attacker and all defender waves
  const attackerValidation = useMemo(
    () => validateSimulatorSide(attacker, true, activeExpansions),
    [attacker, activeExpansions]
  );
  const defenderValidations = useMemo(
    () => defenders.map((d) => validateSimulatorSide(d, true, activeExpansions)),
    [defenders, activeExpansions]
  );
  const allValidationErrors = useMemo(
    () => [
      ...attackerValidation.errors,
      ...defenderValidations.flatMap((v) => v.errors),
    ],
    [attackerValidation.errors, defenderValidations]
  );
  const hasValidationErrors = allValidationErrors.length > 0;

  // Run simulation
  const handleRunSimulation = () => {
    if (hasValidationErrors) {
      setToastMessage(l('Please resolve illegal ship blueprint configurations before simulating.', '请先修正非法的舰船蓝图配置再运行模拟。'));
      return;
    }
    setIsSimulating(true);
    setTimeout(() => {
      const res = runCombatSimulation(attacker, defenders, iterations, {
        activeExpansions,
      });
      setSimulationResult(res);
      setIsSimulating(false);
    }, 10);
  };

  // Reset side to base blueprint
  const handleResetAttackerBlueprints = () => {
    const fresh = createDefaultSimulatorSide(attacker.factionId, {
      isNpc: attacker.isNpc,
      npcVariant: attacker.npcVariant,
      shipCounts: attacker.shipCounts,
      hasAntimatterSplitter: attacker.hasAntimatterSplitter,
    });
    setAttacker(fresh);
    setSimulationResult(null);
  };

  const handleResetDefenderBlueprints = (index: number) => {
    const def = defenders[index];
    if (!def) return;
    const fresh = createDefaultSimulatorSide(def.factionId, {
      isNpc: def.isNpc,
      npcVariant: def.npcVariant,
      shipCounts: def.shipCounts,
      hasAntimatterSplitter: def.hasAntimatterSplitter,
    });
    setDefenders((prev) => {
      const next = [...prev];
      next[index] = fresh;
      return next;
    });
    setSimulationResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-7xl max-h-[96vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-950/50">
              <Swords className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-base sm:text-lg tracking-wider uppercase text-slate-100">
                  {l('Combat Simulator', '战斗模拟器')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {l('Monte Carlo 1,000 / 10,000', '蒙特卡洛 1,000 / 10,000 次')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {l('Simulate battles between customized fleets, alien species, and NPCs with official Eclipse combat rules', '依照星蚀官方战斗规则，模拟自定义舰队、外星派系与中立单位之间的战斗胜率')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={l('Close Simulator', '关闭模拟器')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* In-Game Data Quick Loader Bar (Only visible when open from an active game) */}
        {gameState && (
          <div className="px-5 py-2.5 bg-indigo-950/40 border-b border-indigo-900/50 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="font-bold uppercase tracking-wider text-[11px]">
                {l('In-Game Quick Load:', '对局数据快速载入：')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Load Sector Battle Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">{l('Sector Battle:', '星区战斗：')}</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleLoadSector(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="bg-slate-900 border border-indigo-700/60 rounded px-2 py-1 text-indigo-200 text-xs font-semibold focus:outline-none focus:border-indigo-400"
                >
                  <option value="" disabled>
                    {l('Choose a sector to simulate...', '选择要模拟的星区...')}
                  </option>
                  {pendingCombatSectors.map((s) => (
                    <option
                      key={`${s.sector.id}${s.subsector ? `_sub_${s.subsector}` : ''}`}
                      value={`${s.sector.id}${s.subsector ? `__sub_${s.subsector}` : ''}`}
                    >
                      {s.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Attacker Blueprint Quick Loader */}
              <div className="flex items-center gap-1.5">
                <span className="text-red-400 font-bold">{l('Attacker BP:', '攻方蓝图：')}</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleLoadPlayerForAttacker(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="bg-slate-900 border border-red-700/60 rounded px-2 py-1 text-red-200 text-xs font-semibold focus:outline-none"
                >
                  <option value="" disabled>
                    {l('Import player blueprints...', '导入玩家蓝图...')}
                  </option>
                  {gameState.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {translateFactionName(p.faction.id, p.faction.name, language)} ({p.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Defender Blueprint Quick Loader */}
              <div className="flex items-center gap-1.5">
                <span className="text-cyan-400 font-bold">{l('Defender BP:', '守方蓝图：')}</span>
                {defenders.length > 1 && (
                  <select
                    value={targetDefenderIndexForBp}
                    onChange={(e) => setTargetDefenderIndexForBp(Number(e.target.value))}
                    className="bg-slate-900 border border-cyan-800/80 rounded px-1.5 py-1 text-cyan-300 text-xs font-semibold focus:outline-none"
                    title={l('Select which defender wave to import blueprints into', '选择要导入蓝图的防守方波次')}
                  >
                    {defenders.map((_, idx) => (
                      <option key={idx} value={idx}>
                        {l(`Def #${idx + 1}`, `守方 #${idx + 1}`)}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleLoadPlayerForDefender(e.target.value, targetDefenderIndexForBp);
                      e.target.value = '';
                    }
                  }}
                  className="bg-slate-900 border border-cyan-700/60 rounded px-2 py-1 text-cyan-200 text-xs font-semibold focus:outline-none"
                >
                  <option value="" disabled>
                    {l('Import player blueprints...', '导入玩家蓝图...')}
                  </option>
                  {gameState.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {translateFactionName(p.faction.id, p.faction.name, language)} ({p.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-600 px-5 py-1.5 text-xs text-emerald-200 flex items-center justify-between animate-in fade-in duration-150 shrink-0">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Body: Scrollable Arena */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Top Arena Columns: Attacker vs Defender(s) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* ATTACKER COLUMN */}
            <SideConfigCard
              role="attacker"
              sideConfig={attacker}
              sideValidation={attackerValidation}
              onChangeSideConfig={setAttacker}
              activeShipTab={activeTabAttackerShip}
              onSelectShipTab={setActiveTabAttackerShip}
              onResetBlueprints={handleResetAttackerBlueprints}
              onSwapWithAttacker={() => handleSwapWithAttacker(0)}
              activeExpansions={activeExpansions}
            />

            {/* DEFENDERS COLUMN (Single or Multi-Wave) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="font-display font-black text-xs uppercase tracking-wider text-cyan-300">
                    {l(
                      `Defenders (${defenders.length} Wave${defenders.length > 1 ? 's' : ''})`,
                      `防守方（${defenders.length} 个波次）`
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddDefender}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 text-cyan-200 text-xs font-bold transition shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{l('Add Defender', '添加防守方')}</span>
                </button>
              </div>

              {defenders.map((def, idx) => (
                <SideConfigCard
                  key={idx}
                  role="defender"
                  sideConfig={def}
                  sideValidation={defenderValidations[idx]}
                  onChangeSideConfig={(val) => {
                    setDefenders((prev) => {
                      const next = [...prev];
                      next[idx] = typeof val === 'function' ? val(prev[idx]!) : val;
                      return next;
                    });
                  }}
                  activeShipTab={activeTabDefenderShips[idx] || 'cruiser'}
                  onSelectShipTab={(st) =>
                    setActiveTabDefenderShips((prev) => ({ ...prev, [idx]: st }))
                  }
                  onResetBlueprints={() => handleResetDefenderBlueprints(idx)}
                  defenderIndex={idx}
                  totalDefenders={defenders.length}
                  onMoveUp={() => handleMoveDefender(idx, 'up')}
                  onMoveDown={() => handleMoveDefender(idx, 'down')}
                  onRemove={() => handleRemoveDefender(idx)}
                  onSwapWithAttacker={() => handleSwapWithAttacker(idx)}
                  activeExpansions={activeExpansions}
                />
              ))}
            </div>
          </div>

          {/* SIMULATE CONTROLS & RESULTS */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            {/* Validation Errors Warning Banner */}
            {hasValidationErrors && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-start gap-2.5 shadow-md">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-rose-300">{l('Cannot simulate battle with illegal ship blueprints:', '无法模拟包含非法舰船蓝图的战斗：')}</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-300/90 font-mono text-[11px]">
                    {allValidationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                    {l('Simulation Iterations:', '模拟次数：')}
                  </span>
                  <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIterations(1000)}
                      className={`px-3.5 py-1 rounded-lg text-xs font-bold transition ${
                        iterations === 1000
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {l('1,000 Times', '1,000 次')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIterations(10000)}
                      className={`px-3.5 py-1 rounded-lg text-xs font-bold transition ${
                        iterations === 10000
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {l('10,000 Times (High Precision)', '10,000 次 (高精度)')}
                    </button>
                  </div>
                </div>

                {/* Community Balance Expansion Toggle (Bug 236) */}
                <label
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition cursor-pointer select-none ${
                    includeCommunityBalance
                      ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  title={l('Community Balance Expansion: Modifies Phase Shield (+1 Initiative) and Improved Hull (-1 Initiative)', '社区平衡补丁：修改相位护盾（+1 先攻）与改良船体（-1 先攻）')}
                >
                  <input
                    type="checkbox"
                    checked={includeCommunityBalance}
                    onChange={(e) => {
                      setIncludeCommunityBalance(e.target.checked);
                      setSimulationResult(null);
                    }}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500/30 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <Sparkles className={`w-3.5 h-3.5 ${includeCommunityBalance ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-bold">
                      {l('Community Expansion', '社区平衡扩展')}
                    </span>
                    <span className="text-[10px] text-amber-400/80 font-mono hidden sm:inline">
                      {l('(Phase Shield +1 Init, Improved Hull -1 Init)', '(相位护盾 +1 先攻, 改良船体 -1 先攻)')}
                    </span>
                  </div>
                </label>
              </div>

              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isSimulating || hasValidationErrors}
                title={hasValidationErrors ? l('Resolve illegal ship blueprints before simulating', '模拟前请先修复非法蓝图') : l('Run Monte Carlo Battle Simulation', '运行蒙特卡洛战斗模拟')}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-black text-sm tracking-wider uppercase transition-all transform active:scale-95 ${
                  hasValidationErrors
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60 shadow-none'
                    : 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-slate-950 shadow-lg shadow-orange-950/50 hover:shadow-orange-900/80 cursor-pointer disabled:opacity-50'
                }`}
              >
                <Flame className="w-4 h-4 fill-current" />
                <span>
                  {isSimulating
                    ? l('Simulating Battles...', '正在模拟战斗...')
                    : l(`Simulate Battle (${iterations.toLocaleString()} Runs)`, `开始模拟战斗 (${iterations.toLocaleString()} 次)`)}
                </span>
              </button>
            </div>

            {/* RESULTS PANEL */}
            {simulationResult && (
              <SimulationResultsView
                result={simulationResult}
                attackerName={attacker.name}
                defenderNames={defenders.map((d) => d.name)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SIDE CONFIGURATION CARD (Attacker or Defender)
// ============================================================================
interface SideConfigCardProps {
  role: 'attacker' | 'defender';
  sideConfig: SimulatorSideConfig;
  sideValidation?: SimulatorSideValidation;
  onChangeSideConfig: (
    val: SimulatorSideConfig | ((prev: SimulatorSideConfig) => SimulatorSideConfig)
  ) => void;
  activeShipTab: string;
  onSelectShipTab: (st: string) => void;
  onResetBlueprints: () => void;
  defenderIndex?: number;
  totalDefenders?: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  onSwapWithAttacker?: () => void;
  activeExpansions?: string[];
}

const SideConfigCard: React.FC<SideConfigCardProps> = ({
  role,
  sideConfig,
  sideValidation,
  onChangeSideConfig,
  activeShipTab,
  onSelectShipTab,
  onResetBlueprints,
  defenderIndex,
  totalDefenders,
  onMoveUp,
  onMoveDown,
  onRemove,
  onSwapWithAttacker,
  activeExpansions,
}) => {
  const { l, language } = useLanguage();
  const isAttacker = role === 'attacker';
  const roleColor = isAttacker ? 'red' : 'cyan';
  const isCommunityBalance = Boolean(activeExpansions?.includes('community_balance'));
  const partGroups = useMemo(() => getPartGroups(isCommunityBalance, language), [isCommunityBalance, language]);
  const [simSelectedSlotIndex, setSimSelectedSlotIndex] = useState<number>(0);

  // Handle faction or NPC selection change
  const handleFactionChange = (val: string) => {
    const isNpc = ['ancient', 'guardian', 'gcds'].includes(val);
    let shipCounts: Record<string, number> = {};
    if (!isNpc && !sideConfig.isNpc) {
      shipCounts = { ...sideConfig.shipCounts };
    } else if (isNpc && sideConfig.isNpc) {
      const prevCount = sideConfig.shipCounts[sideConfig.factionId] ?? 0;
      shipCounts = { [val]: prevCount };
    } else {
      shipCounts = isNpc ? { [val]: 0 } : { interceptor: 0, cruiser: 0, dreadnought: 0, starbase: 0 };
    }
    const fresh = createDefaultSimulatorSide(val, { isNpc, shipCounts });
    onChangeSideConfig(fresh);
  };

  // Handle NPC variant change
  const handleNpcVariantChange = (variant: NeutralShipVariant) => {
    const fresh = createDefaultSimulatorSide(sideConfig.factionId, {
      isNpc: true,
      npcVariant: variant,
      shipCounts: sideConfig.shipCounts,
    });
    onChangeSideConfig(fresh);
  };

  // Handle ship count change
  const handleUpdateShipCount = (type: string, delta: number) => {
    onChangeSideConfig((prev) => {
      const current = prev.shipCounts[type] || 0;
      const next = Math.max(0, current + delta);
      return {
        ...prev,
        shipCounts: {
          ...prev.shipCounts,
          [type]: next,
        },
      };
    });
  };

  // Handle Antimatter Splitter toggle
  const handleToggleAntimatterSplitter = () => {
    onChangeSideConfig((prev) => ({
      ...prev,
      hasAntimatterSplitter: !prev.hasAntimatterSplitter,
    }));
  };

  // Handle slot edit for ship blueprint
  const handleSlotChange = (shipType: string, slotIdx: number, partId: string | null) => {
    onChangeSideConfig((prev) => {
      const bp = prev.blueprints[shipType];
      if (!bp) return prev;

      const newSlots = [...bp.slots];
      newSlots[slotIdx] = partId ? SHIP_PARTS[partId] || null : null;

      return {
        ...prev,
        blueprints: {
          ...prev.blueprints,
          [shipType]: {
            ...bp,
            slots: newSlots,
          },
        },
      };
    });
  };

  // Handle Muon Source toggle (placed outside blueprint slots)
  const handleToggleMuonSource = (shipType: string, install: boolean) => {
    onChangeSideConfig((prev) => {
      const bp = prev.blueprints[shipType];
      if (!bp) return prev;

      let newExternal = bp.externalParts ? [...bp.externalParts] : [];
      if (install) {
        if (!newExternal.some((p) => p.id === 'muon_source')) {
          newExternal.push(SHIP_PARTS.muon_source);
        }
      } else {
        newExternal = newExternal.filter((p) => p.id !== 'muon_source');
      }

      return {
        ...prev,
        blueprints: {
          ...prev.blueprints,
          [shipType]: {
            ...bp,
            externalParts: newExternal,
          },
        },
      };
    });
  };

  const availableShipTypes = useMemo(() => {
    if (sideConfig.isNpc) return [];
    return Object.keys(sideConfig.blueprints);
  }, [sideConfig]);

  const activeBp = sideConfig.blueprints[activeShipTab] || sideConfig.blueprints.cruiser || sideConfig.blueprints.interceptor;
  const activeStats = useMemo(() => {
    if (!activeBp) return null;
    return calculateBlueprintStats(activeBp, activeExpansions || activeBp.activeExpansions);
  }, [activeBp, activeExpansions]);

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between space-y-4 ${
        isAttacker
          ? 'bg-red-950/20 border-red-900/60 shadow-lg shadow-red-950/20'
          : 'bg-cyan-950/20 border-cyan-900/60 shadow-lg shadow-cyan-950/20'
      }`}
    >
      <div className="space-y-4">
        {/* Card Header & Faction Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${
                isAttacker
                  ? 'bg-red-900/80 text-red-200 border border-red-700'
                  : 'bg-cyan-900/80 text-cyan-200 border border-cyan-700'
              }`}
            >
              {isAttacker
                ? l('ATTACKER', '攻击方')
                : l(
                    `DEFENDER ${(totalDefenders && totalDefenders > 1) ? `#${(defenderIndex ?? 0) + 1} (Wave ${(defenderIndex ?? 0) + 1})` : ''}`,
                    `防守方 ${(totalDefenders && totalDefenders > 1) ? `#${(defenderIndex ?? 0) + 1} (第 ${(defenderIndex ?? 0) + 1} 波)` : ''}`
                  )}
            </span>
            {!isAttacker && (
              <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" />
                {l('Wins ties', '平手先攻胜出')}
              </span>
            )}

            {/* Reorder and Swap Controls */}
            {onSwapWithAttacker && (
              <button
                type="button"
                onClick={onSwapWithAttacker}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                title={
                  isAttacker
                    ? l('Swap Attacker with Defender #1', '将攻击方与防守方 #1 互换')
                    : l(`Swap Defender #${(defenderIndex ?? 0) + 1} with Attacker`, `将防守方 #${(defenderIndex ?? 0) + 1} 与攻击方互换`)
                }
              >
                <ArrowUpDown className="w-3 h-3 text-amber-400" />
                <span>{isAttacker ? l('Swap with Def #1', '与守方#1互换') : l('Swap Attacker', '与攻方互换')}</span>
              </button>
            )}

            {!isAttacker && totalDefenders && totalDefenders > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={defenderIndex === 0}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 border border-slate-700 transition cursor-pointer"
                  title={l('Move Up (Fight earlier in wave sequence)', '上移（在波次中更早迎战）')}
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={defenderIndex === totalDefenders - 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 border border-slate-700 transition cursor-pointer"
                  title={l('Move Down (Fight later in wave sequence)', '下移（在波次中更晚迎战）')}
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  className="p-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition cursor-pointer"
                  title={l('Remove this defender', '移除此防守方')}
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-bold">{l('Faction / NPC:', '派系 / 中立：')}</label>
            <select
              value={sideConfig.factionId}
              onChange={(e) => handleFactionChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs font-bold rounded-lg px-2.5 py-1 text-white focus:outline-none"
            >
              <optgroup label={l('NPCs (Non-Player Characters)', '中立非玩家单位 (NPC)')}>
                <option value="ancient">{l('Ancients (Ancient Cruiser)', '远古巡洋舰 (Ancients)')}</option>
                <option value="guardian">{l('Guardian (Sector 100s)', '星区守护者 (Guardian)')}</option>
                <option value="gcds">{l('GCDS (Galactic Center 001)', '银河中心防卫系统 (GCDS)')}</option>
              </optgroup>
              <optgroup label={l('Terran Factions', '人类派系')}>
                {HUMAN_FACTIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {translateFactionName(f.id, f.name, language)}
                  </option>
                ))}
              </optgroup>
              <optgroup label={l('Alien Factions', '外星派系')}>
                {ALIEN_FACTIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {translateFactionName(f.id, f.name, language)}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* NPC Variant Selection or Player Tech Options */}
        {sideConfig.isNpc ? (
          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">{l('NPC Blueprint Variant:', 'NPC 蓝图版本：')}</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(['default', 'advanced', 'expert'] as NeutralShipVariant[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleNpcVariantChange(v)}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold capitalize transition ${
                      sideConfig.npcVariant === v
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {v === 'expert'
                      ? l('Remnants', '遗迹 (Remnants)')
                      : v === 'advanced'
                      ? l('advanced', '进阶版')
                      : l('default', '标准版')}
                  </button>
                ))}
              </div>
            </div>
            {/* NPC Stats Summary */}
            {(() => {
              const npcType = sideConfig.factionId as NeutralShipType;
              const npcVar = sideConfig.npcVariant || 'default';
              const bp = NEUTRAL_SHIP_BLUEPRINTS[npcType]?.[npcVar];
              const bpTitle = bp ? translateNeutralBlueprintTitle(npcType, npcVar, bp.name, language) : '';
              return (
                <div className="text-xs text-slate-400 font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  {language === 'zh' && bp
                    ? `${bpTitle}: 船体 ${bp.maxHull}, 先攻 ${bp.initiative}, 计算机 +${bp.computerBonus}${bp.shieldBonus ? `, 护盾 -${bp.shieldBonus}` : ''}`
                    : bp?.summary || `${bp?.name}: Hull ${bp?.maxHull}, Init ${bp?.initiative}, Comp +${bp?.computerBonus}`}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-slate-900/80 rounded-xl px-3 py-2 border border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200 select-none">
              <input
                type="checkbox"
                checked={sideConfig.hasAntimatterSplitter}
                onChange={handleToggleAntimatterSplitter}
                className="w-4 h-4 rounded text-red-600 focus:ring-0 cursor-pointer bg-slate-950 border-slate-700"
              />
              <span>{l('Antimatter Splitter Tech', '反物质分裂器科技')}</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {l('(Splits weapon damage freely over enemy targets)', '(可自由拆分武器伤害至多个敌方目标)')}
            </span>
          </div>
        )}

        {/* Fleet Ship Counts */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {l('Fleet Composition (Ship Counts):', '舰队配置（舰船数量）：')}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {sideConfig.isNpc ? (
              <div className="col-span-2 sm:col-span-4 flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                <span className="text-xs font-bold text-slate-200 capitalize">
                  {translateShipType(sideConfig.factionId, language)} {l('Ships:', '数量：')}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateShipCount(sideConfig.factionId, -1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center transition"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono font-bold text-base text-cyan-300">
                    {sideConfig.shipCounts[sideConfig.factionId] ?? 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateShipCount(sideConfig.factionId, 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center transition"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : (
              ['interceptor', 'cruiser', 'dreadnought', 'starbase'].map((st) => {
                const count = sideConfig.shipCounts[st] || 0;
                return (
                  <div
                    key={st}
                    className="flex flex-col items-center bg-slate-900/80 border border-slate-800 rounded-xl p-2 text-center"
                  >
                    <span className="text-[11px] font-bold text-slate-300 capitalize">
                      {translateShipType(st, language)}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateShipCount(st, -1)}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-sm text-white">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateShipCount(st, 1)}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Blueprint Editor (For Player Factions) */}
        {!sideConfig.isNpc && activeBp && (
          <div className="space-y-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1 overflow-x-auto">
                {availableShipTypes.map((st) => {
                  const count = sideConfig.shipCounts[st] || 0;
                  const hasError = Boolean(sideValidation?.shipErrors[st] && sideValidation.shipErrors[st].length > 0);

                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onSelectShipTab(st)}
                      className={`px-2.5 py-1 rounded text-xs font-bold capitalize transition flex items-center gap-1.5 ${
                        activeShipTab === st
                          ? isAttacker
                            ? 'bg-red-800 text-white shadow'
                            : 'bg-cyan-800 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{translateShipType(st, language)}</span>
                      {count > 0 && (
                        <span className="text-[10px] font-mono opacity-80">({count})</span>
                      )}
                      {hasError && (
                        <AlertTriangle
                          className="w-3.5 h-3.5 text-amber-400 shrink-0"
                          title={sideValidation?.shipErrors[st]?.join('; ')}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onResetBlueprints}
                className="text-[11px] font-bold text-slate-400 hover:text-amber-300 flex items-center gap-1 transition"
                title={l('Reset to factory blueprints', '重置为初始蓝图')}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{l('Reset', '重置')}</span>
              </button>
            </div>

            {/* Blueprint Live Stats */}
            {activeStats && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-rose-300 font-mono font-bold flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                  {activeStats.totalHull} HP
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300 font-mono font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {activeStats.totalInitiative} {l('Init', '先攻')}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-yellow-300 font-mono font-bold flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-yellow-400" />
                  +{activeStats.computerBonus} {l('COMP', '瞄准')}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-mono font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-cyan-400" />
                  -{activeStats.shieldBonus} {l('Shield', '护盾')}
                </span>
                <span
                  className={`px-2 py-0.5 rounded border font-mono font-bold flex items-center gap-1 ${
                    activeBp.type === 'starbase' || activeBp.type === 'orbital' || activeStats.totalDriveSpeed > 0 || activeStats.hasJumpDrive
                      ? 'bg-slate-950 border-slate-800 text-indigo-300'
                      : 'bg-rose-950/60 border-rose-800 text-rose-300 animate-pulse'
                  }`}
                  title={l('Drive Speed', '航速')}
                >
                  <Navigation className="w-3 h-3" />
                  {activeStats.totalDriveSpeed} {l('Speed', '航速')}
                </span>
                <span
                  className={`px-2 py-0.5 rounded border font-mono font-bold ${
                    activeStats.totalPowerProduced >= activeStats.totalPowerConsumed
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-800 text-rose-300 animate-pulse'
                  }`}
                  title={l('Power Produced vs Consumed', '总供电 / 总耗电')}
                >
                  {`⚡ +${activeStats.totalPowerProduced}/-${activeStats.totalPowerConsumed}`}
                </span>
              </div>
            )}

            {/* Blueprint Illegal Error Alert Banner */}
            {activeStats && !activeStats.isValid && (
              <div className="p-2.5 bg-rose-950/50 border border-rose-800 rounded-lg text-rose-200 text-xs flex items-start gap-2 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-rose-300">{l(`Illegal ${activeBp.type.toUpperCase()} Blueprint:`, `非法的 ${translateShipType(activeBp.type, 'zh')} 蓝图：`)}</span>
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px] text-rose-200 font-mono">
                    {activeStats.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Visual Ship Blueprint Component Slots (Square tiles in authentic bghelper layout) */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 my-1 overflow-x-auto">
              <ShipBlueprintSlotsLayout
                shipType={activeBp.type}
                factionId={sideConfig.factionId}
                slots={activeBp.slots}
                maxSlots={activeBp.slots.length}
                preprintedPower={activeBp.preprintedPower}
                preprintedComputer={activeBp.preprintedComputer}
                preprintedShield={activeBp.preprintedShield}
                preprintedHull={activeBp.preprintedHull}
                externalParts={activeBp.externalParts || []}
                interactive={true}
                selectedSlotIndex={simSelectedSlotIndex}
                onSelectSlot={(idx) => setSimSelectedSlotIndex(idx)}
                onClearSlot={(idx) => handleSlotChange(activeBp.type, idx, null)}
                onClearExternalPart={() => handleToggleMuonSource(activeBp.type, false)}
                size="md"
              />
            </div>

            {/* Muon Source Checkbox (Outside Slot) */}
            <div className="flex items-center justify-between p-2.5 bg-slate-900/90 border border-amber-600/50 rounded-xl shadow-inner">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(activeBp.externalParts?.some((p) => p.id === 'muon_source'))}
                  onChange={(e) => handleToggleMuonSource(activeBp.type, e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer accent-amber-500"
                />
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  {l('Install Muon Source (+2🔋, +1 Init outside slot)', '加装渺子源（+2🔋，+1 先攻，不占槽位）')}
                </span>
              </label>
              {Boolean(activeBp.externalParts?.some((p) => p.id === 'muon_source')) && (
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-600/60 px-2 py-0.5 rounded-full">
                  {l('OUTSIDE SLOT EQUIPPED', '已挂载槽外配件')}
                </span>
              )}
            </div>

            {/* Quick-Equip Selector for Selected Square */}
            <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-inner">
              <span className="text-[11px] font-bold text-slate-300">
                {l('Equip Component:', '装配配件：')}
              </span>
              <select
                value={activeBp.slots[simSelectedSlotIndex]?.id || ''}
                onChange={(e) =>
                  handleSlotChange(activeBp.type, simSelectedSlotIndex, e.target.value || null)
                }
                className="flex-1 min-w-[180px] bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400 font-medium"
              >
                <option value="">{l('(Empty Slot)', '(空槽位)')}</option>
                {partGroups.map((g) => (
                  <optgroup key={g.category} label={g.category}>
                    {g.parts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {activeBp.slots[simSelectedSlotIndex] && (
                <button
                  type="button"
                  onClick={() => handleSlotChange(activeBp.type, simSelectedSlotIndex, null)}
                  className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title={l('Clear component', '清空配件')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{l('Clear', '清空')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SIMULATION RESULTS VIEW
// ============================================================================
interface SimulationResultsViewProps {
  result: SimulationResult;
  attackerName: string;
  defenderNames?: string[];
  defenderName?: string;
}

const PARTICIPANT_PALETTES = {
  attacker: {
    gradientClass: 'bg-gradient-to-r from-red-600 to-orange-500',
    textColor: 'text-red-400',
    dotColor: 'bg-red-500',
    bgBadge: 'bg-red-950/60 border-red-800 text-red-300',
  },
  draw: {
    gradientClass: 'bg-slate-600',
    textColor: 'text-slate-400',
    dotColor: 'bg-slate-400',
    bgBadge: 'bg-slate-900 border-slate-700 text-slate-300',
  },
  defenders: [
    {
      gradientClass: 'bg-gradient-to-r from-teal-500 to-cyan-500',
      textColor: 'text-cyan-400',
      dotColor: 'bg-cyan-400',
      bgBadge: 'bg-cyan-950/60 border-cyan-800 text-cyan-300',
      borderCard: 'border-cyan-900/50',
    },
    {
      gradientClass: 'bg-gradient-to-r from-violet-600 to-purple-500',
      textColor: 'text-purple-400',
      dotColor: 'bg-purple-400',
      bgBadge: 'bg-purple-950/60 border-purple-800 text-purple-300',
      borderCard: 'border-purple-900/50',
    },
    {
      gradientClass: 'bg-gradient-to-r from-emerald-600 to-teal-500',
      textColor: 'text-emerald-400',
      dotColor: 'bg-emerald-400',
      bgBadge: 'bg-emerald-950/60 border-emerald-800 text-emerald-300',
      borderCard: 'border-emerald-900/50',
    },
    {
      gradientClass: 'bg-gradient-to-r from-amber-600 to-yellow-500',
      textColor: 'text-amber-400',
      dotColor: 'bg-amber-400',
      bgBadge: 'bg-amber-950/60 border-amber-800 text-amber-300',
      borderCard: 'border-amber-900/50',
    },
    {
      gradientClass: 'bg-gradient-to-r from-pink-600 to-rose-500',
      textColor: 'text-pink-400',
      dotColor: 'bg-pink-400',
      bgBadge: 'bg-pink-950/60 border-pink-800 text-pink-300',
      borderCard: 'border-pink-900/50',
    },
  ],
};

const SimulationResultsView: React.FC<SimulationResultsViewProps> = ({
  result,
  attackerName,
  defenderNames,
  defenderName,
}) => {
  const { l } = useLanguage();
  const isMultiDefender = Boolean(defenderNames && defenderNames.length > 1);
  const primaryDefenderName = defenderName || (defenderNames && defenderNames[0]) || l('Defender', '防守方');
  const defenderDisplayLabel = isMultiDefender
    ? l(`Defenders (${defenderNames!.join(' + ')})`, `防守方 (${defenderNames!.join(' + ')})`)
    : primaryDefenderName;

  // Map participants with color palettes for the Win Rate Bar
  const participants = useMemo(() => {
    if (result.participants && result.participants.length > 0) {
      let defIdx = 0;
      return result.participants.map((p) => {
        let palette;
        if (p.role === 'attacker') {
          palette = PARTICIPANT_PALETTES.attacker;
        } else if (p.role === 'draw') {
          palette = PARTICIPANT_PALETTES.draw;
        } else {
          palette =
            PARTICIPANT_PALETTES.defenders[defIdx % PARTICIPANT_PALETTES.defenders.length]!;
          defIdx++;
        }
        return {
          ...p,
          palette,
        };
      });
    }

    // Fallback if result.participants is missing
    const fallback = [
      {
        id: 'attacker',
        role: 'attacker' as const,
        name: l(`Attacker (${attackerName})`, `攻击方 (${attackerName})`),
        winRate: result.attackerWinRate,
        wins: result.attackerWins,
        isAlliance: false,
        palette: PARTICIPANT_PALETTES.attacker,
      },
    ];
    if (result.draws > 0) {
      fallback.push({
        id: 'draw',
        role: 'draw' as const,
        name: l('Draw', '同归于尽'),
        winRate: result.drawRate,
        wins: result.draws,
        isAlliance: false,
        palette: PARTICIPANT_PALETTES.draw,
      });
    }
    fallback.push({
      id: 'defender',
      role: 'defender' as const,
      name: defenderDisplayLabel,
      winRate: result.defenderWinRate,
      wins: result.defenderWins,
      isAlliance: false,
      palette: PARTICIPANT_PALETTES.defenders[0]!,
    });
    return fallback;
  }, [result, attackerName, defenderDisplayLabel, l]);

  // Parties for the Surviving Fleets breakdown (Attacker, Defender 1, Defender 2, etc.)
  const survivingParties = useMemo(() => {
    const list: {
      id: string;
      label: string;
      shortLabel: string;
      wins: number;
      dotColor: string;
      activeBgClass: string;
      activeBorderClass: string;
      activeTextClass: string;
      badgeClass: string;
      survivingOutcomes: SimulationSurvivingFleet[];
    }[] = [
      {
        id: 'attacker',
        label: l(`Attacker (${attackerName})`, `攻击方 (${attackerName})`),
        shortLabel: attackerName,
        wins: result.attackerWins,
        dotColor: 'bg-red-500',
        activeBgClass: 'bg-red-950',
        activeBorderClass: 'border-red-700',
        activeTextClass: 'text-red-200',
        badgeClass: 'bg-red-950/80 text-red-300 border-red-800',
        survivingOutcomes: result.attackerSurvivingOutcomes || [],
      },
    ];

    if (result.defendersBreakdown && result.defendersBreakdown.length > 0) {
      result.defendersBreakdown.forEach((d, i) => {
        const palette = PARTICIPANT_PALETTES.defenders[i % PARTICIPANT_PALETTES.defenders.length]!;
        const label =
          result.defendersBreakdown!.length > 1
            ? l(`Defender ${i + 1} (${d.name})`, `防守方 ${i + 1} (${d.name})`)
            : l(`Defender (${d.name})`, `防守方 (${d.name})`);

        // Clean outcomes without redundant bracket prefix
        const outcomes =
          d.survivingOutcomes && d.survivingOutcomes.length > 0
            ? d.survivingOutcomes
            : result.defendersBreakdown!.length > 1
            ? (result.defenderSurvivingOutcomes || [])
                .filter((item) => item.summary.startsWith(`[Defender ${i + 1}:`))
                .map((item) => ({
                  ...item,
                  summary: item.summary.replace(/^\[Defender \d+: [^\]]+\]\s*/, ''),
                }))
            : result.defenderSurvivingOutcomes || [];

        list.push({
          id: `defender_${i}`,
          label,
          shortLabel: d.name,
          wins: d.wins,
          dotColor: palette.dotColor,
          activeBgClass: 'bg-slate-900',
          activeBorderClass: palette.bgBadge.split(' ')[1] || 'border-cyan-700',
          activeTextClass: palette.textColor,
          badgeClass: `${palette.bgBadge} font-mono font-bold border`,
          survivingOutcomes: outcomes,
        });
      });
    } else {
      list.push({
        id: 'defender_0',
        label: defenderDisplayLabel,
        shortLabel: primaryDefenderName,
        wins: result.defenderWins,
        dotColor: 'bg-cyan-400',
        activeBgClass: 'bg-cyan-950',
        activeBorderClass: 'border-cyan-700',
        activeTextClass: 'text-cyan-200',
        badgeClass: 'bg-cyan-950/80 text-cyan-300 font-mono font-bold border border-cyan-800',
        survivingOutcomes: result.defenderSurvivingOutcomes || [],
      });
    }

    return list;
  }, [result, attackerName, defenderDisplayLabel, primaryDefenderName]);

  const [activeResultsTab, setActiveResultsTab] = useState<string>(() => {
    if (result.attackerWins >= result.defenderWins) {
      return 'attacker';
    }
    return survivingParties[1]?.id || 'defender_0';
  });

  useEffect(() => {
    if (activeResultsTab === 'draws' && result.draws > 0) return;
    if (!survivingParties.some((p) => p.id === activeResultsTab)) {
      if (result.attackerWins >= result.defenderWins) {
        setActiveResultsTab('attacker');
      } else {
        const topDef = survivingParties
          .slice(1)
          .reduce(
            (prev, curr) => (curr.wins > prev.wins ? curr : prev),
            survivingParties[1] || survivingParties[0]!
          );
        setActiveResultsTab(topDef?.id || 'attacker');
      }
    }
  }, [result, survivingParties]);

  if (result.validationErrors && result.validationErrors.length > 0) {
    return (
      <div className="bg-slate-950 rounded-xl p-4 border border-rose-800 space-y-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{l('Simulation Halted: Illegal Blueprint Detected', '模拟中止：检测到非法舰船蓝图')}</span>
        </div>
        <p className="text-xs text-slate-300">
          {l('The battle simulation could not be executed because one or more participating ships violate Eclipse construction rules:', '由于存在违反《星蚀》造舰规则的蓝图配置，战斗模拟未能执行：')}
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs text-rose-300 font-mono bg-rose-950/40 p-3 rounded-lg border border-rose-900/60">
          {result.validationErrors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-4 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          <h3 className="font-display font-black text-sm tracking-wider uppercase text-white">
            {l(`Simulation Results (${result.iterations.toLocaleString()} Battles)`, `模拟结果（共 ${result.iterations.toLocaleString()} 场战斗）`)}
          </h3>
        </div>
        <div className="text-xs font-mono text-slate-400">
          {l('Average Combat Duration:', '平均交火轮次：')} <span className="font-bold text-amber-300">{l(`${result.avgRounds} Rounds`, `${result.avgRounds} 轮`)}</span>
        </div>
      </div>

      {/* High-Level Win Rates Bar */}
      <div className="space-y-2">
        {/* Participant Win Rate Labels */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs font-bold">
          {participants.map((p) => (
            <div key={p.id} className={`flex items-center gap-1.5 ${p.palette.textColor}`}>
              <span className={`w-2 h-2 rounded-full ${p.palette.dotColor} shrink-0`} />
              <span>
                {p.name}: <span className="font-mono">{p.winRate}%</span>{' '}
                <span className="font-normal text-[11px] opacity-80 font-mono">
                  ({p.wins.toLocaleString()})
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Visual Progress Split Bar (1 part per independent participant, with Draco & Ancients exception) */}
        <div className="w-full h-5 bg-slate-900 rounded-full overflow-hidden flex shadow-inner border border-slate-800/80">
          {participants.map((p) => (
            <div
              key={p.id}
              style={{ width: `${p.winRate}%` }}
              title={l(`${p.name}: ${p.winRate}% (${p.wins.toLocaleString()} wins)`, `${p.name}：${p.winRate}% (${p.wins.toLocaleString()} 胜)`)}
              className={`${p.palette.gradientClass} h-full transition-all duration-500 flex items-center justify-center text-[10px] font-mono font-black text-white shadow-sm overflow-hidden select-none`}
            >
              {p.winRate >= 8 ? `${p.winRate}%` : ''}
            </div>
          ))}
        </div>

        {/* Wave Breakdown for Multiple Defenders */}
        {result.defendersBreakdown && result.defendersBreakdown.length > 1 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 mt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>{l('Wave Combat Sequence Breakdown:', '分波次战斗序列明细：')}</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {l(`Attacker must defeat all ${result.defendersBreakdown.length} waves to win`, `攻击方必须击败全部 ${result.defendersBreakdown.length} 波防守方才算获胜`)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {result.defendersBreakdown.map((d, i) => {
                const matchingParticipant = participants.find(
                  (p) => p.defenderIndices && p.defenderIndices.includes(d.index)
                );
                const borderClass =
                  matchingParticipant?.palette.borderCard || 'border-cyan-900/50';
                const textClass =
                  matchingParticipant?.palette.textColor || 'text-cyan-400';

                return (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg bg-slate-950/80 border ${borderClass} flex flex-col justify-between`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                      <span className={`font-bold ${textClass}`}>
                        {l(`Wave ${i + 1}: ${d.name}`, `第 ${i + 1} 波：${d.name}`)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        #{i + 1}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between">
                      <span className={`font-mono text-sm font-black ${textClass}`}>
                        {d.winRate}%
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {l(`${d.wins.toLocaleString()} victories`, `${d.wins.toLocaleString()} 胜场`)}
                      </span>
                    </div>
                    {matchingParticipant?.isAlliance && (
                      <div className="mt-1 text-[10px] text-teal-400 font-medium flex items-center gap-1">
                        <span>🕊️ {l('Peaceful Allies (Defends with Draco / Ancients)', '和平盟友（与天龙/远古协同防守）')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Surviving Fleets Distribution Details (Split by Participant Parties) */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
          {survivingParties.map((party) => {
            const isActive = activeResultsTab === party.id;
            return (
              <button
                key={party.id}
                type="button"
                onClick={() => setActiveResultsTab(party.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  isActive
                    ? `${party.activeBgClass} border ${party.activeBorderClass} ${party.activeTextClass} shadow`
                    : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${party.dotColor} shrink-0`} />
                <span>
                  {party.label} {l('Fleets', '残余舰队')}{' '}
                  <span className="font-mono text-[11px] opacity-80">({party.wins.toLocaleString()})</span>
                </span>
              </button>
            );
          })}

          {result.draws > 0 && (
            <button
              type="button"
              onClick={() => setActiveResultsTab('draws')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeResultsTab === 'draws'
                  ? 'bg-slate-800 border border-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span>
                {l('Draws', '平局 / 同归于尽')}{' '}
                <span className="font-mono text-[11px] opacity-80">({result.draws.toLocaleString()})</span>
              </span>
            </button>
          )}
        </div>

        {/* Breakdown List for Selected Party */}
        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {activeResultsTab === 'draws' ? (
            <div className="p-3 text-xs text-slate-300 bg-slate-900/80 rounded-lg border border-slate-800">
              {l(
                `Mutual destruction: Both fleets completely wiped out simultaneously in ${result.draws.toLocaleString()} battles (${result.drawRate}%).`,
                `同归于尽：双方舰队在 ${result.draws.toLocaleString()} 场战斗（${result.drawRate}%）中同时全军覆没。`
              )}
            </div>
          ) : (() => {
            const currentParty =
              survivingParties.find((p) => p.id === activeResultsTab) || survivingParties[0]!;

            if (currentParty.survivingOutcomes.length === 0) {
              return (
                <div className="text-xs text-slate-500 italic p-3 text-center">
                  {l(`${currentParty.label} did not achieve any victories in this simulation.`, `${currentParty.label} 在本次模拟中未取得任何胜利。`)}
                </div>
              );
            }

            return currentParty.survivingOutcomes.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 font-mono text-[11px] text-slate-500">#{idx + 1}</span>
                  <span className="font-bold text-white">{item.summary}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400">{item.count.toLocaleString()} {l('times', '次')}</span>
                  <span className={`px-2 py-0.5 rounded ${currentParty.badgeClass}`}>
                    {item.percentage}% {l('of all', '占比')}
                  </span>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
};
