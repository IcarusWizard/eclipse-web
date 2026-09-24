import React, { useState, useEffect } from 'react';
import { PlayerState } from '../../engine/types/player';
import { Handshake, Coins, FlaskConical, Hammer, Check, X, ShieldAlert, ArrowRight } from 'lucide-react';

export type PopulationResourceType = 'money' | 'science' | 'material';

interface DiplomacyModalProps {
  isOpen: boolean;
  initiator: PlayerState;
  target: PlayerState;
  onClose: () => void;
  onConfirm: (
    initiatorCube: PopulationResourceType,
    targetCube: PopulationResourceType
  ) => void;
}

export const DiplomacyModal: React.FC<DiplomacyModalProps> = ({
  isOpen,
  initiator,
  target,
  onClose,
  onConfirm,
}) => {
  const [step, setStep] = useState<'PROMPT' | 'SELECT_CUBES'>('PROMPT');

  // Choose default cube for player with available stock
  const getDefaultCube = (p: PlayerState): PopulationResourceType => {
    if (p.population.money.cubesOnBoard > 0) return 'money';
    if (p.population.science.cubesOnBoard > 0) return 'science';
    return 'material';
  };

  const [initiatorCube, setInitiatorCube] = useState<PopulationResourceType>(getDefaultCube(initiator));
  const [targetCube, setTargetCube] = useState<PopulationResourceType>(getDefaultCube(target));

  // Reset when opened or players change
  useEffect(() => {
    if (isOpen) {
      setStep('PROMPT');
      setInitiatorCube(getDefaultCube(initiator));
      setTargetCube(getDefaultCube(target));
    }
  }, [isOpen, initiator.id, target.id]);

  if (!isOpen) return null;

  const initiatorMoneyCubes = initiator.population.money.cubesOnBoard;
  const initiatorSciCubes = initiator.population.science.cubesOnBoard;
  const initiatorMatCubes = initiator.population.material.cubesOnBoard;

  const targetMoneyCubes = target.population.money.cubesOnBoard;
  const targetSciCubes = target.population.science.cubesOnBoard;
  const targetMatCubes = target.population.material.cubesOnBoard;

  const canConfirm =
    initiator.population[initiatorCube].cubesOnBoard > 0 &&
    target.population[targetCube].cubesOnBoard > 0;

  const resourceConfig: Record<
    PopulationResourceType,
    { label: string; icon: React.ReactNode; colorClass: string; activeClass: string }
  > = {
    money: {
      label: 'Money',
      icon: <Coins className="w-4 h-4 text-yellow-400" />,
      colorClass: 'text-yellow-400',
      activeClass: 'bg-yellow-950/70 border-yellow-500 shadow-yellow-950/50',
    },
    science: {
      label: 'Science',
      icon: <FlaskConical className="w-4 h-4 text-pink-400" />,
      colorClass: 'text-pink-400',
      activeClass: 'bg-pink-950/70 border-pink-500 shadow-pink-950/50',
    },
    material: {
      label: 'Material',
      icon: <Hammer className="w-4 h-4 text-amber-500" />,
      colorClass: 'text-amber-400',
      activeClass: 'bg-amber-950/70 border-amber-500 shadow-amber-950/50',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-900/60 border border-indigo-700/60 text-indigo-300">
              <Handshake className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 font-display">
                Diplomatic Relations & Ambassadors
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/80 text-indigo-300 border border-indigo-700/60">
                  +1 VP Each
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {step === 'PROMPT'
                  ? 'Alliance Proposal & Mutual Consent'
                  : 'Assign Population Cubes to Ambassadors'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {step === 'PROMPT' ? (
            /* Step 1: Prompt target player whether they accept */
            <div className="space-y-4">
              {/* Civilizations Overview */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shrink-0 shadow"
                    style={{ backgroundColor: initiator.color }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Proposing Empire
                    </div>
                    <div className="text-sm font-bold text-slate-200 truncate">{initiator.name}</div>
                    <div className="text-xs text-indigo-300 truncate">{initiator.faction.name}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shrink-0 shadow"
                    style={{ backgroundColor: target.color }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Target Empire
                    </div>
                    <div className="text-sm font-bold text-slate-200 truncate">{target.name}</div>
                    <div className="text-xs text-indigo-300 truncate">{target.faction.name}</div>
                  </div>
                </div>
              </div>

              {/* Inquiry Prompt Box */}
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60 space-y-2.5">
                <div className="text-sm font-bold text-indigo-200 flex items-center gap-2">
                  <Handshake className="w-4 h-4 text-indigo-400" />
                  Alliance Proposal: Does Commander {target.name} accept?
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-slate-100">{initiator.name}</strong> ({initiator.faction.name}) has formally proposed establishing diplomatic ties with <strong className="text-slate-100">{target.name}</strong> ({target.faction.name}).
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="text-slate-300 font-semibold mb-1">If accepted:</div>
                  <div>• Both empires place an Ambassador on their Reputation track, worth <strong className="text-indigo-300">+1 VP</strong> each at game end.</div>
                  <div>• Each commander chooses 1 population cube (💰, 🔬, or 🔨) from their tracks to place on their ambassador, immediately unlocking increased production.</div>
                  <div className="flex items-center gap-1 text-amber-300/90 pt-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    Moving ships into allied territory breaks the alliance and awards the Traitor tile (-2 VP)!
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Decline Proposal
                </button>
                <button
                  type="button"
                  onClick={() => setStep('SELECT_CUBES')}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-900/40 transition flex items-center gap-2"
                >
                  Accept Proposal <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Population Cube Selection for each player */
            <div className="space-y-4">
              <div className="text-xs text-slate-300 bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                Choose a population cube (💰, 🔬, or 🔨) from each civilization to attach to their ambassador. Removing the cube from your board uncovers the track space and increases your production!
              </div>

              {/* Initiator Selection */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: initiator.color }} />
                    {initiator.name}&apos;s Cube ({initiator.faction.name})
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Selected: <strong className="text-slate-200 uppercase">{initiatorCube}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['money', 'science', 'material'] as PopulationResourceType[]).map((res) => {
                    const cfg = resourceConfig[res];
                    const count = initiator.population[res].cubesOnBoard;
                    const isSelected = initiatorCube === res;
                    const isAvailable = count > 0;
                    return (
                      <button
                        key={`init_${res}`}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setInitiatorCube(res)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          !isAvailable
                            ? 'opacity-40 bg-slate-900 border-slate-800 cursor-not-allowed'
                            : isSelected
                            ? `${cfg.activeClass} ring-2 ring-indigo-500/50`
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                            {cfg.icon} {cfg.label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between">
                          <span>On Track:</span>
                          <span className={`font-bold ${isAvailable ? 'text-slate-200' : 'text-rose-400'}`}>
                            {count}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Selection */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: target.color }} />
                    {target.name}&apos;s Cube ({target.faction.name})
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Selected: <strong className="text-slate-200 uppercase">{targetCube}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['money', 'science', 'material'] as PopulationResourceType[]).map((res) => {
                    const cfg = resourceConfig[res];
                    const count = target.population[res].cubesOnBoard;
                    const isSelected = targetCube === res;
                    const isAvailable = count > 0;
                    return (
                      <button
                        key={`tgt_${res}`}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setTargetCube(res)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          !isAvailable
                            ? 'opacity-40 bg-slate-900 border-slate-800 cursor-not-allowed'
                            : isSelected
                            ? `${cfg.activeClass} ring-2 ring-indigo-500/50`
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                            {cfg.icon} {cfg.label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between">
                          <span>On Track:</span>
                          <span className={`font-bold ${isAvailable ? 'text-slate-200' : 'text-rose-400'}`}>
                            {count}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('PROMPT')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Back
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!canConfirm}
                    onClick={() => onConfirm(initiatorCube, targetCube)}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-indigo-900/40 transition flex items-center gap-1.5"
                  >
                    <Handshake className="w-4 h-4" /> Confirm Ambassador Exchange
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
