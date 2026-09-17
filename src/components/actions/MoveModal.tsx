import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { SectorTile, SectorShip } from '../../engine/types/galaxy';
import { areSectorsConnected } from '../../engine/rules/hexMath';
import { getMaxMoveActivations } from '../../engine/rules/gameReducer';
import { Rocket, ArrowRight, CircleAlert, X, Plus, Trash2, Check, Sparkles } from 'lucide-react';

export interface MoveStepPayload {
  shipId: string;
  fromSectorId: string;
  toSectorId: string;
}

interface PlannedMove extends MoveStepPayload {
  id: string;
  shipType: string;
  fromSectorNumber: number;
  toSectorNumber: number;
}

interface MoveModalProps {
  player: PlayerState;
  sectors: SectorTile[];
  onMove: (moves: MoveStepPayload[]) => void;
  onClose: () => void;
}

export const MoveModal: React.FC<MoveModalProps> = ({
  player,
  sectors,
  onMove,
  onClose,
}) => {
  // Collect all ships belonging to this player across all sectors
  const playerShips: { ship: SectorShip; initialSector: SectorTile }[] = [];
  for (const s of sectors) {
    for (const sh of s.ships) {
      if (sh.ownerId === player.id) {
        playerShips.push({ ship: sh, initialSector: s });
      }
    }
  }

  const maxMoves = getMaxMoveActivations(player);
  const hasImprovedLogistics = player.techTrack.researched.some((t) => t.id === 'improved_logistics');
  const hasWormholeGen = player.techTrack.researched.some((t) => t.id === 'wormhole_generator');

  const [plannedMoves, setPlannedMoves] = useState<PlannedMove[]>([]);

  // Compute current simulated sector for every ship after applying plannedMoves
  const simulatedShipSector = new Map<string, SectorTile>();
  for (const ps of playerShips) {
    simulatedShipSector.set(ps.ship.id, ps.initialSector);
  }
  for (const m of plannedMoves) {
    const destSec = sectors.find((s) => s.id === m.toSectorId);
    if (destSec) {
      simulatedShipSector.set(m.shipId, destSec);
    }
  }

  // Selected ship for next planned move
  const [selectedShipId, setSelectedShipId] = useState<string>(
    playerShips[0]?.ship.id || ''
  );

  const currentShipObj = playerShips.find((p) => p.ship.id === selectedShipId)?.ship;
  const currentSimSector = simulatedShipSector.get(selectedShipId);

  // Destinations connected to the ship's current simulated sector via wormholes
  const connectedDestinations = currentSimSector
    ? sectors.filter(
        (s) => s.id !== currentSimSector.id && areSectorsConnected(currentSimSector, s, hasWormholeGen)
      )
    : [];

  const [selectedDestId, setSelectedDestId] = useState<string>(
    connectedDestinations[0]?.id || ''
  );

  const handleAddMove = () => {
    if (!currentShipObj || !currentSimSector) return;
    const destSec = sectors.find((s) => s.id === selectedDestId);
    if (!destSec) return;

    const newMove: PlannedMove = {
      id: `move_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      shipId: currentShipObj.id,
      shipType: currentShipObj.type,
      fromSectorId: currentSimSector.id,
      fromSectorNumber: currentSimSector.sectorNumber,
      toSectorId: destSec.id,
      toSectorNumber: destSec.sectorNumber,
    };

    const newPlanned = [...plannedMoves, newMove];
    setPlannedMoves(newPlanned);

    // After adding, update destinations based on ship's new location
    const newSimSec = destSec;
    const nextConns = sectors.filter(
      (s) => s.id !== newSimSec.id && areSectorsConnected(newSimSec, s, hasWormholeGen)
    );
    setSelectedDestId(nextConns[0]?.id || '');
  };

  const handleRemoveMove = (moveIndex: number) => {
    // Truncate from this move onward to keep sequential movement paths consistent
    setPlannedMoves(plannedMoves.slice(0, moveIndex));
  };

  const canExecute = plannedMoves.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-100 font-display">
                  FLEET MANEUVERS & MOVEMENT
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono font-bold">
                  {plannedMoves.length} / {maxMoves} Moves
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {player.faction.isHuman
                  ? 'Terran fleet doctrine permits up to 3 ship movements per Action Disc.'
                  : `Species movement rate permits up to ${maxMoves} ship movements per Action Disc.`}
                {hasImprovedLogistics && ' (+1 from Improved Logistics)'}
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

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {playerShips.length === 0 ? (
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-400 text-xs text-center">
              No active ships deployed in the galaxy! Build ships using the Build action first.
            </div>
          ) : (
            <>
              {/* Planned Moves Queue */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    Planned Movement Queue ({plannedMoves.length} / {maxMoves})
                  </span>
                  <span className="text-[11px] text-cyan-400 font-mono">
                    {maxMoves - plannedMoves.length} activations remaining
                  </span>
                </div>

                {plannedMoves.length === 0 ? (
                  <div className="py-2 text-center text-slate-500 text-xs italic">
                    No maneuvers queued yet. Configure your first move below.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {plannedMoves.map((m, idx) => (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-xs uppercase text-slate-200">
                            {m.shipType}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-xs text-slate-300">
                            Sector {m.fromSectorNumber} ➔{' '}
                            <strong className="text-cyan-300">Sector {m.toSectorNumber}</strong>
                          </span>
                        </div>

                        <button
                          onClick={() => handleRemoveMove(idx)}
                          className="p-1 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Remove this move and subsequent moves"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Plan Next Maneuver Section */}
              {plannedMoves.length < maxMoves ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3.5">
                  <div className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider">
                    Plan Move #{plannedMoves.length + 1}
                  </div>

                  {/* Ship Selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Select Ship to Move:
                    </label>
                    <select
                      value={selectedShipId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSelectedShipId(newId);
                        const nextSec = simulatedShipSector.get(newId);
                        if (nextSec) {
                          const nextConns = sectors.filter(
                            (s) => s.id !== nextSec.id && areSectorsConnected(nextSec, s, hasWormholeGen)
                          );
                          setSelectedDestId(nextConns[0]?.id || '');
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      {playerShips.map((item) => {
                        const simSec = simulatedShipSector.get(item.ship.id);
                        const isMoved = simSec && simSec.id !== item.initialSector.id;
                        return (
                          <option key={item.ship.id} value={item.ship.id}>
                            {item.ship.type.toUpperCase()} • currently in Sector {simSec?.sectorNumber}
                            {isMoved ? ' (after prior move)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Destination Selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Select Connected Destination Sector:
                    </label>
                    {connectedDestinations.length > 0 ? (
                      <select
                        value={selectedDestId}
                        onChange={(e) => setSelectedDestId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                      >
                        {connectedDestinations.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            Sector {sec.sectorNumber} ({sec.name || `Ring ${sec.ring}`} • {sec.ships.length} ships stationed)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-amber-300 text-xs flex items-center gap-2">
                        <CircleAlert className="w-4 h-4 shrink-0" />
                        <span>No connected adjacent sectors from Sector {currentSimSector?.sectorNumber}!</span>
                      </div>
                    )}
                  </div>

                  {/* Add Step Button */}
                  <button
                    type="button"
                    disabled={!selectedDestId || connectedDestinations.length === 0}
                    onClick={handleAddMove}
                    className="w-full py-2 px-3 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Queue Maneuver #{plannedMoves.length + 1}</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>All {maxMoves} Move activations planned! Ready to execute maneuvers.</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
          <div className="text-xs text-slate-400">
            Maneuvers to execute:{' '}
            <strong className="text-cyan-300 font-bold">{plannedMoves.length} / {maxMoves}</strong>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!canExecute}
              onClick={() =>
                onMove(
                  plannedMoves.map((m) => ({
                    shipId: m.shipId,
                    fromSectorId: m.fromSectorId,
                    toSectorId: m.toSectorId,
                  }))
                )
              }
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs tracking-wide shadow-lg transition-all"
            >
              Execute {plannedMoves.length} {plannedMoves.length === 1 ? 'Maneuver' : 'Maneuvers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

