import { moveGridFocus, resolveGridEdge } from './grid-navigation';
import { HubGridBounds } from './grid.types';

const bounds: HubGridBounds = { rows: 3, cols: 4 };

describe('moveGridFocus', () => {
	describe('inside the grid', () => {
		it('moves one cell per step in each direction', () => {
			expect(moveGridFocus({ row: 1, col: 1 }, { row: 1, col: 0 }, bounds)).toEqual({ row: 2, col: 1 });
			expect(moveGridFocus({ row: 1, col: 1 }, { row: -1, col: 0 }, bounds)).toEqual({ row: 0, col: 1 });
			expect(moveGridFocus({ row: 1, col: 1 }, { row: 0, col: 1 }, bounds)).toEqual({ row: 1, col: 2 });
			expect(moveGridFocus({ row: 1, col: 1 }, { row: 0, col: -1 }, bounds)).toEqual({ row: 1, col: 0 });
		});

		it('moves diagonally when both axes carry a delta', () => {
			expect(moveGridFocus({ row: 0, col: 0 }, { row: 2, col: 3 }, bounds)).toEqual({ row: 2, col: 3 });
		});
	});

	describe('nowrap, the default', () => {
		it('stays put at every edge rather than moving', () => {
			expect(moveGridFocus({ row: 0, col: 0 }, { row: -1, col: 0 }, bounds)).toEqual({ row: 0, col: 0 });
			expect(moveGridFocus({ row: 0, col: 0 }, { row: 0, col: -1 }, bounds)).toEqual({ row: 0, col: 0 });
			expect(moveGridFocus({ row: 2, col: 3 }, { row: 1, col: 0 }, bounds)).toEqual({ row: 2, col: 3 });
			expect(moveGridFocus({ row: 2, col: 3 }, { row: 0, col: 1 }, bounds)).toEqual({ row: 2, col: 3 });
		});

		it('clamps an overshooting delta to the edge instead of discarding it', () => {
			expect(moveGridFocus({ row: 1, col: 1 }, { row: 0, col: 99 }, bounds)).toEqual({ row: 1, col: 3 });
			expect(moveGridFocus({ row: 1, col: 1 }, { row: -99, col: 0 }, bounds)).toEqual({ row: 0, col: 1 });
		});
	});

	describe('loop', () => {
		it('wraps horizontally within the same row', () => {
			const wrap = { horizontal: 'loop' } as const;

			expect(moveGridFocus({ row: 1, col: 3 }, { row: 0, col: 1 }, bounds, wrap)).toEqual({ row: 1, col: 0 });
			expect(moveGridFocus({ row: 1, col: 0 }, { row: 0, col: -1 }, bounds, wrap)).toEqual({ row: 1, col: 3 });
		});

		it('wraps vertically within the same column', () => {
			const wrap = { vertical: 'loop' } as const;

			expect(moveGridFocus({ row: 2, col: 1 }, { row: 1, col: 0 }, bounds, wrap)).toEqual({ row: 0, col: 1 });
			expect(moveGridFocus({ row: 0, col: 1 }, { row: -1, col: 0 }, bounds, wrap)).toEqual({ row: 2, col: 1 });
		});
	});

	describe('continuous', () => {
		it('spills horizontally into the next row, as Tab does in a spreadsheet', () => {
			const wrap = { horizontal: 'continuous' } as const;

			expect(moveGridFocus({ row: 1, col: 3 }, { row: 0, col: 1 }, bounds, wrap)).toEqual({ row: 2, col: 0 });
			expect(moveGridFocus({ row: 1, col: 0 }, { row: 0, col: -1 }, bounds, wrap)).toEqual({ row: 0, col: 3 });
		});

		it('spills vertically into the next column', () => {
			const wrap = { vertical: 'continuous' } as const;

			expect(moveGridFocus({ row: 2, col: 1 }, { row: 1, col: 0 }, bounds, wrap)).toEqual({ row: 0, col: 2 });
			expect(moveGridFocus({ row: 0, col: 1 }, { row: -1, col: 0 }, bounds, wrap)).toEqual({ row: 2, col: 0 });
		});

		it('stops at the very last cell rather than falling off the grid', () => {
			const horizontal = { horizontal: 'continuous' } as const;
			const vertical = { vertical: 'continuous' } as const;

			expect(moveGridFocus({ row: 2, col: 3 }, { row: 0, col: 1 }, bounds, horizontal)).toEqual({ row: 2, col: 3 });
			expect(moveGridFocus({ row: 0, col: 0 }, { row: 0, col: -1 }, bounds, horizontal)).toEqual({ row: 0, col: 0 });
			expect(moveGridFocus({ row: 2, col: 3 }, { row: 1, col: 0 }, bounds, vertical)).toEqual({ row: 2, col: 3 });
			expect(moveGridFocus({ row: 0, col: 0 }, { row: -1, col: 0 }, bounds, vertical)).toEqual({ row: 0, col: 0 });
		});
	});

	describe('degenerate bounds', () => {
		it('pins to the origin when the grid has no cells', () => {
			const empty: HubGridBounds = { rows: 0, cols: 0 };

			expect(moveGridFocus({ row: 0, col: 0 }, { row: 1, col: 1 }, empty)).toEqual({ row: 0, col: 0 });
		});

		it('pulls an out-of-range origin back inside, which is what a shrinking grid leaves behind', () => {
			expect(moveGridFocus({ row: 9, col: 9 }, { row: 0, col: 0 }, bounds)).toEqual({ row: 2, col: 3 });
		});
	});
});

describe('resolveGridEdge', () => {
	it('goes to the ends of the current row', () => {
		expect(resolveGridEdge({ row: 1, col: 2 }, 'row-start', bounds)).toEqual({ row: 1, col: 0 });
		expect(resolveGridEdge({ row: 1, col: 2 }, 'row-end', bounds)).toEqual({ row: 1, col: 3 });
	});

	it('goes to the first and last cell of the whole grid', () => {
		expect(resolveGridEdge({ row: 1, col: 2 }, 'grid-start', bounds)).toEqual({ row: 0, col: 0 });
		expect(resolveGridEdge({ row: 1, col: 2 }, 'grid-end', bounds)).toEqual({ row: 2, col: 3 });
	});

	it('keeps the column when jumping to the ends of the current column', () => {
		expect(resolveGridEdge({ row: 1, col: 2 }, 'col-start', bounds)).toEqual({ row: 0, col: 2 });
		expect(resolveGridEdge({ row: 1, col: 2 }, 'col-end', bounds)).toEqual({ row: 2, col: 2 });
	});

	it('survives an empty grid', () => {
		const empty: HubGridBounds = { rows: 0, cols: 0 };

		expect(resolveGridEdge({ row: 0, col: 0 }, 'grid-end', empty)).toEqual({ row: 0, col: 0 });
	});
});
