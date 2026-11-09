import React from 'react';
import { ShipType, ShipPart } from '../../engine/types/blueprints';
import {
  ShipPartSlotGraphic,
  LightningPip,
  ComputerGraphic,
  ShieldGraphic,
  HullGraphic,
  InitiativeBadge,
  getPartTooltip,
} from '../common/PhysicalTileIconography';
import { Lock, Plus, RotateCcw, Trash2 } from 'lucide-react';

export interface SlotCoordinate {
  col: number;
  row: number;
  offsetY: number; // percentage of cubeSize (e.g. 70 = 0.70 * cubeSize)
}

export interface ShipLayoutDef {
  cubes: SlotCoordinate[];
  gridCols: number;
  gridRows: number;
  extraCube: SlotCoordinate;
}

export const SHIP_LAYOUTS_STANDARD: Record<string, ShipLayoutDef> = {
  interceptor: {
    cubes: [
      { col: 1, row: 0, offsetY: 0 },   // Slot 0: Nose Cannon
      { col: 0, row: 0, offsetY: 70 },  // Slot 1: Left Wing
      { col: 2, row: 0, offsetY: 70 },  // Slot 2: Right Wing
      { col: 1, row: 1, offsetY: 0 },   // Slot 3: Rear Engine
    ],
    gridCols: 3,
    gridRows: 2,
    extraCube: { col: 3, row: 0, offsetY: 35 },
  },
  cruiser: {
    cubes: [
      { col: 1, row: 0, offsetY: 0 },   // Slot 0: Nose
      { col: 0, row: 0, offsetY: 30 },  // Slot 1: Top-Left Wing
      { col: 2, row: 0, offsetY: 30 },  // Slot 2: Top-Right Wing
      { col: 1, row: 1, offsetY: 0 },   // Slot 3: Center Core / Engine
      { col: 0, row: 1, offsetY: 30 },  // Slot 4: Bottom-Left Wing
      { col: 2, row: 1, offsetY: 30 },  // Slot 5: Bottom-Right Wing
    ],
    gridCols: 3,
    gridRows: 2,
    extraCube: { col: 3, row: 0, offsetY: 30 },
  },
  dreadnought: {
    cubes: [
      { col: 1, row: 0, offsetY: 0 },   // Slot 0: Front Inner Left
      { col: 2, row: 0, offsetY: 0 },   // Slot 1: Front Inner Right
      { col: 0, row: 0, offsetY: 30 },  // Slot 2: Front Outer Left
      { col: 3, row: 0, offsetY: 30 },  // Slot 3: Front Outer Right
      { col: 1, row: 1, offsetY: 0 },   // Slot 4: Rear Inner Left
      { col: 2, row: 1, offsetY: 0 },   // Slot 5: Rear Inner Right
      { col: 0, row: 1, offsetY: 30 },  // Slot 6: Rear Outer Left
      { col: 3, row: 1, offsetY: 30 },  // Slot 7: Rear Outer Right
    ],
    gridCols: 4,
    gridRows: 2,
    extraCube: { col: 4, row: 0, offsetY: 30 },
  },
  starbase: {
    cubes: [
      { col: 0, row: 0, offsetY: 0 },   // Slot 0: Top-Left
      { col: 2, row: 0, offsetY: 0 },   // Slot 1: Top-Right
      { col: 1, row: 0, offsetY: 50 },  // Slot 2: Center
      { col: 0, row: 1, offsetY: 0 },   // Slot 3: Bottom-Left
      { col: 2, row: 1, offsetY: 0 },   // Slot 4: Bottom-Right
    ],
    gridCols: 3,
    gridRows: 2,
    extraCube: { col: 3, row: 0, offsetY: 50 },
  },
  orbital: {
    cubes: [
      { col: 0, row: 1, offsetY: 0 },
      { col: 1, row: 0, offsetY: 50 },
      { col: 2, row: 0, offsetY: 0 },
    ],
    gridCols: 3,
    gridRows: 2,
    extraCube: { col: 3, row: 0, offsetY: 25 },
  },
};

