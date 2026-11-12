import React from 'react';
import { FlaskConical } from 'lucide-react';
import { Technology } from '../../engine/types/tech';
import { ShipPart } from '../../engine/types/blueprints';
import { SHIP_PARTS } from '../../engine/rules/partData';

// ============================================================================
// 1. STARBURST HIT PIP (Official Eclipse 8-pointed starburst explosion)
// ============================================================================
export const BlastPip: React.FC<{
  size?: number;
  className?: string;
  color?: string;
  holeColor?: string;
}> = ({ size = 12, className = '', color = '#0f172a', holeColor = 'transparent' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={`inline-block shrink-0 ${className}`}
  >
    <polygon
      points="12,1.5 14.3,7.8 20.8,5.2 16.9,10.8 22.5,14.2 15.8,15.6 17.6,22.2 12,17.8 6.4,22.2 8.2,15.6 1.5,14.2 7.1,10.8 3.2,5.2 9.7,7.8"
      fill={color}
    />
    {holeColor !== 'transparent' && (
      <circle cx="12" cy="12" r="1.8" fill={holeColor} />
    )}
  </svg>
);

// ============================================================================
// 2. LIGHTNING PIP (Physical Energy Bolt Symbol)
// ============================================================================
export const LightningPip: React.FC<{
  size?: number;
  className?: string;
  color?: string;
}> = ({ size = 14, className = '', color = '#fbbf24' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    className={`inline-block shrink-0 drop-shadow-[0_0_3px_rgba(251,191,36,0.75)] ${className}`}
  >
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
  </svg>
);

// ============================================================================
// 3. INITIATIVE CHEVRONS BADGE (Physical ^ / ^^ / ^^^ + numeric indicator)
// Compact horizontal corner badge so it never covers numbers in square slots
// ============================================================================
export const InitiativeBadge: React.FC<{
  init: number;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ init, size = 'md', className = '' }) => {
  if (init === 0) return null;
  const absInit = Math.abs(init);
  const isPositive = init > 0;

  return (
    <div
      title={`${isPositive ? `+${init}` : init} Initiative`}
      className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-[3px] bg-slate-950/95 border ${
        isPositive ? 'border-amber-400/80 text-amber-300' : 'border-rose-500/80 text-rose-400'
      } shadow-xs select-none shrink-0 ${className}`}
      style={{ lineHeight: 1 }}
    >
      <div className="flex -space-x-0.5 items-center">
        {Array.from({ length: Math.min(absInit, 3) }).map((_, i) => (
          <svg
            key={i}
            width={size === 'sm' ? 6 : 7.5}
            height={size === 'sm' ? 5 : 6}
            viewBox="0 0 12 7"
            fill="none"
          >
            <path
              d={isPositive ? 'M1 6L6 1.5L11 6' : 'M1 1L6 5.5L11 1'}
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ))}
      </div>
      <span className={`${size === 'sm' ? 'text-[8.5px]' : 'text-[10.5px]'} font-mono font-black leading-none`}>
        {isPositive ? `+${init}` : init}
      </span>
    </div>
  );
};

// ============================================================================
// 4. POWER COST / CONSUMED BADGE
// Top-right for Tech Tiles, Bottom-right for Ship Parts
// ============================================================================
export const PowerCostBadge: React.FC<{
  cost: number;
  position?: 'top-right' | 'bottom-right' | 'inline';
  size?: 'sm' | 'md';
  className?: string;
}> = ({ cost, position = 'inline', size = 'md', className = '' }) => {
  if (cost <= 0) return null;

  const positionClasses =
    position === 'top-right'
      ? 'absolute top-1.5 right-1.5 z-10'
      : position === 'bottom-right'
      ? 'absolute bottom-1.5 right-1.5 z-10'
      : '';

  const boltSize = size === 'sm' ? 10 : 12;
  const numSize = size === 'sm' ? 'text-[9.5px]' : 'text-[11px]';

  return (
    <div
      title={`Consumes ${cost} Energy`}
      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-950/95 border border-amber-500/80 shadow-lg shadow-black/80 backdrop-blur-xs select-none ${positionClasses} ${className}`}
    >
      {cost === 1 ? (
        <LightningPip size={boltSize} color="#fbbf24" />
      ) : (
        <>
          <span className={`font-mono font-black text-amber-300 leading-none ${numSize}`}>
            {cost}
          </span>
          <LightningPip size={boltSize} color="#fbbf24" />
        </>
      )}
    </div>
  );
};

// ============================================================================
// 5. COMBAT DICE (Yellow, Orange, Blue, Red, Purple)
// Authentic physical board game rounded-square die with black starburst pips
// ============================================================================
export interface DiceGraphicProps {
  color: 'yellow' | 'orange' | 'blue' | 'red' | 'purple' | string;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DiceGraphic: React.FC<DiceGraphicProps> = ({
  color,
  count = 1,
  size = 'md',
  className = '',
}) => {
  const normColor = color.toLowerCase();

  const sizeDims =
    size === 'sm'
      ? 'w-6 h-6 rounded-[5px]'
      : size === 'lg'
      ? 'w-11 h-11 rounded-[9px]'
      : 'w-9 h-9 rounded-[8px]';

  const pipSize = size === 'sm' ? 8 : size === 'lg' ? 15 : 12;

  let bgClass = 'bg-amber-400 border-amber-300 shadow-amber-950/60';
  let pipFill = '#111827';
  let hitCount = 1;

  if (normColor === 'orange') {
    bgClass = 'bg-orange-500 border-orange-300 shadow-orange-950/60';
    pipFill = '#111827';
    hitCount = 2;
  } else if (normColor === 'blue' || normColor === 'cyan') {
    bgClass = 'bg-sky-500 border-sky-300 shadow-sky-950/60';
    pipFill = '#0f172a';
    hitCount = 3;
  } else if (normColor === 'red') {
    bgClass = 'bg-rose-600 border-rose-400 shadow-rose-950/60';
    pipFill = '#111827';
    hitCount = 4;
  } else if (normColor === 'purple') {
    bgClass = 'bg-fuchsia-600 border-fuchsia-300 shadow-fuchsia-950/60';
    pipFill = '#0f172a';
    hitCount = 0;
  }

  const renderSingleDie = (keyIdx: number) => (
    <div
      key={keyIdx}
      title={`${normColor} die (${hitCount > 0 ? `${hitCount} DMG` : 'Rift'})`}
      className={`relative ${sizeDims} ${bgClass} border-[1.5px] shadow-md flex items-center justify-center p-0.5 select-none shrink-0`}
    >
      {normColor === 'purple' ? (
        // Physical Rift Cannon die (Magenta/Fuchsia square with black 8-pointed star pip)
        <BlastPip size={pipSize + 3} color="#0f172a" />
      ) : hitCount === 1 ? (
        // 1 Starburst Pip (Centered - Ion)
        <BlastPip size={pipSize + 3} color={pipFill} />
      ) : hitCount === 2 ? (
        // 2 Starburst Pips side-by-side (Plasma Cannon physical tile)
        <div className="flex items-center justify-center gap-0.5">
          <BlastPip size={pipSize} color={pipFill} />
          <BlastPip size={pipSize} color={pipFill} />
        </div>
      ) : hitCount === 3 ? (
        // 3 Starburst Pips (2 top, 1 bottom - Soliton Cannon physical tile)
        <div className="flex flex-col items-center justify-center -space-y-0.5">
          <div className="flex gap-0.5">
            <BlastPip size={pipSize - 1} color={pipFill} />
            <BlastPip size={pipSize - 1} color={pipFill} />
          </div>
          <BlastPip size={pipSize - 1} color={pipFill} />
        </div>
      ) : (
        // 4 Starburst Pips (2x2 Grid - Antimatter Cannon physical tile)
        <div className="grid grid-cols-2 gap-0.5">
          <BlastPip size={pipSize - 1} color={pipFill} />
          <BlastPip size={pipSize - 1} color={pipFill} />
          <BlastPip size={pipSize - 1} color={pipFill} />
          <BlastPip size={pipSize - 1} color={pipFill} />
        </div>
      )}
    </div>
  );

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {Array.from({ length: count }).map((_, i) => renderSingleDie(i))}
    </div>
  );
};

// ============================================================================
// 5b. COMBAT DIE FACE GRAPHIC
// Authentic physical Eclipse die face icon for combat rolls:
// - Standard dice (Yellow, Orange, Blue, Red):
//     Face 1: empty miss side
//     Faces 2-5: roll numbers (2, 3, 4, 5)
//     Face 6: critical hit damage starburst(s) (1 for Yellow, 2 for Orange, 3 for Blue, 4 for Red)
// - Purple Rift Die:
//     Faces 1-2: empty miss side
//     Face 3: 1 starburst (1 DMG)
//     Face 4: 2 starbursts (2 DMG)
//     Face 5: 2x2 layout with 3 starbursts + 💥 self-damage (3 DMG + 1 Self DMG)
//     Face 6: 💥 self-damage only (0 DMG + 1 Self DMG)
// ============================================================================
export interface CombatDieFaceGraphicProps {
  color: string;
  roll: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}

