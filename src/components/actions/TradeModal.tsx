import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { getTradeRateForResource } from '../../engine/rules/economyEngine';
import { ArrowRightLeft, ArrowRight, Coins, FlaskConical, Hammer, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateResourceType } from '../../i18n/catalogTranslations';

interface TradeModalProps {
  player: PlayerState;
  onTrade: (
    fromResource: 'money' | 'science' | 'material',
    amount: number,
    toResource: 'money' | 'science' | 'material'
  ) => void;
  readOnly?: boolean;
  onClose: () => void;
}

type ResourceType = 'money' | 'science' | 'material';

export const TradeModal: React.FC<TradeModalProps> = ({
  player,
  onTrade,
  readOnly = false,
  onClose,
}) => {
  const { language, l } = useLanguage();
  const isRhoIndi = player.faction.id === 'rho_indi_syndicate';
  const isSpiral = player.faction.id === 'the_spiral';
  const [fromResource, setFromResource] = useState<ResourceType>('material');
  const [toResource, setToResource] = useState<ResourceType>('money');
  const { spend: ratio, receive } = getTradeRateForResource(player, fromResource);
  const [amount, setAmount] = useState<number>(ratio);
  const available =
    fromResource === 'money'
      ? player.resources.money
      : fromResource === 'science'
      ? player.resources.science
      : player.resources.materials;

  const maxTrade = Math.floor(available / ratio) * ratio;
  const gained = Math.floor(amount / ratio) * receive;

  const canTrade = amount > 0 && amount <= available && amount % ratio === 0 && fromResource !== toResource;

  const handleSelectFrom = (res: ResourceType) => {
    setFromResource(res);
    if (res === toResource) {
      // Pick another resource for target
      const choices: ResourceType[] = ['money', 'science', 'material'];
      const alt = choices.find((c) => c !== res) || 'money';
      setToResource(alt);
    }
    setAmount(getTradeRateForResource(player, res).spend);
  };

  const handleSelectTo = (res: ResourceType) => {
    if (res === fromResource) return;
    setToResource(res);
  };

  const resourceConfig: Record<ResourceType, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
    money: {
      label: l('Credits (Money)', '金钱'),
      icon: <Coins className="w-4 h-4 text-yellow-400" />,
      color: 'text-yellow-400',
      bg: 'bg-yellow-950/40',
      border: 'border-yellow-500',
    },
    science: {
      label: l('Science', '科研'),
      icon: <FlaskConical className="w-4 h-4 text-pink-400" />,
      color: 'text-pink-400',
      bg: 'bg-pink-950/40',
      border: 'border-pink-500',
    },
    material: {
      label: l('Materials', '材料'),
      icon: <Hammer className="w-4 h-4 text-amber-500" />,
      color: 'text-amber-400',
      bg: 'bg-amber-950/40',
      border: 'border-amber-500',
    },
  };

  const getBalance = (res: ResourceType) => {
    if (res === 'money') return player.resources.money;
    if (res === 'science') return player.resources.science;
    return player.resources.materials;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <ArrowRightLeft className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100 font-display">
              {l('COMMERCE & RESOURCE EXCHANGE', '星际贸易与资源兑换')}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-400 leading-relaxed">
            {isRhoIndi ? (
              language === 'zh' ? (
                <>
                  <span className="text-amber-400 font-bold">罗印迪辛迪加非对称贸易：</span>{' '}
                  以 <strong>3 金钱兑换 2</strong> 科研或材料（3:2），或以 <strong>3 材料/科研兑换 1</strong> 任意其他资源（3:1）。
                </>
              ) : (
                <>
                  <span className="text-amber-400 font-bold">Rho Indi Syndicate Asymmetric Trade:</span>{' '}
                  Trade <strong>3 Money for 2</strong> Science or Materials (3:2), or trade <strong>3 Materials / Science for 1</strong> of any other resource (3:1).
                </>
              )
            ) : isSpiral ? (
              language === 'zh' ? (
                <>
                  <span className="text-sky-300 font-bold">螺旋一族非对称贸易：</span>{' '}
                  以 <strong>2 科研兑换 1</strong> 金钱或材料（2:1），以 <strong>3 材料/金钱兑换 1</strong> 任意其他资源（3:1）。
                </>
              ) : (
                <>
                  <span className="text-sky-300 font-bold">The Spiral Asymmetric Trade:</span>{' '}
                  Trade <strong>2 Science for 1</strong> Money or Materials (2:1), or trade <strong>3 Materials / Money for 1</strong> of any other resource (3:1).
                </>
              )
            ) : (
              language === 'zh' ? (
                <>
                  种族汇率：<strong className="text-amber-400 font-bold">{ratio}:1</strong>。按你的银河贸易比例，用 {ratio} 单位任意资源兑换 1 单位其他资源。
                </>
              ) : (
                <>
                  Faction Exchange Rate: <strong className="text-amber-400 font-bold">{ratio}:1</strong>.{' '}
                  Trade {ratio} units of any resource for 1 unit of another resource at your galactic commerce ratio.
                </>
              )
            )}
          </div>

          {/* Trade Source */}
          <div>
            <label className="block text-slate-300 font-bold uppercase mb-2 text-[11px] tracking-wider">
              {l(`1. Trade Source (Pay ${ratio} units)`, `1. 付出资源（每次 ${ratio} 单位）`)}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['material', 'science', 'money'] as const).map((res) => {
                const cfg = resourceConfig[res];
                const isSelected = fromResource === res;
                return (
                  <button
                    key={`from_${res}`}
                    type="button"
                    onClick={() => handleSelectFrom(res)}
                    className={`p-2.5 rounded-lg border flex flex-col justify-between text-left transition-all ${
                      isSelected
                        ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-1 ring-amber-400/30 font-bold`
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {cfg.icon}
                      <span className="truncate">{cfg.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-300">
                      {getBalance(res)} {l('Avail', '可用')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trade Destination */}
          <div>
            <label className="block text-slate-300 font-bold uppercase mb-2 text-[11px] tracking-wider">
              {l(`2. Trade Target (Receive ${receive} ${receive === 1 ? 'unit' : 'units'})`, `2. 获得资源（每次获得 ${receive} 单位）`)}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['money', 'science', 'material'] as const).map((res) => {
                const cfg = resourceConfig[res];
                const isSelected = toResource === res;
                const isDisabled = fromResource === res;
                return (
                  <button
                    key={`to_${res}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectTo(res)}
                    className={`p-2.5 rounded-lg border flex flex-col justify-between text-left transition-all ${
                      isDisabled
                        ? 'opacity-30 border-slate-900 bg-slate-950/40 cursor-not-allowed'
                        : isSelected
                        ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-1 ring-emerald-400/30 font-bold`
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {cfg.icon}
                      <span className="truncate">{cfg.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-300">
                      {getBalance(res)} {l('Current', '当前')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount input & Exchange summary */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <label className="block text-slate-300 font-bold uppercase mb-2 text-[11px] tracking-wider">
              {l(`Amount to Spend (Multiples of ${ratio})`, `花费数量（${ratio} 的倍数）`)}
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={ratio}
                max={maxTrade}
                step={ratio}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 w-32 font-bold text-slate-100 font-mono focus:border-amber-500 focus:outline-none text-sm"
              />
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {l('Yields', '获得')}{' '}
                  <strong className="text-emerald-400 font-bold text-base font-mono">
                    +{gained} {resourceConfig[toResource].label}
                  </strong>
                </span>
              </div>
            </div>
            {amount > available && (
              <div className="mt-2 text-rose-400 font-medium text-[11px]">
                {l(`Insufficient ${fromResource} (${available} available).`, `${translateResourceType(fromResource, language)}不足（仅剩 ${available}）。`)}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            {l('Cancel', '取消')}
          </button>
          <button
            disabled={readOnly || !canTrade}
            onClick={() => onTrade(fromResource, amount, toResource)}
            className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs tracking-wide shadow transition-all cursor-pointer"
          >
            {readOnly ? l('Spectator Mode (Read Only)', '观战模式（只读）') : l('Confirm Exchange', '确认兑换')}
          </button>
        </div>
      </div>
    </div>
  );
};
