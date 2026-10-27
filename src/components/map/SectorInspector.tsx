import React from 'react';
import { SectorTile, SectorShip, HexEdge } from '../../engine/types/galaxy';
import { PlayerState } from '../../engine/types/player';

export const EDGE_NAMES: Record<HexEdge, string> = {
  0: '0-E',
  1: '1-SE',
  2: '2-SW',
  3: '3-W',
  4: '4-NW',
  5: '5-NE',
};

export function getSubsectorEdgesDescription(subIdx: 1 | 2 | 3, rotation: number = 0): string {
  const rot = ((rotation % 6) + 6) % 6;
  const baseEdges: Record<1 | 2 | 3, [HexEdge, HexEdge]> = {
    1: [4, 5],
    2: [2, 3],
    3: [0, 1],
  };
  const [eA, eB] = baseEdges[subIdx];
  const boardEdgeA = ((eA + rot) % 6) as HexEdge;
  const boardEdgeB = ((eB + rot) % 6) as HexEdge;
  return `Edges ${EDGE_NAMES[boardEdgeA]} & ${EDGE_NAMES[boardEdgeB]}`;
}
import { calculateBlueprintStats } from '../../engine/rules/shipValidation';
import { getPlayerDisplayName } from '../../engine/rules/gameReducer';
import {
  Rocket,
  Shield,
  Zap,
  Crosshair,
  Award,
  CircleDot,
  X,
  Coins,
  FlaskConical,
  Hammer,
  AlertTriangle,
  Radio,
  Sparkles,
  Layers,
  Lock,
  Check,
  Globe,
  RotateCcw,
  Info,
} from 'lucide-react';

import {
  NeutralShipConfig,
  NeutralShipType,
  getNeutralShipBlueprint,
  getNeutralShipSummary,
} from '../../engine/rules/neutralShips';

interface SectorInspectorProps {
  sector: SectorTile;
  players: PlayerState[];
  activePlayer: PlayerState;
  neutralShipBlueprints?: Partial<NeutralShipConfig>;
  onColonizePlanet?: (
    sectorId: string,
    planetIndex: number,
    chosenResource?: 'money' | 'science' | 'material'
  ) => void;
  onAbandonInfluence?: (sectorId: string) => void;
  onClose: () => void;
  pendingBankruptcy?: { playerId: string; deficit: number } | null;
  stagedAbandonedSectorIds?: string[];
  onToggleAbandonSector?: (sectorId: string) => void;
  onActivatePulsar?: (sectorId: string) => void;
  isPulsarActivatedThisRound?: boolean;
  currentRound?: number;
  blackHoleDelayedShips?: import('../../engine/rules/galacticEvents').BlackHoleDelayedShip[];
  onReturnBlackHoleShip?: (ship: import('../../engine/rules/galacticEvents').BlackHoleDelayedShip) => void;
}