export const CombatDieFaceGraphic: React.FC<CombatDieFaceGraphicProps> = ({
  color,
  roll,
  size = 'md',
  className = '',
  title,
}) => {
  const normColor = (color || 'yellow').toLowerCase();

  // Dimensions based on size
  const dimClasses =
    size === 'xs'
      ? 'w-5 h-5 rounded-[4px] border-[1px]'
      : size === 'sm'
      ? 'w-7 h-7 rounded-[6px] border-[1.5px]'
      : size === 'lg'
      ? 'w-11 h-11 rounded-[9px] border-[2px]'
      : 'w-9 h-9 rounded-md border-[1.5px]';

  // Colors
  let bgClass = 'bg-yellow-500 border-yellow-300 text-slate-950 shadow-yellow-950/60';
  let pipColor = '#0f172a';

  if (normColor === 'orange') {
    bgClass = 'bg-orange-500 border-orange-300 text-slate-950 shadow-orange-950/60';
    pipColor = '#0f172a';
  } else if (normColor === 'blue' || normColor === 'sky' || normColor === 'cyan') {
    bgClass = 'bg-sky-500 border-sky-300 text-slate-950 shadow-sky-950/60';
    pipColor = '#0f172a';
  } else if (normColor === 'red') {
    bgClass = 'bg-rose-600 border-rose-300 text-slate-950 shadow-rose-950/60';
    pipColor = '#0f172a';
  } else if (normColor === 'purple' || normColor === 'fuchsia' || normColor === 'rift') {
    bgClass = 'bg-purple-600 border-purple-300 text-slate-950 shadow-purple-950/60';
    pipColor = '#0f172a';
  }

  // Star size scaling
  const starLg = size === 'xs' ? 9 : size === 'sm' ? 12 : size === 'lg' ? 18 : 15;
  const starMd = size === 'xs' ? 6.5 : size === 'sm' ? 9 : size === 'lg' ? 14 : 11;
  const starSm = size === 'xs' ? 5.5 : size === 'sm' ? 7.5 : size === 'lg' ? 11 : 9;
  const starXs = size === 'xs' ? 5 : size === 'sm' ? 7 : size === 'lg' ? 10.5 : 8.5;

  const fontClass =
    size === 'xs'
      ? 'text-[10px] font-black'
      : size === 'sm'
      ? 'text-xs font-black'
      : size === 'lg'
      ? 'text-base font-black'
      : 'text-sm font-black';

  const emojiClass =
    size === 'xs'
      ? 'text-[8.5px]'
      : size === 'sm'
      ? 'text-[10px]'
      : size === 'lg'
      ? 'text-sm'
      : 'text-xs';

  const defaultTitle = `${normColor} die face ${roll}`;

  const renderContent = () => {
    if (normColor === 'purple' || normColor === 'fuchsia' || normColor === 'rift') {
      if (roll === 1 || roll === 2) {
        return null; // Empty face on miss side (physical Eclipse Rift die is blank on Faces 1 & 2)
      }
      if (roll === 3) {
        return <BlastPip size={starLg} color={pipColor} />;
      }
      if (roll === 4) {
        return (
          <div className="flex items-center justify-center gap-0.5">
            <BlastPip size={starMd} color={pipColor} />
            <BlastPip size={starMd} color={pipColor} />
          </div>
        );
      }
      if (roll === 5) {
        // Face 5: 2x2 layout for 3 damage stars and 1 self-damage explosion symbol
        return (
          <div className="grid grid-cols-2 gap-0.5 place-items-center w-full h-full p-0.5">
            <BlastPip size={starXs} color={pipColor} />
            <BlastPip size={starXs} color={pipColor} />
            <BlastPip size={starXs} color={pipColor} />
            <span className={`${emojiClass} leading-none select-none filter drop-shadow-xs`}>
              💥
            </span>
          </div>
        );
      }
      if (roll === 6) {
        // Face 6: 0 target damage, 1 self-damage (Backfire explosion only)
        return (
          <div className="flex items-center justify-center leading-none">
            <span className={`${emojiClass} select-none filter drop-shadow`}>💥</span>
          </div>
        );
      }
    }

    // Standard combat dice: Yellow (Ion), Orange (Plasma), Blue (Soliton), Red (Antimatter)
    // Face 1 is empty (miss)
    if (roll === 1) {
      return null;
    }

    // Faces 2-5 show roll numbers (2, 3, 4, 5)
    if (roll >= 2 && roll <= 5) {
      return (
        <span className={`font-display ${fontClass} leading-none select-none`}>
          {roll}
        </span>
      );
    }

    // Face 6 shows damage stars (critical hit)
    if (roll === 6) {
      if (normColor === 'orange') {
        // Orange (Plasma): 2 stars for Face 6 (2 DMG)
        return (
          <div className="flex items-center justify-center gap-0.5">
            <BlastPip size={starMd} color={pipColor} />
            <BlastPip size={starMd} color={pipColor} />
          </div>
        );
      }

      if (normColor === 'blue' || normColor === 'sky' || normColor === 'cyan') {
        // Blue (Soliton): 3 stars for Face 6 (3 DMG)
        return (
          <div className="flex flex-col items-center justify-center -space-y-0.5">
            <div className="flex gap-0.5">
              <BlastPip size={starSm} color={pipColor} />
              <BlastPip size={starSm} color={pipColor} />
            </div>
            <BlastPip size={starSm} color={pipColor} />
          </div>
        );
      }

      if (normColor === 'red') {
        // Red (Antimatter): 4 stars for Face 6 (4 DMG in 2x2 grid)
        return (
          <div className="grid grid-cols-2 gap-0.5 place-items-center">
            <BlastPip size={starXs} color={pipColor} />
            <BlastPip size={starXs} color={pipColor} />
            <BlastPip size={starXs} color={pipColor} />
            <BlastPip size={starXs} color={pipColor} />
          </div>
        );
      }

      // Yellow (Ion): 1 star for Face 6 (1 DMG)
      return <BlastPip size={starLg} color={pipColor} />;
    }

    return null;
  };

  return (
    <div
      title={title || defaultTitle}
      className={`relative ${dimClasses} ${bgClass} shadow-md flex items-center justify-center p-0.5 select-none shrink-0 ${className}`}
    >
      {renderContent()}
    </div>
  );
};

// ============================================================================
// 6. REACTOR CORE POWER GRAPHIC (1 Lightning Symbol + Number in Square Box)
// Official Second Dawn physical tile style (e.g. Fusion Source = "6 ⚡")
// ============================================================================
export const ReactorPowerGraphic: React.FC<{
  power: number;
  init?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ power, init = 0, size = 'md', className = '' }) => {
  const boltSize = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;
  const numText = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';

  return (
    <div
      title={`+${power} PWR`}
      className={`flex items-center justify-center gap-1.5 select-none ${className}`}
    >
      {/* Physical Tile Bold Number */}
      <span
        className={`font-display font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-none ${numText}`}
      >
        {power}
      </span>

      {/* 1 Sharp White/Golden Lightning Symbol */}
      <LightningPip
        size={boltSize}
        color="#ffffff"
        className="filter drop-shadow-[0_0_4px_rgba(251,191,36,0.9)]"
      />

      {init !== 0 && <InitiativeBadge init={init} size={size === 'sm' ? 'sm' : 'md'} />}
      <span className="sr-only">{`+${power} PWR`}</span>
    </div>
  );
};

// ============================================================================
// 7. DRIVE GRAPHIC (Physical Tile: Bold White Speed Number + Outlined Hexagon)
// Matches Fusion-drive.jpg ("2 ⬡"), Tachyon-drive.jpg ("3 ⬡"), Transition-drive.jpg ("3 ⬡")
// ============================================================================
export const DriveGraphic: React.FC<{
  speed: number;
  init?: number;
  powerProduced?: number;
  isJump?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ speed, init = 0, powerProduced = 0, isJump = false, size = 'md', className = '' }) => {
  const isDual = powerProduced > 0;
  const hexDim = isDual
    ? size === 'sm' ? 14 : size === 'lg' ? 26 : 18
    : size === 'sm' ? 17 : size === 'lg' ? 26 : 21;
  const boltDim = isDual
    ? size === 'sm' ? 14 : size === 'lg' ? 26 : 18
    : 0;
  const numClass = isDual
    ? size === 'sm' ? 'text-xs font-black' : size === 'lg' ? 'text-lg font-black' : 'text-sm font-black'
    : size === 'sm' ? 'text-sm font-black' : size === 'lg' ? 'text-xl font-black' : 'text-base font-black';

  return (
    <div className={`inline-flex items-center justify-center gap-1 shrink-0 ${className}`}>
      {isJump ? (
        <div
          className="flex items-center"
          title="Jump Drive (7-hex honeycomb): Once per Move activation, this ship may move to any adjacent sector regardless of wormhole connections (crosses non-wormhole edges and closed borders). Consumes 2 Power."
        >
          <svg
            width={size === 'sm' ? 24 : size === 'lg' ? 42 : 32}
            height={size === 'sm' ? 24 : size === 'lg' ? 42 : 32}
            viewBox="0 0 44 44"
            fill="none"
            className="shrink-0"
          >
            {/* 7-Hex Honeycomb: 1 in Center, 6 Surrounding; All White Lines, No Other Colors */}
            {/* Center Hex 0 */}
            <polygon
              points="29.0,22.0 25.5,28.1 18.5,28.1 15.0,22.0 18.5,15.9 25.5,15.9"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Top Hex 1 */}
            <polygon
              points="29.0,9.9 25.5,15.9 18.5,15.9 15.0,9.9 18.5,3.8 25.5,3.8"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Top-Right Hex 2 */}
            <polygon
              points="39.5,15.9 36.0,22.0 29.0,22.0 25.5,15.9 29.0,9.9 36.0,9.9"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Bottom-Right Hex 3 */}
            <polygon
              points="39.5,28.1 36.0,34.1 29.0,34.1 25.5,28.1 29.0,22.0 36.0,22.0"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Bottom Hex 4 */}
            <polygon
              points="29.0,34.1 25.5,40.2 18.5,40.2 15.0,34.1 18.5,28.1 25.5,28.1"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Bottom-Left Hex 5 */}
            <polygon
              points="18.5,28.1 15.0,34.1 8.0,34.1 4.5,28.1 8.0,22.0 15.0,22.0"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Top-Left Hex 6 */}
            <polygon
              points="18.5,15.9 15.0,22.0 8.0,22.0 4.5,15.9 8.0,9.9 15.0,9.9"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Speed Number + Hexagon */}
          <div className="flex items-center gap-1">
            <span
              className={`font-display font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] leading-none select-none ${numClass}`}
            >
              {speed}
            </span>
            {/* Crisp White Outlined Hexagon matching physical drive tiles (Fusion-drive.jpg) */}
            <svg width={hexDim} height={hexDim} viewBox="0 0 32 32" fill="none" className="shrink-0">
              <polygon
                points="9,4 23,4 30,16 23,28 9,28 2,16"
                fill="rgba(15, 23, 42, 0.55)"
                stroke="#ffffff"
                strokeWidth="3.2"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Power Produced Number + Lightning Symbol (Same size as speed & hex, matching other power sources) */}
          {isDual && (
            <div className="flex items-center gap-1" title={`+${powerProduced} Energy Produced`}>
              <span
                className={`font-display font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] leading-none select-none ${numClass}`}
              >
                {powerProduced}
              </span>
              <LightningPip
                size={boltDim}
                color="#ffffff"
                className="filter drop-shadow-[0_0_4px_rgba(251,191,36,0.9)] shrink-0"
              />
            </div>
          )}
        </div>
      )}

      {init !== 0 && <InitiativeBadge init={init} size={size === 'lg' ? 'md' : 'sm'} />}
    </div>
  );
};

