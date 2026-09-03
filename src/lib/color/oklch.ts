import { HubOklch, HubRgb } from './color.types';

/**
 * Conversions between sRGB and OKLab / OKLCh, using Björn Ottosson's matrices.
 *
 * @see https://bottosson.github.io/posts/oklab/
 */

/** Expands an sRGB channel (0-255) to its linear-light value (0-1). */
function toLinear(channel: number): number {
	const v = channel / 255;
	return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Compresses a linear-light value (0-1) back to an sRGB channel (0-255), unclamped. */
function fromLinear(value: number): number {
	const v = value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
	return v * 255;
}

/** Converts an sRGB colour to OKLCh. Alpha is carried through untouched. */
export function rgbToOklch({ r, g, b, a }: HubRgb): HubOklch {
	const lr = toLinear(r);
	const lg = toLinear(g);
	const lb = toLinear(b);

	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

	const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

	const hue = (Math.atan2(okB, okA) * 180) / Math.PI;

	return { l: okL, c: Math.hypot(okA, okB), h: hue < 0 ? hue + 360 : hue, a };
}

/**
 * Converts OKLCh to sRGB **without** gamut mapping: channels outside 0-255 are returned
 * as-is so callers can detect the overflow. Use {@link isInSrgbGamut} to test, or
 * {@link clampToSrgbGamut} to reduce chroma until the colour fits.
 */
export function oklchToRgb({ l, c, h, a }: HubOklch): HubRgb {
	const rad = (h * Math.PI) / 180;
	const okA = c * Math.cos(rad);
	const okB = c * Math.sin(rad);

	const lCube = Math.pow(l + 0.3963377774 * okA + 0.2158037573 * okB, 3);
	const mCube = Math.pow(l - 0.1055613458 * okA - 0.0638541728 * okB, 3);
	const sCube = Math.pow(l - 0.0894841775 * okA - 1.291485548 * okB, 3);

	return {
		r: fromLinear(4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube),
		g: fromLinear(-1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube),
		b: fromLinear(-0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube),
		a
	};
}

/** Whether an OKLCh colour survives the trip to sRGB without any channel overflowing. */
export function isInSrgbGamut(color: HubOklch): boolean {
	const { r, g, b } = oklchToRgb(color);
	return [r, g, b].every((channel) => channel >= -0.02 && channel <= 255.02);
}

/**
 * The highest chroma the given hue can reach at the given lightness inside sRGB.
 *
 * The gamut is not a cylinder — at L 0.578 blue reaches ~0.23 while amber stops at ~0.12 —
 * so a palette that assigns every role the same absolute chroma cannot be built. Callers
 * scale against this ceiling instead.
 *
 * @param l Perceptual lightness, 0-1.
 * @param h Hue angle in degrees.
 * @returns The maximum in-gamut chroma, found by bisection.
 */
export function maxSrgbChroma(l: number, h: number): number {
	let low = 0;
	let high = 0.4;
	for (let i = 0; i < 32; i++) {
		const mid = (low + high) / 2;
		if (isInSrgbGamut({ l, c: mid, h, a: 1 })) {
			low = mid;
		} else {
			high = mid;
		}
	}
	return low;
}

/**
 * Reduces chroma until the colour fits in sRGB, preserving lightness and hue.
 *
 * Preferred over clipping the RGB channels, which shifts both hue and lightness in ways
 * that are visible precisely on the saturated brand colours this is most often used on.
 */
export function clampToSrgbGamut(color: HubOklch): HubOklch {
	if (isInSrgbGamut(color)) {
		return color;
	}
	return { ...color, c: maxSrgbChroma(color.l, color.h) };
}
