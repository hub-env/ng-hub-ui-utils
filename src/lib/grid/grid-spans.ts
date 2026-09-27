import { HubGridCoords, HubGridRange, HubGridSpan, HubGridSpanMap } from './grid.types';

/**
 * Merged blocks, and what the rest of the grid has to know about them.
 *
 * Three questions come up everywhere once cells can merge: is this cell drawn or swallowed, which
 * cell owns it, and does this selection cut a merge in half. Answering them from a list would be
 * linear on every keystroke, so the list is indexed once and read many times.
 *
 * Nothing here merges anything. The grid does not offer merging yet; this is the geometry it will
 * need, put in place before navigation, selection and the clipboard are built on top of a model
 * that cannot express it.
 */

/** Key for the lookup maps. A string beats nested maps for reads at this size. */
function at(row: number, col: number): string {
	return `${row},${col}`;
}

/**
 * Indexes a list of merges.
 *
 * Degenerate entries are dropped rather than repaired: a span of one cell merges nothing, and a
 * zero or negative extent describes no rectangle at all.
 *
 * Where two merges claim the same cell, the first one given wins and the second is dropped whole.
 * Half-applying it would leave cells pointing at an anchor that does not span them, which reads
 * as corruption later and far from here.
 */
export function buildSpanMap(spans: readonly HubGridSpan[]): HubGridSpanMap {
	const anchors = new Map<string, { rowSpan: number; colSpan: number }>();
	const covered = new Map<string, HubGridCoords>();

	for (const span of spans) {
		const rowSpan = Math.trunc(span.rowSpan);
		const colSpan = Math.trunc(span.colSpan);

		if (rowSpan < 1 || colSpan < 1 || rowSpan * colSpan < 2) {
			continue;
		}

		if (overlaps(span, rowSpan, colSpan, anchors, covered)) {
			continue;
		}

		anchors.set(at(span.row, span.col), { rowSpan, colSpan });

		for (let row = span.row; row < span.row + rowSpan; row++) {
			for (let col = span.col; col < span.col + colSpan; col++) {
				if (row !== span.row || col !== span.col) {
					covered.set(at(row, col), { row: span.row, col: span.col });
				}
			}
		}
	}

	return { size: anchors.size, anchors, covered };
}

/** The extent of the block anchored at these coordinates, or null when none starts here. */
export function spanAt(map: HubGridSpanMap, coords: HubGridCoords): { rowSpan: number; colSpan: number } | null {
	return map.anchors.get(at(coords.row, coords.col)) ?? null;
}

/**
 * Whether a cell is swallowed by a merge.
 *
 * A covered cell is never rendered and never receives the cursor; the anchor stands for it.
 */
export function isCovered(map: HubGridSpanMap, coords: HubGridCoords): boolean {
	return map.covered.has(at(coords.row, coords.col));
}

/**
 * The cell that stands for these coordinates.
 *
 * Navigation runs its arithmetic on plain coordinates and then asks this, so moving into the
 * middle of a merged block lands on the block rather than on a cell that is not drawn.
 */
export function anchorOf(map: HubGridSpanMap, coords: HubGridCoords): HubGridCoords {
	return map.covered.get(at(coords.row, coords.col)) ?? coords;
}

/**
 * Grows a range until no merge is left half inside it.
 *
 * A selection that clips a merge cannot be copied, filled or cleared coherently — half a block
 * has no value of its own. Excel grows the selection instead of refusing the operation, and so
 * does this.
 *
 * Growing can pull in further merges, so it repeats until a pass changes nothing. The loop
 * terminates because every pass either stops or enlarges a rectangle bounded by the merges that
 * exist.
 */
export function coversRange(map: HubGridSpanMap, range: HubGridRange): HubGridRange {
	if (map.size === 0) {
		return range;
	}

	let { top, bottom, left, right } = range;
	let grew = true;

	while (grew) {
		grew = false;

		for (let row = top; row <= bottom; row++) {
			for (let col = left; col <= right; col++) {
				const anchor = map.covered.get(at(row, col)) ?? { row, col };
				const span = map.anchors.get(at(anchor.row, anchor.col));

				if (!span) {
					continue;
				}

				const blockBottom = anchor.row + span.rowSpan - 1;
				const blockRight = anchor.col + span.colSpan - 1;

				if (anchor.row < top || anchor.col < left || blockBottom > bottom || blockRight > right) {
					top = Math.min(top, anchor.row);
					left = Math.min(left, anchor.col);
					bottom = Math.max(bottom, blockBottom);
					right = Math.max(right, blockRight);
					grew = true;
				}
			}
		}
	}

	return { top, bottom, left, right };
}

/** Whether a candidate block would touch a cell already claimed by an accepted one. */
function overlaps(
	span: HubGridSpan,
	rowSpan: number,
	colSpan: number,
	anchors: ReadonlyMap<string, unknown>,
	covered: ReadonlyMap<string, unknown>
): boolean {
	for (let row = span.row; row < span.row + rowSpan; row++) {
		for (let col = span.col; col < span.col + colSpan; col++) {
			const key = at(row, col);

			if (anchors.has(key) || covered.has(key)) {
				return true;
			}
		}
	}

	return false;
}
