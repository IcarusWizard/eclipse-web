import React from 'react';
import { SectorTile, SectorShip } from '../../engine/types/galaxy';
import { PlayerState } from '../../engine/types/player';
import { calculateBlueprintStats } from '../../engine/rules/shipValidation';
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
} from 'lucide-react';

interface SectorInspectorProps {
  sector: SectorTile;
  players: PlayerState[];
  activePlayer: PlayerState;
  onColonizePlanet?: (sectorId: string, planetIndex: number) => void;
  onClose: () => void;
}

export const SectorInspector: React.FC<SectorInspectorProps> = ({
  sector,
  players,
  activePlayer,
  onColonizePlanet,
  onClose,
}) => {
  const discOwner = players.find((p) => p.id === sector.discOwner);
  const isCenter = sector.sectorNumber === 1;

  // Group ships by owner
  const shipsByOwner = new Map<string, SectorShip[]>();
  for (const ship of sector.ships) {
    const list = shipsByOwner.get(ship.ownerId) || [];
    list.push(ship);
    shipsByOwner.set(ship.ownerId, list);
  }

  const hasHostiles =
    shipsByOwner.size > 1 ||
    sector.ancientsCount > 0 ||
    sector.ships.some((s) => s.ownerId === 'ancient' || s.ownerId === 'gcds');

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
              {isCenter ? 'Galactic Center' : `Ring ${sector.ring} Orbit`} • {sector.victoryPoints} Victory Points
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
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-slate-400 font-semibold">Sector Control:</span>
          {discOwner ? (
            <div className="flex items-center gap-1.5 font-bold">
              <span
                className="w-3 h-3 rounded-full ring-2 ring-white/30"
                style={{ backgroundColor: discOwner.color }}
              />
              <span className="text-slate-100">{discOwner.name}</span>
            </div>
          ) : (
            <span className="text-slate-400 font-medium italic">Unclaimed / Neutral</span>
          )}
        </div>

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
                              ) : isNpc && type === 'ancient' ? (
                                <div className="text-[10px] text-rose-300/80 font-mono mt-0.5">
                                  Hull: 2 • Init: 2 • 2 Yellow Cannons (+1 Hit)
                                </div>
                              ) : isNpc && type === 'gcds' ? (
                                <div className="text-[10px] text-rose-300/80 font-mono mt-0.5">
                                  Hull: 7 • Init: 0 • 4 Orange Cannons (+2 Hit)
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

                const reqTechName =
                  planet.resource === 'money'
                    ? 'Advanced Economy'
                    : planet.resource === 'science'
                    ? 'Advanced Labs'
                    : 'Advanced Mining';

                const hasRequiredTech =
                  !planet.isAdvanced ||
                  (planet.resource === 'money'
                    ? hasAdvancedEconomy
                    : planet.resource === 'science'
                    ? hasAdvancedLabs
                    : planet.resource === 'material'
                    ? hasAdvancedMining
                    : true);

                const canColonize =
                  !planet.colonizedBy &&
                  sector.discOwner === activePlayer.id &&
                  activePlayer.colonyShips.ready > 0 &&
                  hasRequiredTech;

                const resourceTheme =
                  planet.resource === 'money'
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
                    key={planet.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${resourceTheme.border}`}
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
                              Standard
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
                      <button
                        onClick={() => onColonizePlanet(sector.id, pIdx)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow transition-all font-sans"
                      >
                        Colonize
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Discoveries & Artifacts */}
        {(sector.hasArtifact || sector.hasDiscovery || sector.discoveryTile) && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Special Features
            </h4>

            {sector.hasArtifact && (
              <div className="p-2 rounded-lg bg-sky-950/30 border border-sky-800/50 flex items-center justify-between">
                <span className="text-sky-300 font-bold flex items-center gap-1">
                  ★ Planetary Artifact
                </span>
                <span className="text-[10px] text-sky-400 font-mono">+1 VP / Key bonus</span>
              </div>
            )}

            {sector.discoveryTile && (
              <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-300 font-bold">
                    ★ {sector.discoveryTile.name}
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {sector.discoveryClaimed ? 'Claimed' : 'Unclaimed'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {sector.discoveryTile.description}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
