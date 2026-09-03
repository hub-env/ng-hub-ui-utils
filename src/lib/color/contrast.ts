import { HubColor } from './color.types';
import { rgbToOklch } from './oklch';
import { toRgb } from './parse';

/**
 * Contrast and readability helpers.
 *
 * The WCAG 2 relative-luminance and contrast-ratio formulas, and the APCA implementation,
 * follow chroma.js (BSD-3-Clause, Copyright (c) 2011-2025 Gregor Aisch). APCA itself is
 * specified by Myndex.
 *
 * @see https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 * @see https://readtech.org/ARC/
 */

/** Linearises one sRGB channel for the WCAG luminance sum. */
function linearise(channel: number): number {
	const v = channel / 255;
	return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * WCAG 2 relative luminance, 0 (black) to 1 (white).
 *
 * Alpha is ignored: a translucent colour has no luminance of its own until it is composited,
 * so blend it with {@link compositeOver} first when that matters.
 *
 * @param color A CSS colour string or parsed colour.
 * @returns The relative luminance, or `null` when the colour could not be parsed.
 */
export function relativeLuminance(color: HubColor): number | null {
	const rgb = toRgb(color);
	if (!rgb) {
		return null;
	}
	return 0.2126 * linearise(rgb.r) + 0.7152 * linearise(rgb.g) + 0.0722 * linearise(rgb.b);
}

/**
 * Composites a translucent foreground over an opaque background, in sRGB.
 *
 * Kept simple on purpose: it matches what a browser does for a plain `background-color`
 * stack, which is the only case the contrast helpers need.
 */
export function compositeOver(foreground: HubColor, background: HubColor): HubColor {
	const fg = toRgb(foreground);
	const bg = toRgb(background);
	if (!fg || !bg) {
		return foreground;
	}
	if (fg.a >= 1) {
		return fg;
	}
	return {
		r: bg.r + (fg.r - bg.r) * fg.a,
		g: bg.g + (fg.g - bg.g) * fg.a,
		b: bg.b + (fg.b - bg.b) * fg.a,
		a: 1
	};
}

/**
 * WCAG 2 contrast ratio between two colours, from 1 (identical) to 21 (black on white).
 *
 * The thresholds that matter: 4.5 for body text at AA, 3 for large text and UI components,
 * 7 for AAA.
 *
 * @param a First colour.
 * @param b Second colour.
 * @returns The ratio, or `null` when either colour could not be parsed.
 */
export function contrastRatio(a: HubColor, b: HubColor): number | null {
	const first = relativeLuminance(a);
	const second = relativeLuminance(b);
	if (first === null || second === null) {
		return null;
	}
	return first > second ? (first + 0.05) / (second + 0.05) : (second + 0.05) / (first + 0.05);
}

const APCA_W_OFFSET = 0.027;
const APCA_P_IN = 0.0005;
const APCA_P_OUT = 0.1;
const APCA_R_SCALE = 1.14;
const APCA_B_THRESHOLD = 0.022;
const APCA_B_EXP = 1.414;

/** APCA's own luminance, which differs from WCAG's in both exponent and channel handling. */
function apcaLuminance(r: number, g: number, b: number): number {
	return 0.2126729 * Math.pow(r / 255, 2.4) + 0.7151522 * Math.pow(g / 255, 2.4) + 0.072175 * Math.pow(b / 255, 2.4);
}

/**
 * APCA (Accessible Perceptual Contrast Algorithm) lightness contrast, roughly -108 to 106.
 *
 * Unlike the WCAG ratio it is polarity-aware — dark-on-light and light-on-dark of the same
 * pair score differently — which is why it predicts real readability better, particularly
 * for the mid-lightness accents this design system is full of. The sign carries the
 * polarity; compare `Math.abs()` against a threshold (60 is a common floor for body text).
 *
 * APCA is still a draft, so treat the number as guidance rather than as a conformance claim.
 *
 * @param text The text colour. A translucent value is composited over `background` first.
 * @param background The background colour.
 * @returns The APCA score, or `null` when either colour could not be parsed.
 */
export function contrastAPCA(text: HubColor, background: HubColor): number | null {
	const bg = toRgb(background);
	if (!bg) {
		return null;
	}
	const fg = toRgb(compositeOver(text, bg));
	if (!fg) {
		return null;
	}

	const rawText = apcaLuminance(fg.r, fg.g, fg.b);
	const rawBg = apcaLuminance(bg.r, bg.g, bg.b);

	// Soft-clamp near-black levels, where the power curve would otherwise overstate contrast.
	const yText = rawText >= APCA_B_THRESHOLD ? rawText : rawText + Math.pow(APCA_B_THRESHOLD - rawText, APCA_B_EXP);
	const yBg = rawBg >= APCA_B_THRESHOLD ? rawBg : rawBg + Math.pow(APCA_B_THRESHOLD - rawBg, APCA_B_EXP);

	const normalPolarity = Math.pow(yBg, 0.56) - Math.pow(yText, 0.57);
	const reversePolarity = Math.pow(yBg, 0.65) - Math.pow(yText, 0.62);

	const contrast =
		Math.abs(yBg - yText) < APCA_P_IN ? 0 : yText < yBg ? normalPolarity * APCA_R_SCALE : reversePolarity * APCA_R_SCALE;

	const scaled = Math.abs(contrast) < APCA_P_OUT ? 0 : contrast > 0 ? contrast - APCA_W_OFFSET : contrast + APCA_W_OFFSET;

	return scaled * 100;
}

/** The two ends every readable-foreground decision picks between. */
const INK = '#000000';
const PAPER = '#ffffff';

/**
 * The perceptual lightness above which a surface takes dark ink.
 *
 * Must stay in step with the `--hub-sys-color-*-on` token, which computes the same decision
 * in CSS as `oklch(from … clamp(0, (0.62 - l) * 1000, 1) 0 h)`. If the two ever diverge, the
 * same accent gets one ink colour from the stylesheet and another from TypeScript.
 */
export const HUB_INK_LIGHTNESS_THRESHOLD = 0.62;

/**
 * Picks black or white — whichever reads better on the given background.
 *
 * Defaults to `'lightness'`: a threshold on OKLCh perceptual lightness, which is exactly what
 * the `--hub-sys-color-*-on` token computes in CSS. Choosing it over the WCAG ratio is not a
 * preference but a measured decision — maximising the WCAG 2 ratio puts **black** text on the
 * design system's own blue, green and red accents, because that formula underweights blue at
 * mid lightness. APCA agrees with the lightness rule on all nine semantic roles; WCAG disagrees
 * on three of them.
 *
 * Unparseable input yields black, the safer default on the light surfaces this library assumes.
 *
 * @param background The surface the text will sit on.
 * @param metric `'lightness'` (default) matches the design-system token; `'apca'` maximises the
 * APCA score; `'wcag'` maximises the WCAG 2 ratio — correct for conformance arithmetic, but a
 * poor predictor of what actually reads well on a saturated accent.
 * @returns `'#000000'` or `'#ffffff'`.
 */
export function readableOn(background: HubColor, metric: 'lightness' | 'apca' | 'wcag' = 'lightness'): string {
	const rgb = toRgb(background);
	if (!rgb) {
		return INK;
	}

	if (metric === 'lightness') {
		return rgbToOklch(rgb).l >= HUB_INK_LIGHTNESS_THRESHOLD ? INK : PAPER;
	}

	const score = (foreground: string) =>
		metric === 'apca' ? Math.abs(contrastAPCA(foreground, rgb) ?? 0) : (contrastRatio(foreground, rgb) ?? 0);

	return score(PAPER) > score(INK) ? PAPER : INK;
}
