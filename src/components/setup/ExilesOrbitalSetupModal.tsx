import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { Coins, FlaskConical, ShieldAlert, Sparkles, Check, Minimize2, Maximize2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface ExilesOrbitalSetupModalProps {
  player: PlayerState;
  onChooseCube: (resource: 'money' | 'science') => void;
}

export const ExilesOrbitalSetupModal: React.FC<ExilesOrbitalSetupModalProps> = ({
  player,
  onChooseCube,
}) => {
  const { l } = useLanguage();
  const [selected, setSelected] = useState<'money' | 'science'>('money');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Minimized floating banner at top
  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-teal-500 rounded-full shadow-2xl backdrop-blur-md text-white">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span className="font-bold text-xs sm:text-sm tracking-wide text-teal-300 font-display">
            {l(`EXILES ORBITAL SETUP (${player.name})`, `流亡者轨道站初始设置 (${player.name})`)}
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 rounded-full text-xs font-bold transition-all shadow-md shadow-teal-950/50 flex items-center gap-1.5 cursor-pointer"
            title={l('Return to orbital setup', '返回轨道站设置')}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{l('Setup Orbital', '设置轨道站')}</span>
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
              {l('Faction Setup • Sector 234', '种族初始设置 • 234 号星区')}
            </span>
          </div>
          <button
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors shadow-sm cursor-pointer"
            title={l('Minimize to view map', '最小化以查看星图')}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>{l('View Map', '查看星图')}</span>
          </button>
        </div>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-teal-900/60 border border-teal-500 text-teal-300 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 font-display">
              {l('The Exiles — Starting Orbital Colony', '流亡者 — 起始轨道站殖民')}
            </h2>
            <p className="text-[11px] text-teal-400">
              {l('Commander', '指挥官')} <strong className="text-teal-300">{player.name}</strong>
              {l(', select initial population cube for home orbital.', '，请选择起始母星轨道站放置的人口方块类型。')}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed">
            <p>
              {l(
                'Your starting home Sector 234 begins with an established Armed Orbital Station. Select which population cube to place during initial game setup. This placement is free and does not consume a Colony Ship.',
                '你的母星 234 号星区在开局时自带一座武装轨道站。请选择初始殖民的人口方块类型，此放置免费且不消耗殖民船。'
              )}
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
                <h3 className="font-bold text-sm text-yellow-300 font-display">{l('Credits (Money)', '信用点（金钱）')}</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {l('Advances your Money income track by 1 cube.', '使你的金钱收入轨向前推进 1 格。')}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10.5px] font-mono text-amber-400 font-semibold">
                <span>{l('Income Bonus', '收入加成')}</span>
                <span>{l('+Credits', '+信用点')}</span>
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
                <h3 className="font-bold text-sm text-pink-300 font-display">{l('Science', '科研')}</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {l('Advances your Science production track by 1 cube.', '使你的科研产出轨向前推进 1 格。')}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10.5px] font-mono text-pink-400 font-semibold">
                <span>{l('Research Bonus', '研发加成')}</span>
                <span>{l('+Science', '+科研')}</span>
              </div>
            </button>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-950/30 border border-teal-800/60 text-[11px] text-teal-200">
            <ShieldAlert className="w-4 h-4 shrink-0 text-teal-400 mt-0.5" />
            <span>
              <strong>{l('Exiles Special Rule:', '流亡者特殊规则：')}</strong>{' '}
              {l(
                'Any Orbital colonized with an Exiles population cube acts as an active combat ship (1 Hull, 1 Ion Turret, 1 Electron Computer) plus an outside module granting +2 Hull and +4 Power!',
                '任何已殖民人口的流亡者轨道站都会视作一艘战斗舰船（1 船体、1 离子炮台、1 电子计算机），并额外拥有 +2 船体与 +4 能量的外部组件！'
              )}
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
            <span>
              {selected === 'money'
                ? l('Confirm Credits Orbital Colony', '确认在轨道站放置金钱人口')
                : l('Confirm Science Orbital Colony', '确认在轨道站放置科研人口')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
