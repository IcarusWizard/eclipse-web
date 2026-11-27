import React from 'react';
import { SHIP_LAYOUTS_STANDARD } from '../blueprints/ShipBlueprintSlotsLayout';

export interface ShipIconBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShipIconLayout {
  boxes: ShipIconBox[];
  width: number;
  height: number;
  isNeutral: boolean;
}

const BOX_SIZE = 10;
const BOX_GAP = 2.5;
const BOX_STEP = BOX_SIZE + BOX_GAP;

/** Fallback coordinates matching NeutralShipBlueprintLayout rows ([1,2], [2,2], [2,3]). */
const NEUTRAL_ROW_COUNTS: Record<string, number[]> = {
  ancient: [1, 2],
  guardian: [2, 2],
  gcds: [2, 3],
};

function buildNeutralBoxes(rowCounts: number[]): ShipIconBox[] {
  const maxCols = Math.max(...rowCounts);
  const totalWidth = maxCols * BOX_SIZE + (maxCols - 1) * BOX_GAP;
  const boxes: ShipIconBox[] = [];
  rowCounts.forEach((count, rowIdx) => {
    const rowWidth = count * BOX_SIZE + (count - 1) * BOX_GAP;
    const startX = (totalWidth - rowWidth) / 2;
    const y = rowIdx * BOX_STEP;
    for (let i = 0; i < count; i++) {
      boxes.push({
        x: startX + i * BOX_STEP,
        y,
        w: BOX_SIZE,
        h: BOX_SIZE,
      });
    }
  });
  return boxes;
}

/**
 * Returns the miniature box coordinates for a ship type using the exact
 * Terran / Standard blueprint hull cubes (excluding extraCube / external parts)
 * and Exile's Orbital own blueprint cubes.
 * Children of Light converted 'ancient' ships use the standard 6-block Cruiser icon,
 * while neutral Ancients keep their 3-block triangle icon.
 */
export function getShipIconBoxes(shipType: string, factionId?: string): ShipIconLayout {
  const key = shipType.toLowerCase();
  const effectiveKey = key === 'ancient' && factionId === 'children_of_light' ? 'cruiser' : key;
  const standardLayout = SHIP_LAYOUTS_STANDARD[effectiveKey];

  let rawBoxes: ShipIconBox[];
  let isNeutral = false;

  if (standardLayout) {
    rawBoxes = standardLayout.cubes.map((coord) => ({
      x: coord.col * BOX_STEP,
      y: coord.row * BOX_STEP + (coord.offsetY / 100) * BOX_SIZE,
      w: BOX_SIZE,
      h: BOX_SIZE,
    }));
  } else if (NEUTRAL_ROW_COUNTS[key]) {
    rawBoxes = buildNeutralBoxes(NEUTRAL_ROW_COUNTS[key]);
    isNeutral = true;
  } else {
    rawBoxes = [{ x: 0, y: 0, w: BOX_SIZE, h: BOX_SIZE }];
  }

  const minX = Math.min(...rawBoxes.map((b) => b.x));
  const minY = Math.min(...rawBoxes.map((b) => b.y));
  const maxX = Math.max(...rawBoxes.map((b) => b.x + b.w));
  const maxY = Math.max(...rawBoxes.map((b) => b.y + b.h));

  const boxes = rawBoxes.map((b) => ({
    x: Number((b.x - minX).toFixed(2)),
    y: Number((b.y - minY).toFixed(2)),
    w: b.w,
    h: b.h,
  }));

  return {
    boxes,
    width: Number((maxX - minX).toFixed(2)),
    height: Number((maxY - minY).toFixed(2)),
    isNeutral,
  };
}

export interface ShipTypeSvgBoxesProps {
  shipType: string;
  factionId?: string;
  x?: number;
  y?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  fillOpacity?: number;
  strokeWidth?: number;
}

/**
 * Pure SVG <g> rendering of a ship's box layout, safe to nest inside other SVGs
 * such as HexGalaxyMap sector fleet pills.
 */
export const ShipTypeSvgBoxes: React.FC<ShipTypeSvgBoxesProps> = ({
  shipType,
  factionId,
  x = 0,
  y = 0,
  height = 10,
  fill = 'currentColor',
  stroke = 'currentColor',
  fillOpacity = 0.28,
  strokeWidth = 1.6,
}) => {
  const layout = getShipIconBoxes(shipType, factionId);
  const scale = layout.height > 0 ? height / layout.height : 1;

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {layout.boxes.map((box, idx) => (
        <rect
          key={idx}
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          rx={1.5}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ))}
    </g>
  );
};

/**
 * Orbit ship-type icon should only be shown for The Exiles (the only faction
 * whose Orbital acts as an armed blueprint ship).
 */
export function shouldShowShipTypeIcon(shipType: string, factionId?: string): boolean {
  if (shipType.toLowerCase() === 'orbital') {
    return factionId === 'the_exiles';
  }
  return true;
}

export interface ShipTypeIconProps {
  shipType: string;
  /** Optional owner faction id; hides 'orbital' icon unless factionId === 'the_exiles'. */
  factionId?: string;
  /** Uniform unit scale reference height in pixels (defaults to 16). */
  size?: number;
  color?: string;
  className?: string;
  title?: string;
}

/** Uniform height denominator so square sizes stay consistent across all ship classes. */
const REFERENCE_UNIT_HEIGHT = 25;

/**
 * Compact SVG icon whose silhouette matches the ship's Terran blueprint box layout
 * (or Exile's Orbital blueprint shape for 'orbital').
 */
export const ShipTypeIcon: React.FC<ShipTypeIconProps> = ({
  shipType,
  factionId,
  size = 16,
  color,
  className = '',
  title,
}) => {
  if (factionId !== undefined && !shouldShowShipTypeIcon(shipType, factionId)) {
    return null;
  }

  const layout = getShipIconBoxes(shipType, factionId);
  const scale = size / REFERENCE_UNIT_HEIGHT;
  const pad = 1.5;
  const vbWidth = layout.width + pad * 2;
  const vbHeight = layout.height + pad * 2;
  const pxWidth = Math.max(8, Math.round(vbWidth * scale));
  const pxHeight = Math.max(8, Math.round(vbHeight * scale));

  return (
    <svg
      width={pxWidth}
      height={pxHeight}
      viewBox={`${-pad} ${-pad} ${vbWidth} ${vbHeight}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={color ? { color } : undefined}
      data-testid="ship-type-icon"
      data-ship-type={shipType.toLowerCase()}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {layout.boxes.map((box, idx) => (
        <rect
          key={idx}
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          rx={1.5}
          fill="currentColor"
          fillOpacity={0.28}
          stroke="currentColor"
          strokeWidth={1.6}
        />
      ))}
    </svg>
  );
};
