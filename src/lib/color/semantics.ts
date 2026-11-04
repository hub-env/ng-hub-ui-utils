import { HubColor, HubOklch } from './color.types';
import { contrastRatio, readableOn, relativeLuminance } from './contrast';
import { clampToSrgbGamut, oklchToRgb, rgbToOklch } from './oklch';
import { toHex, toRgb } from './parse';

/**
 * The roles a brand palette derives from its primary. `primary` is not among them: the
 * caller already has it, and it is never rewritten by anything here.
 */
export type HubSemanticRole = 'success' | 'warning' | 'danger' | 'info';

/** A full set of derived semantic colours, as `#rrggbb` strings ready for a CSS custom property. */
export type HubSemanticPalette = Record<HubSemanticRole, string>;

/** The step keys of the design system's neutral ramp. */
export type HubNeutralStep = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

/** A tinted neutral ramp, as `#rrggbb` strings. */
export type HubNeutralRamp = Record<HubNeutralStep, string>;

/**
 * The design system's own semantic anchors — `--hub-sys-color-success` and friends at their
 * untinted values. Harmonising starts from these, so a product that harmonises nothing still
 * gets exactly the palette the stylesheet ships.
 */
export const HUB_SEMANTIC_ANCHORS: Readonly<HubSemanticPalette> = {
	success: '#198754',
	warning: '#ffc107',
	danger: '#dc3545',
	info: '#0dcaf0'
};

/** The design system's own neutral ramp, `--hub-ref-color-gray-100` … `-900`. */
export const HUB_NEUTRAL_ANCHORS: Readonly<HubNeutralRamp> = {
	100: '#f8f9fa',
	200: '#e9ecef',
	300: '#dee2e6',
	400: '#ced4da',
	500: '#adb5bd',
	600: '#6c757d',
	700: '#495057',
	800: '#343a40',
	900: '#212529'
};

/**
 * How far a semantic hue may be rotated towards the brand, in degrees.
 *
 * The ceiling is set by the pair the palette cannot afford to blur: success and danger sit
 * 135.8° apart in OKLCh (157.0° and 21.2°), and a viewer with deuteranopia separates them by
 * hue alone. A brand hue between the two pulls both inwards, so the gap closes by up to twice
 * the cap; at 22.9° it would reach the 90° floor below which the two stop being reliably
 * distinguishable. 15° leaves the gap at 105.8° in the worst case — a sixth of the circle of
 * margin — while still being a visible amount of harmonisation: at 15° a green shifts far
 * enough to read as "this product's green" and not far enough to read as teal.
 *
 * Change it only with the same arithmetic in hand: anything above 22 sacrifices the one
 * guarantee the default exists to protect.
 */
export const HUB_MAX_HUE_SHIFT = 15;

/**
 * The most chroma a tinted neutral may carry.
 *
 * Anchored on the ramp the design system already ships rather than on taste: its most
 * chromatic step, `gray-600`, measures 0.0165, and `gray-500` measures 0.0145. A cap of 0.015
 * therefore sits between the two, so a tinted ramp is never more colourful than the grey
 * people already accept as grey — the tint changes which way the grey leans, not how grey it
 * is. Above roughly 0.03 a neutral stops reading as neutral on the large surfaces it is used
 * for (page background, table rows) and the product looks washed in the brand colour.
 */
export const HUB_MAX_NEUTRAL_CHROMA = 0.015;

/**
 * Below this chroma a colour has no usable hue.
 *
 * OKLCh's hue is `atan2(b, a)`, and on a grey both terms are rounding noise, so the angle it
 * reports is arbitrary — `#808080` lands wherever the last bit fell. Harmonising towards that angle
 * would rotate every role by the full cap in a direction nobody chose. The threshold sits just
 * under the palest step of the design system's own ramp (`gray-100`, chroma 0.0017), so a colour
 * that is greyer than the greys is treated as having no direction at all.
 */
const ACHROMATIC_CHROMA = 0.0015;

/** Options for {@link harmoniseSemantics}. */
export interface HubHarmoniseOptions {
	/** Maximum hue rotation in degrees. Defaults to {@link HUB_MAX_HUE_SHIFT}. */
	maxHueShift?: number;
	/** Anchors to harmonise. Defaults to {@link HUB_SEMANTIC_ANCHORS}. */
	anchors?: Partial<HubSemanticPalette>;
}

/** Options for {@link tintNeutrals}. */
export interface HubTintNeutralsOptions {
	/** Maximum chroma of the tinted ramp. Defaults to {@link HUB_MAX_NEUTRAL_CHROMA}. */
	maxChroma?: number;
	/** Ramp to tint. Defaults to {@link HUB_NEUTRAL_ANCHORS}. */
	ramp?: Partial<HubNeutralRamp>;
}

/**
 * The shortest signed rotation from `from` to `to`, in the range (-180, 180].
 *
 * Signed rather than absolute because the whole point is to move *towards* the target: the
 * sign says which way round the circle the short way is.
 */
function shortestHueDelta(from: number, to: number): number {
	return ((((to - from) % 360) + 540) % 360) - 180;
}

/** Renders an OKLCh colour as hex, reducing chroma first if the hue cannot hold it in sRGB. */
function toGamutHex(color: HubOklch): string {
	return toHex(oklchToRgb(clampToSrgbGamut(color))) as string;
}

/**
 * Gives a rotated role back the contrast its anchor had with its ink, moving lightness only as far
 * as that takes.
 *
 * OKLCh lightness is not WCAG luminance: at another hue the same `l` can read a few hundredths
 * worse, and the design system's success and danger pass AA by three thousandths, so a rotated
 * danger fell under 4.5:1 for almost half the brand hues. The ink is the one that reads on the
 * anchor, the colour only ever moves away from it, and a role that already reads as well is
 * returned as it was. Measured on the final hex, so rounding cannot undo it.
 */
