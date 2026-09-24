/**
 * The viewport arithmetic every floating element in this package needs: does a box fit in the
 * window where it was asked to go, and where does it go instead when it does not.
 *
 * It lives on its own because the package had two answers to the same question. `OverlayPosition`
 * tested candidate positions against the window; the tooltip did not test at all, so a hint on a
 * header button was drawn above the top edge and clipped. A second copy of the maths is how the
 * two drift, so there is now one, and both read from it.
 *
 * Everything here speaks VIEWPORT coordinates — the ones `getBoundingClientRect()` returns. A
 * caller that positions in page coordinates adds its own scroll offset to the result; none of
 * these functions touch the DOM or assume a browser, so they run unchanged on a server render.
 */

/** Size of the window a floating box has to stay inside. */
export interface HubViewportSize {
	width: number;
	height: number;
}

/** Width and height of the box being placed. */
export interface HubBoxSize {
	width: number;
	height: number;
}

/** A point in viewport coordinates. */
export interface HubPoint {
	x: number;
	y: number;
}

/**
 * The part of a `DOMRect` positioning actually reads.
 *
 * Declared structurally so a caller can hand over a real rect or a plain object, which is what
 * makes the arithmetic testable without a layout engine behind it.
 */
export interface HubAnchorRect {
	top: number;
	bottom: number;
	left: number;
	right: number;
	width: number;
	height: number;
}

/**
 * Which side of the anchor the box sits on, named logically.
 *
 * The inline sides mirror under RTL and the block sides do not, which is why they are not called
 * `left` and `right`: a fallback chain written in physical edges needs a second copy for the other
 * direction, and the two copies drift apart. Vertical writing modes are out of scope — `block-start`
 * is the top edge in every direction this package supports.
 */
export type HubAnchorSide = 'block-start' | 'block-end' | 'inline-start' | 'inline-end';

/** Physical edge names, which is how a consumer-facing input such as a placement tends to spell it. */
export type HubPhysicalSide = 'top' | 'bottom' | 'left' | 'right';

/** Where the box lines up along the axis it is *not* anchored on. `start` and `end` are logical. */
export type HubAnchorAlign = 'start' | 'center' | 'end';

/** Everything {@link hubAnchorToViewport} needs to place one box against one anchor. */
export interface HubAnchorOptions {
	/** Rect of the element the box hangs off, in viewport coordinates. */
	anchor: HubAnchorRect;
	/** Measured size of the box being placed. */
	box: HubBoxSize;
	/** Window to stay inside, or `null` when there is none — see {@link hubViewportOf}. */
	viewport: HubViewportSize | null;
	/** Preferred side. It is kept unless it does not fit. */
	side: HubAnchorSide;
	/** Alignment along the cross axis. Defaults to `center`. */
	align?: HubAnchorAlign;
	/** Gap between the anchor and the box, in pixels. */
	offset?: number;
	/** Keep-out distance from the window edges, in pixels. */
	margin?: number;
	/** Writing direction of the anchor, which is what resolves the inline axis. */
	rtl?: boolean;
}

/** Result of {@link hubAnchorToViewport}: where the box goes, and on which side it ended up. */
export interface HubAnchoredPosition extends HubPoint {
	/** The side actually used — the requested one unless it had to give way. */
	side: HubAnchorSide;
	/** `true` only when the preferred side was abandoned, so a caller can label or style the flip. */
	flipped: boolean;
}

/** The side directly across the anchor from each one. */
const OPPOSITE_SIDE: Readonly<Record<HubAnchorSide, HubAnchorSide>> = {
	'block-start': 'block-end',
	'block-end': 'block-start',
	'inline-start': 'inline-end',
	'inline-end': 'inline-start'
};

/**
 * Size of the window an element is rendered in, read through the element's *own* view.
 *
 * Not through the global one: on a server render there is no `window`, and inside an iframe the
 * global belongs to the wrong document. A `null` result means there is nothing to measure against,
 * and every function here treats that as "leave the requested position alone".
 *
 * @param element Element whose document supplies the viewport.
 * @returns The viewport size, or `null` when the element belongs to no view.
 */