// ============================================================================
// 8. COMPUTER GRAPHIC (Physical Tile: Solid White Rounded-Square Die Badge)
// Matches Positron-computer.jpg ("[+2]"), Gluon-computer.jpg ("[+3]"), Sentient-hull.jpg ("[+1]")
// ============================================================================
export const ComputerGraphic: React.FC<{
  computerBonus: number;
  init?: number;
  size?: 'sm' | 'md' | 'lg';
  isMultiStat?: boolean;
  className?: string;
}> = ({ computerBonus, init = 0, size = 'md', isMultiStat = false, className = '' }) => {
  const boxClass = isMultiStat
    ? size === 'sm'
      ? 'w-5 h-5 rounded-[4px] text-[10px]'
      : size === 'lg'
      ? 'w-7 h-7 rounded-[6px] text-xs'
      : 'w-5.5 h-5.5 rounded-[5px] text-[11px]'
    : size === 'sm'
      ? 'w-6 h-6 rounded-[5px] text-xs'
      : size === 'lg'
      ? 'w-9 h-9 rounded-[8px] text-base'
      : 'w-7 h-7 rounded-[6px] text-xs sm:text-sm';

  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      <div
        title={`+${computerBonus} Computer (Hit Bonus)`}
        className={`${boxClass} bg-white border-2 border-slate-300 shadow-[0_2px_6px_rgba(0,0,0,0.75)] flex items-center justify-center font-display font-black text-slate-950 tracking-tighter select-none shrink-0`}
      >
        {`+${computerBonus}`}
      </div>

      {init !== 0 && <InitiativeBadge init={init} size={size === 'lg' ? 'md' : 'sm'} />}
    </div>
  );
};

// ============================================================================
// 9. SHIELD GRAPHIC (Physical Tile: Sleek Black Rounded-Square Die Badge)
// Matches Gauss-shield.jpg ("[-1]"), Phase-shield.jpg ("[-2]"), Absorption-shield.jpg ("[-1] 4⚡")
// ============================================================================
export const ShieldGraphic: React.FC<{
  shieldBonus: number;
  init?: number;
  powerProduced?: number;
  isMorph?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ shieldBonus, init = 0, powerProduced = 0, isMorph = false, size = 'md', className = '' }) => {
  const isMultiStat = powerProduced > 0 || isMorph;

  const boxClass = isMultiStat
    ? size === 'sm'
      ? 'w-5 h-5 rounded-[4px] text-[10px]'
      : size === 'lg'
      ? 'w-7 h-7 rounded-[6px] text-xs'
      : 'w-5.5 h-5.5 rounded-[5px] text-[11px]'
    : size === 'sm'
      ? 'w-6 h-6 rounded-[5px] text-xs'
      : size === 'lg'
      ? 'w-9 h-9 rounded-[8px] text-base'
      : 'w-7 h-7 rounded-[6px] text-xs sm:text-sm';

  return (
    <div className={`flex items-center justify-center ${isMultiStat ? 'gap-1' : 'gap-1.5'} ${className}`}>
      {/* Physical Black Rounded-Square Shield Badge with crisp white border */}
      <div
        title={`-${shieldBonus} Shield`}
        className={`${boxClass} bg-neutral-950 border-[1.8px] border-white/90 shadow-[0_2px_6px_rgba(0,0,0,0.85)] flex items-center justify-center font-display font-black text-white tracking-tighter select-none shrink-0`}
      >
        {`-${shieldBonus}`}
      </div>

      {/* Morph Shield: Cross Damage Symbol (Remove 1 Damage Cube) */}
      {isMorph && (
        <div
          title="Morph Regeneration (Non-standard component): Removes 1 damage cube from this ship at the end of each Engagement Round in battle (heals 1 HP per round during active combat)"
          className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-950/90 border border-rose-500/80 shrink-0 cursor-help"
        >
          <svg
            width={size === 'sm' ? 12 : size === 'lg' ? 18 : 14}
            height={size === 'sm' ? 12 : size === 'lg' ? 18 : 14}
            viewBox="0 0 24 24"
            fill="none"
            className="shrink-0"
          >
            {/* Red Damage Cube */}
            <rect x="3" y="3" width="18" height="18" rx="3.5" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
            {/* White Cross X through damage cube */}
            <line x1="5" y1="5" x2="19" y2="19" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <line x1="19" y1="5" x2="5" y2="19" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className={`${size === 'sm' ? 'text-[7.5px]' : size === 'lg' ? 'text-[10px]' : 'text-[8.5px]'} font-mono font-bold text-rose-300 leading-none`}>
            -1
          </span>
        </div>
      )}

      {/* Absorption Shield / Inversion Shield Energy Production ("4⚡") */}
      {powerProduced > 0 && (
        <div
          title={`Produces +${powerProduced} Energy`}
          className="flex items-center gap-0.5"
        >
          <span
            className={`font-display font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] leading-none select-none ${
              size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
            }`}
          >
            {powerProduced}
          </span>
          <LightningPip size={size === 'sm' ? 9 : size === 'lg' ? 14 : 11} color="#fbbf24" className="drop-shadow-[0_0_4px_rgba(251,191,36,0.9)]" />
        </div>
      )}

      {init !== 0 && <InitiativeBadge init={init} size={size === 'lg' ? 'md' : 'sm'} />}
    </div>
  );
};

// ============================================================================
// 10. HULL GRAPHIC (Physical Tile: Bold White Number + White Circle w/ Starburst)
// Matches Improved-hull.jpg ("2 (✷)"), Conifold-field.jpg ("3 (✷)"), Sentient-hull.jpg ("[+1] 1 (✷)")
// ============================================================================
export const HullGraphic: React.FC<{
  hullBonus: number;
  compBonus?: number;
  init?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ hullBonus, compBonus = 0, init = 0, size = 'md', className = '' }) => {
  const isMultiStat = compBonus > 0;

  // When compBonus is present (Sentient Hull), scale down elements slightly so both fit side-by-side
  const circleDim = isMultiStat
    ? size === 'sm' ? 14 : size === 'lg' ? 20 : 16
    : size === 'sm' ? 18 : size === 'lg' ? 28 : 22;

  const numClass = isMultiStat
    ? size === 'sm' ? 'text-xs font-black' : size === 'lg' ? 'text-base font-black' : 'text-sm font-black'
    : size === 'sm' ? 'text-base font-black' : size === 'lg' ? 'text-2xl font-black' : 'text-lg font-black';

  return (
    <div className={`flex items-center justify-center ${isMultiStat ? 'gap-1' : 'gap-1.5'} ${className}`}>
      {/* Sentient Hull also has a +1 Computer white die badge */}
      {compBonus > 0 && (
        <ComputerGraphic
          computerBonus={compBonus}
          size={size}
          isMultiStat={true}
        />
      )}

      {/* Physical Hull Number + Damage Starburst Disc */}
      <div className="flex items-center gap-0.5" title={`+${hullBonus} Hull Points`}>
        <span
          className={`font-display font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] leading-none select-none ${numClass}`}
        >
          {hullBonus}
        </span>
        <svg width={circleDim} height={circleDim} viewBox="0 0 32 32" fill="none" className="shrink-0">
          {/* Outer thick white ring */}
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="rgba(15, 23, 42, 0.75)"
            stroke="#ffffff"
            strokeWidth="3.2"
          />
          {/* Inner 7/8-pointed white hull starburst */}
          <polygon
            points="16,6 18.2,11.5 24,9.5 20.8,14.8 25.5,18.5 19.5,19.2 20.5,25 16,21 11.5,25 12.5,19.2 6.5,18.5 11.2,14.8 8,9.5 13.8,11.5"
            fill="#ffffff"
          />
          {/* Small dark center hole matching physical tile */}
          <circle cx="16" cy="16" r="2.2" fill="#0f172a" />
        </svg>
      </div>

      {init !== 0 && <InitiativeBadge init={init} size={size === 'lg' ? 'md' : 'sm'} />}
    </div>
  );
};

