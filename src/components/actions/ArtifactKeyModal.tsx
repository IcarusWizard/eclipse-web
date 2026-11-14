import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { Key, Coins, FlaskConical, Box, Sparkles, Check, Minimize2, Maximize2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface ArtifactKeyModalProps {
  player: PlayerState;
  totalResources: number;
  artifactsCount: number;
  onAllocate: (resources: { money: number; science: number; materials: number }) => void;
}

export const ArtifactKeyModal: React.FC<ArtifactKeyModalProps> = ({
  player,
  totalResources,
  artifactsCount,
  onAllocate,
}) => {
  const { language, l } = useLanguage();
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [money, setMoney] = useState(0);
  const [science, setScience] = useState(0);
  const [materials, setMaterials] = useState(totalResources);

  const currentAllocated = money + science + materials;
  const remaining = totalResources - currentAllocated;
  const isValid =
    remaining === 0 &&
    money >= 0 &&
    science >= 0 &&
    materials >= 0 &&
    money % 5 === 0 &&
    science % 5 === 0 &&
    materials % 5 === 0;

  const handleAdjust = (type: 'money' | 'science' | 'materials', delta: number) => {
    if (delta > 0 && remaining <= 0) return;
    if (type === 'money') {
      const next = Math.max(0, money + delta);
      if (next - money <= remaining) setMoney(next);
    } else if (type === 'science') {
      const next = Math.max(0, science + delta);
      if (next - science <= remaining) setScience(next);
    } else {
      const next = Math.max(0, materials + delta);
      if (next - materials <= remaining) setMaterials(next);
    }
  };

  const handleSetAll = (type: 'money' | 'science' | 'materials') => {
    if (type === 'money') {
      setMoney(totalResources);
      setScience(0);
      setMaterials(0);
    } else if (type === 'science') {
      setMoney(0);
      setScience(totalResources);
      setMaterials(0);
    } else {
      setMoney(0);
      setScience(0);
      setMaterials(totalResources);
    }
  };

  // Minimized floating banner at top
  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-amber-500 rounded-full shadow-2xl backdrop-blur-md text-white">
          <Key className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs sm:text-sm tracking-wide text-amber-300 font-display">
            {l(`ARTIFACT KEY REWARD (${player.name})`, `遗迹密钥奖励（${player.name}）`)}
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-full text-xs font-bold transition-all shadow-md shadow-amber-950/50 flex items-center gap-1.5 cursor-pointer"
            title={l('Return to artifact key resolution', '返回遗迹密钥分配')}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{l('Allocate Bounty', '分配奖励')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Side window (non-blocking)
  return (
    <div className="fixed top-18 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-120 max-w-xl pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-200 font-sans">
      <div className="bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-amber-500/20 backdrop-blur-md text-slate-100 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-90px)]">
        {/* Header Action Bar */}
        <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-amber-400 font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80">
              {l('Technology Reward • Artifact Key', '科技奖励 • 遗迹密钥')}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono">
              {l(`${artifactsCount} Artifact${artifactsCount > 1 ? 's' : ''}`, `${artifactsCount} 个遗迹`)}
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
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-display font-black tracking-wide text-amber-400">
              {l('Artifact Key Reward', '遗迹密钥奖励')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'zh' ? (
                <>
                  指挥官 <span className="font-semibold text-slate-200">{player.name}</span>，你研发“遗迹密钥”后，每个受控遗迹可为你带来{' '}
                  <strong className="text-amber-400">5 点任意自选资源</strong>！
                </>
              ) : (
                <>
                  Commander <span className="font-semibold text-slate-200">{player.name}</span>, your research into the Artifact Key yields{' '}
                  <strong className="text-amber-400">5 resources of your choice</strong> for each controlled Artifact!
                </>
              )}
            </p>
          </div>
        </div>

        {/* Counter Summary */}
        <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{l('Total Available Bounty:', '可分配资源总额：')}</span>
            <strong className="text-amber-400 font-mono text-base">{totalResources}</strong>
          </div>
          <div className="text-sm">
            <span className="text-slate-400">{l('Unallocated:', '待分配：')} </span>
            <span
              className={`font-mono font-bold text-base ${
                remaining === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {remaining}
            </span>
          </div>
        </div>

        {/* Resource Selectors */}
        <div className="space-y-3">
          {/* Money */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/50 border border-amber-900/40 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-amber-300 text-sm">{l('Money', '金钱')}</div>
                <div className="text-[11px] text-slate-400">{l(`Current: ${player.resources.money}`, `当前：${player.resources.money}`)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetAll('money')}
                className="text-[10px] px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 mr-1"
                title={l('Allocate all to Money', '全部分配给金钱')}
              >
                {l('All', '全部')}
              </button>
              <button
                type="button"
                onClick={() => handleAdjust('money', -5)}
                disabled={money <= 0}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center text-slate-200"
                title={l('Decrease by 5 (1 Artifact)', '减少 5（1 个遗迹）')}
              >
                -
              </button>
              <div className="w-16 text-center font-mono">
                <span className="font-bold text-lg text-amber-400 block">{money}</span>
                <span className="text-[9px] text-slate-400 font-sans block leading-none">({money / 5} {l('Art', '遗迹')})</span>
              </div>
              <button
                type="button"
                onClick={() => handleAdjust('money', 5)}
                disabled={remaining <= 0}
                className="w-8 h-8 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center text-slate-950"
                title={l('Increase by 5 (1 Artifact)', '增加 5（1 个遗迹）')}
              >
                +
              </button>
            </div>
          </div>

          {/* Science */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/50 border border-pink-900/40 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-pink-300 text-sm">{l('Science', '科研')}</div>
                <div className="text-[11px] text-slate-400">{l(`Current: ${player.resources.science}`, `当前：${player.resources.science}`)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetAll('science')}
                className="text-[10px] px-2 py-1 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 rounded border border-pink-500/30 mr-1"
                title={l('Allocate all to Science', '全部分配给科研')}
              >
                {l('All', '全部')}
              </button>
              <button
                type="button"
                onClick={() => handleAdjust('science', -5)}
                disabled={science <= 0}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center text-slate-200"
                title={l('Decrease by 5 (1 Artifact)', '减少 5（1 个遗迹）')}
              >
                -
              </button>
              <div className="w-16 text-center font-mono">
                <span className="font-bold text-lg text-pink-400 block">{science}</span>
                <span className="text-[9px] text-slate-400 font-sans block leading-none">({science / 5} {l('Art', '遗迹')})</span>
              </div>
              <button
                type="button"
                onClick={() => handleAdjust('science', 5)}
                disabled={remaining <= 0}
                className="w-8 h-8 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center text-slate-950"
                title={l('Increase by 5 (1 Artifact)', '增加 5（1 个遗迹）')}
              >
                +
              </button>
            </div>
          </div>

          {/* Materials */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/50 border border-amber-800/40 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-700/20 text-amber-500 border border-amber-600/30">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-amber-400 text-sm">{l('Materials', '材料')}</div>
                <div className="text-[11px] text-slate-400">{l(`Current: ${player.resources.materials}`, `当前：${player.resources.materials}`)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetAll('materials')}
                className="text-[10px] px-2 py-1 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 rounded border border-amber-600/30 mr-1"
                title={l('Allocate all to Materials', '全部分配给材料')}
              >
                {l('All', '全部')}
              </button>
              <button
                type="button"
                onClick={() => handleAdjust('materials', -5)}
                disabled={materials <= 0}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center text-slate-200"
                title={l('Decrease by 5 (1 Artifact)', '减少 5（1 个遗迹）')}
              >
                -
              </button>
              <div className="w-16 text-center font-mono">
                <span className="font-bold text-lg text-amber-400 block">{materials}</span>
                <span className="text-[9px] text-slate-400 font-sans block leading-none">({materials / 5} {l('Art', '遗迹')})</span>
              </div>
              <button
                type="button"
                onClick={() => handleAdjust('materials', 5)}
                disabled={remaining <= 0}
                className="w-8 h-8 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center text-slate-950"
                title={l('Increase by 5 (1 Artifact)', '增加 5（1 个遗迹）')}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => onAllocate({ money, science, materials })}
          disabled={!isValid}
          className="w-full py-3.5 px-4 rounded-xl font-display font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          <span>{l(`Confirm Resource Allocation (${totalResources})`, `确认分配资源 (${totalResources})`)}</span>
        </button>
      </div>
    </div>
  );
};
