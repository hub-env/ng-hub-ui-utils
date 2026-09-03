import { contrastAPCA, contrastRatio, HUB_INK_LIGHTNESS_THRESHOLD, readableOn, relativeLuminance } from './contrast';
import { clampToSrgbGamut, isInSrgbGamut, maxSrgbChroma, oklchToRgb, rgbToOklch } from './oklch';
import { isValidColor, parseColor, toHex } from './parse';

describe('parseColor', () => {
	it('parses hex in every accepted length', () => {
		expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
		expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
		expect(parseColor('#f008')).toEqual({ r: 255, g: 0, b: 0, a: 136 / 255 });
		expect(parseColor('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 / 255 });
	});

	it('parses the CSS named colours and transparent', () => {
		expect(parseColor('rebeccapurple')).toEqual({ r: 102, g: 51, b: 153, a: 1 });
		expect(parseColor('GOLD')).toEqual({ r: 255, g: 215, b: 0, a: 1 });
		expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
	});

	it('rejects X11 names that are not valid CSS colours', () => {
		expect(parseColor('maroon2')).toBeNull();
		expect(parseColor('lightgoldenrod')).toBeNull();
		expect(parseColor('laserlemon')).toBeNull();
	});

	it('parses rgb() in modern and legacy syntax', () => {
		expect(parseColor('rgb(255 0 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
		expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
		expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
		expect(parseColor('rgb(255 0 0 / 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
		expect(parseColor('rgb(100% 0% 0%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
	});

	it('parses hsl() in modern and legacy syntax', () => {
		expect(toHex(parseColor('hsl(0 100% 50%)')!)).toBe('#ff0000');
		expect(toHex(parseColor('hsl(120, 100%, 50%)')!)).toBe('#00ff00');
		expect(toHex(parseColor('hsl(240deg 100% 50%)')!)).toBe('#0000ff');
		expect(parseColor('hsla(0, 100%, 50%, 0.25)')!.a).toBe(0.25);
	});

	it('accepts every CSS angle unit for hue', () => {
		const red = toHex(parseColor('hsl(0 100% 50%)')!);
		expect(toHex(parseColor('hsl(0.5turn 100% 50%)')!)).toBe(toHex(parseColor('hsl(180 100% 50%)')!));
		expect(toHex(parseColor('hsl(360deg 100% 50%)')!)).toBe(red);
		expect(toHex(parseColor('hsl(400grad 100% 50%)')!)).toBe(red);
	});

	it('parses oklch() and oklab()', () => {
		// The design system's own primary, round-tripped through OKLCh.
		expect(toHex(parseColor('oklch(0.578 0.228 260)')!)).toMatch(/^#[0-9a-f]{6}$/);
		expect(parseColor('oklch(70% 0.1 160 / 0.5)')!.a).toBe(0.5);
		expect(toHex(parseColor('oklab(0.628 0.225 0.126)')!)).toBe(toHex(parseColor('#ff0000')!));
	});

	it('treats the CSS-wide `none` keyword as zero', () => {
		expect(parseColor('rgb(none 0 0)')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
	});

	it('returns null instead of throwing on anything it cannot resolve', () => {
		expect(parseColor('var(--x)')).toBeNull();
		expect(parseColor('currentColor')).toBeNull();
		expect(parseColor('not-a-colour')).toBeNull();
		expect(parseColor('#12345')).toBeNull();
		expect(parseColor('rgb(1 2)')).toBeNull();
		expect(parseColor('')).toBeNull();
		expect(parseColor(null)).toBeNull();
		expect(parseColor(undefined)).toBeNull();
	});

	it('works without any DOM, so it is safe under server-side rendering', () => {
		// A guard rather than a demonstration: the parser must never reach for document.
		const documentSpy = vi.spyOn(globalThis, 'document', 'get');
		parseColor('hsl(210 50% 40%)');
		parseColor('cornflowerblue');
		expect(documentSpy).not.toHaveBeenCalled();
		documentSpy.mockRestore();
	});
});

describe('toHex', () => {
	it('round-trips opaque colours', () => {
		expect(toHex('#abcdef')).toBe('#abcdef');
		expect(toHex('rgb(13 110 253)')).toBe('#0d6efd');
		expect(toHex('rebeccapurple')).toBe('#663399');
	});

	it('appends the alpha pair only when the colour is translucent', () => {
		expect(toHex('rgba(255, 0, 0, 1)')).toBe('#ff0000');
		expect(toHex('rgba(255, 0, 0, 0.5)')).toBe('#ff000080');
	});

	it('returns null for unparseable input', () => {
		expect(toHex('var(--x)')).toBeNull();
	});
});

describe('isValidColor', () => {
	it('accepts resolvable colours and rejects cascade-dependent ones', () => {
		expect(isValidColor('gold')).toBe(true);
		expect(isValidColor('#0d6efd')).toBe(true);
		expect(isValidColor('oklch(0.7 0.1 160)')).toBe(true);
		expect(isValidColor('var(--hub-sys-color-primary)')).toBe(false);
		expect(isValidColor('nope')).toBe(false);
	});
});

describe('relativeLuminance', () => {
	it('anchors at the ends of the range', () => {
		expect(relativeLuminance('#000000')).toBeCloseTo(0, 6);
		expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 6);
	});
});

describe('contrastRatio', () => {
	it('spans 1 to 21', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 4);
		expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 6);
	});

	it('is symmetric', () => {
		expect(contrastRatio('#0d6efd', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#0d6efd')!, 10);
	});

	it('returns null when a colour cannot be parsed', () => {
		expect(contrastRatio('var(--x)', '#fff')).toBeNull();
	});
});

describe('contrastAPCA', () => {
	it('carries polarity in its sign', () => {
		expect(contrastAPCA('#000000', '#ffffff')).toBeGreaterThan(100);
		expect(contrastAPCA('#ffffff', '#000000')).toBeLessThan(-100);
	});

	it('composites translucent text over the background first', () => {
		const opaque = contrastAPCA('#000000', '#ffffff')!;
		const translucent = contrastAPCA('rgba(0, 0, 0, 0.5)', '#ffffff')!;
		expect(Math.abs(translucent)).toBeLessThan(Math.abs(opaque));
	});
});

describe('readableOn', () => {
	it('agrees with the --hub-sys-color-*-on token on every semantic role', () => {
		expect(readableOn('#0d6efd')).toBe('#ffffff'); // primary
		expect(readableOn('#6c757d')).toBe('#ffffff'); // secondary
		expect(readableOn('#198754')).toBe('#ffffff'); // success
		expect(readableOn('#dc3545')).toBe('#ffffff'); // danger
		expect(readableOn('#ffc107')).toBe('#000000'); // warning
		expect(readableOn('#0dcaf0')).toBe('#000000'); // info
		expect(readableOn('#f8f9fa')).toBe('#000000'); // light
		expect(readableOn('#212529')).toBe('#ffffff'); // dark
	});

	it('does not repeat the YIQ mistake of flipping to black on saturated accents', () => {
		// The old `r*.299 + g*.587 + b*.114 > 186` rule and the WCAG ratio disagree here;
		// the lightness rule sides with what the design system actually paints.
		expect(readableOn('#0d6efd', 'wcag')).toBe('#000000');
		expect(readableOn('#0d6efd', 'lightness')).toBe('#ffffff');
		expect(readableOn('#0d6efd', 'apca')).toBe('#ffffff');
	});

	it('falls back to black when the background cannot be parsed', () => {
		expect(readableOn('var(--x)')).toBe('#000000');
	});

	it('switches exactly at the documented lightness threshold', () => {
		const justBelow = oklchToRgb({ l: HUB_INK_LIGHTNESS_THRESHOLD - 0.01, c: 0, h: 0, a: 1 });
		const justAbove = oklchToRgb({ l: HUB_INK_LIGHTNESS_THRESHOLD + 0.01, c: 0, h: 0, a: 1 });
		expect(readableOn(justBelow)).toBe('#ffffff');
		expect(readableOn(justAbove)).toBe('#000000');
	});
});

describe('OKLCh conversions', () => {
	it('round-trips sRGB colours', () => {
		for (const hex of ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0', '#663399', '#ffffff', '#000000']) {
			expect(toHex(oklchToRgb(rgbToOklch(parseColor(hex)!)))).toBe(hex);
		}
	});

	it('measures the design system primary where it was measured by hand', () => {
		const { l, c, h } = rgbToOklch(parseColor('#0d6efd')!);
		expect(l).toBeCloseTo(0.578, 2);
		expect(c).toBeCloseTo(0.228, 2);
		expect(h).toBeCloseTo(260, 0);
	});

	it('reports that the gamut is not a cylinder', () => {
		// The reason a palette cannot give every role the brand's chroma: at one lightness,
		// blue reaches roughly twice the chroma amber can.
		const lightness = 0.578;
		expect(maxSrgbChroma(lightness, 260)).toBeGreaterThan(0.22);
		expect(maxSrgbChroma(lightness, 85)).toBeLessThan(0.13);
	});

	it('clamps out-of-gamut chroma without moving lightness or hue', () => {
		const excessive = { l: 0.578, c: 0.35, h: 85, a: 1 };
		expect(isInSrgbGamut(excessive)).toBe(false);

		const clamped = clampToSrgbGamut(excessive);
		expect(clamped.l).toBe(excessive.l);
		expect(clamped.h).toBe(excessive.h);
		expect(clamped.c).toBeLessThan(excessive.c);
		expect(isInSrgbGamut(clamped)).toBe(true);
	});

	it('leaves in-gamut colours untouched', () => {
		const inGamut = { l: 0.578, c: 0.1, h: 85, a: 1 };
		expect(clampToSrgbGamut(inGamut)).toBe(inGamut);
	});
});