export const SHIP_LAYOUTS_PLANTA: Record<string, ShipLayoutDef> = {
  interceptor: {
    cubes: [
      { col: 1, row: 0, offsetY: 0 },
      { col: 0, row: 0, offsetY: 70 },
      { col: 2, row: 0, offsetY: 70 },
    ],
    gridCols: 3,
    gridRows: 2,
    extraCube: { col: 1, row: 1, offsetY: 0 }, // Sits where engine was, forming a complete diamond
  },
  cruiser: {
    cubes: [
      { col: 1, row: 0, offsetY: 0 },
      { col: 0, row: 0, offsetY: 30 },
      { col: 2, row: 0, offsetY: 30 },
      { col: 1, row: 1, offsetY: 0 },
      { col: 2, row: 1, offsetY: 30 },
    ],
    gridCols: 3,
    gridRows: 2,
    extraCube: { col: 3, row: 0, offsetY: 30 },
  },
  dreadnought: {
    cubes: [
      { col: 1, row: 0, offsetY: 0 },
      { col: 2, row: 0, offsetY: 0 },
      { col: 0, row: 0, offsetY: 30 },
      { col: 3, row: 0, offsetY: 30 },
      { col: 1, row: 1, offsetY: 0 },
      { col: 2, row: 1, offsetY: 0 },
      { col: 3, row: 1, offsetY: 30 },
    ],
    gridCols: 4,
    gridRows: 2,
    extraCube: { col: 4, row: 0, offsetY: 30 },
  },
  starbase: {
    cubes: [
      { col: 0, row: 0, offsetY: 0 },
      { col: 2, row: 0, offsetY: 0 },
      { col: 1, row: 0, offsetY: 50 },
      { col: 2, row: 1, offsetY: 0 },
    ],
    gridCols: 3,
    gridRows: 2,
    extraCube: { col: 3, row: 0, offsetY: 50 },
  },
  orbital: {
    cubes: [
      { col: 0, row: 1, offsetY: 0 },
      { col: 1, row: 0, offsetY: 50 },
      { col: 2, row: 0, offsetY: 0 },
    ],
    gridCols: 3,
    gridRows: 2,
    extraCube: { col: 3, row: 0, offsetY: 25 },
  },
};

export const getChassisName = (
  shipType: string,
  factionId?: string
): string => {
  if (shipType === 'starbase') {
    return factionId === 'planta' ? 'Planta Defense Core' : 'Starbase Power Core';
  }
  if (shipType === 'orbital') {
    return 'Exiles Orbital Chassis';
  }
  if (factionId === 'orion_hegemony') {
    return 'Orion Martial Reactor';
  }
  if (factionId === 'planta') {
    return 'Planta Bio-Computer';
  }
  if (factionId === 'eridani_empire') {
    return 'Eridani Dynastic Power';
  }
  if (factionId === 'rho_indi_syndicate') {
    return 'Gauss Shield System';
  }
  return 'Integrated Chassis System';
};

export const getChassisTooltip = (
  shipType: string,
  factionId?: string,
  power?: number,
  comp?: number,
  shield?: number,
  hull?: number
): string => {
  const name = getChassisName(shipType, factionId);
  const parts: string[] = [name, '(Fixed Innate Chassis Component - Cannot be replaced)'];
  if (power && power > 0) parts.push(`⚡ Power Produced: +${power}`);
  if (comp && comp > 0) parts.push(`🎯 Computer: +${comp} COMP`);
  if (shield && shield > 0) parts.push(`🛡️ Shield: -${shield} Shield`);
  if (hull && hull > 0) parts.push(`❤️ Hull: +${hull} HP`);
  return parts.join('\n');
};

