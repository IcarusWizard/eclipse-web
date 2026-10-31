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
  Ship,
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

const PART_GROUPS = [
  {
    category: 'Cannons',
    parts: [
      { id: 'ion_cannon', name: 'Ion Cannon (1🟡, 1⚡)' },
      { id: 'plasma_cannon', name: 'Plasma Cannon (1🟠, 2⚡)' },
      { id: 'soliton_cannon', name: 'Soliton Cannon (1🔵, 3⚡)' },
      { id: 'antimatter_cannon', name: 'Antimatter Cannon (1🔴, 4⚡)' },
      { id: 'ion_disruptor', name: 'Ion Disruptor (1🟡, +3 Init)' },
      { id: 'ion_turret', name: 'Ion Turret (2🟡)' },
      { id: 'plasma_turret', name: 'Plasma Turret (2🟠, 3⚡)' },
      { id: 'soliton_charger', name: 'Soliton Charger (1🔵, 1⚡)' },
      { id: 'rift_cannon', name: 'Rift Cannon (1🟣, 2⚡)' },
      { id: 'rift_conductor', name: 'Rift Conductor (1🟣, +1❤️, 1⚡)' },
    ],
  },
  {
    category: 'Missiles',
    parts: [
      { id: 'plasma_missile', name: 'Plasma Missile (2🟠, 1⚡)' },
      { id: 'ion_missile', name: 'Ion Missile (3🟡)' },
      { id: 'soliton_missile', name: 'Soliton Missile (1🔵, +1 Init)' },
      { id: 'antimatter_missile', name: 'Antimatter Missile (1🔴)' },
      { id: 'flux_missile', name: 'Flux Missile (2🟡, +1 Init)' },
    ],
  },
  {
    category: 'Computers',
    parts: [
      { id: 'electron_computer', name: 'Electron Computer (+1🎯)' },
      { id: 'positron_computer', name: 'Positron Computer (+2🎯, 1⚡)' },
      { id: 'gluon_computer', name: 'Gluon Computer (+3🎯, 2⚡)' },
      { id: 'axion_computer', name: 'Axion Computer (+2🎯, +1 Init)' },
      { id: 'sentient_hull', name: 'Sentient Hull (+1🎯, +1❤️)' },
    ],
  },
  {
    category: 'Shields',
    parts: [
      { id: 'gauss_shield', name: 'Gauss Shield (-1🛡️)' },
      { id: 'phase_shield', name: 'Phase Shield (-2🛡️, 1⚡)' },
      { id: 'flux_shield', name: 'Flux Shield (-3🛡️, +1 Init, 2⚡)' },
      { id: 'inversion_shield', name: 'Inversion Shield (-2🛡️, +2🔋)' },
      { id: 'absorption_shield', name: 'Absorption Shield (-1🛡️, +4🔋)' },
      { id: 'morph_shield', name: 'Morph Shield (-1🛡️, Heals 1/rnd)' },
    ],
  },
  {
    category: 'Hulls',
    parts: [
      { id: 'hull', name: 'Hull (+1❤️)' },
      { id: 'improved_hull', name: 'Improved Hull (+2❤️)' },
      { id: 'shard_hull', name: 'Shard Hull (+3❤️)' },
      { id: 'conifold_field', name: 'Conifold Field (+3❤️, 2⚡)' },
    ],
  },
  {
    category: 'Drives',
    parts: [
      { id: 'nuclear_drive', name: 'Nuclear Drive (1 Spd, +1 Init, 1⚡)' },
      { id: 'fusion_drive', name: 'Fusion Drive (2 Spd, +2 Init, 2⚡)' },
      { id: 'tachyon_drive', name: 'Tachyon Drive (3 Spd, +3 Init, 3⚡)' },
      { id: 'transition_drive', name: 'Transition Drive (3 Spd, 0⚡)' },
      { id: 'conformal_drive', name: 'Conformal Drive (4 Spd, +2 Init, 2⚡)' },
      { id: 'nonlinear_drive', name: 'Nonlinear Drive (2 Spd, +2🔋)' },
      { id: 'jump_drive', name: 'Jump Drive (Jump, 2⚡)' },
    ],
  },
  {
    category: 'Reactors / Power',
    parts: [
      { id: 'nuclear_source', name: 'Nuclear Source (+3🔋)' },
      { id: 'fusion_source', name: 'Fusion Source (+6🔋)' },
      { id: 'tachyon_source', name: 'Tachyon Source (+9🔋)' },
      { id: 'zero_point_source', name: 'Zero-Point Source (+12🔋)' },
      { id: 'muon_source', name: 'Muon Source (+2🔋, +1 Init)' },
      { id: 'hypergrid_source', name: 'Hypergrid Source (+11🔋)' },
    ],
  },
];