// ============================================================================
// 11. MISSILE SALVO GRAPHIC (Physical Tile: Colored Missile on Top, Dice in Middle)
// Matches Plasma-missile (Orange missile + 2 orange dice), Ion-missile (Yellow missile + 3 yellow dice),
// Soliton-missile (Blue missile + 1 blue die), Antimatter-missile (Red missile + 1 red die)
// ============================================================================
export const MissileGraphic: React.FC<{
  dice: { color: string; count: number; damagePerHit: number }[];
  init?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ dice, init = 0, size = 'md', className = '' }) => {
  const primary = dice[0] || { color: 'orange', count: 2, damagePerHit: 2 };
  const normColor = primary.color.toLowerCase();

  let bodyFill = '#f97316'; // Orange (Plasma Missile)
  let bodyStroke = '#fdba74';
  if (normColor === 'yellow') {
    bodyFill = '#eab308'; // Yellow (Flux / Ion Missile)
    bodyStroke = '#fef08a';
  } else if (normColor === 'blue' || normColor === 'cyan') {
    bodyFill = '#0ea5e9'; // Blue (Soliton Missile)
    bodyStroke = '#bae6fd';
  } else if (normColor === 'red') {
    bodyFill = '#e11d48'; // Red (Antimatter Missile)
    bodyStroke = '#fda4af';
  }

  const missileWidth = size === 'sm' ? 26 : size === 'lg' ? 44 : 34;
  const missileHeight = size === 'sm' ? 8 : size === 'lg' ? 14 : 10;
  const diceSize =
    size === 'sm' || primary.count > 2
      ? 'sm'
      : size === 'lg'
      ? 'md'
      : 'sm';

  return (
    <div
      title={`Missile Salvo: ${primary.count}x ${primary.color} (${primary.damagePerHit} DMG)`}
      className={`flex flex-col items-center justify-center gap-0.5 select-none ${className}`}
    >
      {/* 1. Colored Missile Symbol on Top */}
      <div className="flex items-center justify-center">
        <svg
          width={missileWidth}
          height={missileHeight}
          viewBox="0 0 60 18"
          fill="none"
          className="shrink-0 drop-shadow-xs"
        >
          {/* Tail Fin */}
          <polygon
            points="2,2 12,6 12,12 2,16 6,9"
            fill={bodyFill}
            stroke={bodyStroke}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Fuselage Body */}
          <rect
            x="12"
            y="4"
            width="30"
            height="10"
            rx="2"
            fill={bodyFill}
            stroke={bodyStroke}
            strokeWidth="1.2"
          />
          {/* Nose Cone */}
          <path
            d="M42 4C50 6 56 8.5 58 9C56 9.5 50 12 42 14Z"
            fill={bodyFill}
            stroke={bodyStroke}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* 2. Number of Colored Dice in Middle */}
      <div className="flex items-center justify-center">
        <DiceGraphic
          color={primary.color}
          count={primary.count}
          size={diceSize}
        />
      </div>

      {init !== 0 && <InitiativeBadge init={init} size={size === 'lg' ? 'md' : 'sm'} />}
    </div>
  );
};

