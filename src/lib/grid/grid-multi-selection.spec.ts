import { describe, expect, it } from 'vitest';
import {
	addGridRange,
	clampGridSelection,
	gridSelectionBounds,
	gridSelectionCells,
	gridSelectionSize,
	gridSelectionTable,
	isWithinGridSelection
} from './grid-multi-selection';
import { HubGridRange } from './grid.types';

const range = (top: number, left: number, bottom: number, right: number): HubGridRange => ({ top, left, bottom, right });

describe('isWithinGridSelection', () => {
	const ranges = [range(0, 0, 1, 1), range(5, 5, 6, 6)];

	it('finds a cell in any of the rectangles', () => {
		expect(isWithinGridSelection({ row: 1, col: 1 }, ranges)).toBe(true);
		expect(isWithinGridSelection({ row: 6, col: 5 }, ranges)).toBe(true);
	});

	it('leaves out what is between them', () => {
		expect(isWithinGridSelection({ row: 3, col: 3 }, ranges)).toBe(false);
	});

	it('finds nothing in an empty selection', () => {
		expect(isWithinGridSelection({ row: 0, col: 0 }, [])).toBe(false);
	});
});

describe('addGridRange', () => {
	it('adds a rectangle that stands on its own', () => {
		expect(addGridRange([range(0, 0, 0, 0)], range(2, 2, 2, 2))).toHaveLength(2);
	});

	it('refuses one already held whole by another', () => {
		const ranges = addGridRange([range(0, 0, 4, 4)], range(1, 1, 2, 2));

		expect(ranges).toEqual([range(0, 0, 4, 4)]);
	});

	it('drops the ones the newcomer swallows', () => {
		const ranges = addGridRange([range(1, 1, 2, 2), range(8, 8, 8, 8)], range(0, 0, 4, 4));

		expect(ranges).toEqual([range(8, 8, 8, 8), range(0, 0, 4, 4)]);
	});

	it('keeps two rectangles that merely overlap', () => {
		// Neither holds the other, so they are two decisions and both stand.
		expect(addGridRange([range(0, 0, 2, 2)], range(1, 1, 3, 3))).toHaveLength(2);
	});
});

describe('gridSelectionCells', () => {
	it('walks row by row and left to right, across rectangles', () => {
		const cells = gridSelectionCells([range(2, 0, 2, 1), range(0, 0, 0, 1)]);

		expect(cells).toEqual([
			{ row: 0, col: 0 },
			{ row: 0, col: 1 },
			{ row: 2, col: 0 },
			{ row: 2, col: 1 }
		]);
	});

	it('counts a cell held by two rectangles once', () => {
		expect(gridSelectionSize([range(0, 0, 1, 1), range(1, 1, 2, 2)])).toBe(7);
	});
});

describe('gridSelectionBounds', () => {
	it('is the smallest rectangle holding them all', () => {
		expect(gridSelectionBounds([range(4, 1, 5, 2), range(0, 6, 1, 7)])).toEqual(range(0, 1, 5, 7));
	});

	it('is null for nothing selected', () => {
		expect(gridSelectionBounds([])).toBeNull();
	});
});

describe('clampGridSelection', () => {
	it('trims what hangs over the edge and drops nothing that still lands', () => {
		const ranges = clampGridSelection([range(0, 0, 9, 9)], { rows: 3, cols: 2 });

		expect(ranges).toEqual([range(0, 0, 2, 1)]);
	});
});

describe('gridSelectionTable', () => {
	it('is the rectangle itself when only one is selected', () => {
		expect(gridSelectionTable([range(1, 2, 3, 4)])).toEqual({ rows: [1, 2, 3], cols: [2, 3, 4] });
	});

	it('stacks rectangles that cover the same columns', () => {
		const table = gridSelectionTable([range(4, 1, 4, 2), range(0, 1, 1, 2)]);

		// Sorted by where they are, not by the order they were picked: a copy reads down the sheet.
		expect(table).toEqual({ rows: [0, 1, 4], cols: [1, 2] });
	});

	it('puts rectangles that cover the same rows side by side', () => {
		const table = gridSelectionTable([range(0, 5, 1, 5), range(0, 0, 1, 1)]);

		expect(table).toEqual({ rows: [0, 1], cols: [0, 1, 5] });
	});

	it('refuses a selection with no table in it', () => {
		// Excel says the same thing in words: that command cannot be used on multiple selections.
		expect(gridSelectionTable([range(0, 0, 1, 1), range(4, 6, 6, 9)])).toBeNull();
	});

	it('refuses nothing selected', () => {
		expect(gridSelectionTable([])).toBeNull();
	});

	it('does not repeat a row shared by two stacked rectangles', () => {
		const table = gridSelectionTable([range(0, 0, 2, 1), range(2, 0, 3, 1)]);

		expect(table).toEqual({ rows: [0, 1, 2, 3], cols: [0, 1] });
	});
});