export function hubViewportOf(element: HTMLElement): HubViewportSize | null {
	const view = element.ownerDocument?.defaultView;

	return view ? { width: view.innerWidth, height: view.innerHeight } : null;
}

/**
 * Whether a box of `size` placed at `point` lies entirely inside the viewport.
 *
 * @param point Top-left corner, in viewport coordinates.
 * @param size Measured size of the box.
 * @param viewport Window to fit into.
 * @param margin Keep-out distance from each edge.
 * @returns `true` when no edge of the box crosses the margin.
 */
export function hubFitsInViewport(point: HubPoint, size: HubBoxSize, viewport: HubViewportSize, margin = 0): boolean {
	return (
		point.x >= margin &&
		point.y >= margin &&
		point.x + size.width <= viewport.width - margin &&
		point.y + size.height <= viewport.height - margin
	);
}

/**
 * Pulls a box back inside the viewport without moving it further than it has to.
 *
 * This is the half of the fix flipping cannot do: a label centred on a host near the inline edge
 * overflows on that edge whichever side of the host it opens, so it is slid along instead.
 *
 * @param point Top-left corner, in viewport coordinates.
 * @param size Measured size of the box.
 * @param viewport Window to stay inside.
 * @param margin Keep-out distance from each edge.
 * @returns The nearest point at which the box is inside, or the near edge when it cannot be.
 */
export function hubClampToViewport(point: HubPoint, size: HubBoxSize, viewport: HubViewportSize, margin = 0): HubPoint {
	return {
		x: clampAxis(point.x, size.width, viewport.width, margin),
		y: clampAxis(point.y, size.height, viewport.height, margin)
	};
}

/**
 * Translates a physical edge into its logical side for the given direction.
 *
 * Round-trips with {@link hubToPhysicalSide}, so a consumer whose API is spelled in physical edges
 * keeps its meaning: `left` on an RTL host is the inline *end*, which resolves back to the left.
 * What the trip buys is that the flip in between happens on the logical axis, where one rule covers
 * both directions.
 *
 * @param side Physical edge the consumer asked for.
 * @param rtl Whether the anchor is laid out right-to-left.
 * @returns The equivalent logical side.
 */
export function hubToAnchorSide(side: HubPhysicalSide, rtl = false): HubAnchorSide {
	switch (side) {
		case 'top':
			return 'block-start';
		case 'bottom':
			return 'block-end';
		case 'left':
			return rtl ? 'inline-end' : 'inline-start';
		case 'right':
			return rtl ? 'inline-start' : 'inline-end';
	}
}

/**
 * Translates a logical side into the physical edge it lands on for the given direction.
 *
 * @param side Logical side.
 * @param rtl Whether the anchor is laid out right-to-left.
 * @returns The physical edge that side names.
 */
export function hubToPhysicalSide(side: HubAnchorSide, rtl = false): HubPhysicalSide {
	switch (side) {
		case 'block-start':
			return 'top';
		case 'block-end':
			return 'bottom';
		case 'inline-start':
			return rtl ? 'right' : 'left';
		case 'inline-end':
			return rtl ? 'left' : 'right';
	}
}

/**
 * The side directly across the anchor, which is the only sensible fallback for a side that does
 * not fit: any other would move the box onto an axis the caller did not ask about.
 *
 * @param side Side to mirror.
 * @returns Its opposite.
 */
export function hubOppositeSide(side: HubAnchorSide): HubAnchorSide {
	return OPPOSITE_SIDE[side];
}

/**
 * Places a box against an anchor on the requested side, flipping to the opposite side only when
 * the requested one cannot hold it, and sliding it along the cross axis so it stays readable.
 *
 * The requested side is a preference, not a suggestion: it is abandoned only when the box does not
 * fit there *and* the opposite side is better, because a box that flips when it did not need to is
 * its own defect. When neither side can hold it the box keeps the roomier of the two and is clamped,
 * which at least leaves its beginning on screen.
 *
 * With no `viewport` — a server render — nothing is measured and the requested side is honoured as
 * written; the first real reposition in the browser corrects it.
 *
 * @param options Anchor, box, viewport, preferred side and the offsets around them.
 * @returns Viewport coordinates for the box, the side it ended up on, and whether that was a flip.
 */
