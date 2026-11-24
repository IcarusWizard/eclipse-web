import React from 'react';
import { Rocket, Wrench, Archive, Trophy, Zap, Cpu, AlertTriangle, Minimize2, Maximize2, Check, X, FlaskConical, Sparkles } from 'lucide-react';
import { SectorTile, DiscoveryTile, ShipType } from '../../engine/types/galaxy';
import { PlayerState } from '../../engine/types/player';
import { Technology } from '../../engine/types/tech';
import { SHIP_PARTS } from '../../engine/rules/partData';
import { calculateBlueprintStats, SHIP_LIMITS, countPlayerShips } from '../../engine/rules/shipValidation';
import { ShipBlueprintSlotsLayout } from '../blueprints/ShipBlueprintSlotsLayout';
import { ShipPartTileIconography } from '../common/PhysicalTileIconography';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  translateTechName,
  translateTechCategory,
  translatePartName,
  translateShipType,
  translateResourceType,
} from '../../i18n/catalogTranslations';

interface DiscoveryChoiceModalProps {
  discovery: DiscoveryTile;
  discoveryOptions?: DiscoveryTile[];
  player: PlayerState;
  techSupply?: Technology[];
  sectors?: SectorTile[];
  sectorId?: string;
  fromExplore?: boolean;
  onChoice: (
    keepForVictoryPoints: boolean,
    equipShipType?: ShipType,
    equipSlotIndex?: number,
    chosenTechId?: string,
    colonizeOrbitalResource?: 'money' | 'science',
    chosenResource?: 'money' | 'science' | 'material',
    chosenDiscoveryId?: string
  ) => void;
}

