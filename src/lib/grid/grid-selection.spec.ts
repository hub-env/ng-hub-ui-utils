import { clampGridRange, gridRangeBetween, gridRangeCells, gridRangeSize, isWithinGridRange } from './grid-selection';
import { HubGridBounds, HubGridRange } from './grid.types';

const bounds: HubGridBounds = { rows: 4, cols: 5 };

describe('gridRangeBetween', () => {
	it('orders the corners, so dragging up and left reads the same as down and right', () => {
		const downRight = gridRangeBetween({ row: 1, col: 1 }, { row: 3, col: 4 });
		const upLeft = gridRangeBetween({ row: 3, col: 4 }, { row: 1, col: 1 });

		expect(downRight).toEqual({ top: 1, bottom: 3, left: 1, right: 4 });
		expect(upLeft).toEqual(downRight);
	});

	it('turns a single cell into a rectangle whose corners coincide', () => {
		expect(gridRangeBetween({ row: 2, col: 2 }, { row: 2, col: 2 })).toEqual({
			top: 2,
			bottom: 2,
			left: 2,
			right: 2
		});
	});

	it('handles a drag that crosses only one axis', () => {
		expect(gridRangeBetween({ row: 0, col: 3 }, { row: 3, col: 3 })).toEqual({
			top: 0,
			bottom: 3,
			left: 3,
			right: 3
		});
	});
});

describe('isWithinGridRange', () => {
	const range: HubGridRange = { top: 1, bottom: 2, left: 1, right: 3 };

	it('includes every bound, corners included', () => {
		expect(isWithinGridRange({ row: 1, col: 1 }, range)).toBe(true);
		expect(isWithinGridRange({ row: 2, col: 3 }, range)).toBe(true);
		expect(isWithinGridRange({ row: 2, col: 2 }, range)).toBe(true);
	});

	it('excludes anything outside', () => {
		expect(isWithinGridRange({ row: 0, col: 2 }, range)).toBe(false);
		expect(isWithinGridRange({ row: 3, col: 2 }, range)).toBe(false);
		expect(isWithinGridRange({ row: 2, col: 0 }, range)).toBe(false);
		expect(isWithinGridRange({ row: 2, col: 4 }, range)).toBe(false);
	});

	it('treats no selection as containing nothing', () => {
		expect(isWithinGridRange({ row: 1, col: 1 }, null)).toBe(false);
	});
});

describe('gridRangeCells', () => {
	it('walks row by row, left to right, which is the order a paste expects', () => {
		expect(gridRangeCells({ top: 0, bottom: 1, left: 2, right: 3 })).toEqual([
			{ row: 0, col: 2 },
			{ row: 0, col: 3 },
			{ row: 1, col: 2 },
			{ row: 1, col: 3 }
		]);
	});

	it('yields the one cell of a collapsed range', () => {
		expect(gridRangeCells({ top: 2, bottom: 2, left: 2, right: 2 })).toEqual([{ row: 2, col: 2 }]);
	});

	it('yields nothing for an inverted range rather than looping forever', () => {
		expect(gridRangeCells({ top: 3, bottom: 1, left: 0, right: 2 })).toEqual([]);
	});
});

describe('gridRangeSize', () => {
	it('counts both bounds in', () => {
		expect(gridRangeSize({ top: 1, bottom: 3, left: 0, right: 4 })).toEqual({ rows: 3, cols: 5 });
		expect(gridRangeSize({ top: 2, bottom: 2, left: 2, right: 2 })).toEqual({ rows: 1, cols: 1 });
	});

	it('reports nothing for an inverted range', () => {
		expect(gridRangeSize({ top: 3, bottom: 1, left: 4, right: 0 })).toEqual({ rows: 0, cols: 0 });
	});
});

describe('clampGridRange', () => {
	it('leaves a range that already fits', () => {
		const range: HubGridRange = { top: 1, bottom: 2, left: 1, right: 2 };

		expect(clampGridRange(range, bounds)).toEqual(range);
	});

	it('trims a range that spills past the edges, which is what a shrinking grid leaves behind', () => {
		expect(clampGridRange({ top: -3, bottom: 99, left: -1, right: 42 }, bounds)).toEqual({
			top: 0,
			bottom: 3,
			left: 0,
			right: 4
		});
	});

	it('returns nothing when the grid has no cells left to point at', () => {
		expect(clampGridRange({ top: 0, bottom: 1, left: 0, right: 1 }, { rows: 0, cols: 0 })).toBeNull();
	});
});
