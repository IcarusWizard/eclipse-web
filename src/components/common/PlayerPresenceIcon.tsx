import React from 'react';

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
  const safeColor = color || '#38bdf8';

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
      <circle cx="8" cy="8" r="6" fill={safeColor} opacity="0.85" />
      <circle cx="10.2" cy="7" r="5.1" fill="#020617" />
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="rgba(203,213,225,0.65)"
        strokeWidth="1"
      />
    </svg>
  );
};
