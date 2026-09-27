/**
 * Shared vocabulary for two-dimensional grid navigation and selection.
 *
 * These types describe a grid as pure coordinates, with no DOM and no Angular in sight, so the
 * hard parts — wrapping, clamping, rectangles — can be reasoned about and tested on their own.
 * The directives that drive real cells sit on top and translate.
 *
 * The shape deliberately mirrors `@angular/aria/grid` (MIT, Google LLC), so a project that
 * later prefers the framework's own primitive can swap one for the other without rewriting its
 * call sites. Where their naming is ambiguous — their `rowWrap` reads as both axes depending on
 * which sentence of the doc you believe — this uses `horizontal` and `vertical`, which cannot be
 * misread.
 */

/** A cell's position, both indices zero-based. */
export interface HubGridCoords {
	readonly row: number;
	readonly col: number;
}

/** How many cells the grid holds on each axis. */
export interface HubGridBounds {
	readonly rows: number;
	readonly cols: number;
}

/**
 * What happens when movement runs past an edge.
 *
 * - `nowrap` stops at the edge, which is what a plain data grid does.
 * - `loop` comes back round the same row or column.
 * - `continuous` spills into the next row or column, which is how Tab behaves in a spreadsheet
 *   and the reason this mode exists at all.
 */
export type HubGridWrap = 'nowrap' | 'loop' | 'continuous';

/** Wrapping per axis; either side may be left out and falls back to `nowrap`. */
export interface HubGridWrapConfig {
	readonly horizontal?: HubGridWrap;
	readonly vertical?: HubGridWrap;
}

/** A named destination for the keys that jump rather than step. */
export type HubGridEdge = 'row-start' | 'row-end' | 'col-start' | 'col-end' | 'grid-start' | 'grid-end';

/**
 * A rectangle of cells, every bound inclusive.
 *
 * Inclusive on purpose: a single cell is a range whose corners coincide, so callers never need a
 * special case for "just this one".
 */
export interface HubGridRange {
	readonly top: number;
	readonly bottom: number;
	readonly left: number;
	readonly right: number;
}

/**
 * A merged block of cells, named by its top-left corner.
 *
 * Merging is not offered by the grid in this release, but the geometry knows about it from the
 * start. Spans reach into navigation, selection, the clipboard and fill, so a model that learns
 * about them later has to revisit all four — which is how the field's long-running merge bugs
 * come about.
 */
export interface HubGridSpan extends HubGridCoords {
	/** How many rows the block occupies, counting its own. */
	readonly rowSpan: number;
	/** How many columns the block occupies, counting its own. */
	readonly colSpan: number;
}

/**
 * Merges indexed for lookup: every covered cell points at its anchor, and every anchor at its
 * extent. Built once per change of the merge list by `buildSpanMap`.
 */
export interface HubGridSpanMap {
	/** How many entries the map holds; zero means nothing is merged. */
	readonly size: number;
	/** The extent of an anchor, keyed `row,col`. */
	readonly anchors: ReadonlyMap<string, { rowSpan: number; colSpan: number }>;
	/** The anchor that owns a covered cell, keyed `row,col`. */
	readonly covered: ReadonlyMap<string, HubGridCoords>;
}
