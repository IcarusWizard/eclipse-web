import React from 'react';
import { NeutralShipBlueprint } from '../../engine/rules/neutralShips';
import { ShipPart } from '../../engine/types/blueprints';
import { InitiativeBadge, ShipPartSlotGraphic, getPartTooltip } from '../common/PhysicalTileIconography';
import { getPartSlotCategoryClasses } from './ShipBlueprintSlotsLayout';

function splitChunkedTotal(total: number, maxPerChunk: number, preferBalancedPair = false): number[] {
  if (total <= 0) return [];
  if (preferBalancedPair && total === 4 && maxPerChunk === 3) {
    return [2, 2];
  }
  const chunks: number[] = [];
  let remaining = total;
  while (remaining > 0) {
    const next = Math.min(maxPerChunk, remaining);
    chunks.push(next);
    remaining -= next;
  }
  return chunks;
}

/**
 * Decomposes an NPC ship blueprint into discrete square-box ShipPart modules
 * matching Eclipse component iconography (Computer, Shield, Hull chunks up to 3, Weapons up to 2 dice per tile).
 */
export function buildNeutralShipComponents(blueprint: NeutralShipBlueprint): ShipPart[] {
  const parts: ShipPart[] = [];
  const keyPrefix = `npc_${blueprint.type}_${blueprint.variant}`;

  if (blueprint.computerBonus > 0) {
    parts.push({
      id: `${keyPrefix}_comp`,
      name: `Computer (+${blueprint.computerBonus})`,
      category: 'computer',
      powerProduced: 0,
      powerConsumed: 0,
      initiativeBonus: 0,
      computerBonus: blueprint.computerBonus,
      shieldBonus: 0,
      hullBonus: 0,
    });
  }

  if (blueprint.shieldBonus > 0) {
    parts.push({
      id: `${keyPrefix}_shield`,
      name: `Shield (-${blueprint.shieldBonus})`,
      category: 'shield',
      powerProduced: 0,
      powerConsumed: 0,
      initiativeBonus: 0,
      computerBonus: 0,
      shieldBonus: blueprint.shieldBonus,
      hullBonus: 0,
    });
  }

  // Every ship has 1 base structural HP; additional HP renders as Hull bonus tiles (1★/2★/3★)
  const extraHull = Math.max(0, blueprint.maxHull - 1);
  const hullChunks = splitChunkedTotal(extraHull, 3, true);
  hullChunks.forEach((hullChunk, idx) => {
    parts.push({
      id: `${keyPrefix}_hull_${idx}`,
      name: hullChunk === 1 ? 'Hull (+1)' : hullChunk === 2 ? 'Improved Hull (+2)' : `Hull (+${hullChunk})`,
      category: 'hull',
      powerProduced: 0,
      powerConsumed: 0,
      initiativeBonus: 0,
      computerBonus: 0,
      shieldBonus: 0,
      hullBonus: hullChunk,
    });
  });

  // Group missiles before cannons; cap each square box at 2 dice so dice fit cleanly inside square tiles
  const orderedWeapons = [
    ...blueprint.weapons.filter((w) => w.isMissile),
    ...blueprint.weapons.filter((w) => !w.isMissile),
  ];

  orderedWeapons.forEach((weapon, wIdx) => {
    const colorTitle = weapon.color.charAt(0).toUpperCase() + weapon.color.slice(1);
    const kindLabel = weapon.isMissile ? 'Missile' : 'Cannon';
    const diceChunks = splitChunkedTotal(weapon.count, 2);
    diceChunks.forEach((diceCount, cIdx) => {
      parts.push({
        id: `${keyPrefix}_weapon_${wIdx}_${cIdx}`,
        name: `${diceCount}x ${colorTitle} ${kindLabel}`,
        category: weapon.isMissile ? 'missile' : 'cannon',
        powerProduced: 0,
        powerConsumed: 0,
        initiativeBonus: 0,
        computerBonus: 0,
        shieldBonus: 0,
        hullBonus: 0,
        dice: [
          {
            color: weapon.color,
            count: diceCount,
            damagePerHit: weapon.damage,
            isMissile: weapon.isMissile,
          },
        ],
      });
    });
  });

  return parts;
}

