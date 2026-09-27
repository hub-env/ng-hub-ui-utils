import { HubGridSpan } from './grid.types';
import { anchorOf, buildSpanMap, coversRange, isCovered, spanAt } from './grid-spans';

/**
 * A 4 × 4 sheet with two merges:
 *
 * ```
 *  .  .  .  .
 *  .  A  A  .      A spans 1 row  × 2 cols, anchored at (1,1)
 *  .  B  .  .      B spans 2 rows × 1 col,  anchored at (2,1)
 *  .  ↑  .  .
 * ```
 */
const spans: HubGridSpan[] = [
	{ row: 1, col: 1, rowSpan: 1, colSpan: 2 },
	{ row: 2, col: 1, rowSpan: 2, colSpan: 1 }
];

const map = buildSpanMap(spans);

describe('buildSpanMap', () => {
	it('is empty when nothing is merged', () => {
		expect(buildSpanMap([]).size).toBe(0);
	});

	it('ignores a span that covers exactly one cell, which merges nothing', () => {
		expect(buildSpanMap([{ row: 0, col: 0, rowSpan: 1, colSpan: 1 }]).size).toBe(0);
	});

	it('ignores a span with a zero or negative extent rather than looping forever', () => {
		expect(buildSpanMap([{ row: 0, col: 0, rowSpan: 0, colSpan: 3 }]).size).toBe(0);
		expect(buildSpanMap([{ row: 0, col: 0, rowSpan: -2, colSpan: 3 }]).size).toBe(0);
	});

	/**
	 * Two merges claiming the same cell cannot both be drawn. The first wins, so the outcome
	 * depends on the order given rather than on iteration order, and the second is dropped whole
	 * instead of half-applied.
	 */
	it('keeps the first of two overlapping merges and drops the second entirely', () => {
		const overlapping = buildSpanMap([
			{ row: 0, col: 0, rowSpan: 2, colSpan: 2 },
			{ row: 1, col: 1, rowSpan: 2, colSpan: 2 }
		]);

		expect(spanAt(overlapping, { row: 0, col: 0 })).toEqual({ rowSpan: 2, colSpan: 2 });
		expect(spanAt(overlapping, { row: 1, col: 1 })).toBeNull();
		expect(isCovered(overlapping, { row: 2, col: 2 })).toBe(false);
	});
});

describe('spanAt', () => {
	it('reports the extent at an anchor', () => {
		expect(spanAt(map, { row: 1, col: 1 })).toEqual({ rowSpan: 1, colSpan: 2 });
		expect(spanAt(map, { row: 2, col: 1 })).toEqual({ rowSpan: 2, colSpan: 1 });
	});

	it('reports nothing for a cell that is not an anchor', () => {
		expect(spanAt(map, { row: 0, col: 0 })).toBeNull();
		expect(spanAt(map, { row: 1, col: 2 })).toBeNull();
	});
});

describe('isCovered', () => {
	it('marks the cells swallowed by a merge, which must not be rendered', () => {
		expect(isCovered(map, { row: 1, col: 2 })).toBe(true);
		expect(isCovered(map, { row: 3, col: 1 })).toBe(true);
	});

	it('does not mark the anchor itself, which is the cell that is drawn', () => {
		expect(isCovered(map, { row: 1, col: 1 })).toBe(false);
		expect(isCovered(map, { row: 2, col: 1 })).toBe(false);
	});

	it('does not mark an untouched cell', () => {
		expect(isCovered(map, { row: 0, col: 3 })).toBe(false);
	});
});

describe('anchorOf', () => {
	it('sends a covered cell to the cell that owns it, which is where the cursor must land', () => {
		expect(anchorOf(map, { row: 1, col: 2 })).toEqual({ row: 1, col: 1 });
		expect(anchorOf(map, { row: 3, col: 1 })).toEqual({ row: 2, col: 1 });
	});

	it('leaves an anchor where it is', () => {
		expect(anchorOf(map, { row: 1, col: 1 })).toEqual({ row: 1, col: 1 });
	});

	it('leaves an ordinary cell where it is', () => {
		expect(anchorOf(map, { row: 0, col: 0 })).toEqual({ row: 0, col: 0 });
	});
});

describe('coversRange', () => {
	/**
	 * A selection that cuts a merge in half cannot be copied or filled coherently, so it grows
	 * until every merge it touches is inside it. Excel does the same, and for the same reason.
	 */
	it('grows a selection that clips a merge until the whole merge is inside', () => {
		expect(coversRange(map, { top: 1, bottom: 1, left: 1, right: 1 })).toEqual({
			top: 1,
			bottom: 1,
			left: 1,
			right: 2
		});
	});

	it('grows on the row axis too', () => {
		expect(coversRange(map, { top: 2, bottom: 2, left: 1, right: 1 })).toEqual({
			top: 2,
			bottom: 3,
			left: 1,
			right: 1
		});
	});

	it('keeps growing until nothing is left clipped, however many merges chain', () => {
		// Row 0 merged across three columns, and a second block hanging below its last column.
		// Growing sideways to take in the first block reaches the second, which then pulls the
		// range down — one growth causing another is the case this guards.
		const chained = buildSpanMap([
			{ row: 0, col: 0, rowSpan: 1, colSpan: 3 },
			{ row: 1, col: 2, rowSpan: 2, colSpan: 1 }
		]);

		expect(coversRange(chained, { top: 0, bottom: 1, left: 0, right: 0 })).toEqual({
			top: 0,
			bottom: 2,
			left: 0,
			right: 2
		});
	});

	it('leaves a range that already contains every merge it touches', () => {
		const range = { top: 1, bottom: 3, left: 1, right: 2 };

		expect(coversRange(map, range)).toEqual(range);
	});

	it('leaves any range alone when nothing is merged', () => {
		const range = { top: 0, bottom: 2, left: 0, right: 2 };

		expect(coversRange(buildSpanMap([]), range)).toEqual(range);
	});
});
