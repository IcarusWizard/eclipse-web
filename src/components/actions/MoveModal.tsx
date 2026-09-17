import React, { useEffect, useMemo } from 'react';
import { PlayerState } from '../../engine/types/player';
import { SectorTile, SectorShip } from '../../engine/types/galaxy';
import { getMaxMoveActivations } from '../../engine/rules/gameReducer';
import { calculateBlueprintStats } from '../../engine/rules/shipValidation';
import {
  Rocket,
  ArrowRight,
  CircleAlert,
  X,
  Trash2,
  Check,
  RotateCcw,
  FastForward,
  ShieldAlert,
} from 'lucide-react';

export interface MoveStepPayload {
  shipId: string;
  fromSectorId: string;
  toSectorId: string;
  activationIndex?: number;
}

export interface PlannedMove extends MoveStepPayload {
  id: string;
  shipType: string;
  fromSectorNumber: number;
  toSectorNumber: number;
  activationIndex: number;
  stepInActivation?: number;
  driveSpeed?: number;
}

export interface MoveModalProps {
  player: PlayerState;
  sectors: SectorTile[];
  playerShips: { ship: SectorShip; initialSector: SectorTile }[];
  simulatedShipSector: Map<string, SectorTile>;
  connectedDestinations: SectorTile[];
  plannedMoves: PlannedMove[];
  activeActivationIndex: number;
  currentShipDriveSpeed: number;
  movePointsUsedInCurrentActivation: number;
  isShipPinned: (shipId: string) => boolean;
  onAddMove: (destSectorId: string) => void;
  onRemoveMove: (index: number) => void;
  onClearMoves: () => void;
  selectedShipId: string;
  onSelectShipId: (shipId: string) => void;
  onFinishActivation: () => void;
  onMove: (moves: MoveStepPayload[]) => void;
  onClose: () => void;
}

