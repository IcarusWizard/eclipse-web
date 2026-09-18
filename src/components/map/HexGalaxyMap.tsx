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
  Hammer,
  Hexagon,
} from 'lucide-react';

export interface HexMapBuildMode {
  eligibleSectorIds: string[];
  selectedSectorId: string | null;
  queuedSectors: { sectorId: string; summary: string }[];
  onSelectSector: (sectorId: string) => void;
}

export interface HexMapMoveMode {
  playerShipSectorIds: string[];
  selectedShipId: string | null;
  currentSimSectorId: string | null;
  connectedDestinationSectorIds: string[];
  plannedMoves: {
    id: string;
    shipId: string;
    shipType: string;
    fromSectorId: string;
    toSectorId: string;
    fromSectorNumber: number;
    toSectorNumber: number;
    activationIndex?: number;
    stepInActivation?: number;
    driveSpeed?: number;
  }[];
  onSelectShipSector: (sectorId: string) => void;
  onSelectDestinationSector: (sectorId: string) => void;
  onRemovePlannedMove?: (index: number) => void;
}

interface HexGalaxyMapProps {
  state: GameState;
  selectedSectorId: string | null;
  onSelectSector: (sector: SectorTile) => void;
  onExploreTarget?: (fromCoord: HexCoord, targetCoord: HexCoord) => void;
  isExploreMode?: boolean;
  onColonizePlanet?: (
    sectorId: string,
    planetIndex: number,
    chosenResource?: 'money' | 'science' | 'material'
  ) => void;
  pendingExplore?: {
    from: HexCoord;
    target: HexCoord;
    candidateTile: SectorTile;
    rotation: number;
  } | null;
  onRotateExplore?: (delta: number) => void;
  buildMode?: HexMapBuildMode | null;
  moveMode?: HexMapMoveMode | null;
}

const HEX_RADIUS = 78;

// Deterministic pseudorandom generator for authentic starfield
function createStars(count: number, width: number, height: number, seed: number) {
  let s = seed;
  const next = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const colors = ['#ffffff', '#bfdbfe', '#fef08a', '#fbcfe8', '#a5f3fc', '#e2e8f0'];
  const stars = [];

  for (let i = 0; i < count; i++) {
    const x = Math.floor(next() * width);
    const y = Math.floor(next() * height);
    const r = parseFloat((next() * 1.5 + 0.6).toFixed(1));
    const opacity = parseFloat((next() * 0.55 + 0.35).toFixed(2));
    const color = colors[Math.floor(next() * colors.length)];
    const hasCross = next() > 0.72;
    stars.push({ x, y, r, opacity, color, hasCross });
  }
  return stars;
}

const DISTANT_STARS = createStars(100, 600, 600, 12345);
const BRIGHT_STARS = createStars(50, 800, 800, 67890);

