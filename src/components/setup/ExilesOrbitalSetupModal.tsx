import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { Coins, FlaskConical, ShieldAlert, Sparkles, Check, Minimize2, Maximize2 } from 'lucide-react';

interface ExilesOrbitalSetupModalProps {
  player: PlayerState;
  onChooseCube: (resource: 'money' | 'science') => void;
}

export const ExilesOrbitalSetupModal: React.FC<ExilesOrbitalSetupModalProps> = ({
  player,
  onChooseCube,
}) => {
  const [selected, setSelected] = useState<'money' | 'science'>('money');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Minimized floating banner at top
  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-teal-500 rounded-full shadow-2xl backdrop-blur-md text-white">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span className="font-bold text-xs sm:text-sm tracking-wide text-teal-300 font-display">
            EXILES ORBITAL SETUP ({player.name})
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 rounded-full text-xs font-bold transition-all shadow-md shadow-teal-950/50 flex items-center gap-1.5 cursor-pointer"
            title="Return to orbital setup"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Setup Orbital</span>
          </button>
        </div>
      </div>
    );
  }

  // Side window (non-blocking)
  return (
    <div className="fixed top-18 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-120 max-w-xl pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-200 font-sans">
      <div className="bg-slate-900/95 border-2 border-teal-500/80 rounded-2xl shadow-2xl backdrop-blur-md p-4 sm:p-5 flex flex-col overflow-y-auto max-h-[calc(100vh-90px)] text-slate-100">
        {/* Header Action Bar */}
        <div className="w-full flex items-center justify-between mb-3 pb-2 border-b border-teal-800/60">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-teal-400 font-mono font-bold px-2 py-0.5 rounded bg-teal-950/80 border border-teal-800/80">
              Faction Setup • Sector 234
            </span>
          </div>
          <button
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors shadow-sm cursor-pointer"
            title="Minimize to view map"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>View Map</span>
          </button>
        </div>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-teal-900/60 border border-teal-500 text-teal-300 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 font-display">
              The Exiles — Starting Orbital Colony
            </h2>
            <p className="text-[11px] text-teal-400">
              Commander <strong className="text-teal-300">{player.name}</strong>, select initial population cube for home orbital.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed">
            <p>
              Your starting home Sector 234 begins with an established <strong>Armed Orbital Station</strong>. Select which population cube to place during initial game setup. This placement is free and does not consume a Colony Ship.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Money Option */}
            <button
              type="button"
              onClick={() => setSelected('money')}
              className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
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
                  Advances your Money income track by 1 cube.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10.5px] font-mono text-amber-400 font-semibold">
                <span>Income Bonus</span>
                <span>+Credits</span>
              </div>
            </button>

            {/* Science Option */}
            <button
              type="button"
              onClick={() => setSelected('science')}
              className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
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
                  Advances your Science production track by 1 cube.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10.5px] font-mono text-pink-400 font-semibold">
                <span>Research Bonus</span>
                <span>+Science</span>
              </div>
            </button>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-950/30 border border-teal-800/60 text-[11px] text-teal-200">
            <ShieldAlert className="w-4 h-4 shrink-0 text-teal-400 mt-0.5" />
            <span>
              <strong>Exiles Special Rule:</strong> Any Orbital colonized with an Exiles population cube acts as an active combat ship (1 Hull, 1 Ion Turret, 1 Electron Computer) plus an outside module granting +2 Hull and +4 Power!
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => onChooseCube(selected)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs font-display tracking-wide shadow-lg shadow-teal-950/50 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Confirm {selected === 'money' ? 'Credits' : 'Science'} Orbital Colony</span>
          </button>
        </div>
      </div>
    </div>
  );
};
