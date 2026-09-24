import { contrastRatio, readableOn } from './contrast';
import { rgbToOklch } from './oklch';
import { parseColor } from './parse';
import {
	HUB_MAX_HUE_SHIFT,
	HUB_MAX_NEUTRAL_CHROMA,
	HUB_NEUTRAL_ANCHORS,
	HUB_SEMANTIC_ANCHORS,
	HubNeutralStep,
	HubSemanticRole,
	harmoniseSemantics,
	tintNeutrals
} from './semantics';

/** Reads a hex string back into OKLCh, so assertions talk in the space the maths happens in. */
function oklch(hex: string) {
	return rgbToOklch(parseColor(hex)!);
}

/** Shortest angular distance between two hues, 0-180. */
function hueDistance(a: number, b: number): number {
	return Math.abs(((((b - a) % 360) + 540) % 360) - 180);
}

/** Every 10° around the circle, at a chroma and lightness a real brand would have. */
const BRAND_HUES = Array.from({ length: 36 }, (_, i) => i * 10);

/** A brand colour at the given hue, built through the library's own conversion. */
function brandAt(hue: number): string {
	return `oklch(0.55 0.15 ${hue})`;
}

const ROLES = Object.keys(HUB_SEMANTIC_ANCHORS) as HubSemanticRole[];
const STEPS = Object.keys(HUB_NEUTRAL_ANCHORS).map(Number) as HubNeutralStep[];

describe('harmoniseSemantics', () => {
	it('returns null when the brand colour cannot be parsed', () => {
		expect(harmoniseSemantics('not-a-colour')).toBeNull();
	});

	it('never rotates a role by more than the cap, from any brand angle', () => {
		for (const hue of BRAND_HUES) {
			const palette = harmoniseSemantics(brandAt(hue))!;

			for (const role of ROLES) {
				const moved = hueDistance(oklch(HUB_SEMANTIC_ANCHORS[role]).h, oklch(palette[role]).h);

				expect(moved).toBeLessThanOrEqual(HUB_MAX_HUE_SHIFT + 0.5);
			}
		}
	});

	it('rotates every role towards the brand, never away from it', () => {
		for (const hue of BRAND_HUES) {
			const brand = oklch(brandAt(hue)).h;
			const palette = harmoniseSemantics(brandAt(hue))!;

			for (const role of ROLES) {
				const before = hueDistance(oklch(HUB_SEMANTIC_ANCHORS[role]).h, brand);
				const after = hueDistance(oklch(palette[role]).h, brand);

				expect(after).toBeLessThanOrEqual(before + 0.5);
			}
		}
	});

	it('keeps success green next to a red brand', () => {
		const success = oklch(harmoniseSemantics('#dc3545')!.success);

		// Green occupies roughly 130-175° in OKLCh; the anchor sits at 157.
		expect(success.h).toBeGreaterThan(130);
		expect(success.h).toBeLessThan(175);
	});

	it('keeps success and danger more than 90 degrees apart, from any brand angle', () => {
		for (const hue of BRAND_HUES) {
			const palette = harmoniseSemantics(brandAt(hue))!;

			expect(hueDistance(oklch(palette.success).h, oklch(palette.danger).h)).toBeGreaterThan(90);
		}
	});

	it('leaves lightness exactly where the anchor had it', () => {
		const palette = harmoniseSemantics('#6f42c1')!;

		for (const role of ROLES) {
			expect(oklch(palette[role]).l).toBeCloseTo(oklch(HUB_SEMANTIC_ANCHORS[role]).l, 2);
		}
	});

	it('honours a caller-supplied cap', () => {
		const palette = harmoniseSemantics('#6f42c1', { maxHueShift: 4 })!;

		for (const role of ROLES) {
			const moved = hueDistance(oklch(HUB_SEMANTIC_ANCHORS[role]).h, oklch(palette[role]).h);

			expect(moved).toBeLessThanOrEqual(4.5);
		}
	});

	it('leaves a role alone when the brand already shares its hue', () => {
		const palette = harmoniseSemantics(HUB_SEMANTIC_ANCHORS.success)!;

		expect(hueDistance(oklch(palette.success).h, oklch(HUB_SEMANTIC_ANCHORS.success).h)).toBeLessThan(0.5);
	});
});

