import type { ConnectionPosition } from './connection-position';

/**
 * The fallback chain a dropdown wants: below the origin, aligned to its start edge, flipping above
 * it when there is no room, then trying the end edge for the same pair.
 *
 * `start` and `end` are logical, so this list mirrors itself under RTL without a second copy.
 * Matches the order Angular Material's own connected overlay defaults to, because a reader who
 * knows one should not have to learn the other.
 */
export const HUB_DROPDOWN_POSITIONS: readonly ConnectionPosition[] = [
	{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
	{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
	{ originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
	{ originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' }
];
