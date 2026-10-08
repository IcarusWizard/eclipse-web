import React from 'react';
import { SectorTile, ShipType } from '../../engine/types/galaxy';
import { GameState } from '../../engine/types/state';
import { PlayerState } from '../../engine/types/player';
import {
  Sparkles,
  Rocket,
  Hammer,
  Wrench,
  X,
  ArrowRight,
  Disc,
} from 'lucide-react';

export interface PulsarModalProps {
  sector: SectorTile;
  onSelectAction: (targetSlot: 'move' | 'build' | 'upgrade', sectorId: string) => void;
  onClose: () => void;
  // Optional backwards compatibility
  state?: GameState;
  activePlayer?: PlayerState;
  onActivate?: (
    targetSlot: 'move' | 'build' | 'upgrade',
    payload: {
      move?: { fromSectorId: string; toSectorId: string; shipId: string };
      build?: { sectorId: string; itemType: ShipType | 'orbital' | 'monolith' };
      upgrade?: { shipType: ShipType; slotIndex: number; partId: string | null };
    }
  ) => void;
}

export const PulsarModal: React.FC<PulsarModalProps> = ({
  sector,
  onSelectAction,
  onClose,
}) => {
  const currentSlot = sector.pulsarSlot || 'move';
  const availableSlots: ('move' | 'build' | 'upgrade')[] = (['move', 'build', 'upgrade'] as const).filter(
    (slot) => slot !== currentSlot
  );

  const slotDetails: Record<
    'move' | 'build' | 'upgrade',
    {
      title: string;
      actionName: string;
      description: string;
      icon: React.ReactNode;
      color: string;
      badgeColor: string;
      hoverBorder: string;
    }
  > = {
    build: {
      title: 'CONSTRUCTION',
      actionName: 'Build Action (1 Item)',
      description:
        'Construct 1 ship, orbital, or monolith in any sector under your influence.',
      icon: <Hammer className="w-6 h-6 text-amber-400" />,
      color: 'from-amber-950/40 via-amber-900/20 to-slate-900',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      hoverBorder: 'hover:border-amber-500/80 hover:shadow-amber-500/20',
    },
    upgrade: {
      title: 'SHIP UPGRADE',
      actionName: 'Upgrade Action (1 Slot)',
      description:
        'Modify 1 component on your ship blueprints using available technologies or discoveries.',
      icon: <Wrench className="w-6 h-6 text-indigo-400" />,
      color: 'from-indigo-950/40 via-indigo-900/20 to-slate-900',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      hoverBorder: 'hover:border-indigo-500/80 hover:shadow-indigo-500/20',
    },
    move: {
      title: 'FLEET MANEUVER',
      actionName: 'Move Action (1 Sector)',
      description:
        'Move ships using 1 sector activation along valid wormhole connections.',
      icon: <Rocket className="w-6 h-6 text-cyan-400" />,
      color: 'from-cyan-950/40 via-cyan-900/20 to-slate-900',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      hoverBorder: 'hover:border-cyan-500/80 hover:shadow-cyan-500/20',
    },
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/60 shadow-lg shadow-cyan-500/10">
              <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-cyan-300 font-display flex items-center gap-2">
                PULSAR ANOMALY ACTIVATION
              </h2>
              <p className="text-xs text-slate-400">
                Sector {sector.id} &bull; Galactic Events
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

        {/* Current Disc Status Info */}
        <div className="p-5 flex flex-col gap-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Disc className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Current Sector Disc Slot
                </span>
                <span className="text-sm font-bold text-white uppercase font-mono">
                  {currentSlot}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-semibold">
                Rule
              </span>
              <span className="text-xs text-cyan-300 font-medium">
                1 Activation &bull; 0 Discs Placed
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Shift the pulsar disc from <span className="font-bold text-white uppercase font-mono">{currentSlot}</span> to one of the two available slots below. This initiates the standard action interface with <span className="font-bold text-cyan-300">1 free activation</span> without placing an Influence Disc from your track:
          </p>

          {/* Action Choice Cards */}
          <div className="grid grid-cols-1 gap-3 pt-1">
            {availableSlots.map((slot) => {
              const details = slotDetails[slot];
              return (
                <button
                  key={slot}
                  onClick={() => onSelectAction(slot, sector.id)}
                  className={`w-full text-left p-4 rounded-xl border border-slate-700/80 bg-gradient-to-r ${details.color} ${details.hoverBorder} transition-all duration-200 group shadow-md hover:scale-[1.01] flex items-center justify-between gap-4`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 group-hover:border-cyan-400/50 transition-colors shrink-0">
                      {details.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                          {details.title}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${details.badgeColor}`}
                        >
                          {details.actionName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-snug">
                        {details.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 group-hover:text-cyan-300 font-semibold text-xs shrink-0 transition-colors">
                    <span>Select</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Can only be activated once per round per Pulsar</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
