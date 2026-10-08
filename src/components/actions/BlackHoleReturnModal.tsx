import React, { useState } from 'react';
import { BlackHoleDelayedShip } from '../../engine/rules/galacticEvents';
import { SectorTile } from '../../engine/types/galaxy';
import { PlayerState } from '../../engine/types/player';
import { Radio, Sparkles, X, ArrowRight, ShieldCheck, Ship } from 'lucide-react';

interface BlackHoleReturnModalProps {
  player: PlayerState;
  ship: BlackHoleDelayedShip;
  currentRound: number;
  legalSectors: SectorTile[];
  onReturn: (shipId: string, targetSectorId: string) => void;
  onClose: () => void;
}

export const BlackHoleReturnModal: React.FC<BlackHoleReturnModalProps> = ({
  player,
  ship,
  currentRound,
  legalSectors,
  onReturn,
  onClose,
}) => {
  // Default to player's controlled sector if among legal sectors, or first legal sector
  const defaultSectorId =
    legalSectors.find((s) => s.discOwner === player.id)?.id || legalSectors[0]?.id || '';
  const [selectedSectorId, setSelectedSectorId] = useState<string>(defaultSectorId);

  const selectedSector = legalSectors.find((s) => s.id === selectedSectorId);

  const handleConfirm = () => {
    if (!selectedSectorId) return;
    onReturn(ship.shipId, selectedSectorId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-slate-950/95 border-2 border-indigo-500/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
                BLACK HOLE RETURN
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-300">
                  Round {currentRound}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Spacetime anomaly transit complete for Sector {ship.blackHoleSectorNumber}.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin">
          {/* Ship Details Card */}
          <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-indigo-300">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  Returning Vessel
                </div>
                <div className="text-sm font-black text-slate-100">
                  {player.name} &bull; {ship.shipType.toUpperCase()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Origin</span>
              <span className="text-xs font-mono font-bold text-indigo-300">
                Sector {ship.blackHoleSectorNumber}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                Select Destination Sector ({legalSectors.length} legal)
              </span>
              <span className="text-[10px] text-slate-400">
                {ship.blackHoleSectorNumber === 396 ? 'Inner (Ring I) Sectors' : 'Empty Zone Adjacent'}
              </span>
            </div>

            {legalSectors.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center text-xs text-rose-400">
                No legal destination sectors currently available.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {legalSectors.map((sec) => {
                  const isSelected = selectedSectorId === sec.id;
                  const isControlled = sec.discOwner === player.id;
                  const hasFriendlyShips = sec.ships.some((s) => s.ownerId === player.id);

                  return (
                    <div
                      key={sec.id}
                      onClick={() => setSelectedSectorId(sec.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-950/60 border-indigo-400 ring-1 ring-indigo-400/60 shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-200 flex items-center gap-2">
                          <span>Sector {sec.sectorNumber}</span>
                          <span className="text-slate-400 font-normal">({sec.name})</span>
                          <span className="text-[10px] text-slate-500 font-mono">Ring {sec.ring}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          {isControlled && (
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                              <ShieldCheck className="w-3 h-3" /> Controlled by You
                            </span>
                          )}
                          {hasFriendlyShips && (
                            <span className="text-cyan-400">
                              {sec.ships.filter((s) => s.ownerId === player.id).length} friendly ship(s)
                            </span>
                          )}
                          {!isControlled && !hasFriendlyShips && (
                            <span className="text-slate-500">Unoccupied</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-500 text-slate-950'
                              : 'border-slate-700 bg-slate-900'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Decide Later
          </button>
          <button
            disabled={!selectedSectorId}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-slate-950 transition-all shadow-lg shadow-indigo-950/60 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Return to Sector {selectedSector?.sectorNumber || ''}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
