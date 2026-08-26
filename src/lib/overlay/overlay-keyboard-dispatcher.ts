/**
 * Routes keyboard events to the overlay that should answer them.
 *
 * An overlay lives in `document.body`, outside the tree of whatever opened it, and it usually does
 * not hold focus — a calendar opened by clicking an icon button leaves focus on the body. A
 * component listening on its own host therefore never hears the key: pressing Escape over an open
 * panel did nothing, because nothing was listening where the reader was.
 *
 * One listener on the document serves every overlay, and only the **topmost** one is told. That
 * matters as soon as anything nests: a dropdown opened from inside a dialog must take Escape for
 * itself and leave the dialog alone, rather than both closing at once.
 */
type KeydownHandler = (event: KeyboardEvent) => void;

const stack: Array<{ handler: KeydownHandler }> = [];
let cleanup: (() => void) | null = null;

function dispatch(event: KeyboardEvent): void {
	stack[stack.length - 1]?.handler(event);
}

/**
 * Adds an overlay to the top of the stack.
 *
 * @param handler Called with every keydown while this overlay is the topmost one.
 * @returns A function that removes it again; safe to call more than once.
 */
export function registerOverlayKeydown(handler: KeydownHandler): () => void {
	const entry = { handler };
	stack.push(entry);

	if (!cleanup && typeof document !== 'undefined') {
		document.addEventListener('keydown', dispatch);
		cleanup = () => document.removeEventListener('keydown', dispatch);
	}

	return () => {
		const index = stack.indexOf(entry);

		if (index === -1) {
			return;
		}

		stack.splice(index, 1);

		if (!stack.length) {
			cleanup?.();
			cleanup = null;
		}
	};
}