// ============================================================================
// 12. HELPER FOR ADVANCED PLANET TECH TILES
// Matches Advanced-labs.jpg, Advanced-economy.jpg, Advanced-mining.jpg, Metasynthesis.jpg
// and HexGalaxyMap.tsx advanced planet slots (thick white border + corner star)
// ============================================================================
export const AdvancedPlanetSquareIcon: React.FC<{
  type: 'science' | 'money' | 'materials' | 'wild';
  dim: number;
}> = ({ type, dim }) => {
  const fill =
    type === 'science'
      ? '#ec4899' // Pink
      : type === 'money'
      ? '#eab308' // Yellow/Gold
      : type === 'materials'
      ? '#92400e' // Brown
      : '#64748b';

  return (
    <svg width={dim} height={dim} viewBox="0 0 56 56" fill="none">
      {/* Advanced Planet Rounded Square with Thick White Contour */}
      {type === 'wild' ? (
        <g>
          <defs>
            <clipPath id="metaWildSquareClip">
              <rect x="12" y="12" width="34" height="34" rx="6" />
            </clipPath>
          </defs>
          {/* 3 Distinct Segments: Yellow (Money), Pink (Science), Brown (Materials) */}
          <g clipPath="url(#metaWildSquareClip)">
            {/* Left/Top-Left Segment: Yellow (Money) - strictly above y=40, no overflow into brown */}
            <polygon points="29,29 29,10 10,10 10,40 29,29" fill="#facc15" />
            {/* Right Segment: Pink (Science) */}
            <polygon points="29,29 29,10 48,10 48,40 29,29" fill="#ec4899" />
            {/* Bottom Segment: Brown (Materials) */}
            <polygon points="29,29 10,40 10,48 48,48 48,40 29,29" fill="#92400e" />
            {/* White Divider Lines between segments */}
            <line x1="29" y1="29" x2="29" y2="12" stroke="#ffffff" strokeWidth="2.4" />
            <line x1="29" y1="29" x2="47" y2="39.5" stroke="#ffffff" strokeWidth="2.4" />
            <line x1="29" y1="29" x2="11" y2="39.5" stroke="#ffffff" strokeWidth="2.4" />
          </g>
          <rect
            x="12"
            y="12"
            width="34"
            height="34"
            rx="6"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.8"
          />
        </g>
      ) : (
        <rect
          x="12"
          y="12"
          width="34"
          height="34"
          rx="6"
          fill={fill}
          stroke="#ffffff"
          strokeWidth="3.8"
        />
      )}

      {/* Resource Symbol Inside Square (matching physical tiles & in-game resources) */}
      {type === 'science' && (
        // Erlenmeyer Science Flask (matching Science resource)
        <path
          d="M26 18H32M27.5 18V24L21.5 35C20.8 36.3 21.7 38 23.2 38H34.8C36.3 38 37.2 36.3 36.5 35L30.5 24V18"
          fill="#fbcfe8"
          fillOpacity="0.85"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {type === 'money' && (
        // Two Coins (matching the two-coin symbol on the top-left window in the game interface)
        <g transform="translate(16, 17) scale(1.05)">
          <path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M15 6h1v4" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="m6.134 14.768.866-.5 2 3.464" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="16" cy="8" r="6" stroke="#ffffff" strokeWidth="2.4" fill="none" />
        </g>
      )}

      {type === 'materials' && (
        // Hammer (matching the material symbol on the top-left window in the game interface and the build action)
        <g transform="translate(16, 16) scale(1.05)">
          <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="m18 15 4-4" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      )}

      {/* Corner 4-Point Starburst Gleam on Top-Left Corner (matching physical tile & HexGalaxyMap ★) */}
      <polygon
        points="13,4 15.2,10.8 22,13 15.2,15.2 13,22 10.8,15.2 4,13 10.8,10.8"
        fill="#ffffff"
      />
    </svg>
  );
};

// ============================================================================
// 13. NON-SHIP PART TECH GRAPHIC (Official Fandom Wiki Tiles + Web App Consistency)
// ============================================================================
export const NonPartTechGraphic: React.FC<{
  techId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ techId, size = 'md', className = '' }) => {
  const dim = size === 'sm' ? 36 : size === 'lg' ? 70 : 48;

  switch (techId) {
    case 'nanorobots':
      // Physical tile: "+1" + White Hammer matching the Build Action & Materials symbol
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <span className="sr-only">+1</span>
          <svg
            width={size === 'sm' ? 44 : size === 'lg' ? 88 : 64}
            height={size === 'sm' ? 24 : size === 'lg' ? 48 : 35}
            viewBox="0 0 74 36"
            fill="none"
          >
            <text
              x="2"
              y="27"
              fill="#ffffff"
              fontWeight="900"
              fontSize="22"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              +1
            </text>
            {/* White Hammer Symbol Matching Build Action & Materials in Game UI */}
            <g transform="translate(42, 6) scale(1.05)">
              <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="m18 15 4-4" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
          </svg>
        </div>
      );

    case 'advanced_robotics':
      // Physical tile: "+1" + 3D Cylindrical Influence Disc with generous spacing
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <svg
            width={size === 'sm' ? 44 : size === 'lg' ? 88 : 64}
            height={size === 'sm' ? 22 : size === 'lg' ? 44 : 32}
            viewBox="0 0 76 34"
            fill="none"
          >
            <text
              x="2"
              y="25"
              fill="#ffffff"
              fontWeight="900"
              fontSize="21"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              +1
            </text>
            {/* Disc placed with generous 17px gap from text */}
            <path
              d="M39 14V21C39 25.4 46.2 28.5 55 28.5C63.8 28.5 71 25.4 71 21V14"
              fill="rgba(15, 23, 42, 0.7)"
              stroke="#ffffff"
              strokeWidth="2.8"
            />
            <ellipse
              cx="55"
              cy="14"
              rx="16"
              ry="7.5"
              fill="rgba(30, 41, 59, 0.85)"
              stroke="#ffffff"
              strokeWidth="2.8"
            />
          </svg>
        </div>
      );

    case 'quantum_grid':
      // Physical tile: "+2" + 3D Cylindrical Influence Disc with generous spacing
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <svg
            width={size === 'sm' ? 44 : size === 'lg' ? 88 : 64}
            height={size === 'sm' ? 22 : size === 'lg' ? 44 : 32}
            viewBox="0 0 76 34"
            fill="none"
          >
            <text
              x="2"
              y="25"
              fill="#ffffff"
              fontWeight="900"
              fontSize="21"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              +2
            </text>
            {/* Disc placed with generous 17px gap from text */}
            <path
              d="M39 14V21C39 25.4 46.2 28.5 55 28.5C63.8 28.5 71 25.4 71 21V14"
              fill="rgba(15, 23, 42, 0.7)"
              stroke="#ffffff"
              strokeWidth="2.8"
            />
            <ellipse
              cx="55"
              cy="14"
              rx="16"
              ry="7.5"
              fill="rgba(30, 41, 59, 0.85)"
              stroke="#ffffff"
              strokeWidth="2.8"
            />
          </svg>
        </div>
      );

    case 'orbital':
      // Physical tile: Large White Ring with Split Money (Yellow) & Science (Pink) Population Square inside
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <svg
            width={size === 'sm' ? 40 : size === 'lg' ? 78 : 52}
            height={size === 'sm' ? 40 : size === 'lg' ? 78 : 52}
            viewBox="0 0 52 52"
            fill="none"
          >
            {/* Outer Thick White Orbital Ring */}
            <circle
              cx="26"
              cy="26"
              r="20"
              fill="#312e81"
              stroke="#ffffff"
              strokeWidth="5"
            />
            <circle
              cx="26"
              cy="26"
              r="14"
              fill="#1e1b4b"
              stroke="#818cf8"
              strokeWidth="1.2"
            />
          </svg>
          {/* Split Population Square Inside Ring: Yellow (Money) + Pink (Science) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex rounded-[3px] border-2 border-white overflow-hidden shadow-md">
              <div className="w-3 h-5 bg-yellow-400 flex items-center justify-center" title="Money population slot">
                <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
              </div>
              <div className="w-3 h-5 bg-pink-500 flex items-center justify-center border-l border-white/80" title="Science population slot">
                <div className="w-1.5 h-1.5 rounded-xs bg-white/90" />
              </div>
            </div>
          </div>
        </div>
      );

    case 'starbase':
      // Physical tile: White 4-pointed Starbase station crosshairs + blueprint grid squares on top-right (Starbase.jpg)
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <svg
            width={size === 'sm' ? 44 : size === 'lg' ? 86 : 60}
            height={size === 'sm' ? 36 : size === 'lg' ? 72 : 50}
            viewBox="0 0 60 50"
            fill="none"
          >
            {/* Starbase Ring & 4-Pointed Spires */}
            <circle cx="24" cy="27" r="11" fill="rgba(15,23,42,0.75)" stroke="#ffffff" strokeWidth="2.8" />
            <polygon points="24,8 27.5,23 24,27 20.5,23" fill="#ffffff" />
            <polygon points="24,46 27.5,31 24,27 20.5,31" fill="#ffffff" />
            <polygon points="5,27 20,23.5 24,27 20,30.5" fill="#ffffff" />
            <polygon points="43,27 28,23.5 24,27 28,30.5" fill="#ffffff" />
            <circle cx="24" cy="27" r="2.5" fill="#0f172a" />

            {/* Blueprint Grid Squares on top-right */}
            <rect x="39" y="8" width="6" height="6" stroke="#ffffff" strokeWidth="1.3" fill="rgba(255,255,255,0.12)" />
            <rect x="39" y="15" width="6" height="6" stroke="#ffffff" strokeWidth="1.3" fill="rgba(255,255,255,0.12)" />
            <rect x="46" y="11.5" width="6" height="6" stroke="#ffffff" strokeWidth="1.3" fill="rgba(255,255,255,0.12)" />
            <rect x="53" y="8" width="6" height="6" stroke="#ffffff" strokeWidth="1.3" fill="rgba(255,255,255,0.12)" />
            <rect x="53" y="15" width="6" height="6" stroke="#ffffff" strokeWidth="1.3" fill="rgba(255,255,255,0.12)" />
          </svg>
        </div>
      );

    case 'monolith':
      // Physical tile: 3D Monolith slab standing upright on a solid foundation pedestal with Gold 3 VP Shield Crest
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <svg
            width={size === 'sm' ? 40 : size === 'lg' ? 80 : 54}
            height={size === 'sm' ? 40 : size === 'lg' ? 80 : 54}
            viewBox="0 0 54 54"
            fill="none"
          >
            {/* 3D Foundation Pedestal / Base Platform */}
            {/* Foundation Top Face */}
            <polygon
              points="10,38 27,32 46,38 29,44"
              fill="#64748b"
              stroke="#ffffff"
              strokeWidth="1.3"
            />
            {/* Foundation Front-Left Face */}
            <polygon
              points="10,38 29,44 29,49 10,43"
              fill="#475569"
              stroke="#ffffff"
              strokeWidth="1.3"
            />
            {/* Foundation Front-Right Face */}
            <polygon
              points="29,44 46,38 46,43 29,49"
              fill="#334155"
              stroke="#ffffff"
              strokeWidth="1.3"
            />

            {/* Monolith 3D Rectangular Slab Erected on Foundation */}
            {/* Slab Top Face */}
            <polygon
              points="22,14 31,10 37,13 28,17"
              fill="#f1f5f9"
              stroke="#ffffff"
              strokeWidth="1.2"
            />
            {/* Slab Front-Left Light Face */}
            <polygon
              points="22,14 28,17 28,40 22,37"
              fill="#e2e8f0"
              stroke="#ffffff"
              strokeWidth="1.2"
            />
            {/* Slab Front-Right Shaded Face */}
            <polygon
              points="28,17 37,13 37,36 28,40"
              fill="#475569"
              stroke="#ffffff"
              strokeWidth="1.2"
            />

            {/* Gold 3 VP Shield Crest at Top */}
            <path
              d="M24 5H38V15C38 20 31 24 31 24C31 24 24 20 24 15V5Z"
              fill="#eab308"
              stroke="#fef08a"
              strokeWidth="1.8"
            />
            <text
              x="28"
              y="16"
              fill="#0f172a"
              fontWeight="900"
              fontSize="11"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              3
            </text>
          </svg>
          <span className="sr-only">3 ★</span>
        </div>
      );

    case 'wormhole_generator':
      // Physical tile: Two adjacent hexagons attached along a shared edge, with a half-wormhole
      // on one side, and a moving arrow demonstrating ship movement through the half-wormhole.
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <svg
            width={size === 'sm' ? 48 : size === 'lg' ? 96 : 68}
            height={size === 'sm' ? 30 : size === 'lg' ? 60 : 42}
            viewBox="0 0 80 44"
            fill="none"
          >
            {/* Left Hexagon */}
            <polygon
              points="24,4 40,13 40,31 24,40 8,31 8,13"
              fill="rgba(15, 23, 42, 0.65)"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Right Hexagon (shares vertical edge x=40, y=13..31) */}
            <polygon
              points="40,13 56,4 72,13 72,31 56,40 40,31"
              fill="rgba(15, 23, 42, 0.65)"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Shared boundary edge dashed line */}
            <line x1="40" y1="13" x2="40" y2="31" stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="2 2" />

            {/* Half Wormhole Arc on the LEFT side of shared edge */}
            <path
              d="M 40 16 A 6 6 0 0 0 40 28"
              fill="#38bdf8"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {/* White Ship Silhouette starting in Left Hexagon */}
            <path d="M 13 17 L 26 22 L 13 27 L 16 22 Z" fill="#ffffff" />

            {/* Moving Arrow crossing through the half-wormhole into Right Hexagon */}
            <path
              d="M 27 22 H 62 M 55 17 L 62 22 L 55 27"
              stroke="#38bdf8"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );

    case 'artifact_key':
      // Physical tile: "5" + White Resource Octagon + "/" + 4-pointed Artifact Star (Artifact-key.jpg)
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <span className="sr-only">+5</span>
          <svg
            width={size === 'sm' ? 44 : size === 'lg' ? 90 : 66}
            height={size === 'sm' ? 22 : size === 'lg' ? 44 : 32}
            viewBox="0 0 70 34"
            fill="none"
          >
            <text
              x="2"
              y="25"
              fill="#ffffff"
              fontWeight="900"
              fontSize="21"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              5
            </text>
            {/* Octagon Resource Token */}
            <polygon
              points="25,8 35,8 41,14 41,24 35,30 25,30 19,24 19,14"
              fill="#ffffff"
            />
            {/* Slash "/" */}
            <line x1="43" y1="29" x2="49" y2="7" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
            {/* 4-Pointed Artifact Star */}
            <polygon
              points="60,3 63.5,12.5 71,17 63.5,21.5 60,31 56.5,21.5 49,17 56.5,12.5"
              fill="#ffffff"
            />
          </svg>
        </div>
      );

    case 'advanced_labs':
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <AdvancedPlanetSquareIcon type="science" dim={dim} />
        </div>
      );

    case 'advanced_economy':
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <AdvancedPlanetSquareIcon type="money" dim={dim} />
        </div>
      );

    case 'advanced_mining':
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <AdvancedPlanetSquareIcon type="materials" dim={dim} />
        </div>
      );

    case 'metasynthesis':
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <AdvancedPlanetSquareIcon type="wild" dim={dim} />
        </div>
      );

    case 'neutron_bombs':
      // Physical tile: 3D Isometric Population Cube crossed out with a bold white X (Neutron-bombs.jpg)
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <svg
            width={size === 'sm' ? 38 : size === 'lg' ? 76 : 50}
            height={size === 'sm' ? 38 : size === 'lg' ? 76 : 50}
            viewBox="0 0 48 48"
            fill="none"
          >
            {/* Isometric 3D Cube */}
            <polygon points="24,8 40,16 24,24 8,16" fill="rgba(255,255,255,0.25)" stroke="#ffffff" strokeWidth="2.2" strokeLinejoin="round" />
            <polygon points="8,16 24,24 24,40 8,32" fill="rgba(255,255,255,0.15)" stroke="#ffffff" strokeWidth="2.2" strokeLinejoin="round" />
            <polygon points="24,24 40,16 40,32 24,40" fill="rgba(15,23,42,0.6)" stroke="#ffffff" strokeWidth="2.2" strokeLinejoin="round" />
            {/* Bold White Cross X */}
            <line x1="9" y1="13" x2="39" y2="35" stroke="#ffffff" strokeWidth="4.2" strokeLinecap="round" />
            <line x1="39" y1="13" x2="9" y2="35" stroke="#ffffff" strokeWidth="4.2" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'neutron_absorber':
      // Physical tile: "( [Crossed-out Isometric Cube] )" enclosed in protective parentheses
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <svg
            width={size === 'sm' ? 44 : size === 'lg' ? 88 : 64}
            height={size === 'sm' ? 30 : size === 'lg' ? 60 : 44}
            viewBox="0 0 64 44"
            fill="none"
          >
            {/* Left Protective Parenthesis "(" */}
            <path d="M12 8C6 16 6 28 12 36" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
            {/* Isometric 3D Cube */}
            <polygon points="32,8 45,14.5 32,21 19,14.5" fill="rgba(255,255,255,0.25)" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
            <polygon points="19,14.5 32,21 32,35 19,28.5" fill="rgba(255,255,255,0.15)" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
            <polygon points="32,21 45,14.5 45,28.5 32,35" fill="rgba(15,23,42,0.6)" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
            {/* Cross X */}
            <line x1="19" y1="12" x2="45" y2="31" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="45" y1="12" x2="19" y2="31" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
            {/* Right Protective Parenthesis ")" */}
            <path d="M52 8C58 16 58 28 52 36" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'antimatter_splitter':
      // Physical tile: Red 4-hit Die -> 4 separated starburst pips (Antimatter-splitter.jpg)
      // Scalable vector layout that fits compact boxes without clipping and fills larger squares
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <svg
            width={size === 'sm' ? 44 : size === 'lg' ? 92 : 66}
            height={size === 'sm' ? 20 : size === 'lg' ? 42 : 30}
            viewBox="0 0 76 34"
            fill="none"
          >
            {/* Red Die Face */}
            <rect x="2" y="3" width="28" height="28" rx="5" fill="#e11d48" stroke="#ffffff" strokeWidth="1.8" />
            {/* 4 White Die Pips inside red die */}
            <polygon points="9,7 10,9 12,9 10.5,10.5 11,12.5 9,11 7,12.5 7.5,10.5 6,9 8,9" fill="#ffffff" />
            <polygon points="23,7 24,9 26,9 24.5,10.5 25,12.5 23,11 21,12.5 21.5,10.5 20,9 22,9" fill="#ffffff" />
            <polygon points="9,21 10,23 12,23 10.5,24.5 11,26.5 9,25 7,26.5 7.5,24.5 6,23 8,23" fill="#ffffff" />
            <polygon points="23,21 24,23 26,23 24.5,24.5 25,26.5 23,25 21,26.5 21.5,24.5 20,23 22,23" fill="#ffffff" />

            {/* Transition Arrow "→" */}
            <path d="M34 17H46M46 17L41 12M46 17L41 22" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />

            {/* 4 Separated White Starburst Blast Pips */}
            <g>
              <polygon points="56,5 57.5,8.5 61,10 57.5,11.5 56,15 54.5,11.5 51,10 54.5,8.5" fill="#ffffff" />
              <circle cx="56" cy="10" r="1.5" fill="#0f172a" />
            </g>
            <g>
              <polygon points="68,5 69.5,8.5 73,10 69.5,11.5 68,15 66.5,11.5 63,10 66.5,8.5" fill="#ffffff" />
              <circle cx="68" cy="10" r="1.5" fill="#0f172a" />
            </g>
            <g>
              <polygon points="56,19 57.5,22.5 61,24 57.5,25.5 56,29 54.5,25.5 51,24 54.5,22.5" fill="#ffffff" />
              <circle cx="56" cy="24" r="1.5" fill="#0f172a" />
            </g>
            <g>
              <polygon points="68,19 69.5,22.5 73,24 69.5,25.5 68,29 66.5,25.5 63,24 66.5,22.5" fill="#ffffff" />
              <circle cx="68" cy="24" r="1.5" fill="#0f172a" />
            </g>
          </svg>
        </div>
      );

    case 'cloaking_device':
      // Physical tile: 1 Ship Silhouette <-> 2 Ship Silhouettes (Cloaking-device.jpg)
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <svg
            width={size === 'sm' ? 44 : size === 'lg' ? 88 : 64}
            height={size === 'sm' ? 28 : size === 'lg' ? 56 : 42}
            viewBox="0 0 64 42"
            fill="none"
          >
            {/* Left Ship Silhouette */}
            <path d="M4 14L18 21L4 28L7 21Z" fill="#ffffff" />
            {/* Double-headed Arrow <-> */}
            <path d="M22 21H40M22 21L27 16M22 21L27 26M40 21L35 16M40 21L35 26" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Right Top Ship Silhouette */}
            <path d="M44 6L58 13L44 20L47 13Z" fill="#ffffff" />
            {/* Right Bottom Ship Silhouette */}
            <path d="M44 22L58 29L44 36L47 29Z" fill="#ffffff" />
          </svg>
        </div>
      );

    case 'improved_logistics':
      // Physical tile: "+1" + White Ship Silhouette + Forward Arrow "→" (Improved-logistics.jpg)
      // Generous spacing between "+1" and ship/arrow to prevent visual crowding
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <span className="sr-only">+1 Movement</span>
          <svg
            width={size === 'sm' ? 48 : size === 'lg' ? 98 : 72}
            height={size === 'sm' ? 20 : size === 'lg' ? 42 : 30}
            viewBox="0 0 82 32"
            fill="none"
          >
            {/* +1 Text */}
            <text
              x="2"
              y="24"
              fill="#ffffff"
              fontWeight="900"
              fontSize="21"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              +1
            </text>
            {/* Ship Silhouette with generous 10px+ gap */}
            <path d="M32 7L48 16L32 25L36 16Z" fill="#ffffff" />
            {/* Forward Movement Arrow */}
            <path d="M54 16H76M76 16L70 10M76 16L70 22" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );

    case 'pico_modulator':
      // Physical tile: "+2" + White Wrench matching Upgrade Action in gameplay
      // Generous spacing between "+2" and wrench icon
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <svg
            width={size === 'sm' ? 46 : size === 'lg' ? 92 : 68}
            height={size === 'sm' ? 22 : size === 'lg' ? 44 : 32}
            viewBox="0 0 76 34"
            fill="none"
          >
            <text
              x="2"
              y="25"
              fill="#ffffff"
              fontWeight="900"
              fontSize="21"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              +2
            </text>
            {/* Wrench symbol matching Upgrade Action in gameplay with generous spacing */}
            <g transform="translate(42, 5) scale(1.05)">
              <path
                d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>
          </svg>
        </div>
      );

    case 'ancient_labs':
      // Physical tile: Rotated Amber Discovery Tile with Star "★" matching HexGalaxyMap discovery tile
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <svg
            width={size === 'sm' ? 40 : size === 'lg' ? 80 : 52}
            height={size === 'sm' ? 40 : size === 'lg' ? 80 : 52}
            viewBox="0 0 52 52"
            fill="none"
          >
            {/* Rotated Amber Discovery Diamond Tile */}
            <rect
              x="13"
              y="13"
              width="26"
              height="26"
              rx="5"
              transform="rotate(45 26 26)"
              fill="#f59e0b"
              stroke="#fbbf24"
              strokeWidth="2.5"
            />
            {/* Inner Gold Inset Frame */}
            <rect
              x="15.5"
              y="15.5"
              width="21"
              height="21"
              rx="3.5"
              transform="rotate(45 26 26)"
              fill="none"
              stroke="#fef3c7"
              strokeWidth="1.2"
              strokeOpacity="0.8"
            />
            {/* Center Discovery Star "★" matching HexGalaxyMap */}
            <text
              x="26"
              y="32.5"
              textAnchor="middle"
              fill="#78350f"
              fontSize="18"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              ★
            </text>
          </svg>
        </div>
      );

    case 'warp_portal':
      // Physical tile: Concentric Circular Warp Portal with Wormhole Ticks & 1 VP
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <svg
            width={size === 'sm' ? 38 : size === 'lg' ? 76 : 50}
            height={size === 'sm' ? 38 : size === 'lg' ? 76 : 50}
            viewBox="0 0 52 52"
            fill="none"
          >
            {/* Outer Portal Ring with Wormhole Notches */}
            <circle cx="26" cy="26" r="18" fill="#2e1065" stroke="#ffffff" strokeWidth="2.8" />
            <circle cx="26" cy="26" r="12" fill="#3b0764" stroke="#ffffff" strokeWidth="2.2" />
            <circle cx="26" cy="26" r="6" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
            <circle cx="26" cy="26" r="2" fill="#ffffff" />
            {/* Portal Energy Rays */}
            <line x1="26" y1="4" x2="26" y2="10" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="26" y1="42" x2="26" y2="48" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="4" y1="26" x2="10" y2="26" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="42" y1="26" x2="48" y2="26" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="sr-only">1 ★</span>
        </div>
      );

    default:
      return null;
  }
};

