import { HubGridBounds, HubGridCoords, HubGridEdge, HubGridWrap, HubGridWrapConfig } from './grid.types';

/**
 * Two-dimensional cursor movement for a grid, as pure arithmetic.
 *
 * Ported in shape from `@angular/aria/grid` (MIT, Copyright Google LLC), reimplemented here so
 * the component family keeps its property of depending on nothing outside Angular itself.
 */

/** The origin, returned whenever a grid has no cell to point at. */
const ORIGIN: HubGridCoords = { row: 0, col: 0 };

/**
 * Moves the cursor by `delta`, honouring the wrap mode of each axis.
 *
 * `from` is clamped into the grid before anything else, because a grid that shrinks under a
 * live cursor leaves coordinates pointing at cells that no longer exist, and the caller should
 * not have to notice.
 *
 * @param from Where the cursor is now.
 * @param delta How far to move; either component may be zero, negative or overshoot the grid.
 * @param bounds The size of the grid.
 * @param wrap What to do at each edge; both axes default to `nowrap`.
 * @returns The new position, always inside the grid.
 */
export function moveGridFocus(
	from: HubGridCoords,
	delta: { row: number; col: number },
	bounds: HubGridBounds,
	wrap: HubGridWrapConfig = {}
): HubGridCoords {
	if (isEmpty(bounds)) {
		return ORIGIN;
	}

	const start = clamp(from, bounds);

	// Horizontal first: its `main` axis is the column, and a `continuous` overflow pushes the row,
	// which is why the vertical step reads both of its inputs back out of the horizontal result.
	const horizontal = step(start.row, delta.col, start.col, bounds.cols, bounds.rows, wrap.horizontal);
	const vertical = step(horizontal.main, delta.row, horizontal.cross, bounds.rows, bounds.cols, wrap.vertical);

	return { row: vertical.main, col: vertical.cross };
}

/**
 * Resolves one of the jump destinations — the Home/End family, plus their Ctrl variants.
 *
 * @param from Where the cursor is now.
 * @param edge Which end to travel to.
 * @param bounds The size of the grid.
 * @returns The destination, always inside the grid.
 */
export function resolveGridEdge(from: HubGridCoords, edge: HubGridEdge, bounds: HubGridBounds): HubGridCoords {
	if (isEmpty(bounds)) {
		return ORIGIN;
	}

	const { row, col } = clamp(from, bounds);
	const lastRow = bounds.rows - 1;
	const lastCol = bounds.cols - 1;

	switch (edge) {
		case 'row-start':
			return { row, col: 0 };
		case 'row-end':
			return { row, col: lastCol };
		case 'col-start':
			return { row: 0, col };
		case 'col-end':
			return { row: lastRow, col };
		case 'grid-start':
			return ORIGIN;
		case 'grid-end':
			return { row: lastRow, col: lastCol };
	}
}

/** Whether a grid has any cell at all. */
function isEmpty(bounds: HubGridBounds): boolean {
	return bounds.rows <= 0 || bounds.cols <= 0;
}

/** Pulls coordinates back inside the grid, which is where a shrunken grid leaves them. */
function clamp(coords: HubGridCoords, bounds: HubGridBounds): HubGridCoords {
	return {
		row: between(coords.row, bounds.rows),
		col: between(coords.col, bounds.cols)
	};
}

/** Constrains a single index to `0 .. length - 1`, treating a stray NaN as the first cell. */
function between(value: number, length: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.min(length - 1, Math.trunc(value)));
}

/**
 * Advances one axis, letting the other absorb the overflow when the mode says so.
 *
 * Both axes run the same arithmetic with their roles swapped, so this works in terms of a `main`
 * axis being moved along and a `cross` axis that a `continuous` overflow spills into. The caller
 * maps those onto rows and columns.
 *
 * @returns The new pair, `main` being the axis that was moved.
 */
function step(
	cross: number,
	delta: number,
	main: number,
	mainLength: number,
	crossLength: number,
	wrap: HubGridWrap = 'nowrap'
): { main: number; cross: number } {
	if (delta === 0) {
		return { main, cross };
	}

	const target = main + delta;

	if (target >= 0 && target < mainLength) {
		return { main: target, cross };
	}

	if (wrap === 'loop') {
		return { main: modulo(target, mainLength), cross };
	}

	if (wrap === 'continuous') {
		// One full lap along the main axis is one step along the cross axis, which is what makes
		// Tab fall onto the next row instead of stopping at the last column.
		const absolute = cross * mainLength + target;
		const total = crossLength * mainLength;

		if (absolute < 0 || absolute >= total) {
			// The far corner of the grid. There is nowhere left to spill, so stay.
			return { main, cross };
		}

		return { main: modulo(absolute, mainLength), cross: Math.floor(absolute / mainLength) };
	}

	// nowrap: an overshooting delta still travels as far as it can, so a long jump lands on the
	// edge rather than being thrown away.
	return { main: between(target, mainLength), cross };
}

/** Remainder that stays positive, so a negative index wraps to the far end instead of below zero. */
function modulo(value: number, length: number): number {
	return ((value % length) + length) % length;
}
