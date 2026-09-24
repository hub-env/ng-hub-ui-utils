import {
	hubAnchorToViewport,
	hubClampToViewport,
	hubFitsInViewport,
	hubOppositeSide,
	hubToAnchorSide,
	hubToPhysicalSide,
	HubAnchorRect
} from './viewport-fit';

/**
 * The arithmetic that used to exist twice in this package, tested where it now lives once.
 *
 * jsdom performs no layout, so every real rect would read zero — which is exactly why these
 * functions take plain numbers and touch no DOM: what is under test is the decision, not the
 * measurement.
 */
const VIEWPORT = { width: 1000, height: 800 };

function rect(partial: Partial<HubAnchorRect>): HubAnchorRect {
	return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, ...partial };
}

describe('hubAnchorToViewport', () => {
	it('keeps the requested side when the box fits there', () => {
		const anchor = rect({ top: 400, bottom: 432, left: 460, right: 540, width: 80, height: 32 });

		const placed = hubAnchorToViewport({
			anchor,
			box: { width: 160, height: 30 },
			viewport: VIEWPORT,
			side: 'block-start',
			offset: 8
		});

		expect(placed.side).toBe('block-start');
		expect(placed.flipped).toBe(false);
		expect(placed.y).toBe(362);
		// Centred on the anchor: 460 + (80 - 160) / 2.
		expect(placed.x).toBe(420);
	});

	/** TD-286: the header hint. The requested side is above the window, so the box goes below. */
	it('flips to the opposite side when the requested one is off the window', () => {
		const anchor = rect({ top: 4, bottom: 36, left: 460, right: 540, width: 80, height: 32 });

		const placed = hubAnchorToViewport({
			anchor,
			box: { width: 160, height: 30 },
			viewport: VIEWPORT,
			side: 'block-start',
			offset: 8
		});

		expect(placed.side).toBe('block-end');
		expect(placed.flipped).toBe(true);
		expect(placed.y).toBe(44);
	});

	it('flips at the bottom edge too, which is the same defect upside down', () => {
		const anchor = rect({ top: 770, bottom: 796, left: 460, right: 540, width: 80, height: 26 });

		const placed = hubAnchorToViewport({
			anchor,
			box: { width: 160, height: 30 },
			viewport: VIEWPORT,
			side: 'block-end',
			offset: 8
		});

		expect(placed.side).toBe('block-start');
		expect(placed.y).toBe(732);
	});

	it('flips on the inline axis as well, not only the block one', () => {
		const anchor = rect({ top: 300, bottom: 330, left: 6, right: 46, width: 40, height: 30 });

		const placed = hubAnchorToViewport({
			anchor,
			box: { width: 160, height: 30 },
			viewport: VIEWPORT,
			side: 'inline-start',
			offset: 8
		});

		expect(placed.side).toBe('inline-end');
		expect(placed.x).toBe(54);
	});

	it('slides the box along the cross axis instead of flipping, when that is where it overflows', () => {
		const anchor = rect({ top: 300, bottom: 330, left: 960, right: 1000, width: 40, height: 30 });

		const placed = hubAnchorToViewport({
			anchor,
			box: { width: 160, height: 30 },
			viewport: VIEWPORT,
			side: 'block-start',
			offset: 8
		});

		// The block axis had room, so nothing flipped — the box was only pulled back inside.
		expect(placed.side).toBe('block-start');
		expect(placed.flipped).toBe(false);
		expect(placed.x).toBe(840);
		expect(placed.y).toBe(262);
	});

	it('keeps the roomier side when neither can hold the box, rather than flipping for nothing', () => {
		// 300 above, 470 below: neither holds a 600px box, so the taller half wins.
		const anchor = rect({ top: 300, bottom: 330, left: 460, right: 540, width: 80, height: 30 });

		const placed = hubAnchorToViewport({
			anchor,
			box: { width: 160, height: 600 },
			viewport: VIEWPORT,
			side: 'block-start',
			offset: 8
		});

		expect(placed.side).toBe('block-end');

		const other = hubAnchorToViewport({
			anchor: rect({ top: 470, bottom: 500, left: 460, right: 540, width: 80, height: 30 }),
			box: { width: 160, height: 600 },
			viewport: VIEWPORT,
			side: 'block-end',
			offset: 8
		});

		expect(other.side).toBe('block-start');
	});

	it('honours a keep-out margin from the window edges', () => {
		const anchor = rect({ top: 300, bottom: 330, left: 960, right: 1000, width: 40, height: 30 });

		const placed = hubAnchorToViewport({
			anchor,
			box: { width: 160, height: 30 },
			viewport: VIEWPORT,
			side: 'block-start',
			offset: 8,
			margin: 12
		});

		expect(placed.x).toBe(828);
	});

	/**
	 * `start` and `end` are the halves of this that a physical name cannot carry. A dropdown aligned
	 * to the start of its trigger hangs off the right edge under RTL, from one list.
	 */
	it('mirrors a start alignment under RTL', () => {
		const anchor = rect({ top: 100, bottom: 130, left: 400, right: 600, width: 200, height: 30 });

		const ltr = hubAnchorToViewport({
			anchor,
			box: { width: 150, height: 40 },
			viewport: VIEWPORT,
			side: 'block-end',
			align: 'start'
		});
		const rtl = hubAnchorToViewport({
			anchor,
			box: { width: 150, height: 40 },
			viewport: VIEWPORT,
			side: 'block-end',
			align: 'start',
			rtl: true
		});

		expect(ltr.x).toBe(400);
		expect(rtl.x).toBe(450);
	});

	it('resolves the inline sides against the direction', () => {
		const anchor = rect({ top: 300, bottom: 330, left: 400, right: 600, width: 200, height: 30 });

		const ltr = hubAnchorToViewport({
			anchor,
			box: { width: 100, height: 40 },
			viewport: VIEWPORT,
			side: 'inline-start',
			offset: 8
		});
		const rtl = hubAnchorToViewport({
			anchor,
			box: { width: 100, height: 40 },
			viewport: VIEWPORT,
			side: 'inline-start',
			offset: 8,
			rtl: true
		});

		// Inline start is the left edge under LTR and the right one under RTL.
		expect(ltr.x).toBe(292);
		expect(rtl.x).toBe(608);
	});

	it('leaves the requested side alone when there is no viewport to measure against', () => {
		const anchor = rect({ top: 4, bottom: 36, left: 460, right: 540, width: 80, height: 32 });

		const placed = hubAnchorToViewport({
			anchor,
			box: { width: 160, height: 30 },
			viewport: null,
			side: 'block-start',
			offset: 8
		});

		// A server render measures nothing, so it emits what was asked for and lets the browser
		// correct it on the first reposition.
		expect(placed.side).toBe('block-start');
		expect(placed.flipped).toBe(false);
		expect(placed.y).toBe(-34);
	});
});