// ============================================================================
// 14. CATEGORY WATERMARK ICON (Physical Tile Bottom-Right Track Emblem)
// Matches the Fandom Wiki physical tiles:
// - Nano: Gear Cog
// - Grid: 2x2 Grid Window
// - Military: 7/8-Pointed Starburst
// - Rare: Diagonal Split Circle
// ============================================================================
const CategoryWatermark: React.FC<{ category: string }> = ({ category }) => {
  return (
    <div className="absolute bottom-1 right-1 opacity-25 pointer-events-none">
      {category === 'nano' ? (
        // Gear / Cogwheel icon for Nano Technology category (matching physical board game tile)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : category === 'grid' ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
          <rect x="3" y="3" width="7.5" height="7.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" />
        </svg>
      ) : category === 'military' ? (
        <BlastPip size={16} color="#ffffff" holeColor="#0f172a" />
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
          <circle cx="12" cy="12" r="9" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </svg>
      )}
    </div>
  );
};

// ============================================================================
// 15. SHIP PART TILE ICONOGRAPHY
// Authentic Ship Component Face contained in a Square Box (Power Cost in BOTTOM-RIGHT)
// ============================================================================
export const ShipPartTileIconography: React.FC<{
  part: ShipPart;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ part, compact = false, size, className = '' }) => {
  const isReactor =
    part.category === 'reactor' ||
    (part.powerProduced > 0 && part.category !== 'drive' && part.category !== 'shield');

  const effectiveSize: 'sm' | 'md' | 'lg' = size || (compact ? 'sm' : 'md');
  const sizeDims =
    effectiveSize === 'sm'
      ? 'w-14 h-14 p-1'
      : effectiveSize === 'lg'
      ? 'w-24 h-24 sm:w-28 sm:h-28 p-2.5'
      : 'w-18 h-18 sm:w-20 sm:h-20 p-2';

  return (
    <div
      title={getPartTooltip(part)}
      className={`relative aspect-square ${sizeDims} mx-auto rounded-xl bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border border-slate-700/90 flex items-center justify-center overflow-hidden shadow-md shadow-black/60 select-none ${className}`}
    >
      {/* Subtle Horizontal Scanline Texture matching physical tiles */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 3px)',
        }}
      />

      {/* Top-Left: Initiative Badge for ship parts granting Initiative */}
      {part.initiativeBonus !== 0 && (
        <div className="absolute top-0.5 left-0.5 z-20 select-none pointer-events-none">
          <InitiativeBadge init={part.initiativeBonus} size={effectiveSize === 'lg' ? 'md' : 'sm'} />
        </div>
      )}

      {/* Centered Wordless Graphic Body */}
      <div className="relative z-10 flex items-center justify-center w-full">
        {isReactor ? (
          <ReactorPowerGraphic
            power={part.powerProduced}
            init={0}
            size={effectiveSize}
          />
        ) : part.category === 'drive' ? (
          <DriveGraphic
            speed={part.driveSpeed || 0}
            init={0}
            powerProduced={part.powerProduced}
            isJump={Boolean(part.isJumpDrive)}
            size={effectiveSize}
          />
        ) : part.category === 'computer' ? (
          <ComputerGraphic
            computerBonus={part.computerBonus}
            init={0}
            size={effectiveSize}
          />
        ) : part.category === 'shield' ? (
          <ShieldGraphic
            shieldBonus={part.shieldBonus}
            init={0}
            powerProduced={part.powerProduced}
            isMorph={part.id === 'morph_shield'}
            size={effectiveSize}
          />
        ) : part.category === 'hull' ? (
          <HullGraphic
            hullBonus={part.hullBonus}
            compBonus={part.computerBonus}
            init={0}
            size={effectiveSize}
          />
        ) : part.category === 'missile' && part.dice ? (
          <MissileGraphic
            dice={part.dice}
            init={0}
            size={effectiveSize}
          />
        ) : part.dice ? (
          <div className="flex items-center gap-1">
            {part.dice.map((d, idx) => (
              <DiceGraphic
                key={idx}
                color={d.color}
                count={d.count}
                size={
                  effectiveSize === 'sm' || d.count > 1 || part.dice!.length > 1 || part.hullBonus > 0
                    ? 'sm'
                    : effectiveSize
                }
              />
            ))}
            {part.hullBonus > 0 && (
              <HullGraphic hullBonus={part.hullBonus} size={effectiveSize === 'lg' ? 'md' : 'sm'} />
            )}
          </div>
        ) : (
          <div className="w-6 h-6 rounded bg-slate-800" />
        )}
      </div>

      {/* Energy Cost Badge in BOTTOM-RIGHT corner for Ship Parts */}
      {part.powerConsumed > 0 && (
        <PowerCostBadge
          cost={part.powerConsumed}
          position="bottom-right"
          size={effectiveSize === 'lg' ? 'md' : 'sm'}
        />
      )}
    </div>
  );
};