function keepAnchorContrast(color: HubOklch, anchor: HubColor): string {
	const ink = readableOn(anchor);
	const target = contrastRatio(ink, anchor) as number;
	const hexAt = (l: number) => toGamutHex({ ...color, l });
	const reads = (l: number) => (contrastRatio(ink, hexAt(l)) as number) >= target;

	if (reads(color.l)) {
		return hexAt(color.l);
	}

	// Darker under white ink, lighter under black. The far end always reads, so the bisection
	// keeps `far` on the side that passes and closes in on the smallest move.
	let near = color.l;
	let far = (relativeLuminance(ink) as number) > 0.5 ? 0 : 1;
	for (let step = 0; step < 24; step++) {
		const mid = (near + far) / 2;
		if (reads(mid)) {
			far = mid;
		} else {
			near = mid;
		}
	}

	return hexAt(far);
}

/**
 * Rotates each semantic role's hue towards a brand colour, so a palette looks like one family
 * instead of five unrelated signals.
 *
 * The hue moves, never by more than `maxHueShift`. Lightness stays where the anchor had it, since
 * it carries the contrast the roles were chosen for, with one exception: when the new hue would
 * read worse with its ink than the anchor did, lightness moves away from the ink by the smallest
 * amount that gives the anchor's ratio back (a few thousandths at most). A derived role therefore
 * never reads worse than the design system's own, and never changes which ink sits on it. Chroma
 * is kept too, and only reduced when the new hue cannot hold it inside sRGB.
 *
 * The cap is the whole design: a role that may rotate freely stops being a signal. Success has to
 * stay green next to a red brand, and success and danger have to stay far enough apart in hue that
 * a red-green colour-blind reader still tells them apart. See {@link HUB_MAX_HUE_SHIFT} for the
 * arithmetic behind the default.
 *
 * @param primary The brand colour, as a CSS string or a parsed colour.
 * @param options Cap and anchors to override.
 * @returns The derived palette as hex strings, or `null` when `primary` could not be parsed.
 *
 * @example
 * ```ts
 * harmoniseSemantics('#6f42c1'); // a violet brand
 * // → { success: '#00866b', warning: '#ffbf71', danger: '#d8336b', info: '#4bc5ff' }
 * ```
 */
export function harmoniseSemantics(primary: HubColor, options?: HubHarmoniseOptions): HubSemanticPalette | null {
	const rgb = toRgb(primary);
	if (!rgb) {
		return null;
	}

	const brand = rgbToOklch(rgb);
	// A brand with no hue names no direction to harmonise towards; the anchors are already the answer.
	const cap = brand.c < ACHROMATIC_CHROMA ? 0 : Math.abs(options?.maxHueShift ?? HUB_MAX_HUE_SHIFT);
	const anchors = { ...HUB_SEMANTIC_ANCHORS, ...options?.anchors };
	const result = {} as HubSemanticPalette;

	for (const role of Object.keys(anchors) as HubSemanticRole[]) {
		const anchorRgb = toRgb(anchors[role]);
		if (!anchorRgb) {
			continue;
		}

		const anchor = rgbToOklch(anchorRgb);
		const delta = shortestHueDelta(anchor.h, brand.h);
		const shift = Math.sign(delta) * Math.min(Math.abs(delta), cap);

		result[role] = keepAnchorContrast({ ...anchor, h: (((anchor.h + shift) % 360) + 360) % 360 }, anchorRgb);
	}

	return result;
}

/**
 * Leans a neutral ramp towards the brand hue, so greys sit under the brand instead of beside it.
 *
 * Every step keeps its lightness — the ramp's whole job is a predictable ladder of contrast — and
 * takes the brand's hue with its chroma capped at `maxChroma`. A step that was already flatter than
 * the cap stays flatter: the cap is a ceiling, not a target, or the pale end of the ramp would gain
 * colour it never had.
 *
 * A brand with no hue of its own (a pure grey, chroma 0) leaves the ramp untouched, since there is
 * nothing to lean towards and the alternative — snapping every grey to hue 0 — would tint the whole
 * product pink.
 *
 * @param primary The brand colour, as a CSS string or a parsed colour.
 * @param options Chroma ceiling and ramp to override.
 * @returns The tinted ramp as hex strings, or `null` when `primary` could not be parsed.
 */
export function tintNeutrals(primary: HubColor, options?: HubTintNeutralsOptions): HubNeutralRamp | null {
	const rgb = toRgb(primary);
	if (!rgb) {
		return null;
	}

	const brand = rgbToOklch(rgb);
	const ceiling = Math.max(0, options?.maxChroma ?? HUB_MAX_NEUTRAL_CHROMA);
	const ramp = { ...HUB_NEUTRAL_ANCHORS, ...options?.ramp };
	const result = {} as HubNeutralRamp;

	for (const key of Object.keys(ramp)) {
		const step = Number(key) as HubNeutralStep;
		const stepRgb = toRgb(ramp[step] as string);
		if (!stepRgb) {
			continue;
		}

		// A colourless brand names no direction; leaving the ramp alone beats inventing one, and the
		// step is handed back untouched rather than round-tripped through OKLCh and re-quantised.
		if (brand.c < ACHROMATIC_CHROMA) {
			result[step] = toHex(stepRgb) as string;
			continue;
		}

		const grey = rgbToOklch(stepRgb);
		result[step] = toGamutHex({ ...grey, c: Math.min(grey.c, ceiling), h: brand.h });
	}

	return result;
}
