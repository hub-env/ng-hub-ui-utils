/**
 * Reads the element's transition timing, in milliseconds.
 *
 * The computed style comes from the element's own view rather than from the global `window`, so
 * this works inside an iframe and returns 0 on a server render instead of throwing — nothing
 * animates there, and a duration of 0 is exactly what "no animation" means to the caller.
 */
export function getTransitionDurationMs(element: HTMLElement) {
	const view = element.ownerDocument?.defaultView;
	if (!view) {
		return 0;
	}

	const { transitionDelay, transitionDuration } = view.getComputedStyle(element);
	const transitionDelaySec = parseFloat(transitionDelay);
	const transitionDurationSec = parseFloat(transitionDuration);

	return (transitionDelaySec + transitionDurationSec) * 1000;
}