// ============================================================================
// 16. TECH TILE ICONOGRAPHY
// Authentic Technology Card Face contained in a Square Box
// (Power Cost in TOP-RIGHT corner for ship parts)
// ============================================================================
export const TechTileIconography: React.FC<{
  tech: Technology;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ tech, compact = false, size, className = '' }) => {
  const unlockedPart = tech.unlocksPartId ? SHIP_PARTS[tech.unlocksPartId] : null;

  const effectiveSize: 'sm' | 'md' | 'lg' = size || (compact ? 'sm' : 'md');
  const sizeDims =
    effectiveSize === 'sm'
      ? 'w-14 h-14 p-1'
      : effectiveSize === 'lg'
      ? 'w-24 h-24 sm:w-28 sm:h-28 p-2.5'
      : 'w-full max-w-[84px] sm:max-w-[96px] p-2';

  // Track-specific background and border styling
  let borderTheme = 'border-slate-700';
  let bgTheme = 'from-slate-800/90 via-slate-900 to-slate-950';

  if (tech.category === 'military') {
    borderTheme = 'border-rose-700/60 shadow-[inset_0_0_16px_rgba(225,29,72,0.18)]';
    bgTheme = 'from-rose-900/50 via-rose-950/60 to-slate-950';
  } else if (tech.category === 'grid') {
    borderTheme = 'border-emerald-700/60 shadow-[inset_0_0_16px_rgba(16,185,129,0.18)]';
    bgTheme = 'from-emerald-900/50 via-emerald-950/60 to-slate-950';
  } else if (tech.category === 'nano') {
    borderTheme = 'border-sky-700/60 shadow-[inset_0_0_16px_rgba(14,165,233,0.18)]';
    bgTheme = 'from-sky-900/50 via-sky-950/60 to-slate-950';
  } else if (tech.category === 'rare') {
    borderTheme = 'border-purple-600/60 shadow-[inset_0_0_16px_rgba(168,85,247,0.2)]';
    bgTheme = 'from-purple-900/50 via-slate-950 to-slate-950';
  }

  return (
    <div
      className={`relative aspect-square ${sizeDims} mx-auto rounded-xl bg-gradient-to-b ${bgTheme} ${borderTheme} border-2 flex items-center justify-center overflow-hidden shadow-md shadow-black/60 select-none ${className}`}
    >
      {/* Subtle Scanline Texture like physical tiles */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 3px)',
        }}
      />

      {/* Top-Left: Initiative Badge for Tech tiles unlocking parts with Initiative */}
      {unlockedPart && unlockedPart.initiativeBonus !== 0 && (
        <div className="absolute top-0.5 left-0.5 z-20 select-none pointer-events-none">
          <InitiativeBadge init={unlockedPart.initiativeBonus} size={effectiveSize === 'lg' ? 'md' : 'sm'} />
        </div>
      )}

      {/* Category Watermark in Bottom-Right */}
      <CategoryWatermark category={tech.category} />

      {/* Centered Wordless Graphic Body */}
      <div className="relative z-10 flex items-center justify-center w-full">
        {unlockedPart ? (
          unlockedPart.category === 'reactor' ? (
            <ReactorPowerGraphic
              power={unlockedPart.powerProduced}
              init={0}
              size={effectiveSize}
            />
          ) : unlockedPart.category === 'drive' ? (
            <DriveGraphic
              speed={unlockedPart.driveSpeed || 0}
              init={0}
              powerProduced={unlockedPart.powerProduced}
              isJump={Boolean(unlockedPart.isJumpDrive)}
              size={effectiveSize}
            />
          ) : unlockedPart.category === 'computer' ? (
            <ComputerGraphic
              computerBonus={unlockedPart.computerBonus}
              init={0}
              size={effectiveSize}
            />
          ) : unlockedPart.category === 'shield' ? (
            <ShieldGraphic
              shieldBonus={unlockedPart.shieldBonus}
              init={0}
              powerProduced={unlockedPart.powerProduced}
              isMorph={unlockedPart.id === 'morph_shield'}
              size={effectiveSize}
            />
          ) : unlockedPart.category === 'hull' ? (
            <HullGraphic
              hullBonus={unlockedPart.hullBonus}
              compBonus={unlockedPart.computerBonus}
              init={0}
              size={effectiveSize}
            />
          ) : unlockedPart.category === 'missile' && unlockedPart.dice ? (
            <MissileGraphic
              dice={unlockedPart.dice}
              init={0}
              size={effectiveSize}
            />
          ) : unlockedPart.dice ? (
            <div className="flex items-center gap-1">
              {unlockedPart.dice.map((d, idx) => (
                <DiceGraphic
                  key={idx}
                  color={d.color}
                  count={d.count}
                  size={
                    effectiveSize === 'sm' || d.count > 1 || unlockedPart.dice!.length > 1 || (unlockedPart.hullBonus || 0) > 0
                      ? 'sm'
                      : effectiveSize
                  }
                />
              ))}
              {unlockedPart.hullBonus > 0 && (
                <HullGraphic hullBonus={unlockedPart.hullBonus} size={effectiveSize === 'lg' ? 'md' : 'sm'} />
              )}
            </div>
          ) : null
        ) : (
          <NonPartTechGraphic
            techId={tech.id}
            size={effectiveSize}
          />
        )}
      </div>

      {/* Energy Cost Badge in TOP-RIGHT corner for Tech Tiles */}
      {unlockedPart && unlockedPart.powerConsumed > 0 && (
        <PowerCostBadge
          cost={unlockedPart.powerConsumed}
          position="top-right"
          size={effectiveSize === 'lg' ? 'md' : 'sm'}
        />
      )}
    </div>
  );
};

