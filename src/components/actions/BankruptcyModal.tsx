import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { SectorTile } from '../../engine/types/galaxy';
import { UPKEEP_TABLE } from '../../engine/rules/economyEngine';
import {
  AlertTriangle,
  Disc,
  Skull,
  ArrowRight,
  ShieldAlert,
  Globe,
  MapPin,
  Minimize2,
  Maximize2,
  RefreshCw,
  Coins,
} from 'lucide-react';

interface BankruptcyModalProps {
  player: PlayerState;
  deficit: number;
  sectors: SectorTile[];
  onAbandonSector: (sectorId: string) => void;
  onEmergencyTrade?: (from: 'materials' | 'science') => void;
  onSelectSector?: (sector: SectorTile) => void;
  selectedSectorId?: string | null;
}

export const BankruptcyModal: React.FC<BankruptcyModalProps> = ({
  player,
  deficit,
  sectors,
  onAbandonSector,
  onEmergencyTrade,
  onSelectSector,
  selectedSectorId,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const controlledSectors = sectors.filter((s) => s.discOwner === player.id);

  // Calculate upkeep before and after abandoning 1 sector (returning 1 disc to track)
  const currentDiscsOnTrack = player.influenceTrack.discsOnTrack;
  const currentUpkeep = UPKEEP_TABLE[currentDiscsOnTrack] ?? 30;
  const nextUpkeep = UPKEEP_TABLE[Math.min(16, currentDiscsOnTrack + 1)] ?? 0;
  const upkeepSavings = Math.max(0, currentUpkeep - nextUpkeep);

  const tradeRatio = player.faction.tradeRatio || 2;
  const canTradeMaterials = player.resources.materials >= tradeRatio;
  const canTradeScience = player.resources.science >= tradeRatio;

  // Minimized Bottom HUD Bar allows full interaction with the Galaxy Map
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="bg-slate-950/95 border-2 border-rose-600 rounded-2xl p-4 shadow-2xl shadow-rose-950/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-600/40 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-rose-400 text-sm">
                  TACTICAL BANKRUPTCY
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono font-bold">
                  Deficit: -{deficit} 💰
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Inspect map or click sectors to abandon influence. You can also trade resources.
              </p>
            </div>
          </div>

          {/* Emergency Voluntary Trade Buttons */}
          <div className="flex items-center gap-2">
            {onEmergencyTrade && (
              <>
                <button
                  type="button"
                  disabled={!canTradeMaterials}
                  onClick={() => onEmergencyTrade('materials')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-600/60 disabled:opacity-40 disabled:pointer-events-none text-amber-200 text-xs font-mono font-bold flex items-center gap-1 transition"
                  title={`Convert ${tradeRatio} Materials to +1 Money`}
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>{tradeRatio} Mat → +1💰 ({player.resources.materials})</span>
                </button>

                <button
                  type="button"
                  disabled={!canTradeScience}
                  onClick={() => onEmergencyTrade('science')}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/60 disabled:opacity-40 disabled:pointer-events-none text-cyan-200 text-xs font-mono font-bold flex items-center gap-1 transition"
                  title={`Convert ${tradeRatio} Science to +1 Money`}
                >
                  <Coins className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{tradeRatio} Sci → +1💰 ({player.resources.science})</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow transition"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expand List ({controlledSectors.length})</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900/95 border-2 border-rose-600/90 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl shadow-rose-950 text-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-900/50 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600/20 border border-rose-600/40 rounded-xl text-rose-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-display font-black tracking-wide text-rose-400">
                  Tactical Bankruptcy Required
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono font-bold">
                  Deficit: -{deficit} 💰
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Commander <span className="font-semibold text-slate-200">{player.name}</span>, your treasury is depleted. Voluntarily trade resources or abandon controlled sectors to balance upkeep.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition border border-slate-700"
            title="Minimize to inspect the Galaxy Map"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>View Map</span>
          </button>
        </div>

        {/* Voluntary Resource Trading Section */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Voluntary Emergency Resource Trade ({tradeRatio}:1)</span>
            </span>
            <span className="text-[11px] text-slate-400">
              No automatic conversion — you decide whether to sacrifice resources.
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canTradeMaterials || !onEmergencyTrade}
              onClick={() => onEmergencyTrade && onEmergencyTrade('materials')}
              className="flex-1 min-w-[200px] flex items-center justify-between px-3 py-2 rounded-lg bg-orange-950/40 hover:bg-orange-900/60 border border-orange-700/50 disabled:opacity-40 disabled:pointer-events-none text-xs text-orange-200 font-mono font-bold transition"
            >
              <span>Convert {tradeRatio} Materials → +1 Money</span>
              <span className="text-orange-400">({player.resources.materials} available)</span>
            </button>

            <button
              type="button"
              disabled={!canTradeScience || !onEmergencyTrade}
              onClick={() => onEmergencyTrade && onEmergencyTrade('science')}
              className="flex-1 min-w-[200px] flex items-center justify-between px-3 py-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-700/50 disabled:opacity-40 disabled:pointer-events-none text-xs text-cyan-200 font-mono font-bold transition"
            >
              <span>Convert {tradeRatio} Science → +1 Money</span>
              <span className="text-cyan-400">({player.resources.science} available)</span>
            </button>
          </div>
        </div>

        {/* Tactical Bankruptcy Sector Abandonment Info */}
        <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 text-xs space-y-1.5 text-rose-200/90 leading-relaxed shrink-0">
          <div className="flex items-center gap-2 font-bold text-rose-300 text-xs">
            <ShieldAlert className="w-4 h-4" />
            <span>Abandon Sector Influence (Saves +{upkeepSavings} 💰 Upkeep)</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Removing an Influence Disc returns it to your Influence Track, immediately reducing upkeep cost by{' '}
            <strong className="text-emerald-400 font-mono font-bold">+{upkeepSavings} 💰</strong>. Population cubes in the sector return to your colony supply.
          </p>
        </div>

        {/* Controlled Sectors List */}
        <div className="space-y-2 overflow-y-auto pr-1 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1 flex justify-between items-center">
            <span>Controlled Sectors ({controlledSectors.length})</span>
            <span className="text-[10px] text-slate-500 font-mono">
              Click sector to preview location on map
            </span>
          </div>

          {controlledSectors.length === 0 ? (
            <div className="p-6 bg-slate-950/60 border border-rose-900/50 rounded-xl text-center flex flex-col items-center gap-3">
              <Skull className="w-10 h-10 text-rose-500" />
              <div>
                <p className="font-bold text-rose-400 text-sm">No Controlled Sectors Left</p>
                <p className="text-xs text-slate-400 mt-1">
                  Your civilization has no further sectors or influence discs to sacrifice.
                </p>
              </div>
            </div>
          ) : (
            controlledSectors.map((sector) => {
              const totalPop = sector.planets.reduce((sum, p) => sum + (p.cube ? 1 : 0), 0);
              const isSelected = selectedSectorId === sector.id;

              return (
                <div
                  key={sector.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all gap-2 ${
                    isSelected
                      ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500'
                      : 'bg-slate-950/60 hover:bg-slate-950/90 border-slate-800 hover:border-rose-500/50'
                  }`}
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => onSelectSector && onSelectSector(sector)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] font-mono font-bold text-slate-200">
                        {sector.sectorNumber}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 text-xs sm:text-sm flex items-center gap-2">
                        <span>{sector.name || `Sector ${sector.sectorNumber}`}</span>
                        {sector.victoryPoints > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                            ★ {sector.victoryPoints} VP
                          </span>
                        )}
                        {sector.hasArtifact && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 font-mono border border-sky-700">
                            Artifact
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Ring {sector.ring}</span>
                        <span>•</span>
                        <span>{sector.planets.length} Habitats</span>
                        <span>•</span>
                        <span className="text-amber-300 font-semibold">{totalPop} Population</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {onSelectSector && (
                      <button
                        type="button"
                        onClick={() => onSelectSector(sector)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition"
                        title="Focus on Map"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onAbandonSector(sector.id)}
                      className="py-1.5 px-3 rounded-lg font-display text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Disc className="w-3.5 h-3.5" />
                      <span>Abandon Disc (+{upkeepSavings} 💰)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
