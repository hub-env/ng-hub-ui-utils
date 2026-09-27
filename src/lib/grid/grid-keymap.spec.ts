import { gridCellTabIndex, resolveGridIntent } from './grid-keymap';

/** Builds the slice of a keyboard event the resolver reads. */
function key(init: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
	return {
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		isComposing: false,
		keyCode: 0,
		...init
	} as KeyboardEvent;
}

describe('resolveGridIntent · moving', () => {
	it('turns the arrows into a one-cell step', () => {
		expect(resolveGridIntent(key({ key: 'ArrowDown' }))).toEqual({
			kind: 'move',
			delta: { row: 1, col: 0 },
			extend: false
		});
		expect(resolveGridIntent(key({ key: 'ArrowLeft' }))).toEqual({
			kind: 'move',
			delta: { row: 0, col: -1 },
			extend: false
		});
	});

	it('extends the selection when shift is down', () => {
		expect(resolveGridIntent(key({ key: 'ArrowRight', shiftKey: true }))).toEqual({
			kind: 'move',
			delta: { row: 0, col: 1 },
			extend: true
		});
	});

	it('pages by the configured number of rows, ten by default', () => {
		expect(resolveGridIntent(key({ key: 'PageDown' }))).toEqual({
			kind: 'move',
			delta: { row: 10, col: 0 },
			extend: false
		});
		expect(resolveGridIntent(key({ key: 'PageUp' }), { pageSize: 3 })).toEqual({
			kind: 'move',
			delta: { row: -3, col: 0 },
			extend: false
		});
	});

	it('moves sideways on Tab, which is what a spreadsheet does', () => {
		expect(resolveGridIntent(key({ key: 'Tab' }))).toEqual({
			kind: 'move',
			delta: { row: 0, col: 1 },
			extend: false
		});
		expect(resolveGridIntent(key({ key: 'Tab', shiftKey: true }))).toEqual({
			kind: 'move',
			delta: { row: 0, col: -1 },
			extend: false
		});
	});
});

describe('resolveGridIntent · jumping', () => {
	it('sends Home and End to the ends of the row', () => {
		expect(resolveGridIntent(key({ key: 'Home' }))).toEqual({ kind: 'edge', edge: 'row-start', extend: false });
		expect(resolveGridIntent(key({ key: 'End' }))).toEqual({ kind: 'edge', edge: 'row-end', extend: false });
	});

	it('sends them to the ends of the sheet with a modifier, on either platform', () => {
		expect(resolveGridIntent(key({ key: 'Home', ctrlKey: true }))).toEqual({
			kind: 'edge',
			edge: 'grid-start',
			extend: false
		});
		expect(resolveGridIntent(key({ key: 'End', metaKey: true }))).toEqual({
			kind: 'edge',
			edge: 'grid-end',
			extend: false
		});
	});
});

describe('resolveGridIntent · editing', () => {
	it('opens the editor on F2 with no seed, keeping what the cell held', () => {
		expect(resolveGridIntent(key({ key: 'F2' }))).toEqual({ kind: 'edit', seed: undefined });
	});

	it('opens the editor on Enter, also keeping the value', () => {
		expect(resolveGridIntent(key({ key: 'Enter' }))).toEqual({ kind: 'edit', seed: undefined });
	});

	it('opens the cell on Alt with the down arrow, rather than travelling', () => {
		expect(resolveGridIntent(key({ key: 'ArrowDown', altKey: true }))).toEqual({ kind: 'edit', seed: undefined });
		// Without Alt it is still a move, and Alt with any other arrow is left alone.
		expect(resolveGridIntent(key({ key: 'ArrowDown' }))).toEqual({
			kind: 'move',
			delta: { row: 1, col: 0 },
			extend: false
		});
		expect(resolveGridIntent(key({ key: 'ArrowUp', altKey: true }))).toEqual({
			kind: 'move',
			delta: { row: -1, col: 0 },
			extend: false
		});
	});

	it('refuses to open on Alt with the down arrow when the grid cannot be edited', () => {
		expect(resolveGridIntent(key({ key: 'ArrowDown', altKey: true }), { editable: false })).toBeNull();
	});

	it('types over the cell when a printable character arrives', () => {
		expect(resolveGridIntent(key({ key: 'a' }))).toEqual({ kind: 'edit', seed: 'a' });
		expect(resolveGridIntent(key({ key: '7' }))).toEqual({ kind: 'edit', seed: '7' });
		expect(resolveGridIntent(key({ key: 'ñ' }))).toEqual({ kind: 'edit', seed: 'ñ' });
		expect(resolveGridIntent(key({ key: ' ' }))).toEqual({ kind: 'edit', seed: ' ' });
	});

	it('leaves a character carrying a modifier alone, so shortcuts still reach the browser', () => {
		expect(resolveGridIntent(key({ key: 'a', ctrlKey: true }))).not.toEqual({ kind: 'edit', seed: 'a' });
		expect(resolveGridIntent(key({ key: 'p', metaKey: true }))).toBeNull();
		expect(resolveGridIntent(key({ key: 'b', altKey: true }))).toBeNull();
	});

	it('still types a capital letter, because shift alone is not a modifier here', () => {
		expect(resolveGridIntent(key({ key: 'A', shiftKey: true }))).toEqual({ kind: 'edit', seed: 'A' });
	});

	it('refuses to open the editor on a read-only grid but keeps moving', () => {
		expect(resolveGridIntent(key({ key: 'F2' }), { editable: false })).toBeNull();
		expect(resolveGridIntent(key({ key: 'a' }), { editable: false })).toBeNull();
		expect(resolveGridIntent(key({ key: 'ArrowDown' }), { editable: false })).toEqual({
			kind: 'move',
			delta: { row: 1, col: 0 },
			extend: false
		});
	});
});