export interface ShipBlueprintSlotsLayoutProps {
  shipType: ShipType;
  factionId?: string;
  slots: (ShipPart | null)[];
  maxSlots?: number;
  preprintedPower?: number;
  preprintedComputer?: number;
  preprintedShield?: number;
  preprintedHull?: number;
  externalParts?: ShipPart[];
  // Interactive options
  interactive?: boolean;
  selectedSlotIndex?: number | null;
  onSelectSlot?: (index: number) => void;
  modifiedSlotIndices?: number[];
  onRevertSlot?: (index: number) => void;
  onClearSlot?: (index: number) => void;
  canModify?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ShipBlueprintSlotsLayout: React.FC<ShipBlueprintSlotsLayoutProps> = ({
  shipType,
  factionId,
  slots,
  maxSlots,
  preprintedPower,
  preprintedComputer,
  preprintedShield,
  preprintedHull,
  externalParts = [],
  interactive = false,
  selectedSlotIndex = null,
  onSelectSlot,
  modifiedSlotIndices = [],
  onRevertSlot,
  onClearSlot,
  canModify = true,
  size = 'md',
  className = '',
}) => {
  const isPlanta = factionId === 'planta';
  const layoutDict = isPlanta ? SHIP_LAYOUTS_PLANTA : SHIP_LAYOUTS_STANDARD;
  const layout = layoutDict[shipType] || SHIP_LAYOUTS_STANDARD.interceptor!;

  // Sizing configuration
  const cubeSize = size === 'sm' ? 48 : size === 'lg' ? 72 : 60;
  const gap = size === 'sm' ? 3 : size === 'lg' ? 6 : 4;

  const totalSlotsCount = maxSlots ?? layout.cubes.length;
  const hasPreprinted = Boolean(
    (preprintedPower && preprintedPower > 0) ||
      (preprintedComputer && preprintedComputer > 0) ||
      (preprintedShield && preprintedShield > 0) ||
      (preprintedHull && preprintedHull > 0)
  );

  // Compute bounding box
  const allCoordinates: SlotCoordinate[] = [];
  for (let i = 0; i < totalSlotsCount; i++) {
    const c = layout.cubes[i] || { col: i, row: 0, offsetY: 0 };
    allCoordinates.push(c);
  }

  if (hasPreprinted) {
    allCoordinates.push(layout.extraCube);
  }

  externalParts.forEach((_, extIdx) => {
    const extraOffset = hasPreprinted ? extIdx + 1 : extIdx;
    allCoordinates.push({
      col: layout.extraCube.col,
      row: layout.extraCube.row + extraOffset,
      offsetY: layout.extraCube.offsetY,
    });
  });

  let maxX = 0;
  let maxY = 0;
  for (const c of allCoordinates) {
    const x = c.col * (cubeSize + gap) + cubeSize;
    const y = c.row * (cubeSize + gap) + (c.offsetY / 100) * cubeSize + cubeSize;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const chassisName = getChassisName(shipType, factionId);
  const chassisTooltip = getChassisTooltip(
    shipType,
    factionId,
    preprintedPower,
    preprintedComputer,
    preprintedShield,
    preprintedHull
  );

  return (
    <div
      className={`relative select-none ${className}`}
      style={{ width: maxX, height: maxY }}
    >
      {/* 1. Main Customizable Blueprint Slots */}
      {Array.from({ length: totalSlotsCount }).map((_, idx) => {
        const part = slots[idx] || null;
        const coord = layout.cubes[idx] || { col: idx, row: 0, offsetY: 0 };
        const left = coord.col * (cubeSize + gap);
        const top = coord.row * (cubeSize + gap) + (coord.offsetY / 100) * cubeSize;

        const isSelected = selectedSlotIndex === idx;
        const isModified = modifiedSlotIndices.includes(idx);
        const isAncient = part?.id?.startsWith('ancient_') || (part as any)?.isAncient;

        const baseCategoryBg = part
          ? isAncient
            ? 'bg-amber-950/40 border-amber-500/80 shadow ring-1 ring-amber-500/30'
            : part.category === 'reactor'
            ? 'bg-amber-950/30 border-amber-600/70'
            : part.category === 'drive'
            ? 'bg-cyan-950/30 border-cyan-600/70'
            : part.category === 'hull'
            ? 'bg-rose-950/30 border-rose-600/70'
            : part.category === 'computer'
            ? 'bg-indigo-950/30 border-indigo-600/70'
            : part.category === 'shield'
            ? 'bg-teal-950/30 border-teal-600/70'
            : 'bg-yellow-950/30 border-yellow-600/70'
          : 'bg-slate-900/30 border-dashed border-slate-700/60';

        const stateClasses = isSelected
          ? 'border-2 border-cyan-400 bg-cyan-950/50 shadow-lg shadow-cyan-950 ring-2 ring-cyan-400/60'
          : isModified
          ? 'border-2 border-indigo-500 bg-indigo-950/40 shadow ring-1 ring-indigo-500/40'
          : `border ${baseCategoryBg}`;

        const cursorClasses = interactive && canModify ? 'cursor-pointer hover:border-slate-400' : '';

        return (
          <div
            key={`slot_${shipType}_${idx}`}
            onClick={() => {
              if (interactive && onSelectSlot) {
                onSelectSlot(idx);
              }
            }}
            title={
              part
                ? `${part.name}${part.computerBonus > 0 ? ` (+${part.computerBonus} COMP)` : ''}\n${getPartTooltip(part)}`
                : 'Empty Component Slot'
            }
            className={`absolute rounded-lg flex flex-col items-center justify-center transition-all overflow-hidden aspect-square ${stateClasses} ${cursorClasses}`}
            style={{
              left,
              top,
              width: cubeSize,
              height: cubeSize,
            }}
          >
            {part ? (
              <div className="w-full h-full relative">
                {/* Top-Left: Initiative Badge for ship parts granting Initiative (Symmetrical to Trash Bin on Top-Right) */}
                {part.initiativeBonus !== 0 && (
                  <div className="absolute top-0.5 left-0.5 flex items-center z-20 select-none pointer-events-none">
                    <InitiativeBadge init={part.initiativeBonus} size={size === 'lg' ? 'md' : 'sm'} />
                  </div>
                )}

                <ShipPartSlotGraphic part={part} size={size} showInitiative={false} />

                {/* Interactive Controls in Editor (Top-Right: Revert & Trash Bin) */}
                {interactive && (
                  <div className="absolute top-0.5 right-0.5 flex items-center gap-0.5 z-20">
                    {isModified && onRevertSlot && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRevertSlot(idx);
                        }}
                        className="text-cyan-400 hover:text-cyan-200 p-0.5 bg-slate-950/80 rounded-full"
                        title="Revert to original component"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                      </button>
                    )}
                    {onClearSlot && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearSlot(idx);
                        }}
                        className="text-slate-400 hover:text-rose-400 p-0.5 bg-slate-950/80 rounded-full"
                        title="Remove part"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center text-slate-600">
                <Plus className="w-4 h-4 opacity-40" />
              </div>
            )}
          </div>
        );
      })}

      {/* 2. Additional Preprinted / Innate Chassis Component Square (e.g. Orion, Starbase, Planta) */}
      {hasPreprinted && (() => {
        const coord = layout.extraCube;
        const left = coord.col * (cubeSize + gap);
        const top = coord.row * (cubeSize + gap) + (coord.offsetY / 100) * cubeSize;

        return (
          <div
            key={`preprinted_${shipType}`}
            title={chassisTooltip}
            className="absolute rounded-lg border-2 border-emerald-500/70 bg-emerald-950/40 text-emerald-300 ring-1 ring-emerald-500/30 shadow-md select-none flex flex-col items-center justify-center overflow-hidden aspect-square"
            style={{
              left,
              top,
              width: cubeSize,
              height: cubeSize,
            }}
          >
            {/* Lock / Fixed Indicator */}
            <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 text-emerald-400 bg-slate-950/80 px-1 py-0.2 rounded-full border border-emerald-500/50">
              <Lock className="w-2 h-2" />
              <span className="text-[7px] font-mono font-bold leading-none uppercase">FIXED</span>
            </div>

            {/* Innate Power / Computer / Shield / Hull Display */}
            <div className="flex flex-col items-center justify-center mt-1">
              {preprintedPower && preprintedPower > 0 && (
                <div className="flex items-center gap-0.5">
                  <span className="font-display font-black text-amber-300 text-xs sm:text-sm leading-none drop-shadow">
                    +{preprintedPower}
                  </span>
                  <LightningPip size={size === 'sm' ? 10 : 12} color="#fbbf24" />
                </div>
              )}
              {preprintedComputer && preprintedComputer > 0 && (
                <div className="mt-0.5">
                  <ComputerGraphic computerBonus={preprintedComputer} size="sm" />
                </div>
              )}
              {preprintedShield && preprintedShield > 0 && (
                <div className="mt-0.5">
                  <ShieldGraphic shieldBonus={preprintedShield} size="sm" />
                </div>
              )}
              {preprintedHull && preprintedHull > 0 && (
                <div className="mt-0.5">
                  <HullGraphic hullBonus={preprintedHull} size="sm" />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 3. External Module Slots (e.g. Muon Source, Ancient Parts attached) */}
      {externalParts.map((extPart, extIdx) => {
        const extraOffset = hasPreprinted ? extIdx + 1 : extIdx;
        const left = layout.extraCube.col * (cubeSize + gap);
        const top =
          (layout.extraCube.row + extraOffset) * (cubeSize + gap) +
          (layout.extraCube.offsetY / 100) * cubeSize;

        return (
          <div
            key={`external_${shipType}_${extIdx}`}
            title={`External Module: ${extPart.name}\n${getPartTooltip(extPart)}`}
            className="absolute rounded-lg border-2 border-amber-500/80 bg-amber-950/40 text-amber-200 ring-1 ring-amber-500/30 shadow-md select-none flex flex-col items-center justify-center overflow-hidden aspect-square"
            style={{
              left,
              top,
              width: cubeSize,
              height: cubeSize,
            }}
          >
            <div className="w-full h-full relative flex flex-col items-center justify-center">
              {/* Top-Left: Initiative Badge for external parts if granting Initiative */}
              {extPart.initiativeBonus !== 0 && (
                <div className="absolute top-0.5 left-0.5 flex items-center z-20 select-none pointer-events-none">
                  <InitiativeBadge init={extPart.initiativeBonus} size={size === 'lg' ? 'md' : 'sm'} />
                </div>
              )}

              <ShipPartSlotGraphic part={extPart} size={size === 'sm' ? 'sm' : 'md'} showInitiative={false} />

              <div className="absolute top-0.5 right-0.5 flex items-center gap-0.5 text-amber-400 bg-slate-950/80 px-1 py-0.2 rounded-full border border-amber-500/50 z-20">
                <span className="text-[6.5px] font-mono font-bold leading-none uppercase">EXT</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
