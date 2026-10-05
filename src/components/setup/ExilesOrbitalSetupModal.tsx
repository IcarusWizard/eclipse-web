import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { Coins, FlaskConical, ShieldAlert, Sparkles, Check } from 'lucide-react';

interface ExilesOrbitalSetupModalProps {
  player: PlayerState;
  onChooseCube: (resource: 'money' | 'science') => void;
}

export const ExilesOrbitalSetupModal: React.FC<ExilesOrbitalSetupModalProps> = ({
  player,
  onChooseCube,
}) => {
  const [selected, setSelected] = useState<'money' | 'science'>('money');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-teal-500/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 font-sans animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-teal-800/60 bg-gradient-to-r from-teal-950/80 via-slate-900 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-900/60 border border-teal-500 text-teal-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-teal-400">
                  Outcasts Expansion • Faction Setup
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-100 font-display">
                The Exiles — Starting Orbital Colony
              </h2>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-teal-950 border border-teal-600 text-teal-300 text-[11px] font-mono font-bold">
            Sector 234
          </span>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed space-y-1.5">
            <p>
              Commander <strong className="text-teal-400">{player.name}</strong>, your starting home Sector 234 begins with an established <strong>Armed Orbital Station</strong>.
            </p>
            <p className="text-[11px] text-slate-400">
              Select which population cube to place on the orbital station during initial game setup. This placement is free and does not consume a Colony Ship.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Money Option */}
            <button
              type="button"
              onClick={() => setSelected('money')}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                selected === 'money'
                  ? 'bg-amber-950/40 border-amber-400 shadow-lg ring-2 ring-amber-500/40'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-yellow-950/60 border border-yellow-700 text-yellow-400">
                    <Coins className="w-5 h-5" />
                  </div>
                  {selected === 'money' && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-sm text-yellow-300 font-display">Credits (Money)</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Advances your Money income track by 1 cube, generating more Credits each round to support galactic upkeep.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10.5px] font-mono text-amber-400 font-semibold">
                <span>Income Bonus</span>
                <span>+Credits Track</span>
              </div>
            </button>

            {/* Science Option */}
            <button
              type="button"
              onClick={() => setSelected('science')}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                selected === 'science'
                  ? 'bg-pink-950/40 border-pink-400 shadow-lg ring-2 ring-pink-500/40'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-pink-950/60 border border-pink-700 text-pink-400">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  {selected === 'science' && (
                    <div className="w-5 h-5 rounded-full bg-pink-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-sm text-pink-300 font-display">Science</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Advances your Science production track by 1 cube, accelerating technological discoveries.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10.5px] font-mono text-pink-400 font-semibold">
                <span>Research Bonus</span>
                <span>+Science Track</span>
              </div>
            </button>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-950/30 border border-teal-800/60 text-[11px] text-teal-200">
            <ShieldAlert className="w-4 h-4 shrink-0 text-teal-400 mt-0.5" />
            <span>
              <strong>Exiles Special Rule:</strong> Any Orbital colonized with an Exiles population cube acts as an active combat ship equipped with 3 slots (1 Hull, 1 Ion Turret, 1 Electron Computer) plus an outside module granting +2 Hull and +4 Power!
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            type="button"
            onClick={() => onChooseCube(selected)}
            className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs font-display tracking-wide shadow-lg shadow-teal-950/50 transition-all cursor-pointer flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Confirm {selected === 'money' ? 'Credits' : 'Science'} Orbital Colony</span>
          </button>
        </div>
      </div>
    </div>
  );
};
