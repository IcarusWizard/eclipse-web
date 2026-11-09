import React from 'react';
import { SectorCatalogEntry } from '../../engine/rules/sectorData';
import { SectorTile, HexEdge } from '../../engine/types/galaxy';
import { getHexCornerPoints, getHexEdgeCenter, hexToPixel } from '../../engine/rules/hexMath';
import { getPlanetSlotOffset } from '../map/HexGalaxyMap';
import {
  BASE_SOUTH_WARP_SECTOR_HEXES,
  BASE_SOUTH_CONDUITS,
  getWarpConduitSpline,
} from '../../engine/rules/warpedUniverse';
import { Shield } from 'lucide-react';

export interface SectorPreviewGraphicProps {
  sector: SectorCatalogEntry | Partial<SectorTile>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showCoordinates?: boolean;
}

/**
 * Preview graphic for the Warped Universe Large Warp Sector board as a whole.
 * Renders the full 18-hex double-hex modular board with all 12 conduit splines.
 */
export const WarpSectorPreviewGraphic: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const R = 20;
  // Bounding box for slice 0 south warp sector hexes
  const viewBox = '-26 4 196 204';

  const sizeClass =
    size === 'sm'
      ? 'w-24 h-24'
      : size === 'lg'
      ? 'w-48 h-48 sm:w-56 sm:h-56'
      : 'w-32 h-32 sm:w-36 sm:h-36';

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox={viewBox}
        className={`${sizeClass} drop-shadow-md select-none`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="warpBoardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a0f2e" />
            <stop offset="50%" stopColor="#120c1f" />
            <stop offset="100%" stopColor="#08040f" />
          </linearGradient>
        </defs>

        {/* 18 Hexes of the Large Warp Sector */}
        <g>
          {BASE_SOUTH_WARP_SECTOR_HEXES.map((h, idx) => {
            const { x, y } = hexToPixel(h, R);
            const points = getHexCornerPoints(x, y, R - 1.5);
            return (
              <g key={`warp_hex_${idx}`} data-warp-hex={idx}>
                <polygon
                  points={points}
                  fill="url(#warpBoardGrad)"
                  stroke="#3b2d54"
                  strokeWidth="1.2"
                />
                <polygon
                  points={getHexCornerPoints(x, y, R - 4)}
                  fill="none"
                  stroke="#241738"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
                {h.hasMarker && (
                  <text
                    x={x}
                    y={y + 2.5}
                    textAnchor="middle"
                    fill="#a855f7"
                    fontSize="5.5"
                    fontWeight="bold"
                    opacity="0.6"
                  >
                    T{h.tileIndex}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* 12 Wormhole Conduit Splines */}
        <g>
          {BASE_SOUTH_CONDUITS.map((c) => {
            const dummyConduit = {
              id: `w_cond_${c.conduitIndex}`,
              sliceIndex: 0,
              conduitIndex: c.conduitIndex,
              coordA: c.coordA,
              edgeA: c.edgeA,
              coordB: c.coordB,
              edgeB: c.edgeB,
            };
            const { ptA, ptB, pathD } = getWarpConduitSpline(dummyConduit, R);

            return (
              <g key={`spline_${c.conduitIndex}`} data-conduit-spline={c.conduitIndex}>
                {/* Glow */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="rgba(168, 85, 247, 0.4)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                {/* Core flow line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="1.5"
                  strokeDasharray={c.conduitIndex % 2 === 0 ? '4 2' : undefined}
                  strokeLinecap="round"
                />
                {/* Endpoint nodes */}
                <circle cx={ptA.x} cy={ptA.y} r="2.2" fill="#d8b4fe" stroke="#6b21a8" strokeWidth="0.8" />
                <circle cx={ptB.x} cy={ptB.y} r="2.2" fill="#d8b4fe" stroke="#6b21a8" strokeWidth="0.8" />
              </g>
            );
          })}
        </g>

        {/* Ring Indicators & Apex Title */}
        <g>
          {/* Apex Header */}
          <rect x="52" y="6" width="38" height="9" rx="2" fill="rgba(15, 7, 28, 0.95)" stroke="#a855f7" strokeWidth="0.8" />
          <text x="71" y="12.5" textAnchor="middle" fill="#f3e8ff" fontSize="5" fontWeight="black" letterSpacing="0.4">
            WARP SECTOR
          </text>

          {/* Ring Labels */}
          <rect x="-18" y="28" width="16" height="7" rx="1.5" fill="#1e1035" stroke="#7e22ce" strokeWidth="0.6" />
          <text x="-10" y="33" textAnchor="middle" fill="#d8b4fe" fontSize="4.5" fontWeight="bold">R1</text>

          <rect x="-18" y="78" width="16" height="7" rx="1.5" fill="#1e1035" stroke="#7e22ce" strokeWidth="0.6" />
          <text x="-10" y="83" textAnchor="middle" fill="#d8b4fe" fontSize="4.5" fontWeight="bold">R2</text>

          <rect x="-18" y="146" width="16" height="7" rx="1.5" fill="#1e1035" stroke="#7e22ce" strokeWidth="0.6" />
          <text x="-10" y="151" textAnchor="middle" fill="#d8b4fe" fontSize="4.5" fontWeight="bold">R3</text>
        </g>
      </svg>
    </div>
  );
};

/**
 * Authentic in-game sector tile preview.
 * Matches the exact in-game visual rendering from HexGalaxyMap without any icon overlap:
 * - Proper spacing for Sector 1 (GCDS, Artifact, Discovery, and 6 population slots)
 * - 3-column non-overlapping distribution for Ancient + Artifact + Discovery (109, 204, 301, 302, 303)
 * - Upper-left positioning for Artifact on Terran Home Systems (221-226) avoiding the 5 population slots
 * - Subsector assignment for Nebula sectors 295 & 395 (Sub 1 & 2 have Discovery Tiles, Sub 3 has Ancient Ship)
 * - Side clearance for Discovery Tile on Black Hole sectors 396 & 399 clear of the vortex and return banner
 */
export const SectorPreviewGraphic: React.FC<SectorPreviewGraphicProps> = ({
  sector,
  size = 'md',
  className = '',
}) => {
  // If sector is the Warped Universe board, show it as a whole!
  if (sector.category === 'Warped Universe' || sector.sectorNumber === 900) {
    return <WarpSectorPreviewGraphic size={size} className={className} />;
  }

  const HEX_RADIUS = 78;
  const secNum = sector.sectorNumber ?? 0;
  const isCenter = secNum === 1 || sector.category === 'Galactic Center';
  const isGuardian = sector.category === 'Guardian' || (secNum >= 271 && secNum <= 274);
  const isHome = sector.category === 'Home System' || (secNum >= 221 && secNum <= 238);
  const isNebula = sector.isNebula || secNum === 295 || secNum === 395;
  const isPulsar = sector.isPulsar || secNum === 393 || secNum === 394;
  const isSupernova = sector.isSupernova || secNum === 397 || secNum === 398;
  const isBlackHole = sector.isBlackHole || secNum === 396 || secNum === 399;
  const hasWarpPortal =
    sector.hasWarpPortal || secNum === 281 || secNum === 381 || secNum === 382;

  // In-game hex fill and stroke (matching HexGalaxyMap.tsx)
  const hexFill = isSupernova
    ? 'rgba(249, 115, 22, 0.16)'
    : isBlackHole
    ? 'rgba(30, 27, 75, 0.92)'
    : isNebula
    ? 'rgba(6, 78, 59, 0.20)'
    : isPulsar
    ? 'rgba(3, 105, 161, 0.16)'
    : isCenter
    ? 'rgba(15, 23, 42, 0.98)'
    : 'rgba(15, 23, 42, 0.95)';

  const hexStroke = isSupernova
    ? '#f97316'
    : isBlackHole
    ? '#818cf8'
    : isNebula
    ? '#10b981'
    : isPulsar
    ? '#38bdf8'
    : isCenter
    ? '#cbd5e1'
    : isGuardian
    ? '#f59e0b'
    : '#334155';

  const hexStrokeWidth = isCenter || isGuardian ? 2.2 : 1.5;

  const wormholes = sector.wormholes || [];
  const planets = sector.planets || [];
  const victoryPoints = sector.victoryPoints ?? 0;
  const ancientsCount = sector.ancientsCount ?? 0;
  const guardianCount = sector.guardianCount ?? (isGuardian ? 1 : 0);
  const hasDiscovery = sector.hasDiscovery ?? false;
  const hasArtifact = sector.hasArtifact ?? false;

  // =========================================================================
  // Non-Overlapping Position Calculations for all combinations
  // Population slots strictly remain at their exact original positions: isCenter ? 10 : 6
  // =========================================================================
  let ancientPos: { x: number; y: number } | null = null;
  let guardianPos: { x: number; y: number } | null = null;
  let gcdsPos: { x: number; y: number } | null = null;
  let artifactPos: { x: number; y: number } | null = null;
  let discoveryPos: { x: number; y: number } | null = null;
  let warpPortalPos: { x: number; y: number } | null = null;
  const planetsPosY = isCenter ? 10 : 6;

  if (isNebula) {
    // Nebula sectors (295 & 395) distribute items directly into the 3 subsectors:
    // Sub 1 (top): Discovery Tile
    // Sub 2 (bottom-left): Discovery Tile
    // Sub 3 (bottom-right): Ancient Ship
    // Handled in dedicated Nebula section below!
  } else if (isBlackHole) {
    // Black Hole (396 & 399): Discovery sits in open space on the right, completely outside the vortex
    if (hasDiscovery) {
      discoveryPos = { x: 28, y: -10 };
    }
  } else if (isCenter) {
    // Sector 1 (001): GCDS center at y=-25, Artifact upper-left (-26, -24), Discovery upper-right (26, -24).
    // Population slots remain at original y=10 (Row 0 at 0, top at -6.5). Discovery bottom is at -14.1, leaving >7.5px clearance!
    gcdsPos = { x: 0, y: -25 };
    if (hasArtifact) artifactPos = { x: -26, y: -24 };
    if (hasDiscovery) discoveryPos = { x: 26, y: -24 };
  } else if (guardianCount > 0) {
    // Guardian sectors (271-274): Guardian in center, Artifact left, Discovery right, 3 planets below at original y=6
    guardianPos = { x: 0, y: -22 };
    if (hasArtifact) artifactPos = { x: -26, y: -22 };
    if (hasDiscovery) discoveryPos = { x: 26, y: -22 };
  } else if (ancientsCount > 0 && hasArtifact && hasDiscovery) {
    // Sectors 109, 204, 301, 302, 303: 3 distinct columns!
    // Artifact on Left, Ancient in Center, Discovery on Right
    artifactPos = { x: -26, y: -18 };
    ancientPos = { x: 0, y: -18 };
    discoveryPos = { x: 26, y: -18 };
  } else if (ancientsCount > 0 && hasDiscovery) {
    // Sectors 101, 104, 105, 108, 203, 211, 214, 305: Ancient left, Discovery right
    ancientPos = { x: -16, y: -18 };
    discoveryPos = { x: 16, y: -18 };
  } else if (hasWarpPortal && hasDiscovery) {
    // Sectors 281, 381, 382: Warp Portal left, Discovery right
    warpPortalPos = { x: -18, y: -18 };
    discoveryPos = { x: 18, y: -18 };
  } else if (hasArtifact) {
    // Artifact Only (Terran Sol 221-226 with 5 planets, Alien Home 222, 230, 232 with 4 planets):
    // If planets >= 4, place Artifact in upper-left (x = -26, y = -22) so it NEVER covers Row 0 middle planet at (0, -4)!
    if (planets.length >= 4) {
      artifactPos = { x: -26, y: -22 };
    } else {
      artifactPos = { x: 0, y: -18 };
    }
  } else if (hasDiscovery) {
    // Discovery Only (110, 206, 207, 208, 311-316)
    if (planets.length > 0) {
      discoveryPos = { x: 0, y: -18 };
    } else {
      discoveryPos = { x: 0, y: -4 };
    }
  } else if (ancientsCount > 0) {
    ancientPos = { x: 0, y: -18 };
  }

  const sizeClass =
    size === 'sm'
      ? 'w-20 h-20'
      : size === 'lg'
      ? 'w-36 h-36 sm:w-44 sm:h-44'
      : 'w-26 h-26 sm:w-28 sm:h-28';

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="-78 -80 156 160"
        className={`${sizeClass} drop-shadow-lg select-none`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 1. In-Game Hexagon Tile Polygon */}
        <polygon
          points={getHexCornerPoints(0, 0, HEX_RADIUS - 2)}
          fill={hexFill}
          stroke={hexStroke}
          strokeWidth={hexStrokeWidth}
        />

        {/* 2. In-Game Wormholes on 6 Edges */}
        {([0, 1, 2, 3, 4, 5] as HexEdge[]).map((edge) => {
          const hasWh = wormholes[edge];
          if (!hasWh) return null;

          const edgePos = getHexEdgeCenter(0, 0, HEX_RADIUS - 2, edge);

          return (
            <g
              key={`wh_${edge}`}
              transform={`translate(${edgePos.x}, ${edgePos.y}) rotate(${edgePos.angle})`}
            >
              {/* Semicircle curving INWARD into the hex towards local -X */}
              <path
                d="M 0 -13 A 13 13 0 0 0 0 13 Z"
                fill="rgba(255, 255, 255, 0.9)"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              {/* Inner concentric portal arc in pure white */}
              <path
                d="M 0 -7 A 7 7 0 0 0 0 7"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              {/* Setup Arrow pointing toward Galactic Center on Home Sectors */}
              {isHome && edge === 0 && (
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

        {/* 3. In-Game Sector Number High-Contrast Badge */}
        <g transform={`translate(0, ${-HEX_RADIUS + 15})`} className="pointer-events-none">
          <rect
            x={isCenter ? -28 : -25}
            y={-9}
            width={isCenter ? 56 : 50}
            height={18}
            rx={4}
            fill="rgba(2, 6, 23, 0.94)"
            stroke={isCenter ? '#cbd5e1' : '#38bdf8'}
            strokeWidth={1.3}
          />
          <text
            x={0}
            y={3.5}
            textAnchor="middle"
            fill={isCenter ? '#f8fafc' : '#f0f9ff'}
            fontSize="11"
            fontFamily="monospace"
            fontWeight="900"
            letterSpacing="0.5"
          >
            {isCenter ? 'GCDS 1' : `SEC ${secNum}`}
          </text>
        </g>

        {/* 4. In-Game Sector VP Badge */}
        {victoryPoints > 0 && (
          <g transform={`translate(0, ${-HEX_RADIUS + 32})`} className="pointer-events-none">
            <rect
              x={-18}
              y={-7}
              width={36}
              height={14}
              rx={3.5}
              fill="#1e1b4b"
              stroke="#f59e0b"
              strokeWidth={1.2}
            />
            <text
              x={0}
              y={3.5}
              textAnchor="middle"
              fill="#fbbf24"
              fontSize="9"
              fontWeight="900"
              letterSpacing="0.3"
            >
              {`★ ${victoryPoints} VP`}
            </text>
          </g>
        )}

        {/* 5. Warp Portal Structure / Tile Icon */}
        {warpPortalPos && (
          <g
            transform={`translate(${warpPortalPos.x}, ${warpPortalPos.y})`}
            className="pointer-events-none"
          >
            <circle cx="0" cy="0" r="10" fill="#2e1065" stroke="#a855f7" strokeWidth="1.5" className="animate-pulse" />
            <circle cx="0" cy="0" r="7" fill="#3b0764" stroke="#c084fc" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx="0" cy="0" r="4" fill="#0f172a" stroke="#e9d5ff" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="1.5" fill="#f3e8ff" />
          </g>
        )}

        {/* 6. GCDS Center Defense System (001) */}
        {gcdsPos && (
          <g transform={`translate(${gcdsPos.x - 12}, ${gcdsPos.y - 12})`} className="pointer-events-none">
            <Shield className="text-purple-400" width="24" height="24" />
          </g>
        )}

        {/* 7. Guardian Ship Icon */}
        {guardianPos && (
          <g transform={`translate(${guardianPos.x}, ${guardianPos.y})`}>
            <polygon points="0,-12 11,-2 8,11 -8,11 -11,-2" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
            <polygon points="0,-6 5,0 3,6 -3,6 -5,0" fill="#f59e0b" stroke="#fef08a" strokeWidth="1" />
            <text x="0" y="18" textAnchor="middle" fill="#fde68a" fontSize="7.5" fontWeight="black" letterSpacing="0.5">
              GUARDIAN
            </text>
          </g>
        )}

        {/* 8. Ancient Ships Emblem */}
        {ancientPos && (
          <g transform={`translate(${ancientPos.x}, ${ancientPos.y})`}>
            <polygon points="0,-10 7,6 0,3 -7,6" fill="#be123c" stroke="#fb7185" strokeWidth="1.2" />
            <circle cx="0" cy="-1" r="2.2" fill="#ffffff" />
            {ancientsCount > 1 && (
              <text x="11" y="3" textAnchor="middle" fill="#fb7185" fontSize="8.5" fontWeight="bold">
                ×{ancientsCount}
              </text>
            )}
          </g>
        )}

        {/* 9. Artifact Icon (placed in dedicated non-overlapping coordinates) */}
        {artifactPos && (
          <g
            transform={`translate(${artifactPos.x}, ${artifactPos.y})`}
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

        {/* 10. Discovery Tile Icon (placed in dedicated non-overlapping coordinates) */}
        {discoveryPos && (
          <g
            transform={`translate(${discoveryPos.x}, ${discoveryPos.y})`}
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

        {/* 11. In-Game Galactic Events: Pulsar */}
        {isPulsar && (
          <g transform="translate(0, -4)" className="pointer-events-none">
            <circle cx="0" cy="0" r="10" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" className="animate-pulse" />
            <circle cx="0" cy="0" r="5" fill="#e0f2fe" />
            <text x="0" y="2" textAnchor="middle" fill="#0369a1" fontSize="7" fontWeight="bold">P</text>
            {[
              { slot: 'move', label: 'MOV', cx: 0, cy: -24 },
              { slot: 'build', label: 'BUI', cx: 22, cy: 12 },
              { slot: 'upgrade', label: 'UPG', cx: -22, cy: 12 },
            ].map((sp) => (
              <g key={sp.slot} transform={`translate(${sp.cx}, ${sp.cy})`}>
                <circle cx="0" cy="0" r="8" fill="#0f172a" stroke="#64748b" strokeWidth="1.2" />
                <text x="0" y="2.5" textAnchor="middle" fill="#94a3b8" fontSize="5.5" fontWeight="bold" fontFamily="monospace">
                  {sp.label}
                </text>
              </g>
            ))}
          </g>
        )}

        {/* 12. In-Game Galactic Events: Black Hole */}
        {isBlackHole && (
          <g transform="translate(0, -4)" className="pointer-events-none">
            <circle cx="0" cy="0" r="18" fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="4 3" className="animate-spin" />
            <circle cx="0" cy="0" r="13" fill="#1e1b4b" stroke="#a5b4fc" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="7" fill="#020617" />
            <text x="0" y="2.5" textAnchor="middle" fill="#c7d2fe" fontSize="7" fontWeight="900">BH</text>
            <rect x="-30" y="16" width="60" height="11" rx="3" fill="rgba(15, 23, 42, 0.9)" stroke="#6366f1" strokeWidth="0.8" />
            <text x="0" y="24" textAnchor="middle" fill="#c7d2fe" fontSize="6.5" fontWeight="bold">
              {secNum === 396 ? 'Ring I Return' : 'Empty Zone Return'}
            </text>
          </g>
        )}

        {/* 13. In-Game Galactic Events: Supernova */}
        {isSupernova && (
          <g transform="translate(0, -4)" className="pointer-events-none">
            <circle cx="0" cy="0" r="14" fill="#7c2d12" stroke="#ea580c" strokeWidth="1.5" className="animate-pulse" />
            <circle cx="0" cy="0" r="8" fill="#ffedd5" />
            <text x="0" y="2.5" textAnchor="middle" fill="#ea580c" fontSize="6.5" fontWeight="900">NOVA</text>
          </g>
        )}

        {/* 14. In-Game Galactic Events: Nebula (Sectors 295 & 395) - Items split into the 3 subsectors */}
        {isNebula && (
          <g className="pointer-events-none">
            {/* Dividing lines radiating from center */}
            <line x1="0" y1="0" x2={HEX_RADIUS * 0.866} y2={-HEX_RADIUS * 0.5} stroke="#10b981" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.75" />
            <line x1="0" y1="0" x2="0" y2={HEX_RADIUS * 0.9} stroke="#10b981" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.75" />
            <line x1="0" y1="0" x2={-HEX_RADIUS * 0.866} y2={-HEX_RADIUS * 0.5} stroke="#10b981" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.75" />

            {/* Subsector 1 (Top): Discovery Tile 1 */}
            <g transform="translate(0, -22)">
              <rect x="-6" y="-6" width="12" height="12" rx="2" transform="rotate(45)" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1.2" />
              <text x="0" y="3" textAnchor="middle" fill="#78350f" fontSize="7.5" fontWeight="900">★</text>
            </g>
            <g transform="translate(0, -36)">
              <rect x="-16" y="-5" width="32" height="10" rx="2.5" fill="rgba(6, 78, 59, 0.9)" stroke="#10b981" strokeWidth="0.8" />
              <text x="0" y="2.5" textAnchor="middle" fill="#a7f3d0" fontSize="5.5" fontWeight="bold">Sub 1</text>
            </g>

            {/* Subsector 2 (Bottom-Left): Discovery Tile 2 */}
            <g transform="translate(-26, 16)">
              <rect x="-6" y="-6" width="12" height="12" rx="2" transform="rotate(45)" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1.2" />
              <text x="0" y="3" textAnchor="middle" fill="#78350f" fontSize="7.5" fontWeight="900">★</text>
            </g>
            <g transform="translate(-26, 32)">
              <rect x="-16" y="-5" width="32" height="10" rx="2.5" fill="rgba(6, 78, 59, 0.9)" stroke="#10b981" strokeWidth="0.8" />
              <text x="0" y="2.5" textAnchor="middle" fill="#a7f3d0" fontSize="5.5" fontWeight="bold">Sub 2</text>
            </g>

            {/* Subsector 3 (Bottom-Right): 1 Ancient Ship */}
            <g transform="translate(26, 16)">
              <polygon points="0,-8 6,5 0,2.5 -6,5" fill="#be123c" stroke="#fb7185" strokeWidth="1" />
              <circle cx="0" cy="-0.8" r="1.8" fill="#ffffff" />
            </g>
            <g transform="translate(26, 32)">
              <rect x="-16" y="-5" width="32" height="10" rx="2.5" fill="rgba(88, 28, 28, 0.9)" stroke="#f43f5e" strokeWidth="0.8" />
              <text x="0" y="2.5" textAnchor="middle" fill="#fca5a5" fontSize="5.5" fontWeight="bold">Sub 3</text>
            </g>
          </g>
        )}

        {/* 15. In-Game Planets Display (using getPlanetSlotOffset, placed at non-overlapping posY) */}
        {planets.length > 0 && (
          <g transform={`translate(0, ${planetsPosY})`}>
            {planets.map((planet, pIdx) => {
              const { offsetX, offsetY } = getPlanetSlotOffset(pIdx, planets.length);

              const planetColor =
                planet.resource === 'money'
                  ? '#facc15'
                  : planet.resource === 'science'
                  ? '#ec4899'
                  : planet.resource === 'material'
                  ? '#854d0e'
                  : '#94a3b8';

              return (
                <g key={pIdx} transform={`translate(${offsetX}, ${offsetY})`}>
                  {planet.isAdvanced && (
                    <rect
                      x="-6.5"
                      y="-6.5"
                      width="13"
                      height="13"
                      rx="2"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="4"
                    />
                  )}
                  <rect
                    x="-6.5"
                    y="-6.5"
                    width="13"
                    height="13"
                    rx="2"
                    fill="rgba(15, 23, 42, 0.95)"
                    stroke={planetColor}
                    strokeWidth="1.6"
                  />
                  <rect
                    x="-3"
                    y="-3"
                    width="6"
                    height="6"
                    rx="1.2"
                    fill={planetColor}
                  />
                  {planet.isAdvanced && (
                    <text
                      x="6"
                      y="-6"
                      fontSize="7"
                      fontWeight="black"
                      fill="#ffffff"
                      stroke="#0a0f1d"
                      strokeWidth="0.8"
                      paintOrder="stroke fill"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="pointer-events-none select-none font-bold"
                    >
                      ★
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
};
