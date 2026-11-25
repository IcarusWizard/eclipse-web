import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { Technology } from '../../engine/types/tech';
import { getEligibleSpiralStartingTechs } from '../../engine/rules/techData';
import { TechTileIconography } from '../common/PhysicalTileIconography';
import { Sparkles, Check, Minimize2, Maximize2, FlaskConical } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateTechDesc, translateTechName } from '../../i18n/catalogTranslations';

interface SpiralStartingTechModalProps {
  player: PlayerState;
  techSupply: Technology[];
  onChooseTech: (techId: string) => void;
}

export const SpiralStartingTechModal: React.FC<SpiralStartingTechModalProps> = ({
  player,
  techSupply,
  onChooseTech,
}) => {
  const { language, l } = useLanguage();
  const eligibleTechs = React.useMemo(() => getEligibleSpiralStartingTechs(techSupply), [techSupply]);
  const [selectedTechId, setSelectedTechId] = useState<string>(eligibleTechs[0]?.id || '');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  React.useEffect(() => {
    if (!eligibleTechs.some((t) => t.id === selectedTechId)) {
      setSelectedTechId(eligibleTechs[0]?.id || '');
    }
  }, [eligibleTechs, selectedTechId]);

  const minCost = eligibleTechs[0]?.baseCost ?? 2;
  const activeTech = eligibleTechs.find((t) => t.id === selectedTechId) || eligibleTechs[0];

  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-sky-400 rounded-full shadow-2xl backdrop-blur-md text-white">
          <Sparkles className="w-4 h-4 text-sky-300" />
          <span className="font-bold text-xs sm:text-sm tracking-wide text-sky-200 font-display">
            {l(`THE SPIRAL SETUP (${player.name})`, `螺旋一族开局科技 (${player.name})`)}
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-sky-400 to-indigo-400 hover:from-sky-300 hover:to-indigo-300 text-slate-950 rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{l('Choose Cheapest Tech', '选择最低费科技')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="spiral-starting-tech-modal"
      className="fixed top-18 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-128 max-w-xl pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-200 font-sans"
    >
      <div className="bg-slate-900/95 border-2 border-sky-400/80 rounded-2xl shadow-2xl backdrop-blur-md p-4 sm:p-5 flex flex-col overflow-y-auto max-h-[calc(100vh-90px)] text-slate-100">
        {/* Header Bar */}
        <div className="w-full flex items-center justify-between mb-3 pb-2 border-b border-sky-800/60">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-sky-200 font-mono font-bold px-2 py-0.5 rounded bg-sky-950/80 border border-sky-600/80">
              {l('Faction Setup • MIND', '种族初始设置 • 心智法则')}
            </span>
          </div>
          <button
            type="button"
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
          <div className="p-2 rounded-xl bg-sky-950/70 border border-sky-400/70 text-sky-300 shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 font-display">
              {l('The Spiral — Cheapest Starting Technology', '螺旋一族 — 最低印刷费用初始科技')}
            </h2>
            <p className="text-[11px] text-sky-300">
              {l('Commander', '指挥官')} <strong className="text-amber-300">{player.name}</strong>
              {l(
                `, select 1 Tech Tile from the Tech Tray tied for the lowest printed cost (${minCost} Science) to place on Slot 1 of your single tech line.`,
                `，请从当前科技盘中选择 1 枚并列最低印刷费用（${minCost} 科研）的科技板块，免费置于你单一科技轨的第 1 格。`
              )}
            </p>
          </div>
        </div>

        {/* Tied Lowest-Cost Tech Options */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {eligibleTechs.map((tech) => {
              const isSelected = activeTech?.id === tech.id;
              const tName = translateTechName(tech.id, tech.name, language);
              const tDesc = translateTechDesc(tech.id, tech.description, language);
              return (
                <button
                  key={tech.id}
                  type="button"
                  data-testid={`spiral-setup-tech-${tech.id}`}
                  onClick={() => setSelectedTechId(tech.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-950/50 border-sky-400 shadow-lg ring-2 ring-sky-400/40'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="shrink-0">
                    <TechTileIconography tech={tech} compact className="w-12 h-12" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-slate-100 truncate">{tName}</span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-pink-300 font-bold mt-0.5">
                      {l(`Printed Cost: ${tech.baseCost} (Min ${tech.minCost})`, `印刷费用：${tech.baseCost}（最低 ${tech.minCost}）`)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-snug">{tDesc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!activeTech}
            data-testid="spiral-setup-confirm-btn"
            onClick={() => activeTech && onChooseTech(activeTech.id)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 disabled:opacity-40 text-slate-950 font-black text-xs tracking-wider uppercase shadow-lg transition cursor-pointer"
          >
            {activeTech
              ? l(
                  `Take ${translateTechName(activeTech.id, activeTech.name, language)} & Begin Round 1`,
                  `获取「${translateTechName(activeTech.id, activeTech.name, language)}」并开始第 1 轮`
                )
              : l('Select a Technology', '请选择科技')}
          </button>
        </div>
      </div>
    </div>
  );
};
