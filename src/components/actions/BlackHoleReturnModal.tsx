import React, { useState, useEffect } from 'react';
import { BlackHoleDelayedShip } from '../../engine/rules/galacticEvents';
import { SectorTile } from '../../engine/types/galaxy';
import { PlayerState } from '../../engine/types/player';
import { Radio, Sparkles, X, ArrowRight, ShieldCheck, Ship, MapPin } from 'lucide-react';

interface BlackHoleReturnModalProps {
  player: PlayerState;
  ship: BlackHoleDelayedShip;
  currentRound: number;
  legalSectors: SectorTile[];
  selectedSectorId?: string | null;
  onSelectSectorId?: (sectorId: string) => void;
  onReturn: (shipId: string, targetSectorId: string) => void;
  onDeclineThisRound?: (shipId: string) => void;
  onClose: () => void;
}

export const BlackHoleReturnModal: React.FC<BlackHoleReturnModalProps> = ({
  player,
  ship,
  currentRound,
  legalSectors,
  selectedSectorId: propsSelectedSectorId,
  onSelectSectorId,
  onReturn,
  onDeclineThisRound,
  onClose,
}) => {
  // Default to player's controlled sector if among legal sectors, or first legal sector
  const defaultSectorId =
    legalSectors.find((s) => s.discOwner === player.id)?.id || legalSectors[0]?.id || '';
  const [localSectorId, setLocalSectorId] = useState<string>(
    propsSelectedSectorId || defaultSectorId
  );

  useEffect(() => {
    if (propsSelectedSectorId) {
      setLocalSectorId(propsSelectedSectorId);
    }
  }, [propsSelectedSectorId]);

  const activeSectorId = propsSelectedSectorId || localSectorId;
  const selectedSector = legalSectors.find((s) => s.id === activeSectorId);

  const handleSelect = (secId: string) => {
    setLocalSectorId(secId);
    onSelectSectorId?.(secId);
  };

  const handleConfirm = () => {
    if (!activeSectorId) return;
    onReturn(ship.shipId, activeSectorId);
    onClose();
  };

  const handleDecline = () => {
    if (onDeclineThisRound) {
      onDeclineThisRound(ship.shipId);
    } else {
      onClose();
    }
  };

  return (
    <div
      data-testid="black-hole-return-side-window"
      className="fixed top-20 right-3.5 md:right-4 z-40 w-[calc(100vw-28px)] sm:w-96 max-h-[82vh] bg-slate-950/95 border-2 border-indigo-500/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col pointer-events-auto backdrop-blur-md animate-in fade-in slide-in-from-right-4 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 font-display flex items-center gap-1.5 uppercase">
              BLACK HOLE SHIP RETURN
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-700 text-indigo-300">
                R{currentRound}
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">
              Spacetime transit complete for Sector {ship.blackHoleSectorNumber}.
            </p>
          </div>
        </div>
        <button
          onClick={handleDecline}
          className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Close / Decide Later"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="p-3.5 space-y-3 overflow-y-auto scrollbar-thin flex-1 text-xs">
        {/* Ship Details Card */}
        <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-indigo-300">
              <Ship className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                Returning Vessel
              </div>
              <div className="text-xs font-black text-slate-100">
                {player.name} &bull; {ship.shipType.toUpperCase()}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
              Origin
            </span>
            <span className="text-[11px] font-mono font-bold text-indigo-300">
              Sector {ship.blackHoleSectorNumber}
            </span>
          </div>
        </div>

        {/* Map Click Hint */}
        <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-lg p-2 flex items-center gap-2 text-[10.5px] text-indigo-200">
          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            Click a highlighted sector on the map or select from the legal destinations below.
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Radio className="w-3 h-3 text-indigo-400" />
              Destination ({legalSectors.length} legal)
            </span>
            <span className="text-[9.5px] text-slate-400 font-mono">
              {ship.blackHoleSectorNumber === 396 ? 'Inner (Ring I)' : 'Empty Zone Adjacent'}
            </span>
          </div>

          {legalSectors.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center text-[11px] text-rose-400">
              No legal destination sectors currently available.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {legalSectors.map((sec) => {
                const isSelected = activeSectorId === sec.id;
                const isControlled = sec.discOwner === player.id;
                const hasFriendlyShips = sec.ships.some((s) => s.ownerId === player.id);

                return (
                  <div
                    key={sec.id}
                    onClick={() => handleSelect(sec.id)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-950/70 border-indigo-400 ring-1 ring-indigo-400/60 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
                        <span>Sector {sec.sectorNumber}</span>
                        <span className="text-slate-400 font-normal">({sec.name})</span>
                        <span className="text-[9px] text-slate-500 font-mono">Ring {sec.ring}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        {isControlled && (
                          <span className="text-emerald-400 flex items-center gap-0.5 font-semibold">
                            <ShieldCheck className="w-2.5 h-2.5" /> Controlled
                          </span>
                        )}
                        {hasFriendlyShips && (
                          <span className="text-cyan-400">
                            {sec.ships.filter((s) => s.ownerId === player.id).length} ship(s)
                          </span>
                        )}
                        {!isControlled && !hasFriendlyShips && (
                          <span className="text-slate-500">Unoccupied</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-500 text-slate-950'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
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
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0 gap-2">
        <button
          type="button"
          onClick={handleDecline}
          className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border border-slate-800"
          title="Decline return for this round. Will ask again in the next round."
        >
          Not This Round
        </button>
        <button
          type="button"
          disabled={!activeSectorId}
          onClick={handleConfirm}
          className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-[11px] font-bold tracking-wider uppercase bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-slate-950 transition-all shadow-md shadow-indigo-950/60 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Return to Sec {selectedSector?.sectorNumber || ''}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
