import { HubGridCoords, HubGridEdge } from './grid.types';

/**
 * Turns a keystroke into what the grid should do about it.
 *
 * Kept apart from any component so the whole keyboard contract can be tested as a table of
 * inputs and outputs. The mapping follows the WAI-ARIA data grid pattern, with the two places a
 * spreadsheet departs from it: Tab walks sideways through cells rather than out of the grid, and
 * a printable character starts an edit that replaces the cell.
 */

/** How the grid hands focus to its cells. */
export type HubGridFocusMode = 'roving' | 'activedescendant';

/** What a keystroke asks the grid to do. */
export type HubGridIntent =
	| { kind: 'move'; delta: { row: number; col: number }; extend: boolean }
	| { kind: 'edge'; edge: HubGridEdge; extend: boolean }
	| { kind: 'edit'; seed: string | undefined }
	| { kind: 'clear' }
	| { kind: 'cancel' }
	| { kind: 'copy' }
	| { kind: 'cut' }
	| { kind: 'paste' }
	| { kind: 'select-all' }
	| { kind: 'select-row' }
	| { kind: 'select-col' }
	| { kind: 'undo' }
	| { kind: 'redo' };

/** Knobs the host grid turns; both have sane defaults. */
export interface HubGridKeymapOptions {
	/** How many rows Page Up and Page Down travel. Ten when not given. */
	readonly pageSize?: number;
	/** Whether editing is offered at all. True when not given. */
	readonly editable?: boolean;
}

/** One-cell steps, by arrow key. */
const ARROWS: Record<string, { row: number; col: number }> = {
	ArrowUp: { row: -1, col: 0 },
	ArrowDown: { row: 1, col: 0 },
	ArrowLeft: { row: 0, col: -1 },
	ArrowRight: { row: 0, col: 1 }
};

/**
 * Reads a keydown and says what it means, or null when the grid should keep its hands off.
 *
 * @param event The keydown, or any object carrying the same fields.
 * @param options Page size and whether the grid is editable.
 * @returns The intent, or null to let the event travel on untouched.
 */
export function resolveGridIntent(event: KeyboardEvent, options: HubGridKeymapOptions = {}): HubGridIntent | null {
	// An input method is mid-composition. The Enter that picks a candidate is the same Enter that
	// would commit a cell, so acting on any key here makes the grid unusable in Chinese, Japanese
	// and Korean. Safari does not always set `isComposing`, but it does report the legacy 229.
	if (event.isComposing || event.keyCode === 229) {
		return null;
	}

	const { pageSize = 10, editable = true } = options;
	const modifier = event.ctrlKey || event.metaKey;
	const extend = event.shiftKey;

	if (ARROWS[event.key]) {
		// Alt with the down arrow opens the cell instead of travelling. It is how a spreadsheet
		// drops the list of a cell that has one, and the only way in from the keyboard that does
		// not start by typing over what is there.
		if (event.altKey && event.key === 'ArrowDown') {
			return editable ? { kind: 'edit', seed: undefined } : null;
		}

		return { kind: 'move', delta: ARROWS[event.key], extend };
	}

	switch (event.key) {
		case 'PageDown':
			return { kind: 'move', delta: { row: pageSize, col: 0 }, extend };
		case 'PageUp':
			return { kind: 'move', delta: { row: -pageSize, col: 0 }, extend };
		case 'Tab':
			// Sideways, not out. Whether focus may leave at either end is the host's call, since
			// only it knows what sits around the grid.
			return { kind: 'move', delta: { row: 0, col: extend ? -1 : 1 }, extend: false };
		case 'Home':
			return { kind: 'edge', edge: modifier ? 'grid-start' : 'row-start', extend };
		case 'End':
			return { kind: 'edge', edge: modifier ? 'grid-end' : 'row-end', extend };
		case 'Escape':
			return { kind: 'cancel' };
		case 'Delete':
		case 'Backspace':
			return editable ? { kind: 'clear' } : null;
		case 'Enter':
		case 'F2':
			return editable ? { kind: 'edit', seed: undefined } : null;
	}

	if (modifier) {
		switch (event.key.toLowerCase()) {
			case 'c':
				return { kind: 'copy' };
			case 'x':
				return { kind: 'cut' };
			case 'v':
				return { kind: 'paste' };
			case 'a':
				return { kind: 'select-all' };
			case 'z':
				// Shift turns undo into redo, which is what every editor on every platform does.
				return extend ? { kind: 'redo' } : { kind: 'undo' };
			case 'y':
				return { kind: 'redo' };
			case ' ':
				return { kind: 'select-col' };
		}

		return null;
	}

	if (event.key === ' ' && extend) {
		return { kind: 'select-row' };
	}

	// A printable character types over the cell, as it does in every spreadsheet. Shift is not a
	// modifier here, or capital letters would never reach the editor.
	if (editable && event.key.length === 1 && !event.altKey) {
		return { kind: 'edit', seed: event.key };
	}

	return null;
}

/**
 * The tabindex a cell should carry.
 *
 * Under a roving focus exactly one cell is in the tab order, so the grid is one Tab stop from
 * outside and the arrows take over within. Before anything is active the first cell holds the
 * stop, otherwise the grid could not be reached by keyboard at all.
 *
 * Under `activedescendant` the container keeps the focus and no cell is ever a tab stop.
 */
export function gridCellTabIndex(cell: HubGridCoords, active: HubGridCoords | null, focusMode: HubGridFocusMode): number {
	if (focusMode === 'activedescendant') {
		return -1;
	}

	if (!active) {
		return cell.row === 0 && cell.col === 0 ? 0 : -1;
	}

	return cell.row === active.row && cell.col === active.col ? 0 : -1;
}