export const CombatSimulatorModal: React.FC<CombatSimulatorModalProps> = ({
  isOpen,
  onClose,
  gameState,
}) => {
  // Attacker configuration
  const [attacker, setAttacker] = useState<SimulatorSideConfig>(() =>
    createDefaultSimulatorSide('terran_federation', {
      shipCounts: { dreadnought: 1, cruiser: 1, interceptor: 0, starbase: 0 },
    })
  );

  // Defenders configuration (Wave sequence for multi-faction battles)
  const [defenders, setDefenders] = useState<SimulatorSideConfig[]>([
    createDefaultSimulatorSide('ancient', {
      isNpc: true,
      shipCounts: { ancient: 2 },
    }),
  ]);
  const [targetDefenderIndexForBp, setTargetDefenderIndexForBp] = useState<number>(0);

  // Simulation settings & results
  const [iterations, setIterations] = useState<number>(1000);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeTabAttackerShip, setActiveTabAttackerShip] = useState<string>('cruiser');
  const [activeTabDefenderShips, setActiveTabDefenderShips] = useState<Record<number, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      const subText = subsector ? ` (Nebula Subsector ${subsector})` : '';
      setToastMessage(
        `Loaded battle from Sector #${secNum}${subText} with ${loaded.defenders.length} defender${loaded.defenders.length > 1 ? 's' : ''}!`
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
      clonedBps[k] = { ...v, slots: [...v.slots] };
    }

    setAttacker((prev) => ({
      ...prev,
      factionId: p.faction.id,
      name: p.faction.name,
      isNpc: false,
      blueprints: clonedBps,
      hasAntimatterSplitter: p.techTrack.researched.some((t) => t.id === 'antimatter_splitter'),
    }));
    setToastMessage(`Loaded current blueprints from ${p.faction.name} for Attacker!`);
  };

  // Handle Player Blueprints Import for Defender (specific wave index)
  const handleLoadPlayerForDefender = (playerId: string, defIndex: number = targetDefenderIndexForBp) => {
    if (!gameState) return;
    const p = gameState.players.find((player) => player.id === playerId);
    if (!p) return;

    const clonedBps: Record<string, ShipBlueprint> = {};
    for (const [k, v] of Object.entries(p.blueprints)) {
      clonedBps[k] = { ...v, slots: [...v.slots] };
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
    setToastMessage(`Loaded current blueprints from ${p.faction.name} for Defender #${(defIndex ?? 0) + 1}!`);
  };

  // Defender Management: Add Defender
  const handleAddDefender = () => {
    setDefenders((prev) => [
      ...prev,
      createDefaultSimulatorSide('ancient', {
        isNpc: true,
        shipCounts: { ancient: 2 },
      }),
    ]);
    setToastMessage(`Added Defender #${defenders.length + 1} to wave sequence!`);
  };

  // Defender Management: Remove Defender
  const handleRemoveDefender = (index: number) => {
    if (defenders.length <= 1) return;
    setDefenders((prev) => prev.filter((_, i) => i !== index));
    setSimulationResult(null);
    setToastMessage(`Removed Defender #${index + 1}!`);
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
      `Moved Defender #${index + 1} ${direction === 'up' ? 'earlier' : 'later'} in wave sequence!`
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
    setToastMessage(`Swapped Attacker with Defender #${defenderIndex + 1}!`);
  };

  // Blueprint validation across attacker and all defender waves
  const attackerValidation = useMemo(() => validateSimulatorSide(attacker, true), [attacker]);
  const defenderValidations = useMemo(
    () => defenders.map((d) => validateSimulatorSide(d, true)),
    [defenders]
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
      setToastMessage('Please resolve illegal ship blueprint configurations before simulating.');
      return;
    }
    setIsSimulating(true);
    setTimeout(() => {
      const res = runCombatSimulation(attacker, defenders, iterations);
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
                  Combat Simulator
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Monte Carlo 1,000 / 10,000
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulate battles between customized fleets, alien species, and NPCs with official Eclipse combat rules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close Simulator"
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
                In-Game Quick Load:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Load Sector Battle Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Sector Battle:</span>
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
                    Choose a sector to simulate...
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
                <span className="text-red-400 font-bold">Attacker BP:</span>
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
                    Import player blueprints...
                  </option>
                  {gameState.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.faction.name} ({p.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Defender Blueprint Quick Loader */}
              <div className="flex items-center gap-1.5">
                <span className="text-cyan-400 font-bold">Defender BP:</span>
                {defenders.length > 1 && (
                  <select
                    value={targetDefenderIndexForBp}
                    onChange={(e) => setTargetDefenderIndexForBp(Number(e.target.value))}
                    className="bg-slate-900 border border-cyan-800/80 rounded px-1.5 py-1 text-cyan-300 text-xs font-semibold focus:outline-none"
                    title="Select which defender wave to import blueprints into"
                  >
                    {defenders.map((_, idx) => (
                      <option key={idx} value={idx}>
                        Def #{idx + 1}
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
                    Import player blueprints...
                  </option>
                  {gameState.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.faction.name} ({p.name})
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
            />

            {/* DEFENDERS COLUMN (Single or Multi-Wave) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="font-display font-black text-xs uppercase tracking-wider text-cyan-300">
                    Defenders ({defenders.length} Wave{defenders.length > 1 ? 's' : ''})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddDefender}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 text-cyan-200 text-xs font-bold transition shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Add Defender</span>
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
                  <span className="font-bold text-rose-300">Cannot simulate battle with illegal ship blueprints:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-300/90 font-mono text-[11px]">
                    {allValidationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  Simulation Iterations:
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
                    1,000 Times
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
                    10,000 Times (High Precision)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isSimulating || hasValidationErrors}
                title={hasValidationErrors ? 'Resolve illegal ship blueprints before simulating' : 'Run Monte Carlo Battle Simulation'}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-black text-sm tracking-wider uppercase transition-all transform active:scale-95 ${
                  hasValidationErrors
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60 shadow-none'
                    : 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-slate-950 shadow-lg shadow-orange-950/50 hover:shadow-orange-900/80 cursor-pointer disabled:opacity-50'
                }`}
              >
                <Flame className="w-4 h-4 fill-current" />
                <span>{isSimulating ? 'Simulating Battles...' : `Simulate Battle (${iterations.toLocaleString()} Runs)`}</span>
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
}) => {
  const isAttacker = role === 'attacker';
  const roleColor = isAttacker ? 'red' : 'cyan';

  // Handle faction or NPC selection change
  const handleFactionChange = (val: string) => {
    const isNpc = ['ancient', 'guardian', 'gcds'].includes(val);
    const fresh = createDefaultSimulatorSide(val, { isNpc });
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

  const availableShipTypes = useMemo(() => {
    if (sideConfig.isNpc) return [];
    return Object.keys(sideConfig.blueprints);
  }, [sideConfig]);

  const activeBp = sideConfig.blueprints[activeShipTab] || sideConfig.blueprints.cruiser || sideConfig.blueprints.interceptor;
  const activeStats = useMemo(() => {
    if (!activeBp) return null;
    return calculateBlueprintStats(activeBp, activeBp.activeExpansions);
  }, [activeBp]);

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
                ? 'ATTACKER'
                : `DEFENDER ${(totalDefenders && totalDefenders > 1) ? `#${(defenderIndex ?? 0) + 1} (Wave ${(defenderIndex ?? 0) + 1})` : ''}`}
            </span>
            {!isAttacker && (
              <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" />
                Wins ties
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
                    ? 'Swap Attacker with Defender #1'
                    : `Swap Defender #${(defenderIndex ?? 0) + 1} with Attacker`
                }
              >
                <ArrowUpDown className="w-3 h-3 text-amber-400" />
                <span>{isAttacker ? 'Swap with Def #1' : 'Swap Attacker'}</span>
              </button>
            )}

            {!isAttacker && totalDefenders && totalDefenders > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={defenderIndex === 0}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 border border-slate-700 transition cursor-pointer"
                  title="Move Up (Fight earlier in wave sequence)"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={defenderIndex === totalDefenders - 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 border border-slate-700 transition cursor-pointer"
                  title="Move Down (Fight later in wave sequence)"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  className="p-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition cursor-pointer"
                  title="Remove this defender"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-bold">Faction / NPC:</label>
            <select
              value={sideConfig.factionId}
              onChange={(e) => handleFactionChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs font-bold rounded-lg px-2.5 py-1 text-white focus:outline-none"
            >
              <optgroup label="NPCs (Non-Player Characters)">
                <option value="ancient">Ancients (Ancient Cruiser)</option>
                <option value="guardian">Guardian (Sector 100s)</option>
                <option value="gcds">GCDS (Galactic Center 001)</option>
              </optgroup>
              <optgroup label="Terran Factions">
                {HUMAN_FACTIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Alien Factions">
                {ALIEN_FACTIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
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
              <span className="font-bold text-slate-300">NPC Blueprint Variant:</span>
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
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {/* NPC Stats Summary */}
            {(() => {
              const npcType = sideConfig.factionId as NeutralShipType;
              const bp = NEUTRAL_SHIP_BLUEPRINTS[npcType]?.[sideConfig.npcVariant || 'default'];
              return (
                <div className="text-xs text-slate-400 font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  {bp?.summary || `${bp?.name}: Hull ${bp?.maxHull}, Init ${bp?.initiative}, Comp +${bp?.computerBonus}`}
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
              <span>Antimatter Splitter Tech</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              (Splits weapon damage freely over enemy targets)
            </span>
          </div>
        )}

        {/* Fleet Ship Counts */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Fleet Composition (Ship Counts):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {sideConfig.isNpc ? (
              <div className="col-span-2 sm:col-span-4 flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                <span className="text-xs font-bold text-slate-200 capitalize">
                  {sideConfig.factionId} Ships:
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
                      {st}
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
                      <span>{st}</span>
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
                title="Reset to factory blueprints"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
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
                  {activeStats.totalInitiative} Init
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-yellow-300 font-mono font-bold flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-yellow-400" />
                  +{activeStats.computerBonus} Hit
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-mono font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-cyan-400" />
                  -{activeStats.shieldBonus} Shield
                </span>
                <span
                  className={`px-2 py-0.5 rounded border font-mono font-bold flex items-center gap-1 ${
                    activeBp.type === 'starbase' || activeBp.type === 'orbital' || activeStats.totalDriveSpeed > 0 || activeStats.hasJumpDrive
                      ? 'bg-slate-950 border-slate-800 text-indigo-300'
                      : 'bg-rose-950/60 border-rose-800 text-rose-300 animate-pulse'
                  }`}
                  title="Drive Speed"
                >
                  <Navigation className="w-3 h-3" />
                  {activeStats.totalDriveSpeed} Speed
                </span>
                <span
                  className={`px-2 py-0.5 rounded border font-mono font-bold ${
                    activeStats.totalPowerProduced >= activeStats.totalPowerConsumed
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-800 text-rose-300 animate-pulse'
                  }`}
                  title="Power Produced vs Consumed"
                >
                  ⚡ {activeStats.totalPowerProduced}/{activeStats.totalPowerConsumed}
                </span>
              </div>
            )}

            {/* Blueprint Illegal Error Alert Banner */}
            {activeStats && !activeStats.isValid && (
              <div className="p-2.5 bg-rose-950/50 border border-rose-800 rounded-lg text-rose-200 text-xs flex items-start gap-2 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-rose-300">Illegal {activeBp.type.toUpperCase()} Blueprint:</span>
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px] text-rose-200 font-mono">
                    {activeStats.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Modular Slots Grid */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {activeBp.slots.map((part, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs"
                >
                  <span className="text-[10px] font-mono text-slate-500 w-12 shrink-0">
                    Slot {idx + 1}:
                  </span>
                  <select
                    value={part?.id || ''}
                    onChange={(e) =>
                      handleSlotChange(activeBp.type, idx, e.target.value || null)
                    }
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                  >
                    <option value="">(Empty Slot)</option>
                    {PART_GROUPS.map((g) => (
                      <optgroup key={g.category} label={g.category}>
                        {g.parts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ))}
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
  const isMultiDefender = Boolean(defenderNames && defenderNames.length > 1);
  const primaryDefenderName = defenderName || (defenderNames && defenderNames[0]) || 'Defender';
  const defenderDisplayLabel = isMultiDefender
    ? `Defenders (${defenderNames!.join(' + ')})`
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
        name: `Attacker (${attackerName})`,
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
        name: 'Draw',
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
  }, [result, attackerName, defenderDisplayLabel]);

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
        label: `Attacker (${attackerName})`,
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
            ? `Defender ${i + 1} (${d.name})`
            : `Defender (${d.name})`;

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
          <span>Simulation Halted: Illegal Blueprint Detected</span>
        </div>
        <p className="text-xs text-slate-300">
          The battle simulation could not be executed because one or more participating ships violate Eclipse construction rules:
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
            Simulation Results ({result.iterations.toLocaleString()} Battles)
          </h3>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Average Combat Duration: <span className="font-bold text-amber-300">{result.avgRounds} Rounds</span>
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
              title={`${p.name}: ${p.winRate}% (${p.wins.toLocaleString()} wins)`}
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
                <span>Wave Combat Sequence Breakdown:</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Attacker must defeat all {result.defendersBreakdown.length} waves to win
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
                        Wave {i + 1}: {d.name}
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
                        {d.wins.toLocaleString()} victories
                      </span>
                    </div>
                    {matchingParticipant?.isAlliance && (
                      <div className="mt-1 text-[10px] text-teal-400 font-medium flex items-center gap-1">
                        <span>🕊️ Peaceful Allies (Defends with Draco / Ancients)</span>
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
                  {party.label} Fleets{' '}
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
                Draws{' '}
                <span className="font-mono text-[11px] opacity-80">({result.draws.toLocaleString()})</span>
              </span>
            </button>
          )}
        </div>

        {/* Breakdown List for Selected Party */}
        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {activeResultsTab === 'draws' ? (
            <div className="p-3 text-xs text-slate-300 bg-slate-900/80 rounded-lg border border-slate-800">
              Mutual destruction: Both fleets completely wiped out simultaneously in {result.draws.toLocaleString()} battles ({result.drawRate}%).
            </div>
          ) : (() => {
            const currentParty =
              survivingParties.find((p) => p.id === activeResultsTab) || survivingParties[0]!;

            if (currentParty.survivingOutcomes.length === 0) {
              return (
                <div className="text-xs text-slate-500 italic p-3 text-center">
                  {currentParty.label} did not achieve any victories in this simulation.
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
                  <span className="font-mono text-slate-400">{item.count.toLocaleString()} times</span>
                  <span className={`px-2 py-0.5 rounded ${currentParty.badgeClass}`}>
                    {item.percentage}% of all
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