/**
 * Arranges N square component boxes into centered rows:
 * - 1..2 items: 1 row ([1] or [2])
 * - 3 items: triangle (1 centered on top, 2 on bottom)
 * - 4 items: 2x2 grid
 * - 5 items: staggered triangle/pyramid (2 centered on top, 3 on bottom)
 * - 6+ items: balanced centered rows (top row smaller when odd)
 */
export function getNeutralShipLayoutRows<T>(items: T[]): T[][] {
  const n = items.length;
  if (n === 0) return [];
  if (n <= 2) return [items];

  const rowCount = Math.max(2, Math.ceil(n / 4));
  const baseCount = Math.floor(n / rowCount);
  const extraRows = n % rowCount;
  const topBalancedCount = rowCount - extraRows;

  const rows: T[][] = [];
  let cursor = 0;
  for (let r = 0; r < rowCount; r++) {
    const countInRow = r < topBalancedCount ? baseCount : baseCount + 1;
    rows.push(items.slice(cursor, cursor + countInRow));
    cursor += countInRow;
  }
  return rows;
}

export interface NeutralShipBlueprintLayoutProps {
  blueprint: NeutralShipBlueprint;
  size?: 'sm' | 'md' | 'lg';
  showInitiative?: boolean;
  className?: string;
}

/**
 * Renders an NPC ship blueprint as authentic square component boxes in centered geometric rows.
 */
export const NeutralShipBlueprintLayout: React.FC<NeutralShipBlueprintLayoutProps> = ({
  blueprint,
  size = 'sm',
  showInitiative = true,
  className = '',
}) => {
  const parts = React.useMemo(() => buildNeutralShipComponents(blueprint), [blueprint]);
  const rows = React.useMemo(() => getNeutralShipLayoutRows(parts), [parts]);

  const cubeSize = size === 'sm' ? 48 : size === 'lg' ? 72 : 60;
  const gapPx = size === 'sm' ? 3 : size === 'lg' ? 6 : 4;
  const layoutSignature = rows.map((r) => r.length).join('-');

  return (
    <div
      data-testid="npc-blueprint-grid"
      data-npc-type={blueprint.type}
      data-npc-variant={blueprint.variant}
      data-layout-rows={layoutSignature}
      className={`inline-flex flex-col items-center select-none ${className}`}
      style={{ gap: gapPx }}
    >
      {showInitiative && (
        <div className="flex items-center justify-center gap-1.5 w-full">
          {blueprint.initiative !== 0 ? (
            <InitiativeBadge init={blueprint.initiative} size={size === 'lg' ? 'md' : 'sm'} />
          ) : (
            <span
              title="0 Initiative"
              className="inline-flex items-center px-1.5 py-0.5 rounded-[3px] bg-slate-950/95 border border-slate-700 text-slate-300 text-[8.5px] font-mono font-bold leading-none"
            >
              Init 0
            </span>
          )}
          <span
            title={`Total Hull: ${blueprint.maxHull} HP (1 base + ${Math.max(0, blueprint.maxHull - 1)} hull modules)`}
            className="inline-flex items-center px-1.5 py-0.5 rounded-[3px] bg-slate-950/95 border border-slate-700/80 text-slate-300 text-[8.5px] font-mono font-bold leading-none"
          >
            {blueprint.maxHull} HP
          </span>
        </div>
      )}

      {rows.map((rowParts, rowIdx) => (
        <div
          key={`row_${rowIdx}`}
          data-testid="npc-blueprint-row"
          className="flex items-center justify-center"
          style={{ gap: gapPx }}
        >
          {rowParts.map((part) => (
            <div
              key={part.id}
              data-testid="npc-blueprint-box"
              title={`${part.name}\n${getPartTooltip(part)}`}
              className={`rounded-lg border flex items-center justify-center overflow-hidden aspect-square shrink-0 ${getPartSlotCategoryClasses(part)}`}
              style={{ width: cubeSize, height: cubeSize }}
            >
              <ShipPartSlotGraphic part={part} size={size} showInitiative={false} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
