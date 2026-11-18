import React, { useEffect, useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { PendingAmbassadorCubeReturn } from '../../engine/types/state';
import { getIncomeForTrack } from '../../engine/rules/economyEngine';
import { AlertTriangle, Coins, FlaskConical, Hammer, Swords, Check } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateFactionName } from '../../i18n/catalogTranslations';

interface BetrayalConfirmationModalProps {
  isOpen: boolean;
  allies: PlayerState[];
  onCancel: () => void;
  onConfirm: () => void;
}

export const BetrayalConfirmationModal: React.FC<BetrayalConfirmationModalProps> = ({
  isOpen,
  allies,
  onCancel,
  onConfirm,
}) => {
  const { l, language } = useLanguage();
  if (!isOpen || allies.length === 0) return null;

  const allyLabels = allies
    .map((a) => `${a.name} (${translateFactionName(a.faction.id, a.faction.name, language)})`)
    .join(', ');

  return (
    <div
      data-testid="betrayal-confirmation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border-2 border-rose-500/80 rounded-2xl p-5 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-300 font-display uppercase tracking-wide">
              {l('Confirm Act of Aggression & Betrayal', '确认侵略与破盟行为')}
            </h3>
            <p className="text-xs text-slate-400">
              {l('Your ships ended movement inside allied space.', '你的舰船在盟友控制的星区或飞船所在星区结束了移动。')}
            </p>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 space-y-2 leading-relaxed">
          <p>
            {l('Confirming and ending your Move action will break your diplomatic alliance with ', '确认并结束此次移动行动将立即打破与以下玩家的同盟关系：')}
            <strong className="text-rose-300">{allyLabels}</strong>.
          </p>
          <p className="text-slate-400 text-[11px]">
            {l(
              'You will lose their Ambassador (+1 VP), take the Traitor Tile (-2 VP), and both players will choose which Population Track receives their returned Ambassador cube.',
              '你将失去其大使板块（+1 VP）并获得背叛者板块（-2 VP），随后双方将选择把退回的使节人口方块放回哪一条人口轨道。'
            )}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            data-testid="cancel-betrayal-confirm-btn"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow cursor-pointer"
          >
            {l('Go Back (Review / Revert)', '返回（查看 / 撤回）')}
          </button>
          <button
            type="button"
            data-testid="confirm-betrayal-proceed-btn"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition shadow-lg cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>{l('Confirm Move & Break Alliance', '确认结束并打破同盟')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ReturnAmbassadorCubeModalProps {
  player: PlayerState;
  pending: PendingAmbassadorCubeReturn;
  onConfirm: (formerAllyId: string, resource: 'money' | 'science' | 'material') => void;
}

export const ReturnAmbassadorCubeModal: React.FC<ReturnAmbassadorCubeModalProps> = ({
  player,
  pending,
  onConfirm,
}) => {
  const { l, language } = useLanguage();

  const pickDefaultTrack = (): 'money' | 'science' | 'material' => {
    const order: Array<'money' | 'science' | 'material'> = pending.preferredTrack
      ? [pending.preferredTrack, 'money', 'science', 'material']
      : ['money', 'science', 'material'];
    return order.find((t) => player.population[t].cubesOnBoard < 11) || 'money';
  };

  const [selectedTrack, setSelectedTrack] = useState<'money' | 'science' | 'material'>(pickDefaultTrack);

  useEffect(() => {
    setSelectedTrack(pickDefaultTrack());
  }, [pending.playerId, pending.formerAllyId, pending.preferredTrack]);

  const tracks: Array<{
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

  const factionName = translateFactionName(player.faction.id, player.faction.name, language);
  const canSubmit = player.population[selectedTrack].cubesOnBoard < 11;

  return (
    <div
      data-testid="return-ambassador-cube-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border-2 border-indigo-500/80 rounded-2xl p-5 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-300 font-bold">
            {player.name} ({factionName})
          </div>
          <h3 className="text-base font-bold text-white font-display mt-0.5">
            {l('Return Ambassador Population Cube', '选择退回大使人口方块轨道')}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {l(
              `Your alliance with ${pending.formerAllyName} has broken. Choose which Population Track receives your returned cube:`,
              `你与 ${pending.formerAllyName} 的同盟已破裂。请选择将退回的使节人口方块放回哪一条人口轨道：`
            )}
          </p>
        </div>

        <div className="space-y-2">
          {tracks.map((t) => {
            const currentCubes = player.population[t.key].cubesOnBoard;
            const isFull = currentCubes >= 11;
            const isSelected = selectedTrack === t.key;
            const curIncome = getIncomeForTrack(currentCubes);
            const nextIncome = getIncomeForTrack(Math.min(11, currentCubes + 1));

            return (
              <button
                key={t.key}
                type="button"
                data-testid={`return-cube-track-${t.key}`}
                disabled={isFull}
                onClick={() => setSelectedTrack(t.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isSelected
                    ? t.selectedClass
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {t.icon}
                  <div>
                    <div className={`text-xs font-bold ${t.accentClass}`}>{t.label}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {l(`Cubes: ${currentCubes}/11`, `方块数: ${currentCubes}/11`)}
                      {pending.preferredTrack === t.key && (
                        <span className="ml-1.5 text-[10px] text-indigo-300">
                          {l('(Original)', '(原轨道)')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  {isFull ? (
                    <span className="text-rose-400 font-bold">{l('Full', '已满')}</span>
                  ) : (
                    <span className="text-emerald-300 font-bold">
                      +{curIncome} &rarr; +{nextIncome}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            data-testid="confirm-return-cube-btn"
            disabled={!canSubmit}
            onClick={() => onConfirm(pending.formerAllyId, selectedTrack)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-black transition shadow-lg cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{l('Confirm Return Cube', '确认放回轨道')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
