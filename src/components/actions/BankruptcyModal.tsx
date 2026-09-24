import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { SectorTile } from '../../engine/types/galaxy';
import { UPKEEP_TABLE, abandonSectorForUpkeep } from '../../engine/rules/economyEngine';
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
  RotateCcw,
  Coins,
  CheckCircle2,
  Check,
  Undo2,
} from 'lucide-react';

interface BankruptcyModalProps {
  player: PlayerState;
  deficit: number;
  sectors: SectorTile[];
  onAbandonSector: (sectorId: string) => void;
  onEmergencyTrade?: (from: 'materials' | 'science') => void;
  onSelectSector?: (sector: SectorTile) => void;
  selectedSectorId?: string | null;
  onConfirmPlan?: (plan: { trades: { materials: number; science: number }; abandonedSectorIds: string[] }) => void;
  onResetPlan?: () => void;
}

export const BankruptcyModal: React.FC<BankruptcyModalProps> = ({
  player,
  deficit,
  sectors,
  onAbandonSector,
  onEmergencyTrade,
  onSelectSector,
  selectedSectorId,
  onConfirmPlan,
  onResetPlan,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [stagedTrades, setStagedTrades] = useState<{ materials: number; science: number }>({
    materials: 0,
    science: 0,
  });
  const [stagedAbandonedSectorIds, setStagedAbandonedSectorIds] = useState<string[]>([]);

  const controlledSectors = sectors.filter((s) => s.discOwner === player.id);
  const tradeRatio = player.faction.tradeRatio || 2;

  // Staged simulation using official upkeep and sector abandonment logic
  const simulation = React.useMemo(() => {
    let simPlayer: PlayerState = JSON.parse(JSON.stringify(player));
    let simSectors: SectorTile[] = JSON.parse(JSON.stringify(sectors));
    let totalSavedUpkeep = 0;

    // Apply staged trades
    const matTraded = stagedTrades.materials;
    const sciTraded = stagedTrades.science;
    simPlayer.resources.materials -= matTraded * tradeRatio;
    simPlayer.resources.science -= sciTraded * tradeRatio;
    simPlayer.resources.money += matTraded + sciTraded;

    // Apply staged sector abandonments in sequence
    for (const secId of stagedAbandonedSectorIds) {
      const sec = simSectors.find((s) => s.id === secId);
      if (sec && sec.discOwner === simPlayer.id) {
        const { updatedPlayer, savedUpkeep } = abandonSectorForUpkeep(simPlayer, sec);
        simPlayer = updatedPlayer;
        totalSavedUpkeep += savedUpkeep;
      }
    }

    const projectedDeficit = simPlayer.resources.money < 0 ? Math.abs(simPlayer.resources.money) : 0;
    const isSolvent = simPlayer.resources.money >= 0;

    return {
      simPlayer,
      simSectors,
      totalSavedUpkeep,
      projectedDeficit,
      isSolvent,
    };
  }, [player, sectors, stagedTrades, stagedAbandonedSectorIds, tradeRatio]);

  const canTradeMaterials = simulation.simPlayer.resources.materials >= tradeRatio;
  const canTradeScience = simulation.simPlayer.resources.science >= tradeRatio;
  const hasStagedDecisions =
    stagedTrades.materials > 0 || stagedTrades.science > 0 || stagedAbandonedSectorIds.length > 0;

  const handleStageTrade = (from: 'materials' | 'science', delta: 1 | -1) => {
    setStagedTrades((prev) => ({
      ...prev,
      [from]: Math.max(0, prev[from] + delta),
    }));
  };

  const handleToggleAbandonSector = (sectorId: string) => {
    setStagedAbandonedSectorIds((prev) =>
      prev.includes(sectorId) ? prev.filter((id) => id !== sectorId) : [...prev, sectorId]
    );
  };

  const handleResetDecisions = () => {
    setStagedTrades({ materials: 0, science: 0 });
    setStagedAbandonedSectorIds([]);
    if (onResetPlan) onResetPlan();
  };

  const canConfirm =
    simulation.isSolvent ||
    (controlledSectors.length > 0 && stagedAbandonedSectorIds.length === controlledSectors.length) ||
    controlledSectors.length === 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    if (onConfirmPlan) {
      onConfirmPlan({
        trades: stagedTrades,
        abandonedSectorIds: stagedAbandonedSectorIds,
      });
    } else {
      // Fallback
      for (let i = 0; i < stagedTrades.materials; i++) {
        onEmergencyTrade?.('materials');
      }
      for (let i = 0; i < stagedTrades.science; i++) {
        onEmergencyTrade?.('science');
      }
      for (const id of stagedAbandonedSectorIds) {
        onAbandonSector(id);
      }
    }
  };

  // Upkeep savings for abandoning 1 more sector from current simulation point
  const currentSimDiscs = simulation.simPlayer.influenceTrack.discsOnTrack;
  const currentSimUpkeep = UPKEEP_TABLE[currentSimDiscs] ?? 30;
  const nextSimUpkeep = UPKEEP_TABLE[Math.min(16, currentSimDiscs + 1)] ?? 0;
  const nextUpkeepSavings = Math.max(0, currentSimUpkeep - nextSimUpkeep);

  // Minimized Bottom HUD Bar allows full interaction with the Galaxy Map
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div
          className={`bg-slate-950/95 border-2 ${
            simulation.isSolvent ? 'border-emerald-500' : 'border-rose-600'
          } rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-slate-100`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                simulation.isSolvent
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40'
                  : 'bg-rose-600/20 text-rose-400 border border-rose-600/40'
              } shrink-0`}
            >
              {simulation.isSolvent ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-display font-black text-sm ${
                    simulation.isSolvent ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {simulation.isSolvent ? 'DEFICIT RESOLVED' : 'TACTICAL BANKRUPTCY'}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                    simulation.isSolvent
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                  }`}
                >
                  Projected: {simulation.isSolvent ? '0 (Solvent)' : `-${simulation.projectedDeficit}`} 💰
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Staged: {stagedAbandonedSectorIds.length} sectors, {stagedTrades.materials + stagedTrades.science} trades. Reset decision or confirm when satisfied.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!hasStagedDecisions}
              onClick={handleResetDecisions}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition border border-slate-700"
              title="Reset all staged trades and sector abandonment decisions"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              disabled={!canConfirm}
              onClick={handleConfirm}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow transition disabled:opacity-40 disabled:pointer-events-none ${
                simulation.isSolvent
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow transition ml-1"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expand ({controlledSectors.length})</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border-2 border-rose-600/90 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl shadow-rose-950 text-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-900/50 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600/20 border border-rose-600/40 rounded-xl text-rose-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={`text-lg sm:text-xl font-display font-black tracking-wide ${
                    simulation.isSolvent ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {simulation.isSolvent ? 'Deficit Resolved — Solvency Restored!' : 'Tactical Bankruptcy Required'}
                </h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                    simulation.isSolvent
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                  }`}
                >
                  Deficit: {simulation.isSolvent ? '0 (Solvent)' : `-${simulation.projectedDeficit}`} 💰
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Stage resource trades or sector abandonments. You can{' '}
                <strong className="text-amber-300">reset decisions</strong> at any time before confirming.
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
              Decide how many resources to trade into money.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Materials Trade Card */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-orange-950/30 border border-orange-700/50 text-xs">
              <div>
                <div className="text-orange-200 font-bold font-mono">
                  {tradeRatio} Mat → +1 💰
                </div>
                <div className="text-[10px] text-orange-400/80 font-mono">
                  Avail: {simulation.simPlayer.resources.materials} (Staged: +{stagedTrades.materials} 💰)
                </div>
              </div>
              <div className="flex items-center gap-1">
                {stagedTrades.materials > 0 && (
                  <button
                    type="button"
                    onClick={() => handleStageTrade('materials', -1)}
                    className="p-1 px-2 rounded bg-orange-900/80 hover:bg-orange-800 text-orange-200 text-xs font-bold transition flex items-center gap-0.5"
                    title="Undo 1 trade"
                  >
                    <Undo2 className="w-3 h-3" /> -1
                  </button>
                )}
                <button
                  type="button"
                  disabled={!canTradeMaterials}
                  onClick={() => handleStageTrade('materials', 1)}
                  className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:pointer-events-none text-white font-bold text-xs transition"
                >
                  +1 💰
                </button>
              </div>
            </div>

            {/* Science Trade Card */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/30 border border-cyan-700/50 text-xs">
              <div>
                <div className="text-cyan-200 font-bold font-mono">
                  {tradeRatio} Sci → +1 💰
                </div>
                <div className="text-[10px] text-cyan-400/80 font-mono">
                  Avail: {simulation.simPlayer.resources.science} (Staged: +{stagedTrades.science} 💰)
                </div>
              </div>
              <div className="flex items-center gap-1">
                {stagedTrades.science > 0 && (
                  <button
                    type="button"
                    onClick={() => handleStageTrade('science', -1)}
                    className="p-1 px-2 rounded bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 text-xs font-bold transition flex items-center gap-0.5"
                    title="Undo 1 trade"
                  >
                    <Undo2 className="w-3 h-3" /> -1
                  </button>
                )}
                <button
                  type="button"
                  disabled={!canTradeScience}
                  onClick={() => handleStageTrade('science', 1)}
                  className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:pointer-events-none text-white font-bold text-xs transition"
                >
                  +1 💰
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Bankruptcy Sector Abandonment Info */}
        <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 text-xs space-y-1 text-rose-200/90 leading-relaxed shrink-0">
          <div className="flex items-center justify-between font-bold text-rose-300 text-xs">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>Select Sectors to Abandon</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              Next Disc Saves: +{nextUpkeepSavings} 💰 Upkeep
            </span>
          </div>
          <p className="text-[11px] text-slate-300">
            Click a sector to mark it for abandonment. You can unmark or reset before confirming.
          </p>
        </div>

        {/* Controlled Sectors List */}
        <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-[160px]">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1 flex justify-between items-center">
            <span>Controlled Sectors ({controlledSectors.length})</span>
            <span className="text-[10px] text-slate-500 font-mono">
              {stagedAbandonedSectorIds.length} marked for abandonment
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
              const isMarkedToAbandon = stagedAbandonedSectorIds.includes(sector.id);

              return (
                <div
                  key={sector.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all gap-2 ${
                    isMarkedToAbandon
                      ? 'bg-rose-950/60 border-rose-500 ring-1 ring-rose-500 shadow-md'
                      : isSelected
                      ? 'bg-slate-950/90 border-cyan-500 ring-1 ring-cyan-500'
                      : 'bg-slate-950/60 hover:bg-slate-950/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => onSelectSector && onSelectSector(sector)}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg border flex flex-col items-center justify-center shrink-0 ${
                        isMarkedToAbandon
                          ? 'bg-rose-950 border-rose-600 text-rose-300'
                          : 'bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <Globe className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] font-mono font-bold">
                        {sector.sectorNumber}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 text-xs sm:text-sm flex items-center gap-2">
                        <span>{sector.name || `Sector ${sector.sectorNumber}`}</span>
                        {isMarkedToAbandon && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono font-bold uppercase">
                            To Abandon
                          </span>
                        )}
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
                      onClick={() => handleToggleAbandonSector(sector.id)}
                      className={`py-1.5 px-3 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                        isMarkedToAbandon
                          ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      {isMarkedToAbandon ? (
                        <>
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>Keep Sector</span>
                        </>
                      ) : (
                        <>
                          <Disc className="w-3.5 h-3.5" />
                          <span>Select to Abandon</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Reset & Confirm Bar (Bug 67) */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Staged Plan:</span>
            <span className="font-mono font-bold text-amber-300">
              +{stagedTrades.materials + stagedTrades.science} 💰 Trades
            </span>
            <span>•</span>
            <span className="font-mono font-bold text-rose-300">
              {stagedAbandonedSectorIds.length} Sectors Abandoned
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Reset Decision Button */}
            <button
              type="button"
              disabled={!hasStagedDecisions}
              onClick={handleResetDecisions}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition shadow"
              title="Reset all staged decisions"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Decision</span>
            </button>

            {/* Confirm Plan Button */}
            <button
              type="button"
              disabled={!canConfirm}
              onClick={handleConfirm}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-lg disabled:opacity-40 disabled:pointer-events-none ${
                simulation.isSolvent
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60'
                  : 'bg-rose-700 hover:bg-rose-600 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {simulation.isSolvent
                  ? 'Confirm & Restore Solvency'
                  : `Deficit Remaining (-${simulation.projectedDeficit} 💰)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
