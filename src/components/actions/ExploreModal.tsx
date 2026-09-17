import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { SectorTile, HexCoord, HexEdge, PlanetResourceType } from '../../engine/types/galaxy';
import {
  areSectorsConnected,
  getEdgeBetween,
  hasWormholeOnEdge,
  getRingFromCoord,
  getHexCornerPoints,
  getHexEdgeCenter,
} from '../../engine/rules/hexMath';
import {
  Compass,
  RotateCw,
  RotateCcw,
  Check,
  X,
  ShieldAlert,
  Sparkles,
  Lock,
  Coins,
  FlaskConical,
  Hammer,
  Layers,
} from 'lucide-react';

interface ExploreModalProps {
  player: PlayerState;
  fromCoord: HexCoord;
  targetCoord: HexCoord;
  candidateTile: SectorTile;
  sourceSector: SectorTile;
  onConfirmPlacement: (rotation: number, claimInfluence: boolean) => void;
  onDiscard: () => void;
  onClose: () => void;
}

export const ExploreModal: React.FC<ExploreModalProps> = ({
  player,
  fromCoord,
  targetCoord,
  candidateTile,
  sourceSector,
  onConfirmPlacement,
  onDiscard,
  onClose,
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const [claimInfluence, setClaimInfluence] = useState<boolean>(true);

  // Simulated rotated tile to test connection
  const simulatedTile: SectorTile = {
    ...candidateTile,
    rotation,
    coord: targetCoord,
  };

  const hasWormholeGen = player.techTrack.researched.some((t) => t.id === 'wormhole_generator');
  const isConnected = areSectorsConnected(sourceSector, simulatedTile, hasWormholeGen);
  const edgeToSource = getEdgeBetween(targetCoord, fromCoord);
  const ring = getRingFromCoord(targetCoord);

  // Player researched advanced techs
  const hasAdvancedEconomy = player.techTrack.researched.some(
    (t) => t.id === 'advanced_economy' || t.id === 'metasynthesis'
  );
  const hasAdvancedLabs = player.techTrack.researched.some(
    (t) => t.id === 'advanced_labs' || t.id === 'metasynthesis'
  );
  const hasAdvancedMining = player.techTrack.researched.some(
    (t) => t.id === 'advanced_mining' || t.id === 'metasynthesis'
  );

  const getPlanetMeta = (resource: PlanetResourceType) => {
    switch (resource) {
      case 'money':
        return {
          name: 'Money (Yellow)',
          color: '#facc15',
          bgClass: 'bg-yellow-400',
          borderClass: 'border-yellow-500/50',
          textClass: 'text-yellow-400',
          icon: <Coins className="w-4 h-4 text-yellow-400" />,
          techName: 'Advanced Economy',
          hasTech: hasAdvancedEconomy,
        };
      case 'science':
        return {
          name: 'Science (Pink)',
          color: '#ec4899',
          bgClass: 'bg-pink-500',
          borderClass: 'border-pink-500/50',
          textClass: 'text-pink-400',
          icon: <FlaskConical className="w-4 h-4 text-pink-400" />,
          techName: 'Advanced Labs',
          hasTech: hasAdvancedLabs,
        };
      case 'material':
        return {
          name: 'Materials (Brown)',
          color: '#854d0e',
          bgClass: 'bg-amber-900',
          borderClass: 'border-amber-700/50',
          textClass: 'text-amber-400',
          icon: <Hammer className="w-4 h-4 text-amber-500" />,
          techName: 'Advanced Mining',
          hasTech: hasAdvancedMining,
        };
      default:
        return {
          name: 'Wild / Any Resource',
          color: '#94a3b8',
          bgClass: 'bg-slate-500',
          borderClass: 'border-slate-500/50',
          textClass: 'text-slate-300',
          icon: <Sparkles className="w-4 h-4 text-slate-300" />,
          techName: 'Metasynthesis',
          hasTech: true,
        };
    }
  };

  const canClaimDisc =
    candidateTile.ancientsCount === 0 &&
    player.influenceTrack.discsOnTrack > 0 &&
    claimInfluence;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-100 font-display">
                  EXPLORING GALAXY RING {ring}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">
                  SEC {candidateTile.sectorNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Align wormholes to connect with your origin sector, review habitable planets, and choose to place or discard.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 flex flex-col items-center overflow-y-auto space-y-4">
          {/* SVG Hexagon Preview with authentic components */}
          <div className="relative w-56 h-56 flex items-center justify-center bg-slate-950 rounded-2xl border-2 border-slate-700 p-2 shadow-inner shrink-0">
            <svg viewBox="0 0 150 150" className="w-full h-full">
              {/* Hexagon Body */}
              <polygon
                points={getHexCornerPoints(75, 75, 62)}
                fill="rgba(30, 41, 59, 0.95)"
                stroke={isConnected ? '#38bdf8' : '#f43f5e'}
                strokeWidth="2.5"
              />

              {/* Wormholes on edges */}
              {([0, 1, 2, 3, 4, 5] as HexEdge[]).map((edge) => {
                const hasWormhole = hasWormholeOnEdge(simulatedTile, edge);
                if (!hasWormhole) return null;
                const edgePos = getHexEdgeCenter(75, 75, 62, edge);
                const isFacingSource = edgeToSource !== null && edge === edgeToSource;
                const isConnecting = isFacingSource && isConnected;

                return (
                  <g
                    key={`preview_wh_${edge}`}
                    transform={`translate(${edgePos.x}, ${edgePos.y}) rotate(${edgePos.angle})`}
                  >
                    {/* Semicircle curving INWARD into the hex towards local -X */}
                    <path
                      d="M 0 -12 A 12 12 0 0 0 0 12 Z"
                      fill={isConnecting ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.25)'}
                      stroke="#ffffff"
                      strokeWidth={isConnecting ? '2.5' : '2'}
                      strokeDasharray={isConnecting ? undefined : '3 2'}
                    />
                    <path
                      d="M 0 -6 A 6 6 0 0 0 0 6"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {/* Sector Header Info */}
              <text
                x="75"
                y="45"
                textAnchor="middle"
                fill="#f1f5f9"
                fontSize="11"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                SEC {candidateTile.sectorNumber}
              </text>
              <text
                x="75"
                y="57"
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="9"
                fontWeight="bold"
              >
                {candidateTile.victoryPoints} VP
              </text>

              {/* Center Badges: Ancients / Discovery / Artifact */}
              {candidateTile.ancientsCount > 0 && (
                <g transform="translate(75, 73)">
                  <circle cx="0" cy="0" r="10" fill="rgba(244, 63, 94, 0.25)" stroke="#f43f5e" strokeWidth="1.5" />
                  <text x="0" y="3.5" textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="bold">
                    {candidateTile.ancientsCount} ⚔
                  </text>
                </g>
              )}

              {candidateTile.hasDiscovery && (
                <g transform={`translate(${candidateTile.ancientsCount > 0 ? 98 : candidateTile.hasArtifact ? 86 : 75}, 73)`}>
                  <rect x="-6" y="-6" width="12" height="12" rx="2" transform="rotate(45)" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1.2" />
                  <text x="0" y="3" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="900">
                    ★
                  </text>
                </g>
              )}

              {candidateTile.hasArtifact && (
                <g transform={`translate(${candidateTile.ancientsCount > 0 ? 52 : candidateTile.hasDiscovery ? 64 : 75}, 73)`}>
                  <polygon points="0,-6 6,0 0,6 -6,0" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />
                  <text x="0" y="2.5" textAnchor="middle" fill="#f0f9ff" fontSize="6.5" fontWeight="bold">
                    A
                  </text>
                </g>
              )}

              {/* Habitable Planet Slots Rendered in SVG */}
              {candidateTile.planets.length === 0 ? (
                <text x="75" y="98" textAnchor="middle" fill="#64748b" fontSize="8" fontStyle="italic">
                  Deep Space
                </text>
              ) : (
                <g
                  transform={`translate(75, ${
                    candidateTile.ancientsCount > 0 || candidateTile.hasDiscovery || candidateTile.hasArtifact
                      ? 100
                      : 88
                  })`}
                >
                  {candidateTile.planets.map((planet, pIdx) => {
                    const total = candidateTile.planets.length;
                    const isMultiRow = total > 3;
                    const row = isMultiRow ? Math.floor(pIdx / 3) : 0;
                    const col = isMultiRow ? pIdx % 3 : pIdx;
                    const countInRow = isMultiRow ? (row === 0 ? Math.min(3, total) : total - 3) : total;
                    const offsetX = (col - (countInRow - 1) / 2) * 19;
                    const offsetY = isMultiRow ? (row === 0 ? -9 : 10) : 0;

                    const color =
                      planet.resource === 'money'
                        ? '#facc15'
                        : planet.resource === 'science'
                        ? '#ec4899'
                        : planet.resource === 'material'
                        ? '#854d0e'
                        : '#94a3b8';

                    return (
                      <g key={planet.id || pIdx} transform={`translate(${offsetX}, ${offsetY})`}>
                        {/* Outer ring: Distinct white collar for Advanced squares matching physical game */}
                        <circle
                          cx="0"
                          cy="0"
                          r={planet.isAdvanced ? '8.5' : '7'}
                          fill="rgba(15, 23, 42, 0.95)"
                          stroke={planet.isAdvanced ? '#ffffff' : color}
                          strokeWidth={planet.isAdvanced ? '2.2' : '1.8'}
                        />
                        {/* Inner resource core */}
                        <circle cx="0" cy="0" r="3.2" fill={color} />
                        {/* Advanced dashed accent ring */}
                        {planet.isAdvanced && (
                          <circle
                            cx="0"
                            cy="0"
                            r="5.2"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="0.8"
                            strokeDasharray="2 1"
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>
          </div>

          {/* Rotation Controls and Connection Feedback */}
          <div className="w-full flex flex-col items-center gap-2">
            <div className="flex gap-3">
              <button
                onClick={() => setRotation((r) => ((r - 1 + 6) % 6))}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" /> Rotate CCW
              </button>
              <button
                onClick={() => setRotation((r) => ((r + 1) % 6))}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors shadow-sm"
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan-400" /> Rotate CW
              </button>
            </div>

            <div
              className={`w-full text-center py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                isConnected
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              {isConnected
                ? '✓ Wormhole Aligned & Connected to Origin Sector'
                : '✗ Wormholes Not Connected (Rotate sector tile to face origin wormhole)'}
            </div>
          </div>

          {/* Population Slots & Tech Requirement Breakdown */}
          <div className="w-full bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                Habitable Population Slots ({candidateTile.planets.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Colony Ships Ready:{' '}
                <strong className={player.colonyShips.ready > 0 ? 'text-cyan-300' : 'text-amber-400'}>
                  {player.colonyShips.ready} / {player.colonyShips.total}
                </strong>
              </span>
            </div>

            {candidateTile.planets.length === 0 ? (
              <div className="text-center py-3 text-slate-500 text-xs italic">
                This sector has no habitable planet squares (deep space).
              </div>
            ) : (
              <div className="space-y-2">
                {candidateTile.planets.map((planet, pIdx) => {
                  const meta = getPlanetMeta(planet.resource);

                  return (
                    <div
                      key={planet.id || pIdx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                        planet.isAdvanced
                          ? meta.hasTech
                            ? 'bg-slate-900/90 border-slate-700/80'
                            : 'bg-rose-950/20 border-rose-800/40'
                          : 'bg-slate-900/80 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg border ${meta.borderClass} ${meta.bgClass}/20`}>
                          {meta.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-xs ${meta.textClass}`}>
                              {meta.name}
                            </span>
                            {planet.isAdvanced ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase font-mono bg-slate-800 border border-slate-600 text-slate-100 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                ADVANCED
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase font-mono bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                                STANDARD
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {planet.isAdvanced ? (
                              <span>
                                Requires Tech: <strong className="text-slate-200">{meta.techName}</strong>
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                Colonizable immediately with ready Colony Ship
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Commander Readiness Status */}
                      <div className="text-right">
                        {planet.isAdvanced ? (
                          meta.hasTech ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded-lg">
                              <Check className="w-3 h-3 text-emerald-400" /> Tech Owned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/70 border border-rose-800/60 px-2 py-0.5 rounded-lg">
                              <Lock className="w-3 h-3 text-rose-400" /> Need {meta.techName}
                            </span>
                          )
                        ) : player.colonyShips.ready > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded-lg">
                            <Check className="w-3 h-3 text-emerald-400" /> Ready to Colonize
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-lg">
                            No Ships Ready
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sector Defenses & Features */}
          {(candidateTile.ancientsCount > 0 || candidateTile.hasDiscovery || candidateTile.hasArtifact) && (
            <div className="w-full space-y-2">
              {candidateTile.ancientsCount > 0 && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/60 flex items-start gap-2.5 text-rose-300 text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-rose-200">
                      Guarded by {candidateTile.ancientsCount} Ancient Ship{candidateTile.ancientsCount > 1 ? 's' : ''}!
                    </strong>
                    <div className="text-[11px] text-rose-300/80 mt-0.5">
                      Sector is hostile. Influence Disc cannot be placed and planets cannot be colonized until the Ancients are defeated in the Combat phase.
                    </div>
                  </div>
                </div>
              )}

              {candidateTile.hasDiscovery && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 flex items-start gap-2.5 text-amber-300 text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-200">Discovery Tile Present</strong>
                    <div className="text-[11px] text-amber-300/80 mt-0.5">
                      A face-down Discovery Tile will be drawn and placed here upon placement, ready to be claimed when the sector is secured.
                    </div>
                  </div>
                </div>
              )}

              {candidateTile.hasArtifact && (
                <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-800/60 flex items-start gap-2.5 text-sky-300 text-xs">
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sky-200">Planetary Artifact (+1 VP)</strong>
                    <div className="text-[11px] text-sky-300/80 mt-0.5">
                      Grants 1 VP at game end and bonus resources when activated with the Artifact Key technology.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Influence Disc Claim Option */}
          {candidateTile.ancientsCount === 0 ? (
            <div className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={claimInfluence}
                  disabled={player.influenceTrack.discsOnTrack === 0}
                  onChange={(e) => setClaimInfluence(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4"
                />
                <div>
                  <span className="font-bold">Claim Sector with Influence Disc</span>
                  <div className="text-[10px] text-slate-400">
                    Place 1 disc from your Influence Track to establish control immediately.
                  </div>
                </div>
              </label>

              <span className="text-[11px] font-mono text-cyan-400">
                {player.influenceTrack.discsOnTrack} Discs Left
              </span>
            </div>
          ) : (
            <div className="w-full p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 italic text-center">
              ⚠️ Influence Disc cannot be placed while hostile Ancient ships occupy the sector.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
          <button
            onClick={onDiscard}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 text-xs font-semibold border border-slate-700 transition-colors"
          >
            Discard Tile (Face Down, 0 Credits)
          </button>
          <button
            disabled={!isConnected}
            onClick={() => onConfirmPlacement(rotation, canClaimDisc)}
            className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs tracking-wide shadow-lg transition-all"
          >
            Confirm Placement
          </button>
        </div>
      </div>
    </div>
  );
};

