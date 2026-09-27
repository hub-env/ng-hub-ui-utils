import { HubGridBounds, HubGridCoords, HubGridRange } from './grid.types';
import { clampGridRange, gridRangeCells, isWithinGridRange } from './grid-selection';

/**
 * A selection made of several rectangles, which is what a grid has the moment somebody holds
 * `Ctrl` and clicks a second block.
 *
 * Kept as a list of rectangles rather than as a set of cells, for the same reason one rectangle is
 * kept as two corners: a reader picking four blocks of a thousand rows has picked four rectangles,
 * and turning that into four thousand coordinates to answer "is this cell selected" is how a sheet
 * starts feeling slow.
 *
 * The one rule worth knowing before reading the rest: **a disjoint selection cannot always be
 * copied.** Two blocks side by side make a table; two blocks that overlap nothing and line up with
 * nothing make no table at all, and a spreadsheet says so rather than inventing one. That is what
 * {@link gridSelectionTable} decides, and it is the same rule Excel applies when it refuses with
 * "that command cannot be used on multiple selections".
 */

/** Whether a cell falls inside any rectangle of the selection. */
export function isWithinGridSelection(coords: HubGridCoords, ranges: readonly HubGridRange[]): boolean {
	return ranges.some((range) => isWithinGridRange(coords, range));
}

/** Whether one rectangle holds another whole. */
function contains(outer: HubGridRange, inner: HubGridRange): boolean {
	return inner.top >= outer.top && inner.bottom <= outer.bottom && inner.left >= outer.left && inner.right <= outer.right;
}

/**
 * Adds a rectangle to a selection.
 *
 * Rectangles already swallowed by the newcomer are dropped, and a newcomer already inside one is
 * not added: without that, clicking about with `Ctrl` held quietly grows a list of rectangles that
 * all say the same thing, and every later answer — the cell count, the clipboard, the clearing —
 * has to de-duplicate what should never have been stored twice. Overlaps that are *partial* are
 * kept as they are, because they are two decisions the reader made and neither contains the other.
 */
export function addGridRange(ranges: readonly HubGridRange[], range: HubGridRange): HubGridRange[] {
	if (ranges.some((existing) => contains(existing, range))) {
		return [...ranges];
	}

	return [...ranges.filter((existing) => !contains(range, existing)), range];
}

/** Every rectangle trimmed to the grid, with the ones that no longer land anywhere dropped. */
export function clampGridSelection(ranges: readonly HubGridRange[], bounds: HubGridBounds): HubGridRange[] {
	return ranges.map((range) => clampGridRange(range, bounds)).filter((range): range is HubGridRange => !!range);
}

/**
 * Every cell of the selection, each one once, row by row and left to right.
 *
 * The order matters as much as it does for a single rectangle: it is the order a paste reads and the
 * order a clearing reports, so a host can walk it without sorting anything.
 */
export function gridSelectionCells(ranges: readonly HubGridRange[]): HubGridCoords[] {
	const seen = new Set<string>();
	const cells: HubGridCoords[] = [];

	for (const range of ranges) {
		for (const cell of gridRangeCells(range)) {
			const key = `${cell.row}\t${cell.col}`;

			if (!seen.has(key)) {
				seen.add(key);
				cells.push(cell);
			}
		}
	}

	return cells.sort((a, b) => a.row - b.row || a.col - b.col);
}

/** How many cells the selection covers, counting a cell in two rectangles once. */
export function gridSelectionSize(ranges: readonly HubGridRange[]): number {
	return gridSelectionCells(ranges).length;
}

/** The smallest rectangle holding every rectangle of the selection. */
export function gridSelectionBounds(ranges: readonly HubGridRange[]): HubGridRange | null {
	if (!ranges.length) {
		return null;
	}

	return ranges.reduce((all, range) => ({
		top: Math.min(all.top, range.top),
		bottom: Math.max(all.bottom, range.bottom),
		left: Math.min(all.left, range.left),
		right: Math.max(all.right, range.right)
	}));
}

/**
 * The rows and columns a copy of this selection would write, or null when it cannot be copied.
 *
 * A selection of one rectangle is always copyable. Several are copyable only when they line up: all
 * of them covering the same columns, so they stack into one table, or all of them covering the same
 * rows, so they sit side by side. Anything else has no rectangle to write — the blocks would have to
 * be squashed together and the reader would get a table whose shape they never chose.
 *
 * @returns The row indices and the column indices of the table, in the order they go out, or null
 *          when the selection has no honest table.
 */
export function gridSelectionTable(
	ranges: readonly HubGridRange[]
): { readonly rows: number[]; readonly cols: number[] } | null {
	if (!ranges.length) {
		return null;
	}

	const sequence = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

	if (ranges.length === 1) {
		return { rows: sequence(ranges[0].top, ranges[0].bottom), cols: sequence(ranges[0].left, ranges[0].right) };
	}

	const [first] = ranges;
	const sameColumns = ranges.every((range) => range.left === first.left && range.right === first.right);

	if (sameColumns) {
		const stacked = [...ranges].sort((a, b) => a.top - b.top);

		return {
			rows: unique(stacked.flatMap((range) => sequence(range.top, range.bottom))),
			cols: sequence(first.left, first.right)
		};
	}

	const sameRows = ranges.every((range) => range.top === first.top && range.bottom === first.bottom);

	if (sameRows) {
		const beside = [...ranges].sort((a, b) => a.left - b.left);

		return {
			rows: sequence(first.top, first.bottom),
			cols: unique(beside.flatMap((range) => sequence(range.left, range.right)))
		};
	}

	return null;
}

/** Keeps the first occurrence of each index, so overlapping rectangles do not repeat a row. */
function unique(values: readonly number[]): number[] {
	return [...new Set(values)];
}