describe('tintNeutrals', () => {
	it('returns null when the brand colour cannot be parsed', () => {
		expect(tintNeutrals('rgb(nope)')).toBeNull();
	});

	it('never lets a neutral exceed the chroma ceiling', () => {
		for (const hue of BRAND_HUES) {
			const ramp = tintNeutrals(brandAt(hue))!;

			for (const step of STEPS) {
				expect(oklch(ramp[step]).c).toBeLessThanOrEqual(HUB_MAX_NEUTRAL_CHROMA + 0.002);
			}
		}
	});

	it('keeps every step at the lightness it had', () => {
		const ramp = tintNeutrals('#6f42c1')!;

		for (const step of STEPS) {
			expect(oklch(ramp[step]).l).toBeCloseTo(oklch(HUB_NEUTRAL_ANCHORS[step]).l, 2);
		}
	});

	it('leans the ramp towards the brand hue', () => {
		const brand = oklch('#6f42c1').h;
		const ramp = tintNeutrals('#6f42c1')!;

		// The palest step carries almost no chroma, so its hue is numerically unstable; the mid and
		// dark steps are where a tint is actually visible and where the hue has to land.
		for (const step of [500, 600, 700, 800] as HubNeutralStep[]) {
			expect(hueDistance(oklch(ramp[step]).h, brand)).toBeLessThan(10);
		}
	});

	it('leaves the ramp untouched when the brand has no hue of its own', () => {
		const ramp = tintNeutrals('#808080')!;

		for (const step of STEPS) {
			expect(ramp[step]).toBe(HUB_NEUTRAL_ANCHORS[step].toLowerCase());
		}
	});
});

describe('the contrast a harmonised palette carries', () => {
	/**
	 * Harmonising must not change what a role is safe to write on.
	 *
	 * The function keeps OKLCh lightness on purpose, and its documentation says that is what
	 * carries the contrast. It is true in OKLCh and only nearly true in WCAG: relative luminance
	 * is not lightness, so rotating the hue at a fixed `l` moves the ratio a little. These two
	 * assertions bound "a little" — the ink never flips, and the ratio never loses more than a
	 * fiftieth of what the anchor had.
	 *
	 * Worth knowing before raising {@link HUB_MAX_HUE_SHIFT}: the anchors themselves sit on the
	 * AA line rather than above it (success 4.53, danger 4.53), so that fiftieth is enough to
	 * cross it. At the default cap `danger` measures between 4.47 and 4.53 depending on the brand
	 * hue, which is below 4.5 for a little under half the circle. A wider cap makes that worse,
	 * and the only fix that does not move lightness is a darker anchor.
	 */
	const MAX_CONTRAST_LOSS = 0.02;

	it('never changes which ink reads on a role', () => {
		for (const hue of BRAND_HUES) {
			const palette = harmoniseSemantics(brandAt(hue))!;

			for (const role of ROLES) {
				expect(readableOn(palette[role])).toBe(readableOn(HUB_SEMANTIC_ANCHORS[role]));
			}
		}
	});

	it('stays within a fiftieth of the anchor ratio, from any brand angle', () => {
		for (const hue of BRAND_HUES) {
			const palette = harmoniseSemantics(brandAt(hue))!;

			for (const role of ROLES) {
				const anchor = HUB_SEMANTIC_ANCHORS[role];
				const floor = contrastRatio(readableOn(anchor), anchor)! * (1 - MAX_CONTRAST_LOSS);

				expect(contrastRatio(readableOn(palette[role]), palette[role])!).toBeGreaterThanOrEqual(floor);
			}
		}
	});
});