export function hubAnchorToViewport(options: HubAnchorOptions): HubAnchoredPosition {
	const { anchor, box, viewport, side, align = 'center', offset = 0, margin = 0, rtl = false } = options;

	if (!viewport) {
		return { ...coordsFor(anchor, box, side, align, offset, rtl), side, flipped: false };
	}

	const needed = isBlockSide(side) ? box.height : box.width;
	const preferredRoom = roomOn(anchor, side, viewport, offset, margin, rtl);

	let chosen = side;
	let flipped = false;

	if (preferredRoom < needed) {
		const opposite = hubOppositeSide(side);
		const oppositeRoom = roomOn(anchor, opposite, viewport, offset, margin, rtl);

		if (oppositeRoom >= needed || oppositeRoom > preferredRoom) {
			chosen = opposite;
			flipped = true;
		}
	}

	const point = coordsFor(anchor, box, chosen, align, offset, rtl);

	return { ...hubClampToViewport(point, box, viewport, margin), side: chosen, flipped };
}

/** Whether a side is on the block axis, which decides whether height or width has to fit. */
function isBlockSide(side: HubAnchorSide): boolean {
	return side === 'block-start' || side === 'block-end';
}

/** Space left between the anchor and the window edge on one side, once offset and margin are paid. */
function roomOn(
	anchor: HubAnchorRect,
	side: HubAnchorSide,
	viewport: HubViewportSize,
	offset: number,
	margin: number,
	rtl: boolean
): number {
	switch (hubToPhysicalSide(side, rtl)) {
		case 'top':
			return anchor.top - offset - margin;
		case 'bottom':
			return viewport.height - anchor.bottom - offset - margin;
		case 'left':
			return anchor.left - offset - margin;
		case 'right':
			return viewport.width - anchor.right - offset - margin;
	}
}

/** Top-left corner of the box for one resolved side, before any clamping. */
function coordsFor(
	anchor: HubAnchorRect,
	box: HubBoxSize,
	side: HubAnchorSide,
	align: HubAnchorAlign,
	offset: number,
	rtl: boolean
): HubPoint {
	switch (hubToPhysicalSide(side, rtl)) {
		case 'top':
			return { x: alignInline(anchor, box, align, rtl), y: anchor.top - box.height - offset };
		case 'bottom':
			return { x: alignInline(anchor, box, align, rtl), y: anchor.bottom + offset };
		case 'left':
			return { x: anchor.left - box.width - offset, y: alignBlock(anchor, box, align) };
		case 'right':
			return { x: anchor.right + offset, y: alignBlock(anchor, box, align) };
	}
}

/** Cross-axis placement for a box anchored on the block axis. `start`/`end` mirror under RTL. */
function alignInline(anchor: HubAnchorRect, box: HubBoxSize, align: HubAnchorAlign, rtl: boolean): number {
	switch (align) {
		case 'start':
			return rtl ? anchor.right - box.width : anchor.left;
		case 'end':
			return rtl ? anchor.left : anchor.right - box.width;
		default:
			return anchor.left + (anchor.width - box.width) / 2;
	}
}

/** Cross-axis placement for a box anchored on the inline axis. Direction does not touch this one. */
function alignBlock(anchor: HubAnchorRect, box: HubBoxSize, align: HubAnchorAlign): number {
	switch (align) {
		case 'start':
			return anchor.top;
		case 'end':
			return anchor.bottom - box.height;
		default:
			return anchor.top + (anchor.height - box.height) / 2;
	}
}

/**
 * Clamps one axis, preferring the near edge when the box is larger than the window.
 *
 * Clamping to the far edge in that case would push the *beginning* of a long label off screen,
 * which is the half a reader needs most.
 */
function clampAxis(value: number, size: number, extent: number, margin: number): number {
	const max = extent - margin - size;

	if (max < margin) {
		return margin;
	}

	return Math.min(Math.max(value, margin), max);
}
