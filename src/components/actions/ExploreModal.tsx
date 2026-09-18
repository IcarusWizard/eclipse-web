import React, { useState, useEffect } from 'react';
import { PlayerState } from '../../engine/types/player';
import { SectorTile, HexCoord, PlanetResourceType } from '../../engine/types/galaxy';
import {
  areSectorsConnected,
  getRingFromCoord,
  findLegalExploreRotation,
  findNextLegalExploreRotation,
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
} from 'lucide-react';

interface ExploreModalProps {
  player: PlayerState;
  fromCoord: HexCoord;
  targetCoord: HexCoord;
  candidateTile: SectorTile;
  candidateTiles?: SectorTile[];
  sourceSector: SectorTile;
  rotation: number;
  onRotate: (newRotation: number | ((prev: number) => number)) => void;
  onConfirmPlacement: (rotation: number, claimInfluence: boolean, chosenTileIndex?: number) => void;
  onDiscard: (chosenTileIndex?: number) => void;
  onClose: () => void;
}

export const ExploreModal: React.FC<ExploreModalProps> = ({
  player,
  targetCoord,
  candidateTile,
  candidateTiles,
  sourceSector,
  rotation,
  onRotate,
  onConfirmPlacement,
  onDiscard,
  onClose,
}) => {
  const isDraco = player.faction.id === 'descendants_of_draco';
  const hasDracoChoice = isDraco && candidateTiles && candidateTiles.length >= 2;
  const [selectedDracoIndex, setSelectedDracoIndex] = useState<number>(0);

  const activeTile = hasDracoChoice ? candidateTiles![selectedDracoIndex]! : candidateTile;

  const [claimInfluence, setClaimInfluence] = useState<boolean>(true);
  const [hoveredPlanet, setHoveredPlanet] = useState<number | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<'ancient' | 'discovery' | 'artifact' | null>(null);

  // Simulated rotated tile to test connection
  const simulatedTile: SectorTile = {
    ...activeTile,
    rotation,
    coord: targetCoord,
  };

  const hasWormholeGen = player.techTrack.researched.some((t) => t.id === 'wormhole_generator');
  const isConnected = areSectorsConnected(sourceSector, simulatedTile, hasWormholeGen);
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
          name: 'Yellow Money',
          color: '#facc15',
          borderClass: 'border-yellow-400',
          textClass: 'text-yellow-400',
          icon: <Coins className="w-3.5 h-3.5 text-yellow-400" />,
          techName: 'Advanced Economy',
          hasTech: hasAdvancedEconomy,
        };
      case 'science':
        return {
          name: 'Pink Science',
          color: '#ec4899',
          borderClass: 'border-pink-500',
          textClass: 'text-pink-400',
          icon: <FlaskConical className="w-3.5 h-3.5 text-pink-400" />,
          techName: 'Advanced Labs',
          hasTech: hasAdvancedLabs,
        };
      case 'material':
        return {
          name: 'Brown Materials',
          color: '#854d0e',
          borderClass: 'border-amber-700',
          textClass: 'text-amber-400',
          icon: <Hammer className="w-3.5 h-3.5 text-amber-500" />,
          techName: 'Advanced Mining',
          hasTech: hasAdvancedMining,
        };
      default:
        return {
          name: 'Wild / Any',
          color: '#94a3b8',
          borderClass: 'border-slate-500',
          textClass: 'text-slate-300',
          icon: <Sparkles className="w-3.5 h-3.5 text-slate-300" />,
          techName: 'Metasynthesis',
          hasTech: true,
        };
    }
  };

  const canClaimDisc =
    (activeTile.ancientsCount === 0 || isDraco) &&
    player.influenceTrack.discsOnTrack > 0 &&
    claimInfluence;

  // Ensure tile starts at a legal orientation on mount if not already connected
  useEffect(() => {
    if (!isConnected) {
      const legal = findLegalExploreRotation(
        sourceSector,
        activeTile,
        targetCoord,
        hasWormholeGen
      );
      if (legal !== rotation) {
        onRotate(legal);
      }
    }
  }, [activeTile.id, targetCoord.q, targetCoord.r]);

  // Keyboard shortcut support: R to rotate, Enter to confirm, Esc to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (e.shiftKey) {
          onRotate((r) => ((r - 1 + 6) % 6));
        } else {
          onRotate((r) => ((r + 1) % 6));
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        onRotate((r) => ((r + 1) % 6));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        onRotate((r) => ((r - 1 + 6) % 6));
      } else if (e.key === 'Enter') {
        if (isConnected) {
          e.preventDefault();
          onConfirmPlacement(rotation, canClaimDisc);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnected, rotation, canClaimDisc, onRotate, onConfirmPlacement, onClose]);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 pointer-events-none">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-visible text-slate-100 p-3.5 pointer-events-auto flex flex-col gap-2.5 transition-all">
        {/* Draco 2-Tile Pick Ability Banner */}
        {hasDracoChoice && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-950/50 border border-amber-500/50 text-xs">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Draco Ability: Choose 1 of 2 revealed tiles:</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {candidateTiles!.map((tile, idx) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => {
                    setSelectedDracoIndex(idx);
                    const legal = findLegalExploreRotation(sourceSector, tile, targetCoord, hasWormholeGen);
                    onRotate(legal);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedDracoIndex === idx
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 ring-2 ring-amber-300 font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>Tile {idx + 1}:</span>
                  <span className="font-mono">SEC {tile.sectorNumber}</span>
                  <span className="text-[10px] opacity-80">({tile.victoryPoints} VP)</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-xs font-black tracking-wide text-slate-200">
              EXPLORING RING {ring}
            </span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">
              SEC {activeTile.sectorNumber}
            </span>
            <span className="text-[11px] font-bold text-cyan-400">
              {activeTile.victoryPoints} VP
            </span>
          </div>

          {/* Connection Status & Rotation Controls */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (!isConnected) {
                  const nextLegal = findNextLegalExploreRotation(
                    sourceSector,
                    activeTile,
                    targetCoord,
                    rotation,
                    hasWormholeGen
                  );
                  onRotate(nextLegal);
                }
              }}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 transition-all ${
                isConnected
                  ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300 cursor-default'
                  : 'bg-rose-950/60 border-rose-700/80 text-rose-300 hover:bg-rose-900/80 cursor-pointer animate-pulse'
              }`}
              title={isConnected ? 'Wormholes Connected' : 'Click to snap to next legal rotation'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {isConnected ? 'Wormholes Connected' : 'Rotate to Connect'}
            </button>

            {/* Rotation Buttons */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => onRotate((r) => ((r - 1 + 6) % 6))}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
                title="Rotate CCW (Shift+R / ←)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-slate-400 px-1 font-bold">
                {rotation * 60}°
              </span>
              <button
                onClick={() => onRotate((r) => ((r + 1) % 6))}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
                title="Rotate CW (R / →)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cancel Button */}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Cancel Explore (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Shrunk Compact Info Row with Hover Tooltips */}
        <div className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-3.5 flex-wrap">
            {/* Habitats Group */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">Habitats:</span>
              {activeTile.planets.length === 0 ? (
                <span className="text-[11px] text-slate-500 italic">None (Deep Space)</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  {activeTile.planets.map((planet, pIdx) => {
                    const meta = getPlanetMeta(planet.resource);
                    return (
                      <div
                        key={planet.id || pIdx}
                        className="relative"
                        onMouseEnter={() => setHoveredPlanet(pIdx)}
                        onMouseLeave={() => setHoveredPlanet(null)}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 border ${
                            planet.isAdvanced
                              ? 'border-white ring-1 ring-white/50 bg-slate-950 shadow-sm'
                              : `${meta.borderClass} bg-slate-950`
                          }`}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          {planet.isAdvanced && (
                            <span className="absolute -top-1 -right-1 text-[8px] font-black text-white bg-slate-900 rounded-full px-0.5 border border-white/60 leading-tight">
                              ★
                            </span>
                          )}
                        </div>

                        {/* Rich Hover Tooltip */}
                        {hoveredPlanet === pIdx && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 p-2.5 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl text-left z-50 pointer-events-none">
                            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                              <span className={`text-xs font-bold ${meta.textClass} flex items-center gap-1.5`}>
                                {meta.icon}
                                {meta.name}
                              </span>
                              {planet.isAdvanced ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono font-bold border border-slate-600">
                                  ★ ADVANCED
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-800">
                                  STANDARD
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-300 space-y-1.5">
                              {planet.isAdvanced ? (
                                <div>
                                  <div className="text-slate-400">
                                    Requires Tech: <strong className="text-slate-100">{meta.techName}</strong>
                                  </div>
                                  <div className="mt-1">
                                    {meta.hasTech ? (
                                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5" /> Researched (Ready to Colonize)
                                      </span>
                                    ) : (
                                      <span className="text-rose-400 font-medium flex items-center gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Need {meta.techName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-slate-400">
                                  Standard colony square. Can be settled immediately with any ready Colony Ship!
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Features & Defenses (Ancients, Discovery, Artifact) */}
            {(activeTile.ancientsCount > 0 ||
              activeTile.hasDiscovery ||
              activeTile.hasArtifact) && (
              <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                {activeTile.ancientsCount > 0 && (
                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredFeature('ancient')}
                    onMouseLeave={() => setHoveredFeature(null)}
                  >
                    <div className="px-2 py-0.5 rounded-lg bg-rose-950/70 border border-rose-800/80 text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-rose-900/60 transition-colors">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      {activeTile.ancientsCount} Ancient{activeTile.ancientsCount > 1 ? 's' : ''}
                    </div>
                    {hoveredFeature === 'ancient' && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-2.5 rounded-xl bg-slate-950 border border-rose-800 shadow-2xl text-left z-50 pointer-events-none">
                        <div className="text-xs font-bold text-rose-300 mb-1 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                          Guarded by {activeTile.ancientsCount} Ancient Ship{activeTile.ancientsCount > 1 ? 's' : ''}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">
                          {isDraco
                            ? 'Descendants of Draco coexist peacefully with Ancients and may place an Influence Disc immediately!'
                            : 'Sector is hostile. You cannot place an Influence Disc or colonize planets until Ancient ships are defeated in the Combat Phase.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTile.hasDiscovery && (
                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredFeature('discovery')}
                    onMouseLeave={() => setHoveredFeature(null)}
                  >
                    <div className="px-2 py-0.5 rounded-lg bg-amber-950/70 border border-amber-800/80 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-amber-900/60 transition-colors">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Discovery
                    </div>
                    {hoveredFeature === 'discovery' && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-2.5 rounded-xl bg-slate-950 border border-amber-800 shadow-2xl text-left z-50 pointer-events-none">
                        <div className="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Ancient Discovery Tile
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">
                          A face-down Discovery Tile will be drawn here. Secure the sector to unlock Ancient Tech, a free Cruiser, or +2 VP!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTile.hasArtifact && (
                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredFeature('artifact')}
                    onMouseLeave={() => setHoveredFeature(null)}
                  >
                    <div className="px-2 py-0.5 rounded-lg bg-sky-950/70 border border-sky-800/80 text-sky-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-sky-900/60 transition-colors">
                      <span className="font-mono font-bold text-[10px] text-sky-400">[A]</span>
                      Artifact
                    </div>
                    {hoveredFeature === 'artifact' && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-2.5 rounded-xl bg-slate-950 border border-sky-800 shadow-2xl text-left z-50 pointer-events-none">
                        <div className="text-xs font-bold text-sky-300 mb-1 flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[10px] text-sky-400">[A]</span>
                          Planetary Artifact
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">
                          Ancient alien structure. Yields 0 VP on its own, but activates for a bonus of 5 resources when researching the <strong>Artifact Key</strong> technology.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Compact Influence Disc Option */}
          {activeTile.ancientsCount === 0 || isDraco ? (
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer shrink-0 select-none bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={claimInfluence}
                disabled={player.influenceTrack.discsOnTrack === 0}
                onChange={(e) => setClaimInfluence(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Place Influence Disc</span>
              {isDraco && activeTile.ancientsCount > 0 && (
                <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/80">
                  🐉 Ancient Coexistence
                </span>
              )}
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                ({player.influenceTrack.discsOnTrack} avail)
              </span>
            </label>
          ) : (
            <div className="text-[11px] text-rose-400/90 font-medium shrink-0 flex items-center gap-1 bg-rose-950/30 px-2 py-0.5 rounded-lg border border-rose-900/50">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Hostile Sector (No disc)
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="font-mono text-slate-500 text-[10px]">Controls:</span>
            <span>Click hex on map or press <kbd className="px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded font-mono text-[10px] border border-slate-700 font-bold">R</kbd> to rotate</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDiscard(hasDracoChoice ? selectedDracoIndex : undefined)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 hover:border-rose-800 text-xs font-semibold border border-slate-700 transition-colors"
            >
              Discard Tile (0 Credits)
            </button>
            <button
              disabled={!isConnected}
              onClick={() => onConfirmPlacement(rotation, canClaimDisc, hasDracoChoice ? selectedDracoIndex : undefined)}
              className="px-5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs tracking-wide shadow-lg transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Confirm Placement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
