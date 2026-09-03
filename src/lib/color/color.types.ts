/**
 * An sRGB colour with straight (non-premultiplied) alpha.
 *
 * Channels are kept in the 0-255 range rather than normalised to 0-1 because every
 * consumer here either came from or is heading back to a CSS string, and rounding once
 * on the way out beats rounding on every operation.
 */
export interface HubRgb {
	r: number;
	g: number;
	b: number;
	/** Alpha in the 0-1 range. Fully opaque colours carry `1`. */
	a: number;
}

/**
 * A colour in the OKLCh cylindrical space: perceptual lightness, chroma and hue.
 *
 * OKLCh is the space the design system already mixes in (`color-mix(in oklch, …)`), so
 * deriving palettes here keeps JS-side maths and CSS-side maths in agreement.
 */
export interface HubOklch {
	/** Perceptual lightness, 0-1. */
	l: number;
	/** Chroma. Unbounded in theory; roughly 0-0.37 for colours that fit in sRGB. */
	c: number;
	/** Hue angle in degrees, 0-360. */
	h: number;
	/** Alpha in the 0-1 range. */
	a: number;
}

/** Anything the colour helpers accept: a CSS colour string or an already-parsed {@link HubRgb}. */
export type HubColor = string | HubRgb;
