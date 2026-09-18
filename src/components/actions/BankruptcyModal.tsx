import React from 'react';
import { Player } from '../../engine/types/player';
import { SectorTile } from '../../engine/types/sector';
import { UPKEEP_TABLE } from '../../engine/rules/economyEngine';
import { AlertTriangle, Disc, Skull, ArrowRight, ShieldAlert, Globe } from 'lucide-react';

interface BankruptcyModalProps {
  player: Player;
  deficit: number;
  sectors: SectorTile[];
  onAbandonSector: (sectorId: string) => void;
}

export const BankruptcyModal: React.FC<BankruptcyModalProps> = ({
  player,
  deficit,
  sectors,
  onAbandonSector,
}) => {
  const controlledSectors = sectors.filter((s) => s.discOwner === player.id);

  // Calculate upkeep before and after abandoning 1 sector (returning 1 disc to track)
  const currentDiscsOnTrack = player.influenceTrack.discsOnTrack;
  const currentUpkeep = UPKEEP_TABLE[currentDiscsOnTrack] ?? 30;
  const nextUpkeep = UPKEEP_TABLE[Math.min(16, currentDiscsOnTrack + 1)] ?? 0;
  const upkeepSavings = Math.max(0, currentUpkeep - nextUpkeep);

  return (
    <div className="fixed inset-0 z-50 bg-rose-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-rose-600/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl shadow-rose-600/30 text-slate-100 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-rose-900/50 pb-4">
          <div className="p-3 bg-rose-600/20 border border-rose-600/40 rounded-xl text-rose-400">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-black tracking-wide text-rose-400">
                Tactical Bankruptcy Required
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono">
                Deficit: -{deficit} 💰
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Commander <span className="font-semibold text-slate-200">{player.name}</span>, your treasury is depleted and upkeep cannot be fully paid after emergency trade.
            </p>
          </div>
        </div>

        {/* Tactical Bankruptcy Rule Description */}
        <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-4 text-xs space-y-2 text-rose-200/90 leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-rose-300">
            <ShieldAlert className="w-4 h-4" />
            <span>Official Rule: Sector Influence Abandonment</span>
          </div>
          <p>
            You must abandon influence from your controlled sectors one by one. Removing an Influence Disc returns it to your Influence Track, saving{' '}
            <strong className="text-emerald-400 font-mono">+{upkeepSavings} 💰</strong> on upkeep!
          </p>
          <p className="text-[11px] text-rose-300/70">
            All population cubes on planets in the abandoned sector will return to your colony supply. If all sectors are abandoned and your deficit remains, your civilization collapses immediately.
          </p>
        </div>

        {/* Controlled Sectors List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            Controlled Sectors ({controlledSectors.length})
          </div>

          {controlledSectors.length === 0 ? (
            <div className="p-6 bg-slate-950/60 border border-rose-900/50 rounded-xl text-center flex flex-col items-center gap-3">
              <Skull className="w-10 h-10 text-rose-500" />
              <div>
                <p className="font-bold text-rose-400 text-sm">No Controlled Sectors Left</p>
                <p className="text-xs text-slate-400 mt-1">
                  Your civilization has no further assets or sectors to sacrifice.
                </p>
              </div>
            </div>
          ) : (
            controlledSectors.map((sector) => {
              const totalPop = sector.planets.reduce((sum, p) => sum + (p.cube ? 1 : 0), 0);
              return (
                <div
                  key={sector.id}
                  className="flex items-center justify-between p-3.5 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-rose-500/50 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] font-mono font-bold text-slate-200">
                        {sector.sectorNumber}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                        <span>Sector {sector.sectorNumber}</span>
                        {sector.victoryPoints > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                            ★ {sector.victoryPoints} VP
                          </span>
                        )}
                        {sector.hasArtifact && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                            Artifact
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Planets: {sector.planets.length}</span>
                        <span>•</span>
                        <span>Population: {totalPop} cubes</span>
                        {sector.structures?.monolith && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-400">Monolith</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAbandonSector(sector.id)}
                    className="py-2 px-3.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-500 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Disc className="w-3.5 h-3.5" />
                    <span>Abandon (-1 Disc)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
