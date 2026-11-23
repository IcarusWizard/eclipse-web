import React, { useState, useEffect } from 'react';
import { PendingPopulationReturnChoice } from '../../engine/types/state';
import { PlayerState } from '../../engine/types/player';
import { getAllowedReturnTracksForPlanet } from '../../engine/rules/economyEngine';
import { Coins, FlaskConical, Hammer, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateFactionName } from '../../i18n/catalogTranslations';

interface ReturnDestroyedPopulationModalProps {
  player: PlayerState;
  pending: PendingPopulationReturnChoice;
  remainingCount?: number;
  onConfirm: (sectorId: string, planetIndex: number, resource: 'money' | 'science' | 'material') => void;
}

export const ReturnDestroyedPopulationModal: React.FC<ReturnDestroyedPopulationModalProps> = ({
  player,
  pending,
  remainingCount = 1,
  onConfirm,
}) => {
  const { l, language } = useLanguage();
  const { selectableTracks, usedByTrack } = getAllowedReturnTracksForPlanet(player, pending.allowedTracks);

  const pickDefaultTrack = (): 'money' | 'science' | 'material' => {
    if (pending.previousResource && selectableTracks.includes(pending.previousResource)) {
      return pending.previousResource;
    }
    return selectableTracks[0] || pending.allowedTracks[0] || 'money';
  };

  const [selectedTrack, setSelectedTrack] = useState<'money' | 'science' | 'material'>(pickDefaultTrack);

  useEffect(() => {
    setSelectedTrack(pickDefaultTrack());
  }, [pending.playerId, pending.sectorId, pending.planetIndex]);

  const trackDefs: Array<{
    key: 'money' | 'science' | 'material';
    label: string;
    icon: React.ReactNode;
    accentClass: string;
    selectedClass: string;
  }> = [
    {
      key: 'money',
      label: l('Money Track', '金钱轨道'),
      icon: <Coins className="w-4 h-4 text-amber-400" />,
      accentClass: 'text-amber-300',
      selectedClass: 'border-amber-400 bg-amber-950/60 ring-2 ring-amber-400/40',
    },
    {
      key: 'science',
      label: l('Science Track', '科研轨道'),
      icon: <FlaskConical className="w-4 h-4 text-pink-400" />,
      accentClass: 'text-pink-300',
      selectedClass: 'border-pink-400 bg-pink-950/60 ring-2 ring-pink-400/40',
    },
    {
      key: 'material',
      label: l('Material Track', '材料轨道'),
      icon: <Hammer className="w-4 h-4 text-orange-400" />,
      accentClass: 'text-orange-300',
      selectedClass: 'border-orange-400 bg-orange-950/60 ring-2 ring-orange-400/40',
    },
  ];

  const tracks = trackDefs.filter((t) => pending.allowedTracks.includes(t.key));
  const factionName = translateFactionName(player.faction.id, player.faction.name, language);
  const canSubmit = selectableTracks.includes(selectedTrack);

  return (
    <div
      data-testid="return-destroyed-population-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border-2 border-purple-500/80 rounded-2xl p-5 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-purple-300 font-bold">
            {player.name} ({factionName})
            {remainingCount > 1 ? ` • ${l(`${remainingCount} pending`, `剩余 ${remainingCount} 枚`)}` : ''}
          </div>
          <h3 className="text-base font-bold text-white font-display mt-0.5">
            {pending.isOrbital
              ? l('Return Destroyed Orbital Population Cube', '选择被毁轨道站人口返还轨道')
              : l('Return Destroyed Wild Population Cube', '选择被毁万能行星人口返还轨道')}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {pending.isOrbital
              ? l(
                  `Your Orbital population cube in Sector ${pending.sectorNumber} was destroyed. Choose whether it returns to your Money or Science Casualty Slot (returns to track in Cleanup):`,
                  `你在星区 ${pending.sectorNumber} 的轨道站人口方块被摧毁。请选择它放入金钱或科研伤亡槽（将在清理阶段返回对应轨道）：`
                )
              : l(
                  `Your Wild planet population cube in Sector ${pending.sectorNumber} was destroyed. Choose which Population Track's Casualty Slot receives it (returns to track in Cleanup):`,
                  `你在星区 ${pending.sectorNumber} 的万能行星人口方块被摧毁。请选择放入哪条人口轨道的伤亡槽（将在清理阶段返回对应轨道）：`
                )}
          </p>
        </div>

        <div className="space-y-2">
          {tracks.map((tr) => {
            const count = usedByTrack[tr.key];
            const eligible = selectableTracks.includes(tr.key);
            const isSelected = selectedTrack === tr.key;

            return (
              <button
                key={tr.key}
                type="button"
                data-testid={`return-pop-track-${tr.key}`}
                disabled={!eligible}
                onClick={() => setSelectedTrack(tr.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition ${
                  !eligible
                    ? 'border-slate-800 bg-slate-950/50 opacity-45 cursor-not-allowed'
                    : isSelected
                    ? tr.selectedClass
                    : 'border-slate-700/80 bg-slate-950/60 hover:border-slate-500 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {tr.icon}
                  <div>
                    <div className={`text-sm font-bold ${tr.accentClass}`}>{tr.label}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {l(`Cubes (Track + Casualty): ${count} / 11`, `方块数（轨道+伤亡槽）：${count} / 11`)}
                      {usedByTrack[tr.key] >= 11 ? ` (${l('Full', '已满')})` : ''}
                    </div>
                  </div>
                </div>
                {isSelected && eligible && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          data-testid="confirm-return-pop-track-btn"
          disabled={!canSubmit}
          onClick={() => onConfirm(pending.sectorId, pending.planetIndex, selectedTrack)}
          className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs tracking-wider uppercase transition cursor-pointer"
        >
          {l('Confirm Return Track', '确认返还轨道')}
        </button>
      </div>
    </div>
  );
};
