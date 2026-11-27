import React, { useId } from 'react';
import { getFactionDisplayColor } from '../../engine/rules/gameReducer';

function isDarkHexColor(color: string): boolean {
  const c = color.trim().toLowerCase();
  if (!c.startsWith('#')) return false;
  let r = 0;
  let g = 0;
  let b = 0;
  if (c.length === 4) {
    r = parseInt(c[1] + c[1], 16);
    g = parseInt(c[2] + c[2], 16);
    b = parseInt(c[3] + c[3], 16);
  } else if (c.length === 7) {
    r = parseInt(c.slice(1, 3), 16);
    g = parseInt(c.slice(3, 5), 16);
    b = parseInt(c.slice(5, 7), 16);
  } else {
    return false;
  }
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
  // Relative luminance threshold so black/charcoal faction colors stay legible as an eclipse crescent
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.22;
}

export interface PlayerPresenceIconProps {
  color: string;
  isOnline: boolean;
  size?: number;
  title?: string;
  className?: string;
  testId?: string;
}

/**
 * Computes whether a player seat should show as Online (Full Circle) or Offline (Eclipse).
 * Local games, AI bots, and the viewer's own active seat are always online.
 * When `onlineByUserId` is omitted (e.g. standalone unit renders prior to fetch), defaults to online.
 */
export function isPlayerSeatOnline(params: {
  isLocalGame?: boolean;
  isBot?: boolean;
  seatOccupant?: { userId?: string } | null;
  currentUserId?: string | null;
  onlineByUserId?: Record<string, boolean> | null;
}): boolean {
  if (params.isLocalGame || params.isBot) return true;
  const occId = params.seatOccupant?.userId;
  if (!occId) return false;
  if (params.currentUserId && occId === params.currentUserId) return true;
  if (!params.onlineByUserId) return true;
  return Boolean(params.onlineByUserId[occId]);
}

/**
 * Presence indicator next to a commander's name:
 * - Online: Full Circle in the player's faction color
 * - Offline: Eclipse symbol (dark occultation disc leaving a glowing crescent corona)
 */
export const PlayerPresenceIcon: React.FC<PlayerPresenceIconProps> = ({
  color,
  isOnline,
  size = 11,
  title,
  className = '',
  testId,
}) => {
  const maskId = `presence-eclipse-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const safeColor = color || '#38bdf8';
  const mappedColor = getFactionDisplayColor(safeColor);
  const isDarkColor = mappedColor !== safeColor || isDarkHexColor(safeColor);

  if (isOnline) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        className={`shrink-0 ${className}`}
        data-presence="online"
        data-testid={testId}
        aria-label={title || 'Online'}
      >
        {title && <title>{title}</title>}
        <circle
          cx="8"
          cy="8"
          r="6"
          fill={safeColor}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.2"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={`shrink-0 ${className}`}
      data-presence="offline"
      data-testid={testId}
      aria-label={title || 'Offline (Eclipse)'}
    >
      {title && <title>{title}</title>}
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="16" height="16" fill="white" />
          <circle cx="10.4" cy="6.8" r={isDarkColor ? 4.7 : 5.1} fill="black" />
        </mask>
      </defs>
      {isDarkColor ? (
        <>
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="#cbd5e1"
            stroke="rgba(241,245,249,0.7)"
            strokeWidth="0.9"
          />
          <g mask={`url(#${maskId})`}>
            <circle cx="8" cy="8" r="5.5" fill={safeColor} />
          </g>
        </>
      ) : (
        <>
          <circle cx="10.4" cy="6.8" r="4.8" fill="#020617" opacity="0.55" />
          <g mask={`url(#${maskId})`}>
            <circle
              cx="8"
              cy="8"
              r="6"
              fill={safeColor}
              opacity="0.92"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="0.9"
            />
          </g>
        </>
      )}
    </svg>
  );
};
