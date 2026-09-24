import { HubTooltipController } from './tooltip-controller';
import { HubTooltipPlacement } from './tooltip.types';

/**
 * TD-286: a hint on an element pressed against the top of the window was drawn above it and cut
 * off, because the controller computed `top` from the placement and never looked at the window.
 * The consuming product worked around it by writing `hubTooltipPlacement="bottom"` on every hint
 * in its header, which lasts exactly until somebody adds one more.
 *
 * jsdom performs no layout, so both rects are stubbed: what is under test is the decision the
 * controller makes from a rect and a window, which is precisely where the defect was. The stub on
 * the bubble goes on after it exists, and `setText` re-runs the placement — the same call the
 * directive makes whenever its label changes.
 */
function stubRect(element: HTMLElement, rect: Partial<DOMRect>): void {
	const full = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, ...rect };
	element.getBoundingClientRect = () => ({ ...full, toJSON: () => full }) as DOMRect;
}

/** A host in the document, so `getComputedStyle` reports the direction it was given. */
function makeHost(rect: Partial<DOMRect>, direction: 'ltr' | 'rtl' = 'ltr'): HTMLElement {
	const host = document.createElement('button');
	host.style.direction = direction;
	document.body.appendChild(host);
	stubRect(host, rect);

	return host;
}

/**
 * Opens a bubble, gives it a measured size and places it again, returning the live element.
 *
 * @param host Element the bubble hangs off.
 * @param size Size the bubble would have had in a browser.
 * @param placement Placement asked for, as a consumer would write it.
 * @returns The bubble element, positioned on real numbers.
 */
function openTooltip(
	host: HTMLElement,
	size: { width: number; height: number },
	placement: HubTooltipPlacement = 'top'
): { tooltip: HTMLElement; controller: HubTooltipController } {
	const controller = new HubTooltipController(host, { placement, delay: 0 });
	controller.setText('Change language');
	host.dispatchEvent(new MouseEvent('mouseenter'));

	const tooltip = document.querySelector('.hub-tooltip') as HTMLElement;
	stubRect(tooltip, { width: size.width, height: size.height, right: size.width, bottom: size.height });
	controller.setText('Change language');

	return { tooltip, controller };
}