describe('resolveGridIntent · input methods', () => {
	/**
	 * Typing Chinese, Japanese or Korean goes through a composition, and the Enter that picks a
	 * candidate is the same Enter that would commit the cell. Acting on it makes the grid
	 * unusable in those languages, which is a bug the whole field keeps shipping.
	 */
	it('ignores every key while a composition is in flight', () => {
		expect(resolveGridIntent(key({ key: 'Enter', isComposing: true }))).toBeNull();
		expect(resolveGridIntent(key({ key: 'ArrowDown', isComposing: true }))).toBeNull();
		expect(resolveGridIntent(key({ key: 'a', isComposing: true }))).toBeNull();
	});

	it('also ignores the 229 that Safari reports instead of flagging the composition', () => {
		expect(resolveGridIntent(key({ key: 'Enter', keyCode: 229 }))).toBeNull();
		expect(resolveGridIntent(key({ key: 'Process', keyCode: 229 }))).toBeNull();
	});
});

describe('resolveGridIntent · the rest of the keyboard', () => {
	it('clears the selection contents on Delete and Backspace', () => {
		expect(resolveGridIntent(key({ key: 'Delete' }))).toEqual({ kind: 'clear' });
		expect(resolveGridIntent(key({ key: 'Backspace' }))).toEqual({ kind: 'clear' });
	});

	it('cancels on Escape', () => {
		expect(resolveGridIntent(key({ key: 'Escape' }))).toEqual({ kind: 'cancel' });
	});

	it('maps the clipboard trio on both platforms', () => {
		expect(resolveGridIntent(key({ key: 'c', ctrlKey: true }))).toEqual({ kind: 'copy' });
		expect(resolveGridIntent(key({ key: 'x', metaKey: true }))).toEqual({ kind: 'cut' });
		expect(resolveGridIntent(key({ key: 'v', ctrlKey: true }))).toEqual({ kind: 'paste' });
		expect(resolveGridIntent(key({ key: 'C', ctrlKey: true, shiftKey: true }))).toEqual({ kind: 'copy' });
	});

	it('selects everything, the row or the column', () => {
		expect(resolveGridIntent(key({ key: 'a', ctrlKey: true }))).toEqual({ kind: 'select-all' });
		expect(resolveGridIntent(key({ key: ' ', ctrlKey: true }))).toEqual({ kind: 'select-col' });
		expect(resolveGridIntent(key({ key: ' ', shiftKey: true }))).toEqual({ kind: 'select-row' });
	});

	it('maps undo and redo the way every editor does', () => {
		expect(resolveGridIntent(key({ key: 'z', ctrlKey: true }))).toEqual({ kind: 'undo' });
		expect(resolveGridIntent(key({ key: 'z', metaKey: true }))).toEqual({ kind: 'undo' });
		expect(resolveGridIntent(key({ key: 'z', ctrlKey: true, shiftKey: true }))).toEqual({ kind: 'redo' });
		expect(resolveGridIntent(key({ key: 'Z', metaKey: true, shiftKey: true }))).toEqual({ kind: 'redo' });
		expect(resolveGridIntent(key({ key: 'y', ctrlKey: true }))).toEqual({ kind: 'redo' });
	});

	it('leaves undo alone while a composition is in flight', () => {
		expect(resolveGridIntent(key({ key: 'z', ctrlKey: true, isComposing: true }))).toBeNull();
	});

	it('says nothing about keys it does not own', () => {
		expect(resolveGridIntent(key({ key: 'F5' }))).toBeNull();
		expect(resolveGridIntent(key({ key: 'Shift' }))).toBeNull();
		expect(resolveGridIntent(key({ key: 'Control' }))).toBeNull();
	});
});

describe('gridCellTabIndex', () => {
	it('gives the tab stop to the active cell under a roving focus', () => {
		expect(gridCellTabIndex({ row: 2, col: 1 }, { row: 2, col: 1 }, 'roving')).toBe(0);
		expect(gridCellTabIndex({ row: 0, col: 0 }, { row: 2, col: 1 }, 'roving')).toBe(-1);
	});

	it('falls back to the first cell when nothing is active yet, so the grid is reachable by Tab', () => {
		expect(gridCellTabIndex({ row: 0, col: 0 }, null, 'roving')).toBe(0);
		expect(gridCellTabIndex({ row: 0, col: 1 }, null, 'roving')).toBe(-1);
	});

	it('keeps every cell off the tab order when the container holds the focus', () => {
		expect(gridCellTabIndex({ row: 2, col: 1 }, { row: 2, col: 1 }, 'activedescendant')).toBe(-1);
		expect(gridCellTabIndex({ row: 0, col: 0 }, null, 'activedescendant')).toBe(-1);
	});
});
