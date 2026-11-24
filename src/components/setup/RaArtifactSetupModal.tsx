import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { Coins, FlaskConical, Hammer, Sparkles, Check, Minimize2, Maximize2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface RaArtifactSetupModalProps {
  player: PlayerState;
  onChooseCube: (resource: 'money' | 'science' | 'material') => void;
}

export const RaArtifactSetupModal: React.FC<RaArtifactSetupModalProps> = ({
  player,
  onChooseCube,
}) => {
  const { l } = useLanguage();
  const [selected, setSelected] = useState<'money' | 'science' | 'material'>('science');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-pink-500 rounded-full shadow-2xl backdrop-blur-md text-white">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span className="font-bold text-xs sm:text-sm tracking-wide text-pink-300 font-display">
            {l(`RA ARTIFACT SETUP (${player.name})`, `拉之余晖遗物初始设置 (${player.name})`)}
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-slate-950 rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            title={l('Return to Artifact cube setup', '返回遗物格人口设置')}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{l('Choose Cube', '选择人口方块')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="ra-artifact-setup-modal"
      className="fixed top-18 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-128 max-w-xl pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-200 font-sans"
    >
      <div className="bg-slate-900/95 border-2 border-pink-500/80 rounded-2xl shadow-2xl backdrop-blur-md p-4 sm:p-5 flex flex-col overflow-y-auto max-h-[calc(100vh-90px)] text-slate-100">
        {/* Header Action Bar */}
        <div className="w-full flex items-center justify-between mb-3 pb-2 border-b border-pink-800/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-sky-300 font-mono font-bold px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700/80">
              {l('Faction Setup • Sector 255 [A]', '种族初始设置 • 255 号星区 [A]')}
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
          <div className="p-2 rounded-xl bg-sky-950/70 border border-amber-400/70 text-amber-300 shrink-0 font-mono font-black text-sm">
            [A]
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 font-display">
              {l('Remnants of Ra — Power of the Ancients', '拉之余晖 — 先祖力场初始殖民')}
            </h2>
            <p className="text-[11px] text-pink-300">
              {l('Commander', '指挥官')} <strong className="text-amber-300">{player.name}</strong>
              {l(', select the initial population cube to place on Osiris Seth’s [A] Artifact slot.', '，请选择起始放置于奥西里斯赛特 [A] 遗物附加格的人口方块类型。')}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed">
            <p>
              {l(
                'Home Sector 255 contains an Artifact key [A], granting an extra population slot of any resource type before Round 1 begins. This starting placement is free and does not consume a Colony Ship.',
                '母星 255 号星区拥有远古遗物钥匙 [A]，在第一轮开始前可额外放置 1 枚任意资源的人口方块。此起始放置免费且不消耗殖民船。'
              )}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Money Option */}
            <button
              type="button"
              data-testid="ra-setup-choose-money"
              onClick={() => setSelected('money')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                selected === 'money'
                  ? 'bg-amber-950/40 border-amber-400 shadow-lg ring-2 ring-amber-500/40'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-yellow-950/60 border border-yellow-700 text-yellow-400">
                    <Coins className="w-4 h-4" />
                  </div>
                  {selected === 'money' && (
                    <div className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-yellow-300 font-display">{l('Money', '信用点')}</h3>
                <p className="text-[10.5px] text-slate-400 mt-1 leading-snug">
                  {l('+1 Money income track.', '金钱收入轨推进 1 格。')}
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono text-amber-400 font-semibold">
                {player.population.money.cubesOnBoard} {l('left', '剩余')}
              </div>
            </button>

            {/* Science Option */}
            <button
              type="button"
              data-testid="ra-setup-choose-science"
              onClick={() => setSelected('science')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                selected === 'science'
                  ? 'bg-pink-950/40 border-pink-400 shadow-lg ring-2 ring-pink-500/40'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-pink-950/60 border border-pink-700 text-pink-400">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  {selected === 'science' && (
                    <div className="w-4 h-4 rounded-full bg-pink-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-pink-300 font-display">{l('Science', '科研')}</h3>
                <p className="text-[10.5px] text-slate-400 mt-1 leading-snug">
                  {l('+1 Science production track.', '科研产出轨推进 1 格。')}
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono text-pink-400 font-semibold">
                {player.population.science.cubesOnBoard} {l('left', '剩余')}
              </div>
            </button>

            {/* Materials Option */}
            <button
              type="button"
              data-testid="ra-setup-choose-material"
              onClick={() => setSelected('material')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                selected === 'material'
                  ? 'bg-orange-950/40 border-orange-400 shadow-lg ring-2 ring-orange-500/40'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-700 text-amber-500">
                    <Hammer className="w-4 h-4" />
                  </div>
                  {selected === 'material' && (
                    <div className="w-4 h-4 rounded-full bg-orange-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-amber-300 font-display">{l('Materials', '材料')}</h3>
                <p className="text-[10.5px] text-slate-400 mt-1 leading-snug">
                  {l('+1 Materials production track.', '材料产出轨推进 1 格。')}
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono text-orange-400 font-semibold">
                {player.population.material.cubesOnBoard} {l('left', '剩余')}
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            data-testid="ra-setup-confirm-btn"
            onClick={() => onChooseCube(selected)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-slate-950 font-bold text-xs font-display tracking-wide shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>
              {selected === 'money'
                ? l('Confirm Money [A] Cube', '确认放置金钱 [A] 方块')
                : selected === 'science'
                ? l('Confirm Science [A] Cube', '确认放置科研 [A] 方块')
                : l('Confirm Materials [A] Cube', '确认放置材料 [A] 方块')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
