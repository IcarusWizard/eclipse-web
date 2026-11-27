import React, { useState, useMemo } from 'react';
import { PlayerState } from '../../engine/types/player';
import { Technology } from '../../engine/types/tech';
import { calculateTechCost } from '../../engine/rules/techData';
import { TechTileIconography } from '../common/PhysicalTileIconography';
import { Sparkles, Check, Minimize2, Maximize2, FlaskConical, SkipForward } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateTechDesc, translateTechName } from '../../i18n/catalogTranslations';

interface TechnoMagesStartingTechModalProps {
  player: PlayerState;
  techSupply: Technology[];
  onChooseTech: (techId: string | null, targetTrack?: 'military' | 'grid' | 'nano') => void;
}

export const TechnoMagesStartingTechModal: React.FC<TechnoMagesStartingTechModalProps> = ({
  player,
  techSupply,
  onChooseTech,
}) => {
  const { language, l } = useLanguage();
  const affordableTechs = useMemo(() => {
    return (techSupply || []).filter((t) => {
      const tr =
        t.category === 'military' || t.category === 'grid' || t.category === 'nano'
          ? t.category
          : 'nano';
      return calculateTechCost(t, 0, tr, player.faction.id) <= player.resources.science;
    });
  }, [techSupply, player.faction.id, player.resources.science]);

  const [selectedTechId, setSelectedTechId] = useState<string>(affordableTechs[0]?.id || '');
  const [rareTargetTrack, setRareTargetTrack] = useState<'military' | 'grid' | 'nano'>('nano');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const activeTech = affordableTechs.find((t) => t.id === selectedTechId) || affordableTechs[0] || null;
  const activeCost = activeTech
    ? calculateTechCost(
        activeTech,
        0,
        activeTech.category === 'rare' ? rareTargetTrack : activeTech.category,
        player.faction.id
      )
    : 0;

  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-violet-400 rounded-full shadow-2xl backdrop-blur-md text-white">
          <Sparkles className="w-4 h-4 text-violet-300" />
          <span className="font-bold text-xs sm:text-sm tracking-wide text-violet-200 font-display">
            {l(`TECHNO-MAGES SETUP (${player.name})`, `科技法师开局科技 (${player.name})`)}
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-violet-400 to-fuchsia-400 hover:from-violet-300 hover:to-fuchsia-300 text-slate-950 rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{l('Starting Tech Option', '选择初始科技')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="technomages-starting-tech-modal"
      className="fixed top-18 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-128 max-w-xl pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-200 font-sans"
    >
      <div className="bg-slate-900/95 border-2 border-violet-400/80 rounded-2xl shadow-2xl backdrop-blur-md p-4 sm:p-5 flex flex-col overflow-y-auto max-h-[calc(100vh-90px)] text-slate-100">
        {/* Header Bar */}
        <div className="w-full flex items-center justify-between mb-3 pb-2 border-b border-violet-800/60">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-violet-200 font-mono font-bold px-2 py-0.5 rounded bg-violet-950/80 border border-violet-600/80">
              {l('Faction Setup • Optional Tech Purchase', '种族开局设置 • 可选购买起始科技')}
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
          <div className="p-2 rounded-xl bg-violet-950/70 border border-violet-400/70 text-violet-300 shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 font-display">
              {l('Techno-Mages — Optional Starting Technology', '科技法师 — 开局前可选购买 1 项科技')}
            </h2>
            <p className="text-[11px] text-violet-300">
              {l('Commander', '指挥官')} <strong className="text-amber-300">{player.name}</strong>
              {l(
                ` starts with ${player.resources.science} Science and 0 Techs. Before Round 1 begins, you may spend initial Science to buy 1 Technology Tile from the Tech Tray (or skip and keep all ${player.resources.science} Science).`,
                ` 初始拥有 ${player.resources.science} 科研且无初始科技。第 1 轮开始前，你可以花费起始科研从科技盘购买 1 枚科技板块（也可跳过以保留全部 ${player.resources.science} 科研）。`
              )}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {affordableTechs.length === 0 ? (
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400">
              {l(
                'No technologies in the Tech Tray are currently affordable with your initial Science.',
                '当前科技盘中没有初始科研足以负担的科技。'
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {affordableTechs.map((tech) => {
                const isSelected = activeTech?.id === tech.id;
                const tName = translateTechName(tech.id, tech.name, language);
                const tDesc = translateTechDesc(tech.id, tech.description, language);
                const cost = calculateTechCost(
                  tech,
                  0,
                  tech.category === 'rare' ? rareTargetTrack : tech.category,
                  player.faction.id
                );
                return (
                  <button
                    key={tech.id}
                    type="button"
                    data-testid={`tm-setup-tech-${tech.id}`}
                    onClick={() => setSelectedTechId(tech.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-violet-950/50 border-violet-400 shadow-lg ring-2 ring-violet-400/40'
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
                          <div className="w-4 h-4 rounded-full bg-violet-400 text-slate-950 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-pink-300 font-bold mt-0.5">
                        {l(`Cost: ${cost} Science`, `费用：${cost} 科研`)}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-snug">{tDesc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTech?.category === 'rare' && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-violet-800/60 text-xs">
              <span className="text-slate-300 font-semibold">{l('Place Rare Tech on Track:', '稀有科技放置行：')}</span>
              <div className="flex gap-1.5">
                {(['military', 'grid', 'nano'] as const).map((tr) => (
                  <button
                    key={tr}
                    type="button"
                    onClick={() => setRareTargetTrack(tr)}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase border cursor-pointer ${
                      rareTargetTrack === tr
                        ? 'bg-violet-500 text-slate-950 border-violet-300'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}
                  >
                    {tr}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {activeTech && (
              <button
                type="button"
                data-testid="tm-setup-buy-btn"
                onClick={() =>
                  onChooseTech(
                    activeTech.id,
                    activeTech.category === 'rare' ? rareTargetTrack : activeTech.category
                  )
                }
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-slate-950 font-black text-xs tracking-wider uppercase shadow-lg transition cursor-pointer"
              >
                {l(
                  `Buy ${translateTechName(activeTech.id, activeTech.name, language)} (${activeCost} Sci)`,
                  `购买「${translateTechName(activeTech.id, activeTech.name, language)}」（${activeCost} 科研）`
                )}
              </button>
            )}
            <button
              type="button"
              data-testid="tm-setup-skip-btn"
              onClick={() => onChooseTech(null)}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs tracking-wider uppercase shadow transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <SkipForward className="w-3.5 h-3.5" />
              {l(`Skip (Keep ${player.resources.science} Science)`, `跳过（保留 ${player.resources.science} 科研）`)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