describe('HubTooltipController viewport flipping', () => {
	afterEach(() => {
		document.querySelectorAll('.hub-tooltip').forEach((element) => element.remove());
		document.querySelectorAll('button').forEach((element) => element.remove());
	});

	it('opens downwards when the default placement would put it above the top edge', () => {
		const host = makeHost({ top: 4, bottom: 36, left: 480, right: 560, width: 80, height: 32 });
		const { tooltip, controller } = openTooltip(host, { width: 160, height: 30 });

		// Below the host, whole: 36 + 8. Before the fix this read '-34px' and the label was clipped.
		expect(tooltip.style.top).toBe('44px');
		expect(tooltip.classList.contains('hub-tooltip--bottom')).toBe(true);
		expect(tooltip.classList.contains('hub-tooltip--top')).toBe(false);

		controller.destroy();
	});

	it('keeps the requested placement when it fits, so nothing flips for nothing', () => {
		const host = makeHost({ top: 400, bottom: 432, left: 480, right: 560, width: 80, height: 32 });
		const { tooltip, controller } = openTooltip(host, { width: 160, height: 30 });

		expect(tooltip.style.top).toBe('362px');
		expect(tooltip.style.left).toBe('440px');
		expect(tooltip.classList.contains('hub-tooltip--top')).toBe(true);

		controller.destroy();
	});

	it('flips upwards at the bottom edge', () => {
		const bottom = window.innerHeight - 4;
		const host = makeHost({ top: bottom - 32, bottom, left: 480, right: 560, width: 80, height: 32 });
		const { tooltip, controller } = openTooltip(host, { width: 160, height: 30 }, 'bottom');

		expect(tooltip.style.top).toBe(`${bottom - 32 - 30 - 8}px`);
		expect(tooltip.classList.contains('hub-tooltip--top')).toBe(true);

		controller.destroy();
	});

	it('flips across the inline axis at the leading edge', () => {
		const host = makeHost({ top: 300, bottom: 330, left: 6, right: 46, width: 40, height: 30 });
		const { tooltip, controller } = openTooltip(host, { width: 160, height: 30 }, 'left');

		expect(tooltip.style.left).toBe('54px');
		expect(tooltip.classList.contains('hub-tooltip--right')).toBe(true);

		controller.destroy();
	});

	it('slides a centred bubble back inside instead of flipping, when the overflow is sideways', () => {
		const right = window.innerWidth;
		const host = makeHost({ top: 300, bottom: 330, left: right - 40, right, width: 40, height: 30 });
		const { tooltip, controller } = openTooltip(host, { width: 160, height: 30 });

		// The block axis had room, so the placement held and only the inline overflow was corrected.
		expect(tooltip.classList.contains('hub-tooltip--top')).toBe(true);
		expect(tooltip.style.left).toBe(`${right - 160}px`);

		controller.destroy();
	});

	/**
	 * `left` is the consumer's word for a physical edge and must stay physical, while the flip that
	 * may follow reasons on the inline axis. The round trip is what keeps both true at once, and it
	 * is invisible until a host is laid out right-to-left.
	 */
	it('still means the left edge on an RTL host, and flips to the right one when it does not fit', () => {
		const roomy = makeHost({ top: 300, bottom: 330, left: 500, right: 600, width: 100, height: 30 }, 'rtl');
		const placed = openTooltip(roomy, { width: 160, height: 30 }, 'left');

		expect(placed.tooltip.style.left).toBe('332px');
		expect(placed.tooltip.classList.contains('hub-tooltip--left')).toBe(true);
		placed.controller.destroy();

		const pressed = makeHost({ top: 300, bottom: 330, left: 6, right: 106, width: 100, height: 30 }, 'rtl');
		const flipped = openTooltip(pressed, { width: 160, height: 30 }, 'left');

		expect(flipped.tooltip.style.left).toBe('114px');
		expect(flipped.tooltip.classList.contains('hub-tooltip--right')).toBe(true);
		flipped.controller.destroy();
	});

	it('re-fits while it is open, because a resize moves the edge it was measured against', () => {
		const host = makeHost({ top: 400, bottom: 432, left: 480, right: 560, width: 80, height: 32 });
		const { tooltip, controller } = openTooltip(host, { width: 160, height: 30 });

		expect(tooltip.classList.contains('hub-tooltip--top')).toBe(true);

		// The window shrinks under an open bubble: there is no longer room above the host.
		stubRect(host, { top: 4, bottom: 36, left: 480, right: 560, width: 80, height: 32 });
		window.dispatchEvent(new Event('resize'));

		expect(tooltip.style.top).toBe('44px');
		expect(tooltip.classList.contains('hub-tooltip--bottom')).toBe(true);

		controller.destroy();
	});

	it('re-fits when an ancestor scrolls under it, which never reaches the document by bubbling', () => {
		const host = makeHost({ top: 400, bottom: 432, left: 480, right: 560, width: 80, height: 32 });
		const { tooltip, controller } = openTooltip(host, { width: 160, height: 30 });

		stubRect(host, { top: 4, bottom: 36, left: 480, right: 560, width: 80, height: 32 });
		host.dispatchEvent(new Event('scroll', { bubbles: false }));

		expect(tooltip.style.top).toBe('44px');

		controller.destroy();
	});

	it('stops listening once the bubble is gone', () => {
		const host = makeHost({ top: 400, bottom: 432, left: 480, right: 560, width: 80, height: 32 });
		const { tooltip, controller } = openTooltip(host, { width: 160, height: 30 });

		controller.destroy();
		stubRect(host, { top: 4, bottom: 36, left: 480, right: 560, width: 80, height: 32 });
		window.dispatchEvent(new Event('resize'));

		// Detached and untouched: a controller that kept repositioning would be a leak per host.
		expect(tooltip.isConnected).toBe(false);
		expect(tooltip.style.top).toBe('362px');
	});
});
