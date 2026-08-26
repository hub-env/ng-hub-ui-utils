import {
	computeTargetIndex,
	containsNode,
	copyArrayItem,
	moveItemInArray,
	toAbsoluteIndex,
	transferArrayItem
} from './array-utils';

describe('drag-drop array-utils', () => {
	describe('moveItemInArray', () => {
		it('should move an item forward', () => {
			const arr = ['A', 'B', 'C', 'D', 'E'];
			moveItemInArray(arr, 1, 3);
			expect(arr).toEqual(['A', 'C', 'D', 'B', 'E']);
		});

		it('should move an item backward', () => {
			const arr = ['A', 'B', 'C', 'D', 'E'];
			moveItemInArray(arr, 3, 1);
			expect(arr).toEqual(['A', 'D', 'B', 'C', 'E']);
		});

		it('should be a no-op when indexes are equal', () => {
			const arr = ['A', 'B', 'C'];
			moveItemInArray(arr, 1, 1);
			expect(arr).toEqual(['A', 'B', 'C']);
		});
	});

	describe('transferArrayItem', () => {
		it('should move an item between arrays at the given index', () => {
			const source = ['A', 'B', 'C'];
			const target = ['X', 'Y'];
			transferArrayItem(source, target, 1, 1);
			expect(source).toEqual(['A', 'C']);
			expect(target).toEqual(['X', 'B', 'Y']);
		});

		it('should append when the target index exceeds the length', () => {
			const source = ['A'];
			const target = ['X', 'Y'];
			transferArrayItem(source, target, 0, 99);
			expect(source).toEqual([]);
			expect(target).toEqual(['X', 'Y', 'A']);
		});
	});

	describe('copyArrayItem', () => {
		it('should copy an item without mutating the source', () => {
			const source = ['A', 'B'];
			const target = ['X'];
			copyArrayItem(source, target, 0, 1);
			expect(source).toEqual(['A', 'B']);
			expect(target).toEqual(['X', 'A']);
		});
	});

	describe('toAbsoluteIndex', () => {
		it('should add the slice offset', () => {
			expect(toAbsoluteIndex(2, 10)).toBe(12);
		});
	});

	describe('computeTargetIndex', () => {
		it('should adjust for the removed gap when moving forward in the same container', () => {
			expect(computeTargetIndex(3, true, true, 1)).toBe(3);
			expect(computeTargetIndex(3, false, true, 1)).toBe(2);
		});

		it('should not adjust when moving backward in the same container', () => {
			expect(computeTargetIndex(0, false, true, 3)).toBe(0);
		});

		it('should not adjust across containers', () => {
			expect(computeTargetIndex(3, true, false, 1)).toBe(4);
			expect(computeTargetIndex(3, false, false, 1)).toBe(3);
		});
	});

	describe('containsNode', () => {
		const tree: any = { id: 1, children: [{ id: 2, children: [{ id: 3 }] }, { id: 4 }] };

		it('should be false for a null target', () => {
			expect(containsNode(tree, null, 'children')).toBe(false);
		});

		it('should be true for the node itself', () => {
			expect(containsNode(tree, tree, 'children')).toBe(true);
		});

		it('should be true for a nested descendant', () => {
			expect(containsNode(tree, tree.children[0].children[0], 'children')).toBe(true);
		});

		it('should be false for an unrelated node', () => {
			expect(containsNode(tree, { id: 99 }, 'children')).toBe(false);
		});
	});
});