export const MoveModal: React.FC<MoveModalProps> = ({
  player,
  sectors,
  playerShips,
  simulatedShipSector,
  connectedDestinations,
  plannedMoves,
  activeActivationIndex,
  currentShipDriveSpeed,
  movePointsUsedInCurrentActivation,
  isShipPinned,
  onAddMove,
  onRemoveMove,
  onClearMoves,
  selectedShipId,
  onSelectShipId,
  onFinishActivation,
  onMove,
  onClose,
}) => {
  const maxMoves = getMaxMoveActivations(player);
  const hasImprovedLogistics = player.techTrack.researched.some((t) => t.id === 'improved_logistics');

  const currentShipObj = playerShips.find((p) => p.ship.id === selectedShipId)?.ship;
  const currentSimSector = simulatedShipSector.get(selectedShipId);

  const currentBlueprint = currentShipObj ? player.blueprints[currentShipObj.type] : null;
  const enginePart = currentBlueprint?.slots.find((p) => p && p.category === 'drive');
  const engineName = enginePart ? enginePart.name : 'No Engine';

  // Group planned moves by activation index
  const activationGroups = useMemo(() => {
    const map = new Map<number, PlannedMove[]>();
    for (const m of plannedMoves) {
      const actIdx = m.activationIndex ?? 0;
      const list = map.get(actIdx) || [];
      list.push(m);
      map.set(actIdx, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [plannedMoves]);

  const distinctActivationsCount = activationGroups.length;
  const isSelectedShipPinned = selectedShipId ? isShipPinned(selectedShipId) : false;
  const canExecute = plannedMoves.length > 0;

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && canExecute) {
        e.preventDefault();
        onMove(
          plannedMoves.map((m) => ({
            shipId: m.shipId,
            fromSectorId: m.fromSectorId,
            toSectorId: m.toSectorId,
            activationIndex: m.activationIndex,
          }))
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canExecute, plannedMoves, onMove, onClose]);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4 pointer-events-none font-sans">
      <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-700/80 rounded-2xl shadow-2xl overflow-visible text-slate-100 p-4 pointer-events-auto flex flex-col gap-3 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-wide text-slate-200 uppercase font-display">
                  FLEET MANEUVERS & MOVEMENT
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono font-bold">
                  {distinctActivationsCount} / {maxMoves} Activations
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {plannedMoves.length} {plannedMoves.length === 1 ? 'Step' : 'Steps'}
                </span>
                {hasImprovedLogistics && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                    Logistics +1
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-cyan-400/90 font-medium mt-0.5">
                Each activation allows 1 ship to move up to its engine Drive Speed. Hostile sectors pin ships immediately.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {playerShips.length === 0 ? (
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-400 text-xs text-center">
            No active ships deployed in the galaxy! Build ships using the Build action first.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-0.5">
            {/* Planned Activations Group List */}
            {activationGroups.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                  <span>Planned Activations Queue:</span>
                  <span className="text-slate-500 font-normal">Click trash to undo activation</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {activationGroups.map(([actIdx, moves]) => {
                    const firstMove = moves[0];
                    const shipDrive = firstMove.driveSpeed || 1;
                    return (
                      <div
                        key={actIdx}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-900/80 flex items-center justify-between gap-2 text-xs shadow-sm"
                      >
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">
                            {actIdx + 1}
                          </span>
                          <span className="font-bold text-[11px] text-slate-200 uppercase shrink-0">
                            {firstMove.shipType}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono font-bold shrink-0">
                            {moves.length}/{shipDrive} MP
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 flex-wrap">
                            {moves.map((m, sIdx) => (
                              <React.Fragment key={m.id}>
                                {sIdx > 0 && <span className="text-slate-600">→</span>}
                                <span className="font-mono bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                                  Sec {m.fromSectorNumber} ➔{' '}
                                  <strong className="text-cyan-300">Sec {m.toSectorNumber}</strong>
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const firstIndex = plannedMoves.findIndex((m) => m.id === firstMove.id);
                            onRemoveMove(firstIndex);
                          }}
                          className="p-1 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded transition-colors shrink-0"
                          title="Undo this activation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Activation & Destination Controls */}
            {activeActivationIndex < maxMoves ? (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2.5">
                {/* Ship Switcher and Stats */}
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Activation #{activeActivationIndex + 1}:
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-700/80 text-cyan-300 font-bold text-xs font-mono uppercase">
                      {currentShipObj?.type} (Sec {currentSimSector?.sectorNumber})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 text-[11px] font-mono">
                      {engineName} (Speed {currentShipDriveSpeed})
                    </span>
                    {movePointsUsedInCurrentActivation > 0 && (
                      <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/70 text-amber-300 font-bold text-[11px] font-mono">
                        {movePointsUsedInCurrentActivation} / {currentShipDriveSpeed} MP Used
                      </span>
                    )}
                  </div>

                  {/* Early Activation Finish Button */}
                  {movePointsUsedInCurrentActivation > 0 &&
                    movePointsUsedInCurrentActivation < currentShipDriveSpeed && (
                      <button
                        type="button"
                        onClick={onFinishActivation}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/80 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        title="End this ship's movement and proceed to next activation"
                      >
                        <FastForward className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Finish Activation ({currentShipDriveSpeed - movePointsUsedInCurrentActivation} MP Left)</span>
                      </button>
                    )}
                </div>

                {/* Ship Switcher Fleet Row */}
                {playerShips.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      Fleet:
                    </span>
                    {playerShips.map((item) => {
                      const isSel = item.ship.id === selectedShipId;
                      const sim = simulatedShipSector.get(item.ship.id);
                      const shipBp = player.blueprints[item.ship.type];
                      const shipStats = shipBp ? calculateBlueprintStats(shipBp) : null;
                      const shipSpeed = shipStats ? shipStats.totalDriveSpeed : 0;
                      const pinned = isShipPinned(item.ship.id);
                      const isStarbase = item.ship.type === 'starbase' || shipSpeed <= 0;

                      return (
                        <button
                          key={item.ship.id}
                          type="button"
                          disabled={pinned || isStarbase}
                          onClick={() => onSelectShipId(item.ship.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                            isSel
                              ? 'bg-cyan-500 text-slate-950 shadow-sm'
                              : pinned
                              ? 'bg-rose-950/50 border border-rose-900/60 text-rose-400 opacity-60 cursor-not-allowed'
                              : isStarbase
                              ? 'bg-slate-900 border border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                              : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                          title={
                            pinned
                              ? 'Ship is pinned by hostile forces and cannot move'
                              : isStarbase
                              ? 'Starbases have Drive Speed 0 and cannot move'
                              : `Select ${item.ship.type} (Speed ${shipSpeed})`
                          }
                        >
                          <span>
                            {item.ship.type.slice(0, 3).toUpperCase()} (Sec {sim?.sectorNumber})
                          </span>
                          {pinned && <span className="text-[8px] text-rose-400 font-bold">PINNED</span>}
                          {isStarbase && <span className="text-[8px] text-slate-400">0 DRIVE</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Connected Destinations Quick Bar */}
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-900/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                    Step Destination:
                  </span>
                  {isSelectedShipPinned ? (
                    <div className="text-[11px] text-rose-400 flex items-center gap-1.5 font-medium">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>This fleet is pinned by hostile forces and cannot move further!</span>
                    </div>
                  ) : currentShipDriveSpeed <= 0 ? (
                    <div className="text-[11px] text-amber-400 flex items-center gap-1.5 font-medium">
                      <CircleAlert className="w-3.5 h-3.5" />
                      <span>This unit has Drive Speed 0 and cannot move.</span>
                    </div>
                  ) : connectedDestinations.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {connectedDestinations.map((sec) => (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => onAddMove(sec.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-700/80 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all group shadow-sm"
                        >
                          <ArrowRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                          <span>
                            Sector {sec.sectorNumber} ({sec.name || `Ring ${sec.ring}`})
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-400 flex items-center gap-1.5">
                      <CircleAlert className="w-3.5 h-3.5" />
                      <span>No connected wormholes aligned or movement step limit reached!</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>All {maxMoves} Move activations planned ({plannedMoves.length} steps)! Ready to execute maneuvers.</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
          <div className="text-xs text-slate-400">
            Activations to execute:{' '}
            <strong className="text-cyan-300 font-bold">
              {distinctActivationsCount} / {maxMoves}
            </strong>{' '}
            <span className="text-slate-500">
              ({plannedMoves.length} {plannedMoves.length === 1 ? 'total step' : 'total steps'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {plannedMoves.length > 0 && (
              <button
                type="button"
                onClick={onClearMoves}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-800 flex items-center gap-1 transition-colors"
                title="Reset all planned moves"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
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
                    activationIndex: m.activationIndex,
                  }))
                )
              }
              className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs tracking-wide shadow-lg transition-all"
            >
              Execute {plannedMoves.length} {plannedMoves.length === 1 ? 'Step' : 'Steps'} (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
