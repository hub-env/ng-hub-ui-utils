import { HubGridSpan } from './grid.types';

/**
 * Which tracks of an axis are worth drawing, and how much empty space stands for the rest.
 *
 * A sheet of ten thousand rows cannot put ten thousand rows in the document: the browser spends
 * its time on cells nobody is looking at, and the first paint arrives late. The answer everywhere
 * is the same — draw the tracks the viewport covers, and reserve the space of the others so the
 * scrollbar still tells the truth.
 *
 * Kept here, as arithmetic over sizes and offsets, with no DOM and no framework: it is the part
 * that has the edge cases, and the part a test can hold still.
 */

/** Sizes of the tracks along one axis, or one size when they are all alike. */
export type HubGridTrackSizes = number | readonly number[];

export interface HubGridWindowOptions {
	/** How far the scroller has travelled along this axis, in pixels. */
	readonly offset: number;
	/** How much of the axis is on screen, in pixels. */
	readonly viewport: number;
	/** How big each track is. */
	readonly sizes: HubGridTrackSizes;
	/** How many tracks there are. Required when `sizes` is a single number. */
	readonly count?: number;
	/**
	 * Tracks to draw on each side beyond the viewport.
	 *
	 * Two by default. Nought paints a strip of empty cells at the edge on every fast scroll,
	 * because the frame that fills them arrives after the one that moved; a large number gives
	 * back the cost virtualising saved.
	 */
	readonly overscan?: number;
	/**
	 * Leading tracks that are always drawn, however far the reader has scrolled.
	 *
	 * The frozen ones. They are pinned in place, so they are on screen by definition, and the
	 * window that follows starts after them.
	 */
	readonly pinned?: number;
}

/** The tracks to draw, and the empty space that stands for the ones that are not drawn. */
export interface HubGridWindow {
	/** First track of the window, counting from nought. */
	readonly start: number;
	/** Last track of the window, inclusive. `start - 1` when there is nothing to draw. */
	readonly end: number;
	/** Pixels of the tracks before `start` that are not pinned. */
	readonly before: number;
	/** Pixels of the tracks after `end`. */
	readonly after: number;
}

/** The size of one track, whichever way the sizes were given. */
function sizeOf(sizes: HubGridTrackSizes, index: number): number {
	return typeof sizes === 'number' ? sizes : (sizes[index] ?? 0);
}

/** How many tracks there are, whichever way the sizes were given. */
function countOf(sizes: HubGridTrackSizes, count: number | undefined): number {
	return typeof sizes === 'number' ? Math.max(0, count ?? 0) : sizes.length;
}

/** The pixels a run of tracks occupies. */
function measure(sizes: HubGridTrackSizes, from: number, to: number): number {
	if (to < from) {
		return 0;
	}

	if (typeof sizes === 'number') {
		return (to - from + 1) * sizes;
	}

	let total = 0;

	for (let index = from; index <= to; index++) {
		total += sizes[index] ?? 0;
	}

	return total;
}

/**
 * The window of tracks a viewport covers, with the space the rest would have taken.
 *
 * The pinned tracks are not part of it: they are drawn whatever happens and do not move, so the
 * offset is read against the tracks that scroll. A viewport of nought — a sheet that has not been
 * laid out yet, or one in a hidden tab — yields the first tracks rather than none, so the first
 * paint has something in it and the measurements that follow have something to measure.
 */
export function gridWindow(options: HubGridWindowOptions): HubGridWindow {
	const { offset, viewport, sizes, overscan = 2, pinned = 0 } = options;
	const total = countOf(sizes, options.count);
	const first = Math.min(Math.max(0, pinned), total);

	if (first >= total) {
		return { start: first, end: first - 1, before: 0, after: 0 };
	}

	const travelled = Math.max(0, offset);
	const visible = viewport > 0 ? viewport : measure(sizes, first, Math.min(total - 1, first + 9));

	let start = first;
	let consumed = 0;

	// Walk to the first track the viewport's leading edge touches. A track that is half out is
	// still half in, so the walk stops on it rather than after it.
	while (start < total - 1 && consumed + sizeOf(sizes, start) <= travelled) {
		consumed += sizeOf(sizes, start);
		start++;
	}

	let end = start;
	let filled = consumed + sizeOf(sizes, start) - travelled;

	while (end < total - 1 && filled < visible) {
		end++;
		filled += sizeOf(sizes, end);
	}

	const windowStart = Math.max(first, start - overscan);
	const windowEnd = Math.min(total - 1, end + overscan);

	return {
		start: windowStart,
		end: windowEnd,
		before: measure(sizes, first, windowStart - 1),
		after: measure(sizes, windowEnd + 1, total - 1)
	};
}

/**
 * Grows a window until every merged block it touches is drawn whole.
 *
 * A block is drawn by its anchor, whose `rowspan` and `colspan` occupy the cells below and to the
 * right of it. Leave the anchor outside the window and the block simply is not there — the rows
 * that should have been covered draw their own cells instead, and the sheet comes apart exactly
 * where a reader scrolled to. So the window reaches back to the anchor, and forward to the far
 * edge, of every block that overlaps it.
 *
 * Bounded by the tallest and widest block, which is why a sheet with one block spanning a thousand
 * rows is a sheet that draws a thousand rows. That is not a case worth optimising for; it is a
 * case worth knowing about.
 */
export function growWindowToSpans(
	window: HubGridWindow,
	spans: readonly HubGridSpan[],
	axis: 'row' | 'col',
	sizes: HubGridTrackSizes,
	options: { readonly count?: number; readonly pinned?: number } = {}
): HubGridWindow {
	const total = countOf(sizes, options.count);
	const first = Math.min(Math.max(0, options.pinned ?? 0), total);

	let start = window.start;
	let end = window.end;

	if (end < start) {
		return window;
	}

	// Until a pass changes nothing: growing to reach one block can bring another into the window.
	for (let changed = true; changed;) {
		changed = false;

		for (const span of spans) {
			const anchor = axis === 'row' ? span.row : span.col;
			const extent = axis === 'row' ? span.rowSpan : span.colSpan;
			const far = anchor + extent - 1;

			if (far < start || anchor > end) {
				continue;
			}

			// Clamped first and compared after. Comparing before clamping is what turns this loop
			// into a hang: a block anchored inside the pinned tracks, or one reaching past the last
			// track, is forever "outside" a window that cannot grow any further to reach it.
			const reach = Math.max(first, anchor);
			const edge = Math.min(total - 1, far);

			if (reach < start) {
				start = reach;
				changed = true;
			}

			if (edge > end) {
				end = edge;
				changed = true;
			}
		}
	}

	return {
		start,
		end,
		before: measure(sizes, first, start - 1),
		after: measure(sizes, end + 1, total - 1)
	};
}
