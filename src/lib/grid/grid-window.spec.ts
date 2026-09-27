import { describe, expect, it } from 'vitest';
import { gridWindow, growWindowToSpans } from './grid-window';

describe('gridWindow · tracks of one size', () => {
	const sizes = 20;
	const count = 100;

	it('draws what the viewport covers, plus the overscan each side', () => {
		// 200px of viewport is ten tracks; two more each side.
		expect(gridWindow({ offset: 400, viewport: 200, sizes, count })).toEqual({
			start: 18,
			end: 31,
			before: 360,
			after: 1360
		});
	});

	it('never reaches back past the beginning', () => {
		expect(gridWindow({ offset: 0, viewport: 100, sizes, count })).toMatchObject({ start: 0, before: 0 });
	});

	it('never reaches past the end, and leaves no space behind it there', () => {
		expect(gridWindow({ offset: 100000, viewport: 200, sizes, count })).toMatchObject({ end: 99, after: 0 });
	});

	it('stops on the track the edge is inside, not after it', () => {
		// Half of track 20 is above the fold; it is still half on screen.
		expect(gridWindow({ offset: 410, viewport: 100, sizes, count, overscan: 0 })).toMatchObject({ start: 20 });
	});

	it('draws something when nothing has been measured yet, so the first paint is not empty', () => {
		expect(gridWindow({ offset: 0, viewport: 0, sizes, count, overscan: 0 }).end).toBeGreaterThan(0);
	});

	it('has nothing to draw when there are no tracks', () => {
		expect(gridWindow({ offset: 0, viewport: 300, sizes, count: 0 })).toEqual({
			start: 0,
			end: -1,
			before: 0,
			after: 0
		});
	});
});

describe('gridWindow · tracks of their own sizes', () => {
	const sizes = [10, 40, 10, 40, 10, 40, 10, 40];

	it('measures the space before and after with the real sizes, not an average', () => {
		const window = gridWindow({ offset: 60, viewport: 50, sizes, overscan: 0 });

		expect(window).toMatchObject({ start: 3, before: 60 });
		expect(window.before + window.after).toBeLessThan(200);
	});
});

describe('gridWindow · pinned tracks', () => {
	it('leaves the frozen ones out of the window and reads the offset against the rest', () => {
		const window = gridWindow({ offset: 0, viewport: 100, sizes: 20, count: 50, pinned: 3, overscan: 0 });

		// The window starts after the frozen tracks, which are drawn whatever happens.
		expect(window.start).toBe(3);
		expect(window.before).toBe(0);
	});

	it('draws nothing but the frozen ones when they are all there is', () => {
		expect(gridWindow({ offset: 0, viewport: 100, sizes: 20, count: 3, pinned: 3 })).toEqual({
			start: 3,
			end: 2,
			before: 0,
			after: 0
		});
	});
});

describe('growWindowToSpans', () => {
	const sizes = 20;
	const count = 100;

	it('reaches back to the anchor of a block the window cuts into', () => {
		const window = { start: 10, end: 20, before: 200, after: 1580 };
		const grown = growWindowToSpans(window, [{ row: 6, col: 0, rowSpan: 6, colSpan: 1 }], 'row', sizes, { count });

		// Without this the block is not drawn at all: it lives on its anchor's row.
		expect(grown.start).toBe(6);
		expect(grown.before).toBe(120);
	});

	it('reaches forward to the far edge of one that runs past it', () => {
		const window = { start: 10, end: 20, before: 200, after: 1580 };
		const grown = growWindowToSpans(window, [{ row: 18, col: 0, rowSpan: 8, colSpan: 1 }], 'row', sizes, { count });

		expect(grown.end).toBe(25);
		expect(grown.after).toBe(1480);
	});

	it('keeps growing while each reach brings another block in', () => {
		const spans = [
			{ row: 8, col: 0, rowSpan: 4, colSpan: 1 },
			{ row: 4, col: 0, rowSpan: 5, colSpan: 1 }
		];
		const grown = growWindowToSpans({ start: 10, end: 12, before: 200, after: 1740 }, spans, 'row', sizes, { count });

		expect(grown.start).toBe(4);
	});

	it('leaves alone a block it does not touch', () => {
		const window = { start: 10, end: 20, before: 200, after: 1580 };

		expect(growWindowToSpans(window, [{ row: 40, col: 0, rowSpan: 2, colSpan: 1 }], 'row', sizes, { count })).toEqual(
			window
		);
	});

	it('works the same along the other axis', () => {
		const grown = growWindowToSpans(
			{ start: 5, end: 8, before: 100, after: 1820 },
			[{ row: 0, col: 2, rowSpan: 1, colSpan: 5 }],
			'col',
			sizes,
			{
				count
			}
		);

		expect(grown.start).toBe(2);
	});

	it('never reaches back into the frozen tracks, which are drawn anyway', () => {
		const grown = growWindowToSpans(
			{ start: 10, end: 14, before: 140, after: 1700 },
			[{ row: 1, col: 0, rowSpan: 12, colSpan: 1 }],
			'row',
			sizes,
			{
				count,
				pinned: 3
			}
		);

		expect(grown.start).toBe(3);
	});
	it('does not spin on a block anchored inside the frozen tracks', () => {
		// The window cannot reach an anchor the pinned tracks already cover, so a pass that counts
		// that as progress never settles. It hung the whole test run rather than failing.
		const grown = growWindowToSpans(
			{ start: 10, end: 14, before: 140, after: 1700 },
			[{ row: 0, col: 0, rowSpan: 13, colSpan: 1 }],
			'row',
			sizes,
			{ count, pinned: 5 }
		);

		expect(grown.start).toBe(5);
		expect(grown.end).toBe(14);
	});

	it('does not spin on a block reaching past the last track', () => {
		const grown = growWindowToSpans(
			{ start: 95, end: 99, before: 1900, after: 0 },
			[{ row: 96, col: 0, rowSpan: 40, colSpan: 1 }],
			'row',
			sizes,
			{
				count
			}
		);

		expect(grown.end).toBe(count - 1);
		expect(grown.after).toBe(0);
	});
});
