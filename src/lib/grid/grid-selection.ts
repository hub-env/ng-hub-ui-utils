import { HubGridBounds, HubGridCoords, HubGridRange } from './grid.types';

/**
 * Rectangular selection for a grid, as pure arithmetic.
 *
 * A selection is held as two corners — an anchor and the cursor — rather than as a set of cells,
 * so extending it stays O(1) however large it grows. Everything downstream (copy, fill, clear)
 * asks these helpers for the rectangle it needs.
 */

/**
 * The rectangle spanned by two corners, in either order.
 *
 * Callers hand over the anchor and the live cursor without caring which way the drag went.
 */
export function gridRangeBetween(anchor: HubGridCoords, cursor: HubGridCoords): HubGridRange {
	return {
		top: Math.min(anchor.row, cursor.row),
		bottom: Math.max(anchor.row, cursor.row),
		left: Math.min(anchor.col, cursor.col),
		right: Math.max(anchor.col, cursor.col)
	};
}

/** Whether a cell falls inside the selection; a null range contains nothing. */
export function isWithinGridRange(coords: HubGridCoords, range: HubGridRange | null): boolean {
	if (!range) {
		return false;
	}

	return coords.row >= range.top && coords.row <= range.bottom && coords.col >= range.left && coords.col <= range.right;
}

/**
 * Every cell of the range, row by row and left to right.
 *
 * That order is not incidental: it is the order a spreadsheet writes to the clipboard and reads
 * a paste back, so callers can zip this against tab-separated text without sorting anything.
 */
export function gridRangeCells(range: HubGridRange): HubGridCoords[] {
	const cells: HubGridCoords[] = [];

	for (let row = range.top; row <= range.bottom; row++) {
		for (let col = range.left; col <= range.right; col++) {
			cells.push({ row, col });
		}
	}

	return cells;
}

/** How many rows and columns the range covers, both bounds counted in. */
export function gridRangeSize(range: HubGridRange): { rows: number; cols: number } {
	return {
		rows: Math.max(0, range.bottom - range.top + 1),
		cols: Math.max(0, range.right - range.left + 1)
	};
}

/**
 * Trims a range to the grid it belongs to.
 *
 * Worth doing on every read rather than only on write: rows come and go under a live selection —
 * a filter, a delete, a reload after a save — and a stale rectangle would otherwise be copied or
 * filled against cells that no longer exist.
 *
 * @returns The trimmed range, or null when the grid has no cells at all.
 */
export function clampGridRange(range: HubGridRange, bounds: HubGridBounds): HubGridRange | null {
	if (bounds.rows <= 0 || bounds.cols <= 0) {
		return null;
	}

	return {
		top: between(range.top, bounds.rows),
		bottom: between(range.bottom, bounds.rows),
		left: between(range.left, bounds.cols),
		right: between(range.right, bounds.cols)
	};
}

/** Constrains a single index to `0 .. length - 1`. */
function between(value: number, length: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.min(length - 1, Math.trunc(value)));
}
