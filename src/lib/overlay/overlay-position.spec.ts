import { OverlayPosition } from './overlay-position';
import { HUB_DROPDOWN_POSITIONS } from './connected-positions';

/**
 * `start` and `end` are logical names. Resolved as `left` and `right` regardless of direction — as
 * they were — an overlay opened from a field inside an RTL container hangs off the wrong edge, and
 * a library that had just been made RTL-correct throughout would lose it again the moment its
 * dropdowns moved onto this strategy.
 *
 * The direction is read from the ORIGIN rather than from the document, so an RTL island inside an
 * LTR page positions by the direction it is actually laid out in.
 *
 * jsdom performs no layout, so every rect would read zero. The origin is therefore stubbed with an
 * explicit rect: what is under test is the arithmetic that turns a rect and a position into
 * coordinates, which is exactly where the direction enters.
 */
function makeOrigin(direction: 'ltr' | 'rtl', rect: Partial<DOMRect>): HTMLElement {
	const element = document.createElement('div');
	element.style.direction = direction;
	document.body.appendChild(element);

	const full = { left: 100, right: 300, top: 50, bottom: 80, width: 200, height: 30, x: 100, y: 50, ...rect };
	element.getBoundingClientRect = () => ({ ...full, toJSON: () => full }) as DOMRect;

	return element;
}

function makeOverlay(width: number, height: number): HTMLElement {
	const element = document.createElement('div');
	const rect = { left: 0, right: width, top: 0, bottom: height, width, height, x: 0, y: 0 };
	element.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;

	return element;
}

describe('OverlayPosition direction awareness', () => {
	afterEach(() => {
		document.body.querySelectorAll('div').forEach((node) => node.remove());
	});

	it("anchors a start-aligned overlay to the origin's left edge under LTR", () => {
		const origin = makeOrigin('ltr', {});
		const overlay = makeOverlay(150, 100);

		new OverlayPosition()
			.flexibleConnectedTo(origin)
			.withPositions([{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' }])
			.apply(overlay);

		// The overlay's own left edge lands on the origin's left edge.
		expect(overlay.style.left).toBe('100px');
	});

	it("anchors the same overlay to the origin's right edge under RTL", () => {
		const origin = makeOrigin('rtl', {});
		const overlay = makeOverlay(150, 100);

		new OverlayPosition()
			.flexibleConnectedTo(origin)
			.withPositions([{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' }])
			.apply(overlay);

		// `start` is the right edge, and the overlay hangs leftward from it: 300 - 150.
		expect(overlay.style.left).toBe('150px');
	});

	it('reads the direction from the origin, not from the document', () => {
		document.documentElement.setAttribute('dir', 'ltr');
		const origin = makeOrigin('rtl', {});
		const overlay = makeOverlay(150, 100);

		new OverlayPosition()
			.flexibleConnectedTo(origin)
			.withPositions([{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' }])
			.apply(overlay);

		expect(overlay.style.left).toBe('150px');
		document.documentElement.removeAttribute('dir');
	});

	it('lets a caller override the direction it reads', () => {
		const origin = makeOrigin('rtl', {});
		const overlay = makeOverlay(150, 100);

		new OverlayPosition()
			.flexibleConnectedTo(origin)
			.withDirection('ltr')
			.withPositions([{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' }])
			.apply(overlay);

		expect(overlay.style.left).toBe('100px');
	});

	it('mirrors an end-aligned overlay too', () => {
		const overlay = makeOverlay(150, 100);

		new OverlayPosition()
			.flexibleConnectedTo(makeOrigin('ltr', {}))
			.withPositions([{ originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' }])
			.apply(overlay);
		expect(overlay.style.left).toBe('150px');

		const mirrored = makeOverlay(150, 100);
		new OverlayPosition()
			.flexibleConnectedTo(makeOrigin('rtl', {}))
			.withPositions([{ originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' }])
			.apply(mirrored);
		expect(mirrored.style.left).toBe('100px');
	});

	it('leaves the vertical axis alone — direction does not touch it', () => {
		const overlay = makeOverlay(150, 100);

		new OverlayPosition()
			.flexibleConnectedTo(makeOrigin('rtl', {}))
			.withPositions([{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 }])
			.apply(overlay);

		expect(overlay.style.top).toBe('84px');
	});

	it('ships the dropdown fallback chain in logical terms, so one list serves both directions', () => {
		expect(HUB_DROPDOWN_POSITIONS).toHaveLength(4);
		expect(HUB_DROPDOWN_POSITIONS[0]).toEqual({
			originX: 'start',
			originY: 'bottom',
			overlayX: 'start',
			overlayY: 'top'
		});
		// No physical edge names anywhere: `left`/`right` here would need a second list for RTL.
		const names = HUB_DROPDOWN_POSITIONS.flatMap((p) => [p.originX, p.overlayX]);
		expect(names.every((n) => n === 'start' || n === 'end' || n === 'center')).toBe(true);
	});
});