export const SectorInspector: React.FC<SectorInspectorProps> = ({
  sector,
  players,
  activePlayer,
  neutralShipBlueprints,
  onColonizePlanet,
  onAbandonInfluence,
  onClose,
  pendingBankruptcy,
  stagedAbandonedSectorIds = [],
  onToggleAbandonSector,
  onActivatePulsar,
  isPulsarActivatedThisRound = false,
  currentRound,
  blackHoleDelayedShips = [],
  onReturnBlackHoleShip,
}) => {
  const isStagedForAbandonment = stagedAbandonedSectorIds.includes(sector.id);
  const discOwner = players.find((p) => p.id === sector.discOwner);
  const isCenter = sector.sectorNumber === 1;

  const isNebula = Boolean(sector.isNebula || sector.sectorNumber === 295 || sector.sectorNumber === 395);
  const isPulsar = Boolean(sector.isPulsar || sector.sectorNumber === 393 || sector.sectorNumber === 394);
  const isBlackHole = Boolean(sector.isBlackHole || sector.sectorNumber === 396 || sector.sectorNumber === 399);
  const isSupernova = Boolean(sector.isSupernova || sector.sectorNumber === 397 || sector.sectorNumber === 398);

  // Group ships by owner
  const shipsByOwner = new Map<string, SectorShip[]>();
  for (const ship of sector.ships) {
    const list = shipsByOwner.get(ship.ownerId) || [];
    list.push(ship);
    shipsByOwner.set(ship.ownerId, list);
  }

  const isDraco = activePlayer?.faction?.id === 'descendants_of_draco';
  const hasHostiles = sector.isNebula
    ? ([1, 2, 3] as const).some((sub) => {
        const shipsInSub = sector.ships.filter((s) => (s.subsector || 1) === sub);
        const playerInSub = shipsInSub.some((s) => s.ownerId === activePlayer.id);
        const hostilesInSub = shipsInSub.filter((s) => {
          if (s.ownerId === activePlayer.id) return false;
          if (s.ownerId === 'ancient') return !isDraco;
          return true;
        });
        return playerInSub && hostilesInSub.length > 0;
      })
    : (
        shipsByOwner.size > 1 ||
        (!isDraco && (sector.ancientsCount > 0 || sector.ships.some((s) => s.ownerId === 'ancient'))) ||
        sector.ships.some((s) => s.ownerId === 'gcds' || s.ownerId === 'guardian')
      );

  const hasFriendlyShips = sector.ships.some((s) => s.ownerId === activePlayer.id);
  const isBankruptcyActive = Boolean(
    pendingBankruptcy && pendingBankruptcy.playerId === activePlayer.id
  );
  const canAbandonControl =
    sector.discOwner === activePlayer.id &&
    Boolean(onAbandonInfluence);

  return (
    <div className="bg-slate-950/95 border border-slate-700/80 rounded-2xl w-84 sm:w-96 shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 flex flex-col max-h-[82vh] font-sans">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800/80 text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-100 font-display">
                {sector.name ? sector.name.toUpperCase() : `SECTOR ${sector.sectorNumber}`}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono font-bold">
                SEC {sector.sectorNumber}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              {isCenter ? 'Galactic Center' : `Ring ${sector.ring} Orbit`} • {sector.victoryPoints + (sector.structures?.monolith ? 3 : 0)} Victory Points{sector.structures?.monolith ? ` (${sector.victoryPoints} Base + 3 Monolith)` : ''}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
          title="Close Sector Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto text-xs">
        {/* Sector Control Status */}
        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold">Sector Control:</span>
            {discOwner ? (
              <div className="flex items-center gap-1.5 font-bold">
                <span
                  className="w-3 h-3 rounded-full ring-2 ring-white/30"
                  style={{ backgroundColor: discOwner.color }}
                />
                <span className="text-slate-100">{getPlayerDisplayName(discOwner)}</span>
              </div>
            ) : isNebula || isBlackHole ? (
              <span className="text-slate-400 font-medium italic">Spacetime Anomaly (No Influence Disc)</span>
            ) : (
              <span className="text-slate-400 font-medium italic">Unclaimed / Neutral</span>
            )}
          </div>

          {isBankruptcyActive && sector.discOwner === activePlayer.id && (onToggleAbandonSector || onAbandonInfluence) && (
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (onToggleAbandonSector) {
                    onToggleAbandonSector(sector.id);
                  } else if (onAbandonInfluence) {
                    onAbandonInfluence(sector.id);
                  }
                }}
                className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  isStagedForAbandonment
                    ? 'bg-rose-900/70 hover:bg-rose-800 text-white border-rose-500 shadow-md ring-1 ring-rose-500/50'
                    : 'bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border-slate-700 hover:border-rose-700'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${isStagedForAbandonment ? 'text-white' : 'text-rose-400'}`} />
                <span>
                  {isStagedForAbandonment
                    ? 'Staged for Abandonment (Click to Keep Sector)'
                    : 'Stage Sector for Abandonment'}
                </span>
              </button>
            </div>
          )}
          {!isBankruptcyActive && sector.discOwner === activePlayer.id && onAbandonInfluence && (
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => onAbandonInfluence(sector.id)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Retrieve Influence Disc (Influence Action)</span>
              </button>
            </div>
          )}
        </div>

        {/* Supernova Sector Alert & Rules */}
        {isSupernova && (
          <div
            data-testid="sector-rules-supernova"
            className={`p-3 rounded-xl border space-y-2 ${
              sector.isSupernovaExploded
                ? 'bg-red-950/70 border-red-700/80 shadow-inner'
                : 'bg-amber-950/40 border-amber-600/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-bold flex items-center gap-1.5 text-xs ${sector.isSupernovaExploded ? 'text-red-400' : 'text-amber-300'}`}>
                <AlertTriangle className={`w-3.5 h-3.5 ${sector.isSupernovaExploded ? 'text-red-400' : 'text-amber-400'}`} />
                {sector.isSupernovaExploded ? 'Supernova Collapsed Void' : `Supernova Sector (${sector.name || 'Unstable Star'})`}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border uppercase ${
                sector.isSupernovaExploded
                  ? 'bg-red-900/60 text-red-200 border-red-600'
                  : 'bg-amber-900/60 text-amber-200 border-amber-600'
              }`}>
                {sector.isSupernovaExploded ? 'Collapsed' : 'Cleanup Check'}
              </span>
            </div>

            {sector.isSupernovaExploded ? (
              <div className="space-y-1.5 text-[11px] text-slate-300">
                <p>
                  This star went supernova and collapsed into empty space. All planets, population slots, and wormholes have been completely obliterated.
                </p>
                <div className="text-[10px] text-red-300 font-mono">
                  Traversal: Only ships equipped with a Wormhole Generator can enter this empty void.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Supernova Rules (Galactic Events)</span>
                </div>
                <ul className="text-[10px] text-slate-300 space-y-1 list-disc list-inside leading-snug">
                  <li><strong className="text-slate-100">Rich Planetary Resources:</strong> Contains 5 rich resource squares (1 Adv Money, 1 Adv Material, 1 Science, 2 Wild/Any).</li>
                  <li><strong className="text-slate-100">Cleanup Instability Check:</strong> In the Cleanup Phase of each round, an Instability Check must be rolled for the Supernova: <span className="text-amber-300 font-mono font-bold">2 Yellow Dice + highest single tech track count</span>.</li>
                  <li><strong className="text-slate-100">Explosion Condition:</strong> If the total sum is strictly less than the current round number (<span className="text-amber-300 font-mono font-bold">Sum &lt; Round</span>), the star explodes!</li>
                  <li><strong className="text-slate-100">Catastrophic Explosion:</strong> When it explodes, all ships, structures (orbitals/monoliths), population cubes, and influence discs in the sector are destroyed and returned to supply (cubes to graveyard). The sector turns into an empty void with no wormholes (accessible only via Wormhole Generator).</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Galactic Events: Nebula Subsectors Breakdown & Rules */}
        {isNebula && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-emerald-300 font-bold flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Nebula Sector (3 Subsectors)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 font-mono font-bold border border-emerald-600 uppercase">
                Internal Wormholes
              </span>
            </div>
            <div className="text-[11px] text-slate-300 space-y-1.5">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-mono font-bold">Subsector 1</span>
                    <span className="text-[10px] text-slate-400">({getSubsectorEdgesDescription(1, sector.rotation)})</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {sector.subsectors ? (
                      sector.subsectors[0]?.discoveryTile ? (
                        <span className="text-amber-300 font-semibold">❓ Discovery Tile Present</span>
                      ) : (
                        <span className="text-slate-500 italic">Discovery Tile Claimed</span>
                      )
                    ) : (
                      <span className="text-amber-300 font-semibold">❓ Discovery Tile Present</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {sector.ships.filter((s) => (s.subsector || 1) === 1).length} ship(s)
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-mono font-bold">Subsector 2</span>
                    <span className="text-[10px] text-slate-400">({getSubsectorEdgesDescription(2, sector.rotation)})</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {sector.subsectors ? (
                      sector.subsectors[1]?.discoveryTile ? (
                        <span className="text-amber-300 font-semibold">❓ Discovery Tile Present</span>
                      ) : (
                        <span className="text-slate-500 italic">Discovery Tile Claimed</span>
                      )
                    ) : (
                      <span className="text-amber-300 font-semibold">❓ Discovery Tile Present</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {sector.ships.filter((s) => s.subsector === 2).length} ship(s)
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-mono font-bold">Subsector 3</span>
                    <span className="text-[10px] text-slate-400">({getSubsectorEdgesDescription(3, sector.rotation)})</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {sector.ships.some((s) => s.ownerId === 'ancient' && (s.subsector === 3 || !s.subsector)) ? (
                      <span className="text-rose-400 font-semibold">👾 Ancient Ship Stationed</span>
                    ) : (
                      <span className="text-slate-500 italic">Ancient Defeated</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {sector.ships.filter((s) => s.subsector === 3).length} ship(s)
                </span>
              </div>
            </div>

            {/* Dedicated Nebula Rules Card */}
            <div data-testid="sector-rules-nebula" className="pt-2 border-t border-emerald-800/50 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Nebula Rules (Galactic Events)</span>
              </div>
              <ul className="text-[10px] text-slate-300 space-y-1 list-disc list-inside leading-snug">
                <li><strong className="text-slate-100">No Influence Space:</strong> Cannot place an Influence Disc (cannot be claimed by any player; no upkeep cost).</li>
                <li><strong className="text-slate-100">Subsector Entry:</strong> Incoming ships land in the subsector matching their entry edge: Subsector 1 ({getSubsectorEdgesDescription(1, sector.rotation)}), Subsector 2 ({getSubsectorEdgesDescription(2, sector.rotation)}), or Subsector 3 ({getSubsectorEdgesDescription(3, sector.rotation)}).</li>
                <li><strong className="text-slate-100">Internal Movement:</strong> Moving between subsectors costs 1 Movement Point (MP) along internal wormholes.</li>
                <li><strong className="text-slate-100">Localized Pinning:</strong> Pinning is resolved strictly within each subsector. Ships in other subsectors do not pin you.</li>
                <li><strong className="text-slate-100">Combat & Discoveries:</strong> Combat resolves per subsector during the Combat Phase. Subsector 3 harbors an Ancient ship; Subsectors 1 & 2 each contain 1 Discovery Tile, claimed after all combat in that subsector concludes.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Hostile Contest Alert */}
        {hasHostiles && (
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-2 text-rose-300 font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Contested Sector! Combat will resolve during Combat Phase.</span>
          </div>
        )}

        {/* Fleet Deployment Roster */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5 text-cyan-400" />
              Stationed Fleets ({sector.ships.length} {sector.ships.length === 1 ? 'Ship' : 'Ships'})
            </h4>
          </div>

          {sector.ships.length === 0 ? (
            <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-xl text-center text-slate-500 text-[11px] italic">
              No ships currently stationed in this sector.
            </div>
          ) : (
            <div className="space-y-2.5">
              {Array.from(shipsByOwner.entries()).map(([ownerId, ships]) => {
                let ownerName = 'Unknown Commander';
                let ownerColor = '#38bdf8';
                let isNpc = false;

                if (ownerId === 'ancient') {
                  ownerName = 'Ancient Defenders';
                  ownerColor = '#f43f5e';
                  isNpc = true;
                } else if (ownerId === 'gcds') {
                  ownerName = 'Galactic Center Defense System';
                  ownerColor = '#fb7185';
                  isNpc = true;
                } else if (ownerId === 'guardian') {
                  ownerName = 'Guardian Drone';
                  ownerColor = '#ec4899';
                  isNpc = true;
                } else {
                  const pl = players.find((p) => p.id === ownerId);
                  if (pl) {
                    ownerName = pl.name;
                    ownerColor = pl.color;
                  }
                }

                // Tally ship types
                const shipsByType: Record<string, SectorShip[]> = {};
                for (const s of ships) {
                  shipsByType[s.type] = shipsByType[s.type] || [];
                  shipsByType[s.type]!.push(s);
                }

                return (
                  <div
                    key={ownerId}
                    className="p-2.5 rounded-xl border bg-slate-900/60"
                    style={{ borderColor: `${ownerColor}60` }}
                  >
                    {/* Owner Subheading */}
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span
                          className="w-2.5 h-2.5 rounded-full ring-1 ring-white/40"
                          style={{ backgroundColor: ownerColor }}
                        />
                        <span className="text-slate-200">{ownerName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ships.length} {ships.length === 1 ? 'Ship' : 'Ships'}
                      </span>
                    </div>

                    {/* Ship Cards */}
                    <div className="space-y-1.5">
                      {Object.entries(shipsByType).map(([type, typeShips]) => {
                        const firstShip = typeShips[0]!;
                        const pl = players.find((p) => p.id === ownerId);
                        const bp = pl ? pl.blueprints[type] : null;
                        const stats = bp ? calculateBlueprintStats(bp) : null;

                        return (
                          <div
                            key={type}
                            className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-extrabold text-[11px] text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                                <span className="font-mono text-cyan-400 font-bold">
                                  {typeShips.length}×
                                </span>
                                <span>{type}</span>
                                {typeShips.some((s) => s.damage > 0) && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                                    Damaged
                                  </span>
                                )}
                                {sector.isNebula && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                                    Sub {Array.from(new Set(typeShips.map((s) => s.subsector || 1))).sort().join(', ')}
                                  </span>
                                )}
                              </div>

                              {/* Stats / Weapons Preview */}
                              {stats ? (
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                                  <span>Hull: {stats.totalHull}</span>
                                  <span>• Speed: {stats.totalDriveSpeed}</span>
                                  <span>• Init: {stats.totalInitiative}</span>
                                  {stats.computerBonus > 0 && <span>• +{stats.computerBonus} Hit</span>}
                                  {stats.shieldBonus > 0 && <span>• -{stats.shieldBonus} Shield</span>}
                                </div>
                              ) : isNpc && (type === 'ancient' || type === 'guardian' || type === 'gcds') ? (
                                <div className={`text-[10px] font-mono mt-0.5 ${type === 'guardian' ? 'text-pink-300/80' : 'text-rose-300/80'}`}>
                                  {neutralShipBlueprints?.[type as NeutralShipType] === 'advanced' && (
                                    <span className="text-amber-400 font-bold mr-1.5">[Advanced]</span>
                                  )}
                                  {neutralShipBlueprints?.[type as NeutralShipType] === 'expert' && (
                                    <span className="text-rose-400 font-bold mr-1.5">[Expert]</span>
                                  )}
                                  {getNeutralShipSummary(type as NeutralShipType, neutralShipBlueprints?.[type as NeutralShipType])}
                                </div>
                              ) : null}
                            </div>

                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                              style={{
                                backgroundColor: `${ownerColor}20`,
                                color: ownerColor,
                                borderColor: `${ownerColor}60`,
                                borderWidth: '1px',
                              }}
                            >
                              {type.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Planetary Colonies Grid */}
        {!sector.isSupernovaExploded && (
          <div>
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-yellow-400" />
              Planetary Population Squares ({sector.planets.length})
            </h4>

          {sector.planets.length === 0 ? (
            <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-xl text-center text-slate-500 text-[11px] italic">
              No habitable planet squares in this sector.
            </div>
          ) : (
            <div className="space-y-2">
              {sector.planets.map((planet, pIdx) => {
                const colonizer = players.find((p) => p.id === planet.colonizedBy);

                const hasAdvancedEconomy = activePlayer.techTrack.researched.some(
                  (t) => t.id === 'advanced_economy' || t.id === 'metasynthesis'
                );
                const hasAdvancedLabs = activePlayer.techTrack.researched.some(
                  (t) => t.id === 'advanced_labs' || t.id === 'metasynthesis'
                );
                const hasAdvancedMining = activePlayer.techTrack.researched.some(
                  (t) => t.id === 'advanced_mining' || t.id === 'metasynthesis'
                );

                const isWild = planet.resource === 'any';
                const isOrb = !!planet.isOrbital;

                const reqTechName = isWild
                  ? 'Adv Economy / Labs / Mining'
                  : planet.resource === 'money'
                  ? 'Advanced Economy'
                  : planet.resource === 'science'
                  ? 'Advanced Labs'
                  : 'Advanced Mining';

                const hasRequiredTech =
                  !planet.isAdvanced ||
                  (isWild
                    ? hasAdvancedEconomy || hasAdvancedLabs || hasAdvancedMining
                    : planet.resource === 'money'
                    ? hasAdvancedEconomy
                    : planet.resource === 'science'
                    ? hasAdvancedLabs
                    : planet.resource === 'material'
                    ? hasAdvancedMining
                    : true);

                const canColonize =
                  !planet.colonizedBy &&
                  sector.discOwner === activePlayer.id &&
                  activePlayer.colonyShips.ready > 0;

                const resourceTheme = isOrb
                  ? {
                      name: 'Orbital Habitat (Money or Science)',
                      badge: 'bg-cyan-500 text-slate-950 font-extrabold',
                      border: 'border-cyan-500/40 bg-cyan-950/15',
                      text: 'text-cyan-300',
                      icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" />,
                    }
                  : isWild
                  ? planet.isAdvanced
                    ? {
                        name: '★ Advanced Wild Habitat',
                        badge: 'bg-white text-slate-950 font-black',
                        border: 'border-white/80 bg-slate-900/60 ring-1 ring-white/50',
                        text: 'text-white font-bold',
                        icon: <Sparkles className="w-3.5 h-3.5 text-white" />,
                      }
                    : {
                        name: 'Standard Wild Habitat (Any Resource)',
                        badge: 'bg-slate-300 text-slate-950 font-extrabold',
                        border: 'border-slate-500/40 bg-slate-900/40',
                        text: 'text-slate-200',
                        icon: <Globe className="w-3.5 h-3.5 text-slate-300" />,
                      }
                  : planet.resource === 'money'
                  ? {
                      name: 'Money (Economy)',
                      badge: 'bg-yellow-400 text-slate-950 font-extrabold',
                      border: 'border-yellow-500/40 bg-yellow-950/15',
                      text: 'text-yellow-300',
                      icon: <Coins className="w-3.5 h-3.5 text-yellow-400" />,
                    }
                  : planet.resource === 'science'
                  ? {
                      name: 'Science (Research)',
                      badge: 'bg-pink-500 text-white font-bold',
                      border: 'border-pink-500/40 bg-pink-950/15',
                      text: 'text-pink-300',
                      icon: <FlaskConical className="w-3.5 h-3.5 text-pink-400" />,
                    }
                  : {
                      name: 'Materials (Production)',
                      badge: 'bg-amber-900 text-amber-100 font-bold',
                      border: 'border-amber-700/40 bg-amber-950/20',
                      text: 'text-amber-400',
                      icon: <Hammer className="w-3.5 h-3.5 text-amber-500" />,
                    };

                return (
                  <div
                    key={planet.id || `planet-${pIdx}`}
                    className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${resourceTheme.border}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-slate-900 border border-slate-800">
                        {resourceTheme.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={resourceTheme.text}>{resourceTheme.name}</span>
                          {planet.isAdvanced ? (
                            hasRequiredTech ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300 uppercase font-mono flex items-center gap-1">
                                <Check className="w-2.5 h-2.5 text-emerald-400" /> Advanced
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950/80 border border-rose-800 text-rose-300 uppercase font-mono flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-rose-400" /> Need {reqTechName}
                              </span>
                            )
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 uppercase font-mono">
                              {isOrb ? 'Orbital' : isWild ? 'Wild' : 'Standard'}
                            </span>
                          )}
                        </div>

                        {colonizer ? (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>Colonized by</span>
                            <span className="font-bold text-slate-200">{colonizer.name}</span>
                            <span
                              className="w-2 h-2 rounded-sm inline-block"
                              style={{ backgroundColor: colonizer.color }}
                            />
                            {planet.colonizedResource && (
                              <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-300 font-mono ml-1">
                                {planet.colonizedResource}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            {planet.isAdvanced && !hasRequiredTech
                              ? `Requires ${reqTechName} tech`
                              : 'Uncolonized Square'}
                          </div>
                        )}
                      </div>
                    </div>

                    {canColonize && onColonizePlanet && (
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {isOrb ? (
                          <>
                            <button
                              disabled={activePlayer.population.money.cubesOnBoard <= 0}
                              onClick={() => onColonizePlanet(sector.id, pIdx, 'money')}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 shadow"
                              title="Colonize with Money Cube"
                            >
                              + Money ({activePlayer.population.money.cubesOnBoard})
                            </button>
                            <button
                              disabled={activePlayer.population.science.cubesOnBoard <= 0}
                              onClick={() => onColonizePlanet(sector.id, pIdx, 'science')}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-pink-500 hover:bg-pink-400 disabled:opacity-40 disabled:pointer-events-none text-white shadow"
                              title="Colonize with Science Cube"
                            >
                              + Science ({activePlayer.population.science.cubesOnBoard})
                            </button>
                          </>
                        ) : isWild ? (
                          <>
                            <button
                              disabled={activePlayer.population.money.cubesOnBoard <= 0 || (planet.isAdvanced && !hasAdvancedEconomy)}
                              onClick={() => onColonizePlanet(sector.id, pIdx, 'money')}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 shadow"
                              title="Colonize with Money Cube"
                            >
                              + Money
                            </button>
                            <button
                              disabled={activePlayer.population.science.cubesOnBoard <= 0 || (planet.isAdvanced && !hasAdvancedLabs)}
                              onClick={() => onColonizePlanet(sector.id, pIdx, 'science')}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-pink-500 hover:bg-pink-400 disabled:opacity-40 disabled:pointer-events-none text-white shadow"
                              title="Colonize with Science Cube"
                            >
                              + Science
                            </button>
                            <button
                              disabled={activePlayer.population.material.cubesOnBoard <= 0 || (planet.isAdvanced && !hasAdvancedMining)}
                              onClick={() => onColonizePlanet(sector.id, pIdx, 'material')}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none text-white shadow"
                              title="Colonize with Material Cube"
                            >
                              + Material
                            </button>
                          </>
                        ) : (
                          <button
                            disabled={!hasRequiredTech || activePlayer.population[planet.resource as 'money' | 'science' | 'material'].cubesOnBoard <= 0}
                            onClick={() => onColonizePlanet(sector.id, pIdx, planet.resource as any)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 shadow transition-all font-sans"
                          >
                            Colonize
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* Special Features & Structures */}
        {(isPulsar || isBlackHole || sector.hasArtifact || sector.hasDiscovery || sector.discoveryTile || sector.structures?.monolith || (sector.guardiansCount && sector.guardiansCount > 0)) && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Special Features & Structures
            </h4>

            {isPulsar && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-600/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-bold flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Pulsar Anomaly ({sector.name || `Sector ${sector.sectorNumber}`})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-200 font-mono font-bold border border-cyan-600 uppercase">
                    Slot: {sector.pulsarSlot || 'move'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {sector.discOwner ? (
                    sector.discOwner === activePlayer.id ? (
                      isPulsarActivatedThisRound ? (
                        <span className="text-slate-400 italic">Already activated this round.</span>
                      ) : (
                        <span className="text-emerald-300 font-medium">Ready for free action activation this round!</span>
                      )
                    ) : (
                      <span className="text-slate-400">Controlled by another commander.</span>
                    )
                  ) : (
                    <span className="text-slate-400">Control this sector with an Influence Disc to shift the disc for free actions.</span>
                  )}
                </div>
                {sector.discOwner === activePlayer.id && !isPulsarActivatedThisRound && !activePlayer.hasPassed && onActivatePulsar && (
                  <button
                    type="button"
                    onClick={() => onActivatePulsar(sector.id)}
                    className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-950 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Activate Pulsar (Shift Slot)</span>
                  </button>
                )}

                {/* Dedicated Pulsar Rules Card */}
                <div data-testid="sector-rules-pulsar" className="pt-2 border-t border-cyan-800/50 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300">
                    <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Pulsar Rules (Galactic Events)</span>
                  </div>
                  <ul className="text-[10px] text-slate-300 space-y-1 list-disc list-inside leading-snug">
                    <li><strong className="text-slate-100">3 Action Spaces:</strong> Replaces normal influence space with 3 Action Spaces: <span className="text-cyan-300 font-semibold">Move</span>, <span className="text-cyan-300 font-semibold">Build</span>, and <span className="text-cyan-300 font-semibold">Upgrade</span>. Influence Disc starts on Move upon control.</li>
                    <li><strong className="text-slate-100">Free Action Shifting:</strong> Once per round on your turn during the Action Phase (in place of a normal action, before passing), shift your disc to a different slot to execute 1 activation:
                      <ul className="pl-4 space-y-0.5 list-disc list-inside text-cyan-200">
                        <li><strong className="text-slate-100">Move:</strong> Move 1 ship up to its full drive speed.</li>
                        <li><strong className="text-slate-100">Build:</strong> Build 1 ship or structure (paying normal material cost).</li>
                        <li><strong className="text-slate-100">Upgrade:</strong> Upgrade 1 ship blueprint (up to 2 ship parts).</li>
                      </ul>
                    </li>
                    <li><strong className="text-slate-100">Zero Upkeep Disc:</strong> Shifts the disc already on the sector; does NOT place a disc from your player board track, saving discs and upkeep.</li>
                    <li><strong className="text-slate-100">Pass Restriction:</strong> Cannot be activated after passing for the round.</li>
                  </ul>
                </div>
              </div>
            )}

            {isBlackHole && (
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-300 font-bold flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    Black Hole Anomaly ({sector.sectorNumber === 396 ? 'Cygnus X-1' : 'V616 Mon'})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200 font-mono font-bold border border-indigo-600">
                    {sector.sectorNumber === 396 ? 'Ring I Return' : 'Empty Zone Return'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {blackHoleDelayedShips && blackHoleDelayedShips.length > 0 ? (
                    <div className="space-y-1.5 mt-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Ships in Spacetime Anomaly:
                      </div>
                      {blackHoleDelayedShips.map((ds) => {
                        const owner = players.find((p) => p.id === ds.ownerId);
                        const canReturn = currentRound !== undefined && currentRound >= ds.returnRound;
                        const isMine = ds.ownerId === activePlayer.id;
                        return (
                          <div
                            key={ds.shipId}
                            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: owner?.color || '#94a3b8' }} />
                                <span>{owner ? owner.name : ds.ownerId}</span>
                                <span className="text-indigo-300 uppercase font-mono">[{ds.shipType}]</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {canReturn ? (
                                  <span className="text-emerald-400 font-bold">Emerging this round (Round {ds.returnRound})!</span>
                                ) : (
                                  <span>Returns in Round {ds.returnRound} ({currentRound !== undefined ? ds.returnRound - currentRound : 1} round(s) left)</span>
                                )}
                              </div>
                            </div>
                            {canReturn && isMine && onReturnBlackHoleShip && (
                              <button
                                type="button"
                                onClick={() => onReturnBlackHoleShip(ds)}
                                className="px-2.5 py-1 rounded-md bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-[11px] transition shadow cursor-pointer"
                              >
                                Return Now
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No ships currently trapped in spacetime anomaly.</span>
                  )}
                </div>

                {/* Dedicated Black Hole Rules Card */}
                <div data-testid="sector-rules-black-hole" className="pt-2 border-t border-indigo-800/50 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300">
                    <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Black Hole Rules (Galactic Events)</span>
                  </div>
                  <ul className="text-[10px] text-slate-300 space-y-1 list-disc list-inside leading-snug">
                    <li><strong className="text-slate-100">Spacetime Anomaly:</strong> Cannot place an Influence Disc (no influence space / 0 VP).</li>
                    <li><strong className="text-slate-100">Discovery Tile:</strong> The first ship entering the Black Hole immediately claims the Discovery Tile.</li>
                    <li><strong className="text-slate-100">Transit Duration (Yellow Die):</strong> Ships end movement immediately and enter transit. Roll yellow die:
                      <ul className="pl-4 space-y-0.5 list-disc list-inside text-indigo-200">
                        <li><strong className="text-slate-100">Star (1) or Blank (6):</strong> Returns immediately this round, taking 1 damage.</li>
                        <li><strong className="text-slate-100">2 or 3:</strong> Trapped for 1 round (returns in Round + 1).</li>
                        <li><strong className="text-slate-100">4 or 5:</strong> Trapped for 2 rounds (returns in Round + 2).</li>
                      </ul>
                    </li>
                    <li><strong className="text-slate-100">Return Location:</strong> {sector.sectorNumber === 396 ? 'Sector 396 (Cygnus X-1) returns to any Ring I sector.' : 'Sector 399 (V616 Mon) returns to any sector with a wormhole facing empty space/void.'}</li>
                    <li><strong className="text-slate-100">Return Decision:</strong> On the player\'s first turn of the return round, a side window prompts whether to return the ship now or postpone until next round.</li>
                  </ul>
                </div>
              </div>
            )}

            {sector.structures?.monolith && (
              <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-700/60 flex items-center justify-between">
                <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Ancient Monolith
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200 font-mono font-bold border border-indigo-600">
                  +3 Victory Points
                </span>
              </div>
            )}

            {Boolean(sector.guardiansCount && sector.guardiansCount > 0) && (
              <div className="p-2 rounded-lg bg-pink-950/40 border border-pink-700/60 flex items-center justify-between">
                <span className="text-pink-300 font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-pink-400" />
                  Guardian Defender (Sector {sector.sectorNumber})
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-pink-900/60 text-pink-200 font-mono font-bold border border-pink-600">
                  3 Hull • 3 Ion Dice • 2 VP
                </span>
              </div>
            )}

            {sector.hasArtifact && (
              <div className="p-2 rounded-lg bg-sky-950/30 border border-sky-800/50 flex items-center justify-between">
                <span className="text-sky-300 font-bold flex items-center gap-1.5">
                  <span className="font-mono text-xs text-sky-400 font-black">[A]</span>
                  Planetary Artifact
                </span>
                <span className="text-[10px] text-sky-400 font-mono">Artifact Key Target (0 VP)</span>
              </div>
            )}

            {(sector.discoveryTile || (sector.hasDiscovery && !sector.discoveryClaimed)) && (
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/50">
                {sector.discoveryClaimed && sector.discoveryTile ? (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-amber-300 font-bold text-xs">
                        ★ {sector.discoveryTile.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 font-mono border border-emerald-800">
                        Claimed
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {sector.discoveryTile.description}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs font-mono shadow">
                        ★
                      </div>
                      <div>
                        <span className="text-amber-300 font-bold text-xs block">
                          Face-Down Discovery Tile
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Hidden from all players until claimed by securing sector control.
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 font-mono font-bold border border-amber-700/50">
                      Unexplored
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