export const DiscoveryChoiceModal: React.FC<DiscoveryChoiceModalProps> = ({
  discovery,
  discoveryOptions,
  player,
  techSupply,
  sectors,
  sectorId,
  fromExplore,
  onChoice,
}) => {
  const { language, l } = useLanguage();
  const options = discoveryOptions && discoveryOptions.length > 0 ? discoveryOptions : [discovery];
  const [chosenDiscoveryId, setChosenDiscoveryId] = React.useState<string>(discovery.id);
  React.useEffect(() => {
    setChosenDiscoveryId(discovery.id);
  }, [discovery.id, discoveryOptions]);

  const activeDiscovery = options.find((o) => o.id === chosenDiscoveryId) || discovery;
  const part = activeDiscovery.shipPartId ? SHIP_PARTS[activeDiscovery.shipPartId] : null;

  const sector = sectors?.find((s) => s.id === sectorId);
  const isSectorAlreadyControlled = sector ? sector.discOwner === player.id : false;
  const isControlledOrStandalone = sector ? sector.discOwner === player.id : true;
  const showNextStepControlNote = fromExplore && sector && !isSectorAlreadyControlled;

  const [isMinimized, setIsMinimized] = React.useState<boolean>(false);
  const [selectedShipType, setSelectedShipType] = React.useState<ShipType>('cruiser');
  const [selectedSlotIndex, setSelectedSlotIndex] = React.useState<number>(() => {
    const bp = player.blueprints['cruiser'];
    if (!bp) return 0;
    const emptyIdx = bp.slots.findIndex((s) => s === null);
    return emptyIdx !== -1 ? emptyIdx : 0;
  });
  const [selectedTechId, setSelectedTechId] = React.useState<string>('');
  const [colonizeOrbitalResource, setColonizeOrbitalResource] = React.useState<'money' | 'science' | null>(null);
  const [chosenBonusResource, setChosenBonusResource] = React.useState<'money' | 'science' | 'material'>('money');

  const hasColonyShipReady = player.colonyShips.ready > 0;

  const currentBlueprint = player.blueprints[selectedShipType];

  const prevShipTypeRef = React.useRef(selectedShipType);
  // Auto-select first empty slot ONLY when ship type actually changes
  React.useEffect(() => {
    if (prevShipTypeRef.current !== selectedShipType) {
      prevShipTypeRef.current = selectedShipType;
      const bp = player.blueprints[selectedShipType];
      if (bp) {
        const emptyIdx = bp.slots.findIndex((s) => s === null);
        setSelectedSlotIndex(emptyIdx !== -1 ? emptyIdx : 0);
      }
    }
  }, [selectedShipType, player.blueprints]);

  const isMuonSource = part?.id === 'muon_source';

  // Bug 53: Validate power for immediate installation
  const testBp = React.useMemo(() => {
    if (!currentBlueprint || !part) return null;
    if (isMuonSource) {
      return {
        ...currentBlueprint,
        slots: [...currentBlueprint.slots],
        externalParts: [...(currentBlueprint.externalParts || []), part],
      };
    }
    if (selectedSlotIndex < 0 || selectedSlotIndex >= currentBlueprint.maxSlots) {
      return null;
    }
    const cloned = { ...currentBlueprint, slots: [...currentBlueprint.slots] };
    cloned.slots[selectedSlotIndex] = part;
    return cloned;
  }, [currentBlueprint, part, selectedSlotIndex, isMuonSource]);

  const testStats = testBp ? calculateBlueprintStats(testBp) : null;
  const isPowerDeficit = testStats ? testStats.totalPowerConsumed > testStats.totalPowerProduced : false;

  // Bug 56: Ancient Technology discovery tile eligible regular techs
  const eligibleTechs = React.useMemo(() => {
    if (!activeDiscovery.immediateReward?.ancientTech || !techSupply) return [];
    const owned = new Set(player.techTrack.researched.map((t) => t.id));
    return techSupply
      .filter((t) => ['military', 'grid', 'nano'].includes(t.category) && !owned.has(t.id))
      .sort((a, b) => a.baseCost - b.baseCost);
  }, [activeDiscovery, techSupply, player.techTrack.researched]);

  const minTechCost = eligibleTechs.length > 0 ? eligibleTechs[0].baseCost : 0;
  const tiedTechs = React.useMemo(() => {
    return eligibleTechs.filter((t) => t.baseCost === minTechCost);
  }, [eligibleTechs, minTechCost]);

  React.useEffect(() => {
    if (tiedTechs.length > 0 && !selectedTechId) {
      setSelectedTechId(tiedTechs[0].id);
    }
  }, [tiedTechs, selectedTechId]);

  const grantShipType = activeDiscovery.immediateReward?.grantShipType || (activeDiscovery.id === 'disc_ancient_cruiser' ? 'cruiser' : undefined);
  const isShipSupplyDepleted = Boolean(
    grantShipType &&
    sectors &&
    countPlayerShips(sectors, player.id)[grantShipType] >= SHIP_LIMITS[grantShipType]
  );

  // Minimized floating banner at top
  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-amber-500 rounded-full shadow-2xl backdrop-blur-md text-white">
          {part ? (
            <div className="shrink-0 -my-1">
              <ShipPartTileIconography part={part} size="sm" className="w-8 h-8 rounded-md" />
            </div>
          ) : (
            <Trophy className="w-4 h-4 text-amber-400" />
          )}
          <span className="font-bold text-xs sm:text-sm tracking-wide text-amber-300 font-display">
            {l(`ANCIENT DISCOVERY: ${activeDiscovery.name} (${player.name})`, `远古探索发现：${activeDiscovery.name}（${player.name}）`)}
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-full text-xs font-bold transition-all shadow-md shadow-amber-950/50 flex items-center gap-1.5 cursor-pointer"
            title={l('Return to discovery resolution', '返回处理探索发现')}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{l('Resolve Discovery', '处理发现')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Side window (Bug 123)
  return (
    <div className="fixed top-18 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-125 max-w-xl pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="relative w-full bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl shadow-2xl backdrop-blur-md p-5 flex flex-col items-center text-center overflow-y-auto max-h-[calc(100vh-90px)]">
        {/* Glow ambient decoration */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Action Bar */}
        <div className="w-full flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-widest text-amber-400 font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80">
            {l('Ancient Artifact', '远古探索发现')}
          </span>
          <button
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors shadow-sm cursor-pointer"
            title={l('Minimize to inspect map', '最小化以查看星图')}
          >
            <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{l('View Map', '查看星图')}</span>
          </button>
        </div>

        <h2 className="text-2xl font-black text-white tracking-wide mb-1 font-display">
          {activeDiscovery.name}
        </h2>
        <div className="text-xs text-slate-400 mb-3 font-medium">
          {l('Commander', '指挥官')} <span className="font-bold text-slate-200">{player.name}</span> {l('must decide how to utilize this ancient artifact.', '必须决定如何利用此远古发现。')}
        </div>

        {/* Atlantians Ancient Spirit Dual-Discovery Selector */}
        {options.length > 1 && (
          <div className="w-full mb-3 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/50 text-left">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{l(`Ancient Spirit — Select 1 of ${options.length} Discovery Tiles to Resolve:`, `远古之灵 — 从 ${options.length} 张发现板块中选择 1 张结算：`)}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {options.map((opt, idx) => {
                const isPicked = activeDiscovery.id === opt.id;
                const optPart = opt.shipPartId ? SHIP_PARTS[opt.shipPartId] : null;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`discovery-option-${opt.id}`}
                    onClick={() => setChosenDiscoveryId(opt.id)}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2.5 transition cursor-pointer ${
                      isPicked
                        ? 'bg-cyan-500/25 border-cyan-400 text-white shadow-md ring-1 ring-cyan-400/60'
                        : 'bg-slate-950/80 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {optPart ? (
                      <ShipPartTileIconography part={optPart} size="sm" className="w-10 h-10 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-amber-950/60 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <Trophy className="w-4 h-4 text-amber-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">
                        #{idx + 1}: {opt.name}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                        {opt.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tile Details Card */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 mb-4 text-left">
          <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
            {activeDiscovery.description}
          </p>

          {part && (
            <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-3 flex items-center gap-3.5">
              <div className="shrink-0">
                <ShipPartTileIconography part={part} size="md" className="w-16 h-16 sm:w-[72px] sm:h-[72px] shadow-md shadow-black/70" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                  {part.powerConsumed > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 font-bold">
                      -{part.powerConsumed}⚡ {l('Power', '能量')}
                    </span>
                  )}
                  {part.powerProduced > 0 && (
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold">
                      +{part.powerProduced}⚡ {l('Power', '能量')}
                    </span>
                  )}
                  {part.initiativeBonus !== 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-400/50 text-amber-200 font-bold">
                      {part.initiativeBonus > 0 ? `+${part.initiativeBonus}` : part.initiativeBonus} {l('Init', '先攻')}
                    </span>
                  )}
                  {part.driveSpeed ? (
                    <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-bold">
                      {l('Speed', '航速')} {part.driveSpeed}
                    </span>
                  ) : part.isJumpDrive ? (
                    <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-bold">
                      {l('Jump Drive (1 Hex)', '跳跃引擎（1 格）')}
                    </span>
                  ) : null}
                  {part.morphShield && (
                    <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/50 text-rose-300 font-bold">
                      {l('-1 Shield & Heals 1 HP/Round', '-1 护盾 & 每轮回复 1 生命')}
                    </span>
                  )}
                  {part.shieldBonus > 0 && !part.morphShield && (
                    <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/50 text-blue-300 font-bold">
                      -{part.shieldBonus} {l('Shield', '护盾')}
                    </span>
                  )}
                  {part.computerBonus > 0 && (
                    <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/50 text-indigo-300 font-bold">
                      +{part.computerBonus} {l('COMP', '计算机')}
                    </span>
                  )}
                  {part.hullBonus > 0 && (
                    <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/50 text-rose-300 font-bold">
                      +{part.hullBonus} {l('HP', '生命')}
                    </span>
                  )}
                  {part.dice && part.dice.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-orange-950/80 border border-orange-500/50 text-orange-300 font-bold">
                      {part.dice.map((d) => `${d.count}x ${d.damagePerHit} ${l('DMG', '伤害')} ${d.color.toUpperCase()} ${d.isMissile ? '🚀' : ''}`).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeDiscovery.immediateReward && (
            <div className="flex flex-wrap gap-2 mt-2">
              {activeDiscovery.immediateReward.money && (
                <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  +{activeDiscovery.immediateReward.money} {l('Credits', '金钱')}
                </span>
              )}
              {activeDiscovery.immediateReward.science && (
                <span className="px-2.5 py-1 bg-pink-500/20 border border-pink-500/40 text-pink-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  +{activeDiscovery.immediateReward.science} {l('Science', '科研')}
                </span>
              )}
              {activeDiscovery.immediateReward.materials && (
                <span className="px-2.5 py-1 bg-amber-700/20 border border-amber-700/40 text-amber-500 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                  +{activeDiscovery.immediateReward.materials} {l('Materials', '材料')}
                </span>
              )}
              {activeDiscovery.immediateReward.grantShipType && (
                <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-purple-400" />
                  +1 {l(`Free ${activeDiscovery.immediateReward.grantShipType.toUpperCase()}`, `免费${translateShipType(activeDiscovery.immediateReward.grantShipType, language)}`)}
                </span>
              )}
              {activeDiscovery.immediateReward.ancientTech && (
                <div className="w-full mt-2 p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-left">
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 mb-1.5">
                    <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="flex items-center gap-1">
                      {l(`+1 Free Regular Technology (Lowest Printed Cost: ${minTechCost}`, `+1 项免费常规科技（最低印刷费用：${minTechCost}`)}
                      <FlaskConical className="w-3.5 h-3.5 text-pink-400 inline shrink-0" />{language === 'zh' ? '）' : ')'}
                    </span>
                  </div>
                  {tiedTechs.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">{l('No eligible technologies in supply', '供应区无可选科技')}</div>
                  ) : tiedTechs.length === 1 ? (
                    <div className="text-xs text-emerald-300 font-semibold flex items-center gap-1">
                      <span>{l('Awarded:', '获得：')}</span>
                      <strong className="text-cyan-200">{translateTechName(tiedTechs[0].id, tiedTechs[0].name, language)}</strong>
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        ({translateTechCategory(tiedTechs[0].category, language)} • {l('Cost', '费用')} {tiedTechs[0].baseCost}
                        <FlaskConical className="w-2.5 h-2.5 text-pink-400 inline shrink-0" />)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                        <span>{l(`Multiple lowest-cost technologies available (${minTechCost}`, `有多个最低费用科技可选（${minTechCost}`)}</span>
                        <FlaskConical className="w-3 h-3 text-pink-400 inline shrink-0" />
                        <span>{l('). Choose which to receive:', '）。选择要获得的一项：')}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {tiedTechs.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTechId(t.id)}
                            className={`p-2 rounded-lg border text-left transition flex items-center justify-between text-xs ${
                              selectedTechId === t.id
                                ? 'bg-cyan-600/30 border-cyan-400 text-white font-bold shadow'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span className="truncate">{translateTechName(t.id, t.name, language)}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800 flex items-center gap-1">
                              <span>{t.category[0].toUpperCase()}</span>
                              <span>•</span>
                              <span>{t.baseCost}</span>
                              <FlaskConical className="w-2.5 h-2.5 text-pink-400 shrink-0" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeDiscovery.immediateReward.grantStructure === 'orbital' && (
                <div className="w-full mt-2 p-2.5 rounded-lg bg-blue-950/60 border border-blue-500/40 text-left">
                  <div className="text-xs font-bold text-blue-300 flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-blue-400" />
                      {l('Ancient Orbital Habitat (+2 Materials)', '远古轨道站（+2 材料）')}
                    </span>
                    <span className="text-[10px] font-mono text-blue-200">
                      {l('Ready Colony Ships:', '可用殖民船：')} <strong>{player.colonyShips.ready}</strong>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mb-2">
                    {l('You may immediately colonize the new Orbital using 1 ready Colony Ship. Orbitals can produce Money or Science.', '你可以使用 1 艘待命殖民船立即殖民新轨道站。轨道站可产出金钱或科研。')}
                  </p>
                  {showNextStepControlNote ? (
                    <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-[11px] text-indigo-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>
                        {l('An Ancient Orbital (+2 Materials) will be placed in this sector. You will decide whether to control this sector in the next step, where it can be colonized.', '此星区将放置 1 座远古轨道站（+2 材料）。你将在下一步决定是否控制该星区，并在之后进行殖民。')}
                      </span>
                    </div>
                  ) : hasColonyShipReady ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setColonizeOrbitalResource(null)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                          colonizeOrbitalResource === null
                            ? 'bg-slate-700 border-white text-white shadow'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {l('Leave Empty (No Colonization)', '暂不殖民')}
                      </button>
                      <button
                        type="button"
                        disabled={player.population.money.cubesOnBoard <= 0}
                        onClick={() => setColonizeOrbitalResource('money')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                          colonizeOrbitalResource === 'money'
                            ? 'bg-yellow-500/30 border-yellow-400 text-yellow-200 font-bold shadow'
                            : 'bg-slate-900 border-slate-700 text-yellow-400/80 hover:text-yellow-300'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                        {l('Colonize with Money (🪙)', '殖民金钱（🪙）')}
                      </button>
                      <button
                        type="button"
                        disabled={player.population.science.cubesOnBoard <= 0}
                        onClick={() => setColonizeOrbitalResource('science')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                          colonizeOrbitalResource === 'science'
                            ? 'bg-pink-500/30 border-pink-400 text-pink-200 font-bold shadow'
                            : 'bg-slate-900 border-slate-700 text-pink-400/80 hover:text-pink-300'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />
                        <span>{l('Colonize with Science', '殖民科研')}</span>
                        <FlaskConical className="w-3 h-3 text-pink-400 shrink-0" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      {l('No ready colony ships available to colonize immediately.', '没有可用殖民船，无法立即殖民。')}
                    </div>
                  )}
                </div>
              )}
              {activeDiscovery.immediateReward.grantStructure === 'monolith' && (
                <span className="px-2.5 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  {l('+1 Ancient Monolith (3 VP)', '+1 远古方尖碑（3 分）')}
                </span>
              )}
              {activeDiscovery.immediateReward.warpPortal && (
                <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-emerald-400" />
                  {l('Ancient Warp Portal (Connects all Warp Portals, 2 VP)', '远古曲速传送门（连接所有传送门，2 分）')}
                </span>
              )}
              {activeDiscovery.immediateReward.artifactCodex && (
                <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  {l('Artifact Codex (+1 VP per Controlled Artifact at Game End)', '遗迹法典（终局每控制 1 个遗迹 +1 分）')}
                </span>
              )}
              {activeDiscovery.immediateReward.ancientMight && (
                <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  {l('Ancient Might (+1 VP per 3 VP in Reputation Tiles at Game End)', '远古之力（终局声望板块每满 3 分额外 +1 分）')}
                </span>
              )}
              {activeDiscovery.immediateReward.choose3Resource && (
                <div className="w-full mt-2 p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-left">
                  <div className="text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    {l('Gain +3 Money plus 3 additional Resources of your choice:', '获得 +3 金钱及任意 3 点额外资源：')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setChosenBonusResource('money')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        chosenBonusResource === 'money'
                          ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold shadow'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      {l('+3 Money (🪙 Total +6)', '+3 金钱（🪙 共计 +6）')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChosenBonusResource('science')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        chosenBonusResource === 'science'
                          ? 'bg-pink-500/30 border-pink-400 text-pink-200 font-bold shadow'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />
                      <span className="flex items-center gap-1">
                        {l('+3 Science (3 Money + 3', '+3 科研（3 金钱 + 3')}
                        <FlaskConical className="w-3 h-3 text-pink-400 shrink-0 inline" /> {l('Science)', '科研）')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChosenBonusResource('material')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        chosenBonusResource === 'material'
                          ? 'bg-amber-700/30 border-amber-600 text-amber-300 font-bold shadow'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                      {l('+3 Materials (⚙️ 3 Money + 3 Materials)', '+3 材料（⚙️ 3 金钱 + 3 材料）')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* If Ancient Tech Module: Immediate Blueprint Installation Interface */}
        {part && currentBlueprint && (
          <div className="w-full bg-slate-950/60 border border-cyan-900/50 rounded-xl p-3 mb-4 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" /> {isMuonSource ? l('Equip Outside Grid (Free)', '免费装配于蓝图外（额外槽位）') : l('Equip Immediately to Ship (Free)', '立即免费装配至飞船')}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {isMuonSource ? l('Select ship class to attach outside grid', '选择要额外挂载的飞船类型') : l('Select ship class and slot to equip', '选择飞船类型与槽位')}
              </span>
            </div>

            {/* Ship Class Tabs */}
            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              {(['interceptor', 'cruiser', 'dreadnought', 'starbase'] as ShipType[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedShipType(st)}
                  className={`py-1 px-2 rounded-lg text-xs font-bold uppercase transition cursor-pointer ${
                    selectedShipType === st
                      ? 'bg-cyan-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {translateShipType(st, language)}
                </button>
              ))}
            </div>

            {/* Slot Grid for Chosen Blueprint OR External Module Card for Muon Source */}
            {isMuonSource ? (
              <div className="p-3 rounded-lg border border-amber-500/70 bg-amber-950/40 text-amber-200">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-300 mb-1">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>{l('External Power Module (Placed Outside Blueprint Grid)', '外置能源模块（置于蓝图格之外）')}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
                  {language === 'zh'
                    ? <>挂载至 <strong>{translateShipType(selectedShipType, language)}</strong> 的组件格之外，不占用任何标准模块槽位。提供 <strong>+2 能量产出</strong> 与 <strong>+1 先攻</strong>。</>
                    : <>Attaches to <strong>{selectedShipType.toUpperCase()}</strong> outside the component grid without consuming any of its standard modular slots. Grants <strong>+2 Energy Produced</strong> and <strong>+1 Initiative</strong>.</>}
                </p>
                <div className="flex flex-col items-center justify-center p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80 overflow-x-auto">
                  <ShipBlueprintSlotsLayout
                    shipType={selectedShipType}
                    factionId={player.faction.id}
                    slots={currentBlueprint.slots}
                    maxSlots={currentBlueprint.maxSlots}
                    preprintedPower={currentBlueprint.preprintedPower}
                    preprintedComputer={currentBlueprint.preprintedComputer}
                    preprintedShield={currentBlueprint.preprintedShield}
                    preprintedHull={currentBlueprint.preprintedHull}
                    externalParts={[...(currentBlueprint.externalParts || []), part]}
                    size="sm"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-cyan-500/40 bg-slate-900/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                    <span>{l(`Click a slot on ${selectedShipType.toUpperCase()} to install:`, `点击${translateShipType(selectedShipType, language)}上的槽位进行安装：`)}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {l('Slots:', '槽位数：')} {currentBlueprint.maxSlots}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 overflow-x-auto">
                  <ShipBlueprintSlotsLayout
                    shipType={selectedShipType}
                    factionId={player.faction.id}
                    slots={currentBlueprint.slots}
                    maxSlots={currentBlueprint.maxSlots}
                    preprintedPower={currentBlueprint.preprintedPower}
                    preprintedComputer={currentBlueprint.preprintedComputer}
                    preprintedShield={currentBlueprint.preprintedShield}
                    preprintedHull={currentBlueprint.preprintedHull}
                    externalParts={currentBlueprint.externalParts}
                    interactive={true}
                    canModify={true}
                    selectedSlotIndex={selectedSlotIndex}
                    onSelectSlot={(sIdx) => setSelectedSlotIndex(sIdx)}
                    size="sm"
                  />
                </div>

                <div className="w-full mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs gap-1.5">
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-slate-400">{l('Target Slot:', '目标槽位：')}</span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/60 text-cyan-200 font-bold">
                      {l(`Slot ${selectedSlotIndex + 1}`, `槽位 ${selectedSlotIndex + 1}`)}
                    </span>
                    <span className="text-slate-300">
                      ({currentBlueprint.slots[selectedSlotIndex] ? (
                        <span>{l('Replaces', '替换')} <strong className="text-amber-300">{translatePartName(currentBlueprint.slots[selectedSlotIndex]!.id, currentBlueprint.slots[selectedSlotIndex]!.name, language)}</strong></span>
                      ) : (
                        <span className="text-emerald-400 font-semibold italic">{l('Empty Slot', '空槽位')}</span>
                      )})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-slate-400">{l('Power:', '能量：')}</span>
                    <span className={testStats && testStats.totalPowerConsumed > testStats.totalPowerProduced ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {testStats ? `${testStats.totalPowerProduced - testStats.totalPowerConsumed >= 0 ? '+' : ''}${testStats.totalPowerProduced - testStats.totalPowerConsumed}⚡` : '0⚡'}
                    </span>
                  </div>
                </div>

                {/* Quick-select Slot Pills */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 pt-2 border-t border-slate-800/60">
                  {currentBlueprint.slots.map((sl, sIdx) => {
                    const isSelected = selectedSlotIndex === sIdx;
                    return (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => setSelectedSlotIndex(sIdx)}
                        className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold transition border cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400 shadow'
                            : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                        title={l(`Slot ${sIdx + 1}: ${sl?.name || 'Empty'}`, `槽位 ${sIdx + 1}：${sl ? translatePartName(sl.id, sl.name, language) : '空'}`)}
                      >
                        <span>{l(`Slot ${sIdx + 1}`, `槽位 ${sIdx + 1}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bug 53: Power Deficit Alert */}
        {part && isPowerDeficit && (
          <div className="w-full mb-3 p-2.5 rounded-xl bg-rose-950/60 border border-rose-600/70 text-rose-300 text-xs flex items-center gap-2 text-left">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>{l('Cannot Equip Immediately:', '无法立即装配：')}</strong> {l(`Power consumed (${testStats?.totalPowerConsumed}⚡) exceeds power produced (${testStats?.totalPowerProduced}⚡) on ${selectedShipType.toUpperCase()}. Store in reserve or keep for VP.`, `${translateShipType(selectedShipType, language)}的能量消耗 (${testStats?.totalPowerConsumed}⚡) 超过能量产出 (${testStats?.totalPowerProduced}⚡)。请放入备用库或保留为胜利分。`)}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        {part ? (
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isPowerDeficit}
              onClick={() => onChoice(false, selectedShipType, isMuonSource ? -1 : selectedSlotIndex, undefined, undefined, undefined, activeDiscovery.id)}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-cyan-500/60 bg-cyan-600/20 hover:bg-cyan-600/35 disabled:opacity-30 disabled:cursor-not-allowed transition group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs mb-0.5 group-hover:scale-105 transition-transform">
                <Wrench className="w-3.5 h-3.5" /> {isMuonSource ? l('Equip Outside Grid', '装配于蓝图外') : l('Equip Immediately', '立即装配')}
              </div>
              <span className="text-[10px] text-slate-300">
                {isMuonSource ? (
                  <>{l('To', '至')} <strong>{translateShipType(selectedShipType, language)}</strong> ({l('Outside Grid', '蓝图外')})</>
                ) : (
                  <>{l('To', '至')} <strong>{translateShipType(selectedShipType, language)}</strong> ({l(`Slot ${selectedSlotIndex + 1}`, `槽位 ${selectedSlotIndex + 1}`)})</>
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onChoice(false, undefined, undefined, undefined, undefined, undefined, activeDiscovery.id)}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 transition group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-slate-300 font-bold text-xs mb-0.5 group-hover:scale-105 transition-transform">
                <Archive className="w-3.5 h-3.5 text-slate-400" /> {l('Store in Reserve', '存入备用库')}
              </div>
              <span className="text-[10px] text-slate-400">
                {l('Save for later Upgrade action', '留待之后升级行动使用')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onChoice(true, undefined, undefined, undefined, undefined, undefined, activeDiscovery.id)}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/25 transition group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mb-0.5 group-hover:scale-105 transition-transform">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> {l('Keep for 2 VP', '保留换取 2 分')}
              </div>
              <span className="text-[10px] text-slate-400">
                {language === 'zh'
                  ? <>终局记 <strong className="text-amber-300">+2 分</strong></>
                  : <>Score <strong className="text-amber-300">+2 VP</strong> at game end</>}
              </span>
            </button>
          </div>
        ) : (
          <div className="w-full">
            {isShipSupplyDepleted && grantShipType && (
              <div className="w-full mb-3 p-2.5 rounded-xl bg-amber-950/70 border border-amber-600/70 text-amber-200 text-xs flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>{l('Supply Depleted:', '供应已耗尽：')}</strong> {l(`All ${SHIP_LIMITS[grantShipType]} ${grantShipType.toUpperCase()}s are already deployed. You cannot take another ${grantShipType}; you must keep this tile for 2 VP instead.`, `全部 ${SHIP_LIMITS[grantShipType]} 艘${translateShipType(grantShipType, language)}均已部署，无法再领取，只能保留此板块作为 2 分。`)}
                </span>
              </div>
            )}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChoice(true, undefined, undefined, undefined, undefined, undefined, activeDiscovery.id)}
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/25 transition group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm mb-1 group-hover:scale-105 transition-transform">
                  <Trophy className="w-4 h-4 text-amber-400" /> {l('Keep for Victory Points', '保留为胜利分')}
                </div>
                <span className="text-xs text-slate-400">
                  {language === 'zh'
                    ? <>终局记 <strong className="text-amber-300">+2 分</strong></>
                    : <>Score <strong className="text-amber-300">+2 VP</strong> at game end</>}
                </span>
              </button>

              <button
                type="button"
                disabled={isShipSupplyDepleted}
                onClick={() =>
                  onChoice(
                    false,
                    undefined,
                    undefined,
                    selectedTechId || tiedTechs[0]?.id,
                    isControlledOrStandalone ? (colonizeOrbitalResource || undefined) : undefined,
                    chosenBonusResource,
                    activeDiscovery.id
                  )
                }
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition group cursor-pointer ${
                  isShipSupplyDepleted
                    ? 'border-slate-800 bg-slate-900/50 opacity-40 cursor-not-allowed'
                    : 'border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/25'
                }`}
                title={isShipSupplyDepleted ? l(`Cannot claim: maximum limit of ${SHIP_LIMITS[grantShipType!]} reached`, `无法领取：已达上限 ${SHIP_LIMITS[grantShipType!]}`) : undefined}
              >
                <div className={`flex items-center gap-1.5 font-bold text-sm mb-1 ${isShipSupplyDepleted ? 'text-slate-400' : 'text-cyan-400 group-hover:scale-105 transition-transform'}`}>
                  <Zap className={`w-4 h-4 ${isShipSupplyDepleted ? 'text-slate-500' : 'text-cyan-400'}`} /> {l('Take Immediate Reward', '领取立即奖励')}
                </div>
                <span className="text-xs text-slate-400">
                  {isShipSupplyDepleted
                    ? l(`Max supply reached (${SHIP_LIMITS[grantShipType!]} deployed)`, `已达供应上限（已部署 ${SHIP_LIMITS[grantShipType!]} 艘）`)
                    : activeDiscovery.immediateReward?.grantShipType
                    ? l(`Deploy free ${activeDiscovery.immediateReward.grantShipType} to sector`, `向该星区免费部署 1 艘${translateShipType(activeDiscovery.immediateReward.grantShipType, language)}`)
                    : activeDiscovery.immediateReward?.ancientTech
                    ? (() => {
                        const chosenT = (selectedTechId && tiedTechs.find((t) => t.id === selectedTechId)) || tiedTechs[0];
                        return l(`Claim ${chosenT?.name || 'Tech'}`, `获得 ${chosenT ? translateTechName(chosenT.id, chosenT.name, language) : '科技'}`);
                      })()
                    : activeDiscovery.immediateReward?.artifactCodex
                    ? l('Activate Artifact Codex (+1 VP per Artifact)', '激活遗迹法典（每个遗迹 +1 分）')
                    : activeDiscovery.immediateReward?.ancientMight
                    ? l('Activate Ancient Might (+1 VP per 3 VP Reputation)', '激活远古之力（每 3 分声望 +1 分）')
                    : activeDiscovery.immediateReward?.choose3Resource
                    ? l(`Collect +3 Money and +3 ${chosenBonusResource.toUpperCase()}`, `获得 +3 金钱与 +3 ${translateResourceType(chosenBonusResource, language)}`)
                    : l('Collect resources immediately', '立即收集资源')}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
