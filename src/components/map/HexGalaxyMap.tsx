import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GameState } from '../../engine/types/state';
import { SectorTile, HexCoord, HexEdge } from '../../engine/types/galaxy';
import {
  hexToPixel,
  getHexCornerPoints,
  getHexEdgeCenter,
  areCoordsEqual,
  areSectorsConnected,
  getNeighborCoord,
  hasWormholeOnEdge,
  HEX_DIRECTIONS,
  getRingFromCoord,
} from '../../engine/rules/hexMath';
import {
  Rocket,
  Compass,
  RotateCw,
  RotateCcw,
  Check,
  X,
  Crosshair,
  Shield,
  Zap,
} from 'lucide-react';

interface HexGalaxyMapProps {
  state: GameState;
  selectedSectorId: string | null;
  onSelectSector: (sector: SectorTile) => void;
  onExploreTarget?: (fromCoord: HexCoord, targetCoord: HexCoord) => void;
  isExploreMode?: boolean;
  onColonizePlanet?: (sectorId: string, planetIndex: number) => void;
}

const HEX_RADIUS = 78;

export const HexGalaxyMap: React.FC<HexGalaxyMapProps> = ({
  state,
  selectedSectorId,
  onSelectSector,
  onExploreTarget,
  isExploreMode = false,
  onColonizePlanet,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 450, y: 350 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const activePlayer = state.players[state.activePlayerIndex];

  // Center pan on initial load
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: rect.height / 2 });
    }
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(2.5, Math.max(0.4, z * zoomFactor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: rect.height / 2 });
      setZoom(1);
    }
  };

  // Compute legal unexplored target hexes adjacent to explored sectors where active player has presence
  const explorableHexes = useMemo(() => {
    if (!isExploreMode || !activePlayer) return [];
    const targets: { from: HexCoord; target: HexCoord; ring: number }[] = [];
    const hasWormholeGen = activePlayer.techTrack.researched.some((t) => t.id === 'wormhole_generator');

    for (const sec of state.sectors) {
      const hasPresence =
        sec.discOwner === activePlayer.id ||
        sec.ships.some((s) => s.ownerId === activePlayer.id);
      if (!hasPresence) continue;

      for (let edge = 0; edge < 6; edge++) {
        // Player must have an open wormhole on this edge to explore through it
        if (!hasWormholeOnEdge(sec, edge as HexEdge) && !hasWormholeGen) {
          continue;
        }

        const dir = HEX_DIRECTIONS[edge as HexEdge];
        const candidate: HexCoord = { q: sec.coord.q + dir.q, r: sec.coord.r + dir.r };
        const ring = getRingFromCoord(candidate);
        if (ring > 3) continue; // Outside Galaxy

        // Check if already occupied
        const exists = state.sectors.some((s) => areCoordsEqual(s.coord, candidate));
        if (!exists && !targets.some((t) => areCoordsEqual(t.target, candidate))) {
          targets.push({ from: sec.coord, target: candidate, ring });
        }
      }
    }
    return targets;
  }, [state.sectors, activePlayer, isExploreMode]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background Deep Space Grid */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.25) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
          className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded text-sm font-bold shadow"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z * 0.8))}
          className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded text-sm font-bold shadow"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={resetView}
          className="px-3 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-cyan-400 rounded text-xs font-semibold shadow"
          title="Center Galaxy"
        >
          Center
        </button>
      </div>

      {/* Galaxy SVG */}
      <svg className="w-full h-full pointer-events-none">
        <g
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="pointer-events-auto transition-transform duration-75 ease-out"
        >
          {/* Ring Guide Lines */}
          <circle cx="0" cy="0" r={HEX_RADIUS * 1.732 * 1} fill="none" stroke="rgba(51, 65, 85, 0.4)" strokeDasharray="4 6" />
          <circle cx="0" cy="0" r={HEX_RADIUS * 1.732 * 2} fill="none" stroke="rgba(51, 65, 85, 0.3)" strokeDasharray="4 6" />
          <circle cx="0" cy="0" r={HEX_RADIUS * 1.732 * 3} fill="none" stroke="rgba(51, 65, 85, 0.2)" strokeDasharray="4 6" />

          {/* Explorable Target Hexes in Explore Mode */}
          {explorableHexes.map((target, idx) => {
            const { x, y } = hexToPixel(target.target, HEX_RADIUS);
            return (
              <g
                key={`explore_target_${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onExploreTarget?.(target.from, target.target);
                }}
                className="cursor-pointer group"
              >
                <polygon
                  points={getHexCornerPoints(x, y, HEX_RADIUS - 4)}
                  fill="rgba(6, 182, 212, 0.08)"
                  stroke="rgba(6, 182, 212, 0.6)"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  className="group-hover:fill-cyan-500/20 group-hover:stroke-cyan-300 transition-all"
                />
                <circle cx={x} cy={y} r="16" fill="rgba(15, 23, 42, 0.8)" stroke="#06b6d4" strokeWidth="1.5" />
                <Compass className="text-cyan-400 group-hover:scale-125 transition-transform" x={x - 8} y={y - 8} width="16" height="16" />
                <text x={x} y={y + 28} textAnchor="middle" fill="#06b6d4" fontSize="10" fontWeight="bold">
                  Ring {target.ring}
                </text>
              </g>
            );
          })}

          {/* Render Explored Sectors */}
          {state.sectors.map((sector) => {
            const { x, y } = hexToPixel(sector.coord, HEX_RADIUS);
            const isSelected = selectedSectorId === sector.id;
            const owner = state.players.find((p) => p.id === sector.discOwner);
            const isCenter = sector.sectorNumber === 1;

            return (
              <g
                key={sector.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSector(sector);
                }}
                className="cursor-pointer group"
              >
                {/* Sector Hexagon Polygon */}
                <polygon
                  points={getHexCornerPoints(x, y, HEX_RADIUS - 2)}
                  fill={
                    isCenter
                      ? 'rgba(30, 27, 75, 0.95)'
                      : owner
                      ? `${owner.color}15`
                      : 'rgba(15, 23, 42, 0.95)'
                  }
                  stroke={
                    isSelected
                      ? '#38bdf8'
                      : owner
                      ? owner.color
                      : isCenter
                      ? '#a855f7'
                      : '#334155'
                  }
                  strokeWidth={isSelected ? '3' : owner ? '2.5' : '1.5'}
                  className="transition-colors group-hover:stroke-slate-300"
                />

                {/* Wormholes on 6 Edges */}
                {([0, 1, 2, 3, 4, 5] as HexEdge[]).map((edge) => {
                  const hasWormhole = hasWormholeOnEdge(sector, edge);
                  if (!hasWormhole) return null;
                  const edgePos = getHexEdgeCenter(x, y, HEX_RADIUS - 2, edge);

                  // Check if adjacent sector exists and shares a connected wormhole
                  const neighborCoord = getNeighborCoord(sector.coord, edge);
                  const neighborSector = state.sectors.find((s) => areCoordsEqual(s.coord, neighborCoord));
                  const isConnected = neighborSector ? areSectorsConnected(sector, neighborSector) : false;

                  return (
                    <g
                      key={`wormhole_${edge}`}
                      transform={`translate(${edgePos.x}, ${edgePos.y}) rotate(${edgePos.angle})`}
                    >
                      {/* Semicircle curving INWARD into the hex towards local -X */}
                      <path
                        d="M 0 -13 A 13 13 0 0 0 0 13 Z"
                        fill={isConnected ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.25)'}
                        stroke="#ffffff"
                        strokeWidth={isConnected ? '2.5' : '2'}
                        strokeDasharray={isConnected ? undefined : '3.5 2'}
                      />
                      {/* Inner concentric portal arc in pure white */}
                      <path
                        d="M 0 -7 A 7 7 0 0 0 0 7"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}

                {/* Sector Number & VP Header */}
                <text
                  x={x}
                  y={y - HEX_RADIUS + (sector.name ? 19 : 22)}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize={sector.name ? '10' : '11'}
                  fontWeight="bold"
                  letterSpacing="0.5"
                >
                  {sector.name || (isCenter ? 'GCDS 001' : `SEC ${sector.sectorNumber}`)}
                  {sector.victoryPoints > 0 && ` (${sector.victoryPoints} VP)`}
                </text>
                {sector.name && (
                  <text
                    x={x}
                    y={y - HEX_RADIUS + 29}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="8"
                    fontWeight="semibold"
                  >
                    SEC {sector.sectorNumber}
                  </text>
                )}

                {/* Center / Discovery / Ancient / Artifact Badges */}
                {sector.hasGCDS && (
                  <g transform={`translate(${x - 14}, ${y - 20})`}>
                    <Shield className="text-purple-400" width="28" height="28" />
                  </g>
                )}

                {sector.ancientsCount > 0 && !sector.hasGCDS && (
                  <g transform={`translate(${x - 12}, ${y - 20})`}>
                    <Crosshair className="text-rose-500 animate-pulse" width="24" height="24" />
                    <text x="12" y="32" textAnchor="middle" fill="#f43f5e" fontSize="10" fontWeight="bold">
                      {sector.ancientsCount} Ancient
                    </text>
                  </g>
                )}

                {/* Artifact Icon */}
                {sector.hasArtifact && !sector.hasGCDS && (
                  <g
                    transform={`translate(${sector.ancientsCount > 0 ? x - 26 : x - 18}, ${y - 12})`}
                    className="pointer-events-none"
                  >
                    <polygon
                      points="0,-6 6,0 0,6 -6,0"
                      fill="#0284c7"
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="2.5"
                      textAnchor="middle"
                      fill="#f0f9ff"
                      fontSize="6.5"
                      fontWeight="bold"
                    >
                      A
                    </text>
                  </g>
                )}

                {(sector.discoveryTile || (sector.hasDiscovery && !sector.discoveryClaimed)) && (
                  <g
                    transform={`translate(${sector.ancientsCount > 0 ? x + 18 : sector.hasArtifact ? x + 18 : x}, ${y - 12})`}
                    className="pointer-events-none"
                  >
                    <rect
                      x="-7"
                      y="-7"
                      width="14"
                      height="14"
                      rx="2.5"
                      transform="rotate(45)"
                      fill="#f59e0b"
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#78350f"
                      fontSize="9"
                      fontWeight="900"
                    >
                      ★
                    </text>
                  </g>
                )}

                {/* Planets Display */}
                <g transform={`translate(${x}, ${y + (isCenter ? 10 : 6)})`}>
                  {sector.planets.map((planet, pIdx) => {
                    const totalPlanets = sector.planets.length;
                    const isMultiRow = totalPlanets > 4;
                    const row = isMultiRow ? Math.floor(pIdx / 3) : 0;
                    const col = isMultiRow ? pIdx % 3 : pIdx;
                    const countInRow = isMultiRow
                      ? (row === 0 ? Math.min(3, totalPlanets) : totalPlanets - 3)
                      : totalPlanets;
                    const offsetX = (col - (countInRow - 1) / 2) * 20;
                    const offsetY = isMultiRow ? (row === 0 ? -9 : 11) : 0;

                    const planetColor =
                      planet.resource === 'money'
                        ? '#facc15' // Bright Yellow (official physical game)
                        : planet.resource === 'science'
                        ? '#ec4899' // Pink/Magenta
                        : planet.resource === 'material'
                        ? '#854d0e' // Warm Brown
                        : '#94a3b8';

                    const colonizer = state.players.find((p) => p.id === planet.colonizedBy);

                    return (
                      <g
                        key={planet.id}
                        transform={`translate(${offsetX}, ${offsetY})`}
                        onClick={(e) => {
                          if (!planet.colonizedBy && sector.discOwner === activePlayer?.id) {
                            e.stopPropagation();
                            onColonizePlanet?.(sector.id, pIdx);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <circle
                          cx="0"
                          cy="0"
                          r={planet.isAdvanced ? '8.5' : '7.5'}
                          fill={planet.colonizedBy ? colonizer?.color : 'rgba(15, 23, 42, 0.95)'}
                          stroke={planet.isAdvanced ? '#ffffff' : planetColor}
                          strokeWidth={planet.isAdvanced ? '2' : '1.8'}
                        />
                        {!planet.colonizedBy && (
                          <circle cx="0" cy="0" r="3.2" fill={planetColor} />
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* Ships and Fleet Badges: Grouped by Owner with Ship Class and Counts */}
                {sector.ships.length > 0 && (() => {
                  const ownerMap = new Map<string, SectorShip[]>();
                  for (const ship of sector.ships) {
                    const list = ownerMap.get(ship.ownerId) || [];
                    list.push(ship);
                    ownerMap.set(ship.ownerId, list);
                  }

                  const fleetGroups: {
                    ownerId: string;
                    ownerName: string;
                    ownerColor: string;
                    isNpc: boolean;
                    typeCounts: { type: string; count: number; label: string }[];
                    totalDamage: number;
                    totalShips: number;
                  }[] = [];

                  for (const [ownerId, ships] of ownerMap.entries()) {
                    let ownerName = 'Commander';
                    let ownerColor = '#38bdf8';
                    let isNpc = false;

                    if (ownerId === 'ancient') {
                      ownerName = 'Ancient';
                      ownerColor = '#f43f5e';
                      isNpc = true;
                    } else if (ownerId === 'gcds') {
                      ownerName = 'GCDS';
                      ownerColor = '#fb7185';
                      isNpc = true;
                    } else if (ownerId === 'guardian') {
                      ownerName = 'Guardian';
                      ownerColor = '#ec4899';
                      isNpc = true;
                    } else {
                      const pl = state.players.find((p) => p.id === ownerId);
                      if (pl) {
                        ownerName = pl.name.split(' ')[1] || pl.name.split(' ')[0] || pl.name;
                        ownerColor = pl.color;
                      }
                    }

                    const countMap: Record<string, number> = {};
                    let totalDamage = 0;
                    for (const s of ships) {
                      countMap[s.type] = (countMap[s.type] || 0) + 1;
                      totalDamage += s.damage;
                    }

                    const typeCounts: { type: string; count: number; label: string }[] = [];
                    if (countMap.interceptor) typeCounts.push({ type: 'interceptor', count: countMap.interceptor, label: 'Int' });
                    if (countMap.cruiser) typeCounts.push({ type: 'cruiser', count: countMap.cruiser, label: 'Cru' });
                    if (countMap.dreadnought) typeCounts.push({ type: 'dreadnought', count: countMap.dreadnought, label: 'Dre' });
                    if (countMap.starbase) typeCounts.push({ type: 'starbase', count: countMap.starbase, label: 'Sta' });
                    if (countMap.ancient) typeCounts.push({ type: 'ancient', count: countMap.ancient, label: 'Anc' });
                    if (countMap.gcds) typeCounts.push({ type: 'gcds', count: countMap.gcds, label: 'GCDS' });
                    if (countMap.guardian) typeCounts.push({ type: 'guardian', count: countMap.guardian, label: 'Grd' });

                    fleetGroups.push({
                      ownerId,
                      ownerName,
                      ownerColor,
                      isNpc,
                      typeCounts,
                      totalDamage,
                      totalShips: ships.length,
                    });
                  }

                  const isContested = fleetGroups.length > 1;

                  return (
                    <g transform={`translate(${x}, ${y + (isCenter ? 38 : 34)})`}>
                      {fleetGroups.map((group, gIdx) => {
                        const offsetY = fleetGroups.length === 1 ? 0 : (gIdx === 0 ? -9 : 9);
                        const labelStr = group.typeCounts.map((t) => `${t.count}${t.label}`).join(' ');
                        const badgeWidth = Math.max(50, labelStr.length * 6.5 + 24);

                        return (
                          <g key={group.ownerId} transform={`translate(0, ${offsetY})`}>
                            {/* Fleet Background Pill */}
                            <rect
                              x={-badgeWidth / 2}
                              y="-8"
                              width={badgeWidth}
                              height="16"
                              rx="4"
                              fill="rgba(10, 15, 30, 0.94)"
                              stroke={group.ownerColor}
                              strokeWidth={isContested ? "1.6" : "1.2"}
                              className={isContested ? "animate-pulse" : ""}
                            />

                            {/* Owner Color Dot */}
                            <circle
                              cx={-badgeWidth / 2 + 7}
                              cy="0"
                              r="3.5"
                              fill={group.ownerColor}
                              stroke="#ffffff"
                              strokeWidth="0.8"
                            />

                            {/* Ship Type Breakdown */}
                            <text
                              x={5}
                              y="3"
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="9"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {group.typeCounts.map((t, tIdx) => (
                                <tspan key={t.type}>
                                  {tIdx > 0 ? ' ' : ''}
                                  <tspan fill="#ffffff">{t.count}</tspan>
                                  <tspan fill={group.ownerColor} fontSize="8">{t.label}</tspan>
                                </tspan>
                              ))}
                            </text>

                            {/* Damage indicator pip if any ship in fleet took damage */}
                            {group.totalDamage > 0 && (
                              <circle
                                cx={badgeWidth / 2 - 5}
                                cy="-4"
                                r="2.5"
                                fill="#f43f5e"
                                stroke="#ffffff"
                                strokeWidth="0.5"
                              />
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}

                {/* Influence Disc Indicator */}
                {owner && (
                  <circle
                    cx={x}
                    cy={y + HEX_RADIUS - 18}
                    r="8"
                    fill={owner.color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="shadow-lg"
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