// ============================================================================
// 17. COMPACT SHIP PART SLOT GRAPHIC
// Designed for Hangar Tray Blueprint slots (ShipBlueprintEditor & PlayerBoard)
// Uses physical tile iconography scaled for compact blueprint slots
// ============================================================================
export const ShipPartSlotGraphic: React.FC<{
  part: ShipPart;
  size?: 'sm' | 'md' | 'lg';
  showInitiative?: boolean;
  className?: string;
}> = ({ part, size = 'sm', showInitiative = true, className = '' }) => {
  const isReactor =
    part.category === 'reactor' ||
    (part.powerProduced > 0 && part.category !== 'drive' && part.category !== 'shield');

  return (
    <div
      title={getPartTooltip(part)}
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden select-none p-0.5 ${className}`}
    >
      {/* Top Left: Initiative Badge for ship parts granting Initiative */}
      {showInitiative && part.initiativeBonus !== 0 && (
        <div className="absolute top-0.5 left-0.5 z-20 select-none pointer-events-none">
          <InitiativeBadge init={part.initiativeBonus} size={size === 'lg' ? 'md' : 'sm'} />
        </div>
      )}

      {/* Top Right: Power Production for dual-function parts (e.g. Nonlinear Drive +2⚡) */}
      {part.powerProduced > 0 && !isReactor && part.category !== 'shield' && (
        <div className={`absolute top-0.5 right-0.5 z-10 flex items-center gap-0.5 bg-slate-950/95 ${size === 'lg' ? 'px-1.5 py-0.5' : 'px-1 py-0.2'} rounded-full border border-emerald-500/70 shadow select-none`}>
          <span className={`${size === 'lg' ? 'text-xs' : 'text-[8.5px]'} font-mono font-bold text-emerald-400 leading-none`}>
            +{part.powerProduced}
          </span>
          <LightningPip size={size === 'lg' ? 10 : 8} color="#34d399" />
        </div>
      )}

      {/* Center Physical Iconography */}
      <div className="my-auto flex items-center justify-center">
        {isReactor ? (
          <div className="flex items-center gap-1">
            <span className={`font-display font-black text-white ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-base sm:text-lg'} leading-none drop-shadow`}>
              {part.powerProduced}
            </span>
            <LightningPip size={size === 'sm' ? 10 : size === 'lg' ? 16 : 12} color="#fbbf24" />
          </div>
        ) : part.category === 'drive' ? (
          <DriveGraphic
            speed={part.driveSpeed || 0}
            init={0} // Rendered at top-left
            powerProduced={part.powerProduced}
            isJump={Boolean(part.isJumpDrive)}
            size={size}
          />
        ) : part.category === 'computer' ? (
          <ComputerGraphic
            computerBonus={part.computerBonus}
            init={0} // Rendered at top-left
            size={size}
          />
        ) : part.category === 'shield' ? (
          <ShieldGraphic
            shieldBonus={part.shieldBonus}
            init={0} // Rendered at top-left
            powerProduced={part.powerProduced} // Displayed side-by-side with die
            isMorph={part.id === 'morph_shield'}
            size={size}
          />
        ) : part.category === 'hull' ? (
          <HullGraphic
            hullBonus={part.hullBonus}
            compBonus={part.computerBonus}
            init={0} // Rendered at top-left
            size={size}
          />
        ) : part.category === 'missile' && part.dice ? (
          <MissileGraphic
            dice={part.dice}
            init={0} // Rendered at top-left
            size={size}
          />
        ) : part.dice ? (
          <div className="flex items-center gap-1">
            {part.dice.map((d, idx) => (
              <DiceGraphic
                key={idx}
                color={d.color}
                count={d.count}
                size={d.count > 1 || part.dice!.length > 1 || part.hullBonus > 0 ? 'sm' : size}
              />
            ))}
            {part.hullBonus > 0 && (
              <HullGraphic
                hullBonus={part.hullBonus}
                size={size === 'sm' ? 'sm' : size === 'lg' ? 'md' : 'sm'}
              />
            )}
          </div>
        ) : null}
      </div>

      {/* Bottom Right: Energy Cost */}
      {part.powerConsumed > 0 && (
        <div className={`absolute bottom-0.5 right-0.5 flex items-center bg-slate-950/95 ${size === 'lg' ? 'px-1.5 py-0.5' : 'px-1 py-0.2'} rounded-full border border-amber-500/70 shadow select-none`}>
          {part.powerConsumed === 1 ? (
            <LightningPip size={size === 'lg' ? 12 : size === 'sm' ? 8 : 10} color="#fbbf24" />
          ) : (
            <>
              <span className={`${size === 'lg' ? 'text-xs' : size === 'sm' ? 'text-[8.5px]' : 'text-[9.5px]'} font-mono font-bold text-amber-300 mr-0.5 leading-none`}>
                {part.powerConsumed}
              </span>
              <LightningPip size={size === 'lg' ? 12 : size === 'sm' ? 8 : 10} color="#fbbf24" />
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 18. PART TOOLTIP FORMATTER
// ============================================================================
export const getPartTooltip = (p: ShipPart): string => {
  const lines: string[] = [`${p.name} (${p.category.toUpperCase()})`];
  if (p.powerProduced > 0) lines.push(`⚡ Power Produced: +${p.powerProduced}`);
  if (p.powerConsumed > 0) lines.push(`⚡ Power Consumed: -${p.powerConsumed}`);
  if (p.dice && p.dice.length > 0) {
    lines.push(
      `🎲 Weapons: ` +
        p.dice
          .map((d) =>
            d.color === 'purple'
              ? `${d.count} Purple (Rift)`
              : `${d.count} ${d.color.toUpperCase()} (${d.damagePerHit} DMG/hit)`
          )
          .join(', ')
    );
  }
  if (p.driveSpeed) lines.push(`🚀 Drive Speed: ${p.driveSpeed}`);
  if (p.initiativeBonus !== 0) {
    lines.push(`Initiative: ${p.initiativeBonus > 0 ? `+${p.initiativeBonus}` : p.initiativeBonus}`);
  }
  if (p.computerBonus > 0) lines.push(`🎯 Computer: +${p.computerBonus}`);
  if (p.shieldBonus > 0) lines.push(`🛡️ Shield: -${p.shieldBonus}`);
  if (p.hullBonus > 0) lines.push(`❤️ Hull: +${p.hullBonus} HP`);
  if (p.isJumpDrive) {
    lines.push(
      `✨ Special: Jump Traverse (Non-standard component) - Once per Move activation, this ship may move to any adjacent sector regardless of wormhole connections (even if there are no connecting wormholes between the sectors, or across sectors with closed borders). Requires 2 Power consumed to equip.`
    );
  }
  if (p.id === 'morph_shield' || p.morphShield) {
    lines.push(
      `✨ Special: Morph Regeneration (Non-standard component) - In addition to -${p.shieldBonus} Shield reducing enemy hit rolls, this ship automatically removes 1 damage cube at the end of each Engagement Round in battle (surviving ships heal 1 HP per round during active combat).`
    );
  }
  return lines.join('\n');
};

// ============================================================================
// 19. DETAILED TECH HOVER TOOLTIP
// Unified authentic hover window matching TechMarketModal tech tray
// ============================================================================
export interface TechHoverTooltipProps {
  tech: Technology;
  horizontalPlacement?: string;
  verticalPlacement?: string;
  className?: string;
}

export const TechHoverTooltip: React.FC<TechHoverTooltipProps> = ({
  tech,
  horizontalPlacement = 'left-1/2 -translate-x-1/2',
  verticalPlacement = 'bottom-[calc(100%+8px)]',
  className = '',
}) => {
  return (
    <div
      role="tooltip"
      style={{ backgroundColor: '#020617' }}
      className={`hidden group-hover:block absolute ${horizontalPlacement} ${verticalPlacement} z-50 w-72 max-w-[calc(100vw-2rem)] p-3 bg-slate-950 border-2 border-amber-500/90 rounded-xl shadow-2xl shadow-black text-xs text-slate-100 pointer-events-none animate-in fade-in zoom-in-95 duration-150 text-left select-none ${className}`}
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-1.5">
        <span className="font-bold text-amber-300 text-sm font-display">{tech.name}</span>
        <span className="text-[10px] text-cyan-300 font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
          {tech.category}
        </span>
      </div>
      <p className="text-slate-200 text-xs leading-relaxed mb-2 font-normal">
        {tech.description}
      </p>
      <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          Base Cost: {tech.baseCost}
          <FlaskConical className="w-3 h-3 text-pink-400 inline" />
        </span>
        <span className="flex items-center gap-1">
          Min Cost: {tech.minCost}
          <FlaskConical className="w-3 h-3 text-pink-400 inline" />
        </span>
        {tech.victoryPoints ? (
          <span className="text-amber-400 font-bold">+{tech.victoryPoints} VP</span>
        ) : null}
      </div>
    </div>
  );
};

export { SectorPreviewGraphic, WarpSectorPreviewGraphic } from './SectorPreviewGraphic';
export type { SectorPreviewGraphicProps } from './SectorPreviewGraphic';

