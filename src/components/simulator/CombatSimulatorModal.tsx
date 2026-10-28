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

  // Defender configuration
  const [defender, setDefender] = useState<SimulatorSideConfig>(() =>
    createDefaultSimulatorSide('ancient', {
      isNpc: true,
      shipCounts: { ancient: 2 },
    })
  );

  // Simulation settings & results
  const [iterations, setIterations] = useState<number>(1000);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeTabAttackerShip, setActiveTabAttackerShip] = useState<string>('cruiser');
  const [activeTabDefenderShip, setActiveTabDefenderShip] = useState<string>('cruiser');
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

  // Handle Sector Import
  const handleLoadSector = (sectorId: string) => {
    if (!gameState) return;
    const loaded = loadBattleFromSector(gameState, sectorId);
    if (loaded) {
      setAttacker(loaded.attacker);
      setDefender(loaded.defender);
      setSimulationResult(null);
      setToastMessage(`Loaded battle from Sector #${gameState.sectors.find((s) => s.id === sectorId)?.sectorNumber || sectorId}!`);
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

  // Handle Player Blueprints Import for Defender
  const handleLoadPlayerForDefender = (playerId: string) => {
    if (!gameState) return;
    const p = gameState.players.find((player) => player.id === playerId);
    if (!p) return;

    const clonedBps: Record<string, ShipBlueprint> = {};
    for (const [k, v] of Object.entries(p.blueprints)) {
      clonedBps[k] = { ...v, slots: [...v.slots] };
    }

    setDefender((prev) => ({
      ...prev,
      factionId: p.faction.id,
      name: p.faction.name,
      isNpc: false,
      blueprints: clonedBps,
      hasAntimatterSplitter: p.techTrack.researched.some((t) => t.id === 'antimatter_splitter'),
    }));
    setToastMessage(`Loaded current blueprints from ${p.faction.name} for Defender!`);
  };

  // Blueprint validation across attacker and defender sides
  const attackerValidation = useMemo(() => validateSimulatorSide(attacker, true), [attacker]);
  const defenderValidation = useMemo(() => validateSimulatorSide(defender, true), [defender]);
  const allValidationErrors = useMemo(
    () => [...attackerValidation.errors, ...defenderValidation.errors],
    [attackerValidation.errors, defenderValidation.errors]
  );
  const hasValidationErrors = allValidationErrors.length > 0;

  // Run simulation
  const handleRunSimulation = () => {
    if (hasValidationErrors) {
      setToastMessage('Please resolve illegal ship blueprint configurations before simulating.');
      return;
    }
    setIsSimulating(true);
    // Timeout allows rendering transition / snappy feel
    setTimeout(() => {
      const res = runCombatSimulation(attacker, defender, iterations);
      setSimulationResult(res);
      setIsSimulating(false);
    }, 10);
  };

  // Reset side to base blueprint
  const handleResetSideBlueprints = (side: 'attacker' | 'defender') => {
    if (side === 'attacker') {
      const fresh = createDefaultSimulatorSide(attacker.factionId, {
        isNpc: attacker.isNpc,
        npcVariant: attacker.npcVariant,
        shipCounts: attacker.shipCounts,
        hasAntimatterSplitter: attacker.hasAntimatterSplitter,
      });
      setAttacker(fresh);
    } else {
      const fresh = createDefaultSimulatorSide(defender.factionId, {
        isNpc: defender.isNpc,
        npcVariant: defender.npcVariant,
        shipCounts: defender.shipCounts,
        hasAntimatterSplitter: defender.hasAntimatterSplitter,
      });
      setDefender(fresh);
    }
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
                    <option key={s.sector.id} value={s.sector.id}>
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
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleLoadPlayerForDefender(e.target.value);
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
              className="text-emerald-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Body: Scrollable Arena */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Top Arena Columns: Attacker vs Defender */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ATTACKER COLUMN */}
            <SideConfigCard
              role="attacker"
              sideConfig={attacker}
              sideValidation={attackerValidation}
              onChangeSideConfig={setAttacker}
              activeShipTab={activeTabAttackerShip}
              onSelectShipTab={setActiveTabAttackerShip}
              onResetBlueprints={() => handleResetSideBlueprints('attacker')}
            />

            {/* DEFENDER COLUMN */}
            <SideConfigCard
              role="defender"
              sideConfig={defender}
              sideValidation={defenderValidation}
              onChangeSideConfig={setDefender}
              activeShipTab={activeTabDefenderShip}
              onSelectShipTab={setActiveTabDefenderShip}
              onResetBlueprints={() => handleResetSideBlueprints('defender')}
            />
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
                defenderName={defender.name}
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
  onChangeSideConfig: React.Dispatch<React.SetStateAction<SimulatorSideConfig>>;
  activeShipTab: string;
  onSelectShipTab: (st: string) => void;
  onResetBlueprints: () => void;
}

const SideConfigCard: React.FC<SideConfigCardProps> = ({
  role,
  sideConfig,
  sideValidation,
  onChangeSideConfig,
  activeShipTab,
  onSelectShipTab,
  onResetBlueprints,
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
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${
                isAttacker
                  ? 'bg-red-900/80 text-red-200 border border-red-700'
                  : 'bg-cyan-900/80 text-cyan-200 border border-cyan-700'
              }`}
            >
              {role}
            </span>
            {!isAttacker && (
              <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" />
                Wins initiative ties
              </span>
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
  defenderName: string;
}

const SimulationResultsView: React.FC<SimulationResultsViewProps> = ({
  result,
  attackerName,
  defenderName,
}) => {
  const [activeResultsTab, setActiveResultsTab] = useState<'attacker' | 'defender' | 'draws'>(
    result.attackerWins >= result.defenderWins ? 'attacker' : 'defender'
  );

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
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-red-400">
            Attacker ({attackerName}): {result.attackerWinRate}% ({result.attackerWins.toLocaleString()})
          </span>
          {result.draws > 0 && (
            <span className="text-slate-400">
              Draw: {result.drawRate}% ({result.draws.toLocaleString()})
            </span>
          )}
          <span className="text-cyan-400">
            Defender ({defenderName}): {result.defenderWinRate}% ({result.defenderWins.toLocaleString()})
          </span>
        </div>

        {/* Visual Progress Split Bar */}
        <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${result.attackerWinRate}%` }}
            className="bg-gradient-to-r from-red-600 to-orange-500 h-full transition-all duration-500"
          />
          {result.drawRate > 0 && (
            <div
              style={{ width: `${result.drawRate}%` }}
              className="bg-slate-600 h-full transition-all duration-500"
            />
          )}
          <div
            style={{ width: `${result.defenderWinRate}%` }}
            className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full transition-all duration-500"
          />
        </div>
      </div>

      {/* Surviving Fleets Distribution Details */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveResultsTab('attacker')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              activeResultsTab === 'attacker'
                ? 'bg-red-950 border border-red-700 text-red-200 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Attacker Surviving Fleets ({result.attackerWins})
          </button>
          <button
            type="button"
            onClick={() => setActiveResultsTab('defender')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              activeResultsTab === 'defender'
                ? 'bg-cyan-950 border border-cyan-700 text-cyan-200 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Defender Surviving Fleets ({result.defenderWins})
          </button>
          {result.draws > 0 && (
            <button
              type="button"
              onClick={() => setActiveResultsTab('draws')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeResultsTab === 'draws'
                  ? 'bg-slate-800 border border-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Draws ({result.draws})
            </button>
          )}
        </div>

        {/* Breakdown List */}
        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {activeResultsTab === 'attacker' && (
            result.attackerSurvivingOutcomes.length > 0 ? (
              result.attackerSurvivingOutcomes.map((item, idx) => (
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
                    <span className="px-2 py-0.5 rounded bg-red-950/80 text-red-300 font-mono font-bold border border-red-800">
                      {item.percentage}% of all
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic p-3 text-center">
                Attacker did not achieve any victories in this simulation.
              </div>
            )
          )}

          {activeResultsTab === 'defender' && (
            result.defenderSurvivingOutcomes.length > 0 ? (
              result.defenderSurvivingOutcomes.map((item, idx) => (
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
                    <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-mono font-bold border border-cyan-800">
                      {item.percentage}% of all
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic p-3 text-center">
                Defender did not achieve any victories in this simulation.
              </div>
            )
          )}

          {activeResultsTab === 'draws' && (
            <div className="p-3 text-xs text-slate-300 bg-slate-900/80 rounded-lg border border-slate-800">
              Mutual destruction: Both fleets completely wiped out simultaneously in {result.draws} battles ({result.drawRate}%).
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
