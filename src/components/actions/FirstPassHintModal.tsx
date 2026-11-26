import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { CircleOff, Zap, ShieldAlert, Check, X, Info } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface FirstPassHintModalProps {
  player: PlayerState;
  round: number;
  isOpen: boolean;
  onConfirmPass: (enableAutoPass: boolean) => void;
  onCancel: () => void;
}

export const FirstPassHintModal: React.FC<FirstPassHintModalProps> = ({
  player,
  round,
  isOpen,
  onConfirmPass,
  onCancel,
}) => {
  const { language, l } = useLanguage();
  const [autoPassEnabled, setAutoPassEnabled] = useState<boolean>(true);
  const firstPassGold = player.faction.id === 'legion_of_midas' ? 1 : 2;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-indigo-500/60 rounded-2xl shadow-2xl shadow-indigo-950/70 p-5 sm:p-6 flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <CircleOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-100 tracking-wide">
                {l(`Pass Turn — Round ${round}`, `跳过行动阶段 — 第 ${round} 轮`)}
              </h3>
              <p className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block ring-1 ring-white/20"
                  style={{ backgroundColor: player.color }}
                />
                {l('Commander', '指挥官')} {player.name}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Hint Body */}
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          {/* Reaction Rule Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex gap-2.5">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sky-300 block mb-0.5">{l('Reaction Turns in Eclipse:', '《星蚀》中的响应回合：')}</span>
              {language === 'zh' ? (
                <>
                  跳过将结束你在第 {round} 轮的常规行动。但当其他玩家继续行动时，轮到你时仍会进入<strong className="text-slate-100">响应回合</strong>（可执行 1 处升级、1 项建造或跳过），直到所有玩家连续跳过为止。
                </>
              ) : (
                <>
                  Passing concludes your main actions for Round {round}. However, whenever opponents take actions,
                  the turn will rotate back to you for <strong className="text-slate-100">Reaction Turns</strong> (where
                  you can Upgrade 1 part, Build 1 ship/structure, or Pass) until all players pass consecutively.
                  {firstPassGold === 1 && (
                    <span className="block mt-1 text-amber-300 font-semibold">
                      All That Glitters: Legion of Midas earns 1 Gold instead of 2 Gold when passing first.
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Auto-Pass Feature Card */}
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 flex gap-2.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 block mb-0.5">{l('Speed Up Play with Auto-Pass:', '使用自动跳过加快节奏：')}</span>
              {language === 'zh' ? (
                <>
                  为避免每次响应回合都手动点击“跳过”，你可以开启 <strong className="text-slate-100">自动跳过响应回合</strong>，系统将为你自动跳过后续响应回合。
                </>
              ) : (
                <>
                  To avoid manually clicking "Pass" every reaction turn, you can enable{' '}
                  <strong className="text-slate-100">Auto-Pass Reactions</strong>. The game will automatically pass subsequent
                  reaction turns for you.
                </>
              )}
            </div>
          </div>

          {/* Invasion Protection Card */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 flex gap-2.5">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-300 block mb-0.5">{l('Invasion Safety:', '入侵保护机制：')}</span>
              {language === 'zh' ? (
                <>
                  如果有其他玩家进入或入侵了你拥有影响力圆片、人口方块或飞船的星区，自动跳过将<strong className="text-emerald-200">立即暂停并提醒你</strong>，以便你做出防御反应！
                </>
              ) : (
                <>
                  If another player enters or invades any sector where you have an influence disc, population cubes,
                  or ships, Auto-Pass will <strong className="text-emerald-200">immediately pause and alert you</strong> so
                  you can react and defend your territory!
                </>
              )}
            </div>
          </div>
        </div>

        {/* Checkbox / Toggle Option */}
        <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-indigo-500/40 hover:border-indigo-400 transition-colors cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoPassEnabled}
            onChange={(e) => setAutoPassEnabled(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {l('Enable Auto-Pass for subsequent reaction turns', '对后续响应回合启用自动跳过')}
            </span>
            <span className="text-[11px] text-slate-400">
              {l('You can toggle this ON or OFF anytime using the switch on the action bar.', '你可以随时通过底部操作栏开关开启或关闭此功能。')}
            </span>
          </div>
        </label>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {l('Cancel', '取消')}
          </button>
          <button
            type="button"
            onClick={() => onConfirmPass(autoPassEnabled)}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold shadow-lg transition-all ${
              autoPassEnabled
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-indigo-900/50 hover:scale-105'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>{l('Pass Turn', '确认跳过')} {autoPassEnabled ? l('(with Auto-Pass)', '（含自动跳过）') : l('(Manual Reactions)', '（手动响应）')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