function generateSpiralPath(startAngle: number, sweep: number, rStart: number, rEnd: number): string {
  const steps = 24;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = startAngle + t * sweep;
    const r = rStart + (rEnd - rStart) * Math.pow(t, 1.15);
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    if (i === 0) {
      d += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  return d;
}

const SPIRAL_ARMS = [
  { path: generateSpiralPath(0, 3.6, 70, 520), color: 'rgba(56, 189, 248, 0.18)', width: 34, opacity: 0.8 },
  { path: generateSpiralPath(Math.PI, 3.6, 70, 520), color: 'rgba(168, 85, 247, 0.18)', width: 34, opacity: 0.8 },
  { path: generateSpiralPath(Math.PI * 0.5, 3.2, 85, 480), color: 'rgba(236, 72, 153, 0.14)', width: 28, opacity: 0.65 },
  { path: generateSpiralPath(Math.PI * 1.5, 3.2, 85, 480), color: 'rgba(99, 102, 241, 0.14)', width: 28, opacity: 0.65 },
];

export const HexGalaxyMap: React.FC<HexGalaxyMapProps> = ({
  state,
  selectedSectorId,
  onSelectSector,
  onExploreTarget,
  isExploreMode = false,
  onColonizePlanet,
  pendingExplore,
  onRotateExplore,
  buildMode = null,
  moveMode = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 450, y: 350 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);

  const unoccupiedCoords = useMemo(() => {
    const list: HexCoord[] = [];
    for (let q = -3; q <= 3; q++) {
      for (let r = -3; r <= 3; r++) {
        if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= 3) {
          const coord = { q, r };
          const exists = state.sectors.some((s) => areCoordsEqual(s.coord, coord));
          if (!exists) {
            list.push(coord);
          }
        }
      }
    }
    return list;
  }, [state.sectors]);

  const activePlayer = state.players[state.activePlayerIndex];

  // Center pan on initial load
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: rect.height / 2 });
    }
  }, []);

  // Auto-center view on candidate hex when exploration target is selected
  const lastExploreTargetRef = useRef<string | null>(null);
  useEffect(() => {
    if (pendingExplore) {
      const key = `${pendingExplore.target.q},${pendingExplore.target.r}`;
      if (lastExploreTargetRef.current !== key) {
        lastExploreTargetRef.current = key;
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const pFrom = hexToPixel(pendingExplore.from, HEX_RADIUS);
          const pTarget = hexToPixel(pendingExplore.target, HEX_RADIUS);
          const midX = (pFrom.x + pTarget.x) / 2;
          const midY = (pFrom.y + pTarget.y) / 2;
          setPan({
            x: rect.width / 2 - midX * zoom,
            y: rect.height * 0.42 - midY * zoom,
          });
        }
      }
    } else {
      lastExploreTargetRef.current = null;
    }
  }, [pendingExplore, zoom]);

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
      {/* Deep Space Background with Parallax Nebulae */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden z-0"
        style={{ backgroundColor: '#020617' }}
      >
        {/* Layered Cosmic Nebulae Gas Clouds */}
        <div
          className="absolute -inset-[35%] pointer-events-none opacity-65 transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x * 0.05}px, ${pan.y * 0.05}px)`,
            backgroundImage: `
              radial-gradient(ellipse 1000px 700px at 28% 28%, rgba(126, 34, 206, 0.18), transparent 75%),
              radial-gradient(ellipse 1200px 800px at 72% 68%, rgba(6, 182, 212, 0.15), transparent 75%),
              radial-gradient(circle 850px at 50% 50%, rgba(79, 70, 229, 0.13), transparent 70%),
              radial-gradient(ellipse 900px 600px at 78% 22%, rgba(236, 72, 153, 0.11), transparent 70%),
              radial-gradient(ellipse 800px 550px at 18% 75%, rgba(14, 165, 233, 0.12), transparent 70%)
            `,
          }}
        />

        {/* High-Tech Tactical Astrogation Dotted Grid */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.35) 1px, transparent 0)`,
            backgroundSize: '48px 48px',
            transform: `translate(${(pan.x * 0.15) % 48}px, ${(pan.y * 0.15) % 48}px)`,
          }}
        />
      </div>

      {/* Map Controls & Status HUD */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Sector Deck Counter Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-lg text-xs font-mono shadow-md">
          <span className="text-slate-400 font-bold text-[11px]">DECKS:</span>
          <span className="text-amber-400 font-bold" title="Ring 1 Sector Stack">R1: {state.sectorDecks?.ring1?.length ?? 0}</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400 font-bold" title="Ring 2 Sector Stack">R2: {state.sectorDecks?.ring2?.length ?? 0}</span>
          <span className="text-slate-600">|</span>
          <span className="text-indigo-400 font-bold" title="Ring 3 Sector Stack">R3: {state.sectorDecks?.ring3?.length ?? 0}</span>
        </div>

        {/* Grid Outline Toggle */}
        <button
          type="button"
          onClick={() => setShowGrid((g) => !g)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold shadow transition-all flex items-center gap-1.5 ${
            showGrid
              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-cyan-500/20'
              : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
          title="Toggle Dashed Hexagonal Grid Outlines for Unexplored Sectors"
        >
          <Hexagon className="w-3.5 h-3.5" />
          <span>Grid</span>
        </button>

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
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          {/* Galactic Core Glow Gradient */}
          <radialGradient id="galactic_core_glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="18%" stopColor="#38bdf8" stopOpacity="0.32" />
            <stop offset="42%" stopColor="#8b5cf6" stopOpacity="0.22" />
            <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>

          {/* Outer Nebula Halo Gradient */}
          <radialGradient id="galactic_nebula_halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.22" />
            <stop offset="35%" stopColor="#06b6d4" stopOpacity="0.14" />
            <stop offset="65%" stopColor="#4f46e5" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Soft Blur Filter for Core Glow */}
          <filter id="core_blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="16" />
          </filter>

          {/* Distant Micro-Star Dust Pattern */}
          <pattern
            id="starfield_distant"
            width="600"
            height="600"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x * 0.12}, ${pan.y * 0.12})`}
          >
            {DISTANT_STARS.map((star, i) => (
              <circle
                key={`dist_star_${i}`}
                cx={star.x}
                cy={star.y}
                r={star.r}
                fill={star.color}
                opacity={star.opacity}
              />
            ))}
          </pattern>

          {/* Closer Twinkling & Bright Stars Pattern */}
          <pattern
            id="starfield_bright"
            width="800"
            height="800"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x * 0.28}, ${pan.y * 0.28})`}
          >
            {BRIGHT_STARS.map((star, i) => (
              <g key={`bright_star_${i}`}>
                <circle
                  cx={star.x}
                  cy={star.y}
                  r={star.r * 2.4}
                  fill={star.color}
                  opacity={star.opacity * 0.25}
                />
                <circle
                  cx={star.x}
                  cy={star.y}
                  r={star.r}
                  fill={star.color}
                  opacity={star.opacity}
                />
                {star.hasCross && (
                  <g stroke={star.color} strokeWidth="0.6" opacity={star.opacity * 0.6}>
                    <line x1={star.x - star.r * 3.5} y1={star.y} x2={star.x + star.r * 3.5} y2={star.y} />
                    <line x1={star.x} y1={star.y - star.r * 3.5} x2={star.x} y2={star.y + star.r * 3.5} />
                  </g>
                )}
              </g>
            ))}
          </pattern>

          {/* Arrowhead marker for fleet movement vectors */}
          <marker
            id="move_arrow_cyan"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" />
          </marker>
        </defs>

        {/* Infinite Seamless Parallax Starfield Layers */}
        <rect width="100%" height="100%" fill="url(#starfield_distant)" opacity="0.85" />
        <rect width="100%" height="100%" fill="url(#starfield_bright)" opacity="0.9" />

        <g
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="pointer-events-auto transition-transform duration-75 ease-out"
        >
          {/* Galactic Center Core Radiance and Spiral Arms at (0, 0) */}
          <g className="pointer-events-none">
            {/* Outer Galactic Halo */}
            <circle cx="0" cy="0" r="580" fill="url(#galactic_nebula_halo)" />
            {/* Mid Core Accretion Halo */}
            <circle cx="0" cy="0" r="300" fill="url(#galactic_core_glow)" />
            {/* Center Nucleus Soft Glow */}
            <circle cx="0" cy="0" r="95" fill="rgba(255, 255, 255, 0.16)" filter="url(#core_blur)" />

            {/* Luminous Spiral Arms */}
            {SPIRAL_ARMS.map((arm, aIdx) => (
              <g key={`spiral_arm_${aIdx}`}>
                <path
                  d={arm.path}
                  fill="none"
                  stroke={arm.color}
                  strokeWidth={arm.width * 2.2}
                  strokeOpacity={arm.opacity * 0.7}
                  strokeLinecap="round"
                />
                <path
                  d={arm.path}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={arm.width * 0.55}
                  strokeOpacity={arm.opacity * 0.45}
                  strokeLinecap="round"
                />
              </g>
            ))}

            {/* 6 Hexagonal Cardinal Axis Guides (0°, 60°, 120°, 180°, 240°, 300°) */}
            {[0, 60, 120, 180, 240, 300].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = Math.cos(rad) * (HEX_RADIUS * 1.732 * 0.85);
              const y1 = Math.sin(rad) * (HEX_RADIUS * 1.732 * 0.85);
              const x2 = Math.cos(rad) * (HEX_RADIUS * 1.732 * 3.3);
              const y2 = Math.sin(rad) * (HEX_RADIUS * 1.732 * 3.3);
              return (
                <line
                  key={`axis_ray_${deg}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(148, 163, 184, 0.12)"
                  strokeWidth="1"
                  strokeDasharray="3 7"
                />
              );
            })}

            {/* Ring 1 (Inner) Orbital Boundary */}
            <circle
              cx="0"
              cy="0"
              r={HEX_RADIUS * 1.732 * 1}
              fill="none"
              stroke="rgba(56, 189, 248, 0.26)"
              strokeDasharray="4 8"
              strokeWidth="1.2"
            />
            <text
              x={HEX_RADIUS * 1.732 * 1 * 0.72}
              y={-HEX_RADIUS * 1.732 * 1 * 0.72}
              fill="rgba(56, 189, 248, 0.45)"
              fontSize="8"
              fontWeight="bold"
              fontFamily="monospace"
              letterSpacing="1"
            >
              RING I
            </text>

            {/* Ring 2 (Middle) Orbital Boundary */}
            <circle
              cx="0"
              cy="0"
              r={HEX_RADIUS * 1.732 * 2}
              fill="none"
              stroke="rgba(168, 85, 247, 0.22)"
              strokeDasharray="6 10"
              strokeWidth="1.2"
            />
            <text
              x={HEX_RADIUS * 1.732 * 2 * 0.72}
              y={-HEX_RADIUS * 1.732 * 2 * 0.72}
              fill="rgba(168, 85, 247, 0.40)"
              fontSize="8"
              fontWeight="bold"
              fontFamily="monospace"
              letterSpacing="1"
            >
              RING II
            </text>

            {/* Ring 3 (Outer) Orbital Boundary */}
            <circle
              cx="0"
              cy="0"
              r={HEX_RADIUS * 1.732 * 3}
              fill="none"
              stroke="rgba(99, 102, 241, 0.18)"
              strokeDasharray="8 12"
              strokeWidth="1.2"
            />
            <text
              x={HEX_RADIUS * 1.732 * 3 * 0.72}
              y={-HEX_RADIUS * 1.732 * 3 * 0.72}
              fill="rgba(99, 102, 241, 0.35)"
              fontSize="8"
              fontWeight="bold"
              fontFamily="monospace"
              letterSpacing="1"
            >
              RING III
            </text>
          </g>

          {/* Dashed Hexagonal Outlines for Unexplored Sectors (when showGrid is enabled) */}
          {showGrid &&
            unoccupiedCoords.map((coord) => {
              const { x, y } = hexToPixel(coord, HEX_RADIUS);
              const ring = getRingFromCoord(coord);
              const hexPoints = getHexCornerPoints(x, y, HEX_RADIUS - 2);
              return (
                <g key={`dash_grid_${coord.q}_${coord.r}`} className="pointer-events-none">
                  <polygon
                    points={hexPoints}
                    fill="rgba(15, 23, 42, 0.22)"
                    stroke={
                      ring === 1
                        ? 'rgba(251, 191, 36, 0.35)'
                        : ring === 2
                        ? 'rgba(56, 189, 248, 0.35)'
                        : 'rgba(129, 140, 248, 0.35)'
                    }
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    fill={
                      ring === 1
                        ? 'rgba(251, 191, 36, 0.45)'
                        : ring === 2
                        ? 'rgba(56, 189, 248, 0.45)'
                        : 'rgba(129, 140, 248, 0.45)'
                    }
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                    letterSpacing="0.5"
                  >
                    R{ring}
                  </text>
                </g>
              );
            })}

          {/* Explorable Target Hexes in Explore Mode */}
          {explorableHexes.map((target, idx) => {
            if (pendingExplore && areCoordsEqual(target.target, pendingExplore.target)) {
              return null;
            }
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

            // Build mode status
            const isBuildEligible = buildMode ? buildMode.eligibleSectorIds.includes(sector.id) : false;
            const isBuildSelected = buildMode ? buildMode.selectedSectorId === sector.id : false;
            const queuedBuild = buildMode ? buildMode.queuedSectors.find((q) => q.sectorId === sector.id) : null;

            // Move mode status
            const hasMoveableShips = moveMode ? moveMode.playerShipSectorIds.includes(sector.id) : false;
            const isMoveOrigin = moveMode ? moveMode.currentSimSectorId === sector.id : false;
            const isMoveConnectedDest = moveMode ? moveMode.connectedDestinationSectorIds.includes(sector.id) : false;

            let hexFill = isCenter
              ? 'rgba(30, 27, 75, 0.95)'
              : owner
              ? `${owner.color}15`
              : 'rgba(15, 23, 42, 0.95)';

            let hexStroke = isSelected
              ? '#38bdf8'
              : owner
              ? owner.color
              : isCenter
              ? '#a855f7'
              : '#334155';

            let hexStrokeWidth = isSelected ? '3' : owner ? '2.5' : '1.5';
            let hexStrokeDasharray: string | undefined = undefined;

            if (buildMode) {
              if (isBuildSelected) {
                hexFill = 'rgba(245, 158, 11, 0.22)';
                hexStroke = '#fbbf24';
                hexStrokeWidth = '3.5';
              } else if (isBuildEligible) {
                hexFill = 'rgba(245, 158, 11, 0.08)';
                hexStroke = '#f59e0b';
                hexStrokeWidth = '2.5';
                hexStrokeDasharray = '5 3';
              }
            } else if (moveMode) {
              if (isMoveConnectedDest) {
                hexFill = 'rgba(16, 185, 129, 0.22)';
                hexStroke = '#10b981';
                hexStrokeWidth = '3.2';
              } else if (isMoveOrigin) {
                hexFill = 'rgba(6, 182, 212, 0.22)';
                hexStroke = '#06b6d4';
                hexStrokeWidth = '3.5';
              } else if (hasMoveableShips) {
                hexStroke = '#38bdf8';
                hexStrokeWidth = '2.5';
                hexStrokeDasharray = '5 3';
              }
            }

            return (
              <g
                key={sector.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (buildMode && isBuildEligible) {
                    buildMode.onSelectSector(sector.id);
                    return;
                  }
                  if (moveMode) {
                    if (isMoveConnectedDest) {
                      moveMode.onSelectDestinationSector(sector.id);
                      return;
                    }
                    if (hasMoveableShips) {
                      moveMode.onSelectShipSector(sector.id);
                      return;
                    }
                  }
                  onSelectSector(sector);
                }}
                className="cursor-pointer group"
              >
                {/* Sector Hexagon Polygon */}
                <polygon
                  points={getHexCornerPoints(x, y, HEX_RADIUS - 2)}
                  fill={hexFill}
                  stroke={hexStroke}
                  strokeWidth={hexStrokeWidth}
                  strokeDasharray={hexStrokeDasharray}
                  className="transition-colors group-hover:stroke-slate-200"
                />

                {/* Pulsating interactive halo for selected shipyard or destination */}
                {isBuildSelected && (
                  <polygon
                    points={getHexCornerPoints(x, y, HEX_RADIUS + 3)}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                    className="animate-pulse pointer-events-none"
                  />
                )}
                {isMoveConnectedDest && (
                  <polygon
                    points={getHexCornerPoints(x, y, HEX_RADIUS + 3)}
                    fill="rgba(16, 185, 129, 0.12)"
                    stroke="#34d399"
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                    className="animate-pulse pointer-events-none"
                  />
                )}
                {isMoveOrigin && (
                  <polygon
                    points={getHexCornerPoints(x, y, HEX_RADIUS + 3)}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                    className="animate-pulse pointer-events-none"
                  />
                )}

                {/* Wormholes on 6 Edges */}
                {([0, 1, 2, 3, 4, 5] as HexEdge[]).map((edge) => {
                  const hasWormhole = hasWormholeOnEdge(sector, edge);
                  if (!hasWormhole) return null;
                  const edgePos = getHexEdgeCenter(x, y, HEX_RADIUS - 2, edge);

                  // Check if adjacent sector exists and shares a connected wormhole (including rotating candidate tile)
                  const neighborCoord = getNeighborCoord(sector.coord, edge);
                  const candidateNeighbor =
                    pendingExplore && areCoordsEqual(neighborCoord, pendingExplore.target)
                      ? {
                          ...pendingExplore.candidateTile,
                          coord: pendingExplore.target,
                          rotation: pendingExplore.rotation,
                        }
                      : null;
                  const neighborSector =
                    state.sectors.find((s) => areCoordsEqual(s.coord, neighborCoord)) ||
                    candidateNeighbor;
                  const hasWormholeGen =
                    activePlayer?.techTrack.researched.some((t) => t.id === 'wormhole_generator') ?? false;
                  const isConnected = neighborSector ? areSectorsConnected(sector, neighborSector, hasWormholeGen) : false;

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
                      {/* Setup Arrow pointing toward Galactic Center on Home Sectors */}
                      {sector.sectorNumber >= 221 && sector.sectorNumber <= 232 && ((edge - sector.rotation) % 6 + 6) % 6 === 0 && (
                        <path
                          d="M -18 -4 L -13 0 L -18 4"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Sector Number High-Contrast Badge */}
                <g transform={`translate(${x}, ${y - HEX_RADIUS + 15})`} className="pointer-events-none">
                  <rect
                    x={isCenter ? -28 : -24}
                    y="-9"
                    width={isCenter ? 56 : 48}
                    height="18"
                    rx="4"
                    fill="rgba(2, 6, 23, 0.92)"
                    stroke={isCenter ? '#ec4899' : '#38bdf8'}
                    strokeWidth="1.3"
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill={isCenter ? '#f472b6' : '#f0f9ff'}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="900"
                    letterSpacing="0.5"
                  >
                    {isCenter ? 'GCDS 1' : `SEC ${sector.sectorNumber}`}
                  </text>
                </g>

                {sector.victoryPoints > 0 && (
                  <g transform={`translate(${x}, ${y - HEX_RADIUS + 32})`} className="pointer-events-none">
                    <rect
                      x="-18"
                      y="-7"
                      width="36"
                      height="14"
                      rx="3.5"
                      fill="#1e1b4b"
                      stroke="#f59e0b"
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#fbbf24"
                      fontSize="9.5"
                      fontWeight="900"
                      letterSpacing="0.4"
                    >
                      ★ {sector.victoryPoints} VP
                    </text>
                  </g>
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
                {sector.hasArtifact && (() => {
                  const hasDiscovery = sector.discoveryTile || (sector.hasDiscovery && !sector.discoveryClaimed);
                  const hasOther = sector.hasGCDS || sector.ancientsCount > 0 || hasDiscovery;
                  const posX = !hasOther
                    ? x
                    : sector.hasGCDS
                    ? x - 22
                    : sector.ancientsCount > 0
                    ? x - 26
                    : x - 18;
                  const posY = !hasOther ? y - 15 : y - 12;

                  return (
                    <g
                      transform={`translate(${posX}, ${posY})`}
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
                  );
                })()}

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
                            if (planet.isOrbital || planet.resource === 'any') {
                              onSelectSector(sector);
                            } else {
                              onColonizePlanet?.(sector.id, pIdx, planet.resource as any);
                            }
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {planet.isOrbital ? (
                          <g className="orbital-station">
                            {/* Photovoltaic solar array wings */}
                            <line x1="-11" y1="0" x2="11" y2="0" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
                            <line x1="-10" y1="-3" x2="-10" y2="3" stroke="#38bdf8" strokeWidth="1.2" />
                            <line x1="10" y1="-3" x2="10" y2="3" stroke="#38bdf8" strokeWidth="1.2" />
                            {/* Rotating habitat ring */}
                            <circle
                              cx="0"
                              cy="0"
                              r="7"
                              fill={planet.colonizedBy ? colonizer?.color : '#0f172a'}
                              stroke="#38bdf8"
                              strokeWidth="1.8"
                              strokeDasharray={planet.colonizedBy ? 'none' : '3 1.5'}
                            />
                            {/* Station hub core */}
                            <circle
                              cx="0"
                              cy="0"
                              r="2.8"
                              fill={planet.colonizedBy ? '#ffffff' : '#38bdf8'}
                            />
                          </g>
                        ) : (
                          <>
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
                          </>
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

                {/* Build Mode Interactive Overlay Badges */}
                {buildMode && isBuildEligible && (
                  <g transform={`translate(${x}, ${y - HEX_RADIUS + (sector.victoryPoints > 0 ? 48 : 34)})`} className="pointer-events-none">
                    <rect
                      x="-38"
                      y="-8"
                      width="76"
                      height="16"
                      rx="8"
                      fill={isBuildSelected ? '#78350f' : '#451a03'}
                      stroke={isBuildSelected ? '#fbbf24' : '#f59e0b'}
                      strokeWidth={isBuildSelected ? '1.8' : '1'}
                      className={isBuildSelected ? 'animate-pulse' : ''}
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill={isBuildSelected ? '#fef08a' : '#fde68a'}
                      fontSize="8.5"
                      fontWeight="black"
                      letterSpacing="0.5"
                    >
                      {isBuildSelected ? '★ SHIPYARD' : 'SHIPYARD'}
                    </text>
                  </g>
                )}

                {buildMode && queuedBuild && queuedBuild.summary && (
                  <g transform={`translate(${x}, ${y + HEX_RADIUS - 34})`} className="pointer-events-none">
                    <rect
                      x="-36"
                      y="-7"
                      width="72"
                      height="14"
                      rx="7"
                      fill="#451a03"
                      stroke="#fbbf24"
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="8"
                      fontWeight="bold"
                    >
                      + {queuedBuild.summary}
                    </text>
                  </g>
                )}

                {/* Move Mode Interactive Overlay Badges */}
                {moveMode && isMoveConnectedDest && (
                  <g transform={`translate(${x}, ${y - 10})`} className="pointer-events-none">
                    <rect
                      x="-48"
                      y="-11"
                      width="96"
                      height="22"
                      rx="11"
                      fill="#064e3b"
                      stroke="#10b981"
                      strokeWidth="1.8"
                      className="animate-pulse"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#6ee7b7"
                      fontSize="9.5"
                      fontWeight="black"
                      letterSpacing="0.5"
                    >
                      ➔ MOVE HERE
                    </text>
                  </g>
                )}

                {moveMode && isMoveOrigin && (
                  <g transform={`translate(${x}, ${y - HEX_RADIUS + (sector.victoryPoints > 0 ? 48 : 34)})`} className="pointer-events-none">
                    <rect
                      x="-40"
                      y="-8"
                      width="80"
                      height="16"
                      rx="8"
                      fill="#083344"
                      stroke="#06b6d4"
                      strokeWidth="1.6"
                      className="animate-pulse"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#67e8f9"
                      fontSize="8.5"
                      fontWeight="black"
                      letterSpacing="0.5"
                    >
                      🎯 CURRENT
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Planned Fleet Movement Flight Paths & Vectors */}
          {moveMode && moveMode.plannedMoves.length > 0 && (
            <g key="fleet_movement_paths" className="pointer-events-auto">
              {moveMode.plannedMoves.map((m, idx) => {
                const fromSec = state.sectors.find((s) => s.id === m.fromSectorId);
                const toSec = state.sectors.find((s) => s.id === m.toSectorId);
                if (!fromSec || !toSec) return null;

                const pFrom = hexToPixel(fromSec.coord, HEX_RADIUS);
                const pTo = hexToPixel(toSec.coord, HEX_RADIUS);
                const angle = Math.atan2(pTo.y - pFrom.y, pTo.x - pFrom.x);

                const startX = pFrom.x + Math.cos(angle) * 22;
                const startY = pFrom.y + Math.sin(angle) * 22;
                const endX = pTo.x - Math.cos(angle) * 36;
                const endY = pTo.y - Math.sin(angle) * 36;

                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;
                const perpOffset = (idx % 2 === 0 ? 1 : -1) * 16;
                const ctrlX = midX - Math.sin(angle) * perpOffset;
                const ctrlY = midY + Math.cos(angle) * perpOffset;
                const pathD = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;

                return (
                  <g key={m.id} className="group cursor-pointer">
                    {/* Glowing trajectory shadow */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="6"
                      opacity="0.4"
                    />
                    {/* Animated dashed trajectory line with cyan arrow marker */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeDasharray="6 3"
                      markerEnd="url(#move_arrow_cyan)"
                    />
                    {/* Waypoint pill badge at midpoint */}
                    <g
                      transform={`translate(${ctrlX}, ${ctrlY})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveMode.onRemovePlannedMove?.(idx);
                      }}
                    >
                      <rect
                        x="-34"
                        y="-9"
                        width="68"
                        height="18"
                        rx="9"
                        fill="#0f172a"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        className="group-hover:stroke-rose-400 group-hover:fill-rose-950/80 transition-colors"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#38bdf8"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                        className="group-hover:fill-rose-300"
                      >
                        {m.activationIndex !== undefined
                          ? `Act ${m.activationIndex + 1}.${m.stepInActivation || 1} ${m.shipType.slice(0, 3).toUpperCase()}`
                          : `#${idx + 1} ${m.shipType.slice(0, 3).toUpperCase()}`}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* Candidate Exploration Tile Rendered in Real-Time on the Galaxy Map */}
          {pendingExplore && (() => {
            const { x, y } = hexToPixel(pendingExplore.target, HEX_RADIUS);
            const fromPixel = hexToPixel(pendingExplore.from, HEX_RADIUS);
            const simulatedTile: SectorTile = {
              ...pendingExplore.candidateTile,
              coord: pendingExplore.target,
              rotation: pendingExplore.rotation,
            };
            const hasWormholeGen =
              activePlayer?.techTrack.researched.some((t) => t.id === 'wormhole_generator') ?? false;
            const sourceSector = state.sectors.find((s) => areCoordsEqual(s.coord, pendingExplore.from));
            const isConnectedToSource = sourceSector
              ? areSectorsConnected(sourceSector, simulatedTile, hasWormholeGen)
              : false;

            return (
              <g
                key="candidate_explore_tile"
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  onRotateExplore?.(1);
                }}
              >
                {/* Connection Vector between Origin and Candidate */}
                <line
                  x1={fromPixel.x}
                  y1={fromPixel.y}
                  x2={x}
                  y2={y}
                  stroke={isConnectedToSource ? '#38bdf8' : '#f43f5e'}
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  strokeOpacity="0.8"
                />

                {/* Outer animated halo ring */}
                <polygon
                  points={getHexCornerPoints(x, y, HEX_RADIUS + 3)}
                  fill="none"
                  stroke={isConnectedToSource ? '#06b6d4' : '#fb7185'}
                  strokeWidth="1.5"
                  strokeOpacity="0.5"
                  className="animate-pulse"
                />

                {/* Candidate Sector Hexagon Polygon */}
                <polygon
                  points={getHexCornerPoints(x, y, HEX_RADIUS - 2)}
                  fill="rgba(15, 23, 42, 0.95)"
                  stroke={isConnectedToSource ? '#38bdf8' : '#f43f5e'}
                  strokeWidth="3"
                  strokeDasharray={isConnectedToSource ? undefined : '6 4'}
                  className="transition-colors"
                />

                {/* Wormholes on 6 Edges with real-time rotation */}
                {([0, 1, 2, 3, 4, 5] as HexEdge[]).map((edge) => {
                  const hasWormhole = hasWormholeOnEdge(simulatedTile, edge);
                  if (!hasWormhole) return null;
                  const edgePos = getHexEdgeCenter(x, y, HEX_RADIUS - 2, edge);

                  // Check if adjacent sector exists and shares a connected wormhole
                  const neighborCoord = getNeighborCoord(simulatedTile.coord, edge);
                  const neighborSector = state.sectors.find((s) => areCoordsEqual(s.coord, neighborCoord));
                  const isNeighborConnected = neighborSector
                    ? areSectorsConnected(simulatedTile, neighborSector, hasWormholeGen)
                    : false;

                  return (
                    <g
                      key={`candidate_wh_${edge}`}
                      transform={`translate(${edgePos.x}, ${edgePos.y}) rotate(${edgePos.angle})`}
                    >
                      {/* Semicircle curving INWARD into the hex towards local -X */}
                      <path
                        d="M 0 -13 A 13 13 0 0 0 0 13 Z"
                        fill={isNeighborConnected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.25)'}
                        stroke="#ffffff"
                        strokeWidth={isNeighborConnected ? '2.5' : '2'}
                        strokeDasharray={isNeighborConnected ? undefined : '3.5 2'}
                      />
                      <path
                        d="M 0 -7 A 7 7 0 0 0 0 7"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}

                {/* Sector Header / Stats */}
                <text
                  x={x}
                  y={y - HEX_RADIUS + 22}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="11"
                  fontWeight="bold"
                  letterSpacing="0.5"
                >
                  SEC {pendingExplore.candidateTile.sectorNumber} ({pendingExplore.candidateTile.victoryPoints} VP)
                </text>

                {/* Center / Ancient / Discovery / Artifact Badges */}
                {pendingExplore.candidateTile.ancientsCount > 0 && (
                  <g transform={`translate(${x - 12}, ${y - 20})`}>
                    <Crosshair className="text-rose-500 animate-pulse" width="24" height="24" />
                    <text x="12" y="32" textAnchor="middle" fill="#f43f5e" fontSize="10" fontWeight="bold">
                      {pendingExplore.candidateTile.ancientsCount} Ancient
                    </text>
                  </g>
                )}

                {pendingExplore.candidateTile.hasDiscovery && (
                  <g
                    transform={`translate(${
                      pendingExplore.candidateTile.ancientsCount > 0
                        ? x + 18
                        : pendingExplore.candidateTile.hasArtifact
                        ? x + 18
                        : x
                    }, ${y - 12})`}
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
                    <text x="0" y="3.5" textAnchor="middle" fill="#78350f" fontSize="9" fontWeight="900">
                      ★
                    </text>
                  </g>
                )}

                {pendingExplore.candidateTile.hasArtifact && (() => {
                  const hasOther = pendingExplore.candidateTile.ancientsCount > 0 || pendingExplore.candidateTile.hasDiscovery;
                  const posX = !hasOther
                    ? x
                    : pendingExplore.candidateTile.ancientsCount > 0
                    ? x - 26
                    : x - 18;
                  const posY = !hasOther ? y - 15 : y - 12;

                  return (
                    <g transform={`translate(${posX}, ${posY})`}>
                      <polygon points="0,-6 6,0 0,6 -6,0" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />
                      <text x="0" y="2.5" textAnchor="middle" fill="#f0f9ff" fontSize="6.5" fontWeight="bold">
                        A
                      </text>
                    </g>
                  );
                })()}

                {/* Habitable Planets */}
                <g transform={`translate(${x}, ${y + 6})`}>
                  {pendingExplore.candidateTile.planets.map((planet, pIdx) => {
                    const totalPlanets = pendingExplore.candidateTile.planets.length;
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
                        ? '#facc15'
                        : planet.resource === 'science'
                        ? '#ec4899'
                        : planet.resource === 'material'
                        ? '#854d0e'
                        : '#94a3b8';

                    return (
                      <g key={planet.id || pIdx} transform={`translate(${offsetX}, ${offsetY})`}>
                        <circle
                          cx="0"
                          cy="0"
                          r={planet.isAdvanced ? '8.5' : '7.5'}
                          fill="rgba(15, 23, 42, 0.95)"
                          stroke={planet.isAdvanced ? '#ffffff' : planetColor}
                          strokeWidth={planet.isAdvanced ? '2' : '1.8'}
                        />
                        <circle cx="0" cy="0" r="3.2" fill={planetColor} />
                      </g>
                    );
                  })}
                </g>

                {/* Click to Rotate Map Handle */}
                <g transform={`translate(${x}, ${y + HEX_RADIUS - 16})`}>
                  <rect
                    x="-56"
                    y="-12"
                    width="112"
                    height="24"
                    rx="12"
                    fill="rgba(15, 23, 42, 0.92)"
                    stroke={isConnectedToSource ? '#38bdf8' : '#f43f5e'}
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#38bdf8"
                    fontSize="9.5"
                    fontWeight="bold"
                  >
                    ↻ Click to Rotate
                  </text>
                </g>
              </g>
            );
          })()}
        </g>
      </svg>
    </div>
  );
};