describe('the logical side mapping', () => {
	it('round-trips a physical edge through the logical axis in both directions', () => {
		for (const side of ['top', 'bottom', 'left', 'right'] as const) {
			expect(hubToPhysicalSide(hubToAnchorSide(side, false), false)).toBe(side);
			expect(hubToPhysicalSide(hubToAnchorSide(side, true), true)).toBe(side);
		}
	});

	it('names the other edge for the inline sides under RTL', () => {
		expect(hubToPhysicalSide('inline-start', false)).toBe('left');
		expect(hubToPhysicalSide('inline-start', true)).toBe('right');
	});

	it('mirrors every side onto the one across the anchor', () => {
		expect(hubOppositeSide('block-start')).toBe('block-end');
		expect(hubOppositeSide('inline-end')).toBe('inline-start');
	});
});

describe('hubFitsInViewport and hubClampToViewport', () => {
	it('rejects a box that crosses any edge', () => {
		expect(hubFitsInViewport({ x: 10, y: 10 }, { width: 100, height: 100 }, VIEWPORT)).toBe(true);
		expect(hubFitsInViewport({ x: -1, y: 10 }, { width: 100, height: 100 }, VIEWPORT)).toBe(false);
		expect(hubFitsInViewport({ x: 950, y: 10 }, { width: 100, height: 100 }, VIEWPORT)).toBe(false);
		expect(hubFitsInViewport({ x: 10, y: 750 }, { width: 100, height: 100 }, VIEWPORT)).toBe(false);
	});

	it('moves a box no further than it has to', () => {
		expect(hubClampToViewport({ x: 10, y: 10 }, { width: 100, height: 100 }, VIEWPORT)).toEqual({ x: 10, y: 10 });
		expect(hubClampToViewport({ x: -40, y: 900 }, { width: 100, height: 100 }, VIEWPORT)).toEqual({ x: 0, y: 700 });
	});

	it('pins a box wider than the window to the near edge, so its beginning stays readable', () => {
		expect(hubClampToViewport({ x: -200, y: 0 }, { width: 1400, height: 20 }, VIEWPORT).x).toBe(0);
	});
});
