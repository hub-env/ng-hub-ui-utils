import { HubColor, HubRgb } from './color.types';
import { HUB_NAMED_COLORS } from './named-colors';
import { oklchToRgb } from './oklch';

const HEX_PATTERN = /^#([0-9a-f]{3,8})$/;
const FUNCTION_PATTERN = /^([a-z]+)\((.*)\)$/;

/** Constrains a value to a range, used on the way out so callers never see an out-of-range channel. */
function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Reads one numeric component.
 *
 * `none` resolves to 0 per CSS Color 4, and a percentage is scaled by `percentBase` —
 * which differs per channel, so the caller supplies it (255 for rgb, 100 for hsl, 1 for
 * an OKLCh lightness).
 *
 * @returns The parsed number, or `null` when the token is not a number at all.
 */
function readNumber(token: string, percentBase: number): number | null {
	if (token === 'none') {
		return 0;
	}
	const isPercentage = token.endsWith('%');
	const parsed = Number.parseFloat(isPercentage ? token.slice(0, -1) : token);
	if (Number.isNaN(parsed)) {
		return null;
	}
	return isPercentage ? (parsed / 100) * percentBase : parsed;
}

/** Reads a hue angle, honouring the four CSS angle units and normalising to 0-360 degrees. */
function readHue(token: string): number | null {
	if (token === 'none') {
		return 0;
	}
	const match = /^(-?[\d.]+)(deg|rad|turn|grad)?$/.exec(token);
	if (!match) {
		return null;
	}
	const value = Number.parseFloat(match[1]);
	const degrees =
		match[2] === 'rad'
			? (value * 180) / Math.PI
			: match[2] === 'turn'
				? value * 360
				: match[2] === 'grad'
					? value * 0.9
					: value;
	return ((degrees % 360) + 360) % 360;
}

/** Reads an alpha component, accepting both `0.5` and `50%`. Missing alpha means opaque. */
function readAlpha(token: string | undefined): number | null {
	if (token === undefined) {
		return 1;
	}
	const parsed = readNumber(token, 1);
	return parsed === null ? null : clamp(parsed, 0, 1);
}

/**
 * Splits a colour function's argument list into components plus an optional alpha.
 *
 * Handles the modern (`0 0 0 / 50%`) and legacy (`0, 0, 0, 0.5`) syntaxes in one pass, so
 * every colour function below is spared knowing which of the two it was given.
 */
function splitComponents(body: string): { components: string[]; alpha: string | undefined } {
	const [values, slashAlpha] = body.split('/');
	const components = values
		.trim()
		.split(/[\s,]+/)
		.filter(Boolean);

	if (slashAlpha !== undefined) {
		return { components, alpha: slashAlpha.trim() };
	}
	// Legacy `rgba()` / `hsla()` carry alpha as a fourth comma-separated component.
	return components.length === 4
		? { components: components.slice(0, 3), alpha: components[3] }
		: { components, alpha: undefined };
}

/** Converts an HSL triplet (hue in degrees, saturation and lightness 0-1) to sRGB channels. */
function hslToRgbChannels(h: number, s: number, l: number): [number, number, number] {
	const chroma = (1 - Math.abs(2 * l - 1)) * s;
	const sector = h / 60;
	const secondary = chroma * (1 - Math.abs((sector % 2) - 1));
	const offset = l - chroma / 2;

	const rgb: [number, number, number] =
		sector < 1
			? [chroma, secondary, 0]
			: sector < 2
				? [secondary, chroma, 0]
				: sector < 3
					? [0, chroma, secondary]
					: sector < 4
						? [0, secondary, chroma]
						: sector < 5
							? [secondary, 0, chroma]
							: [chroma, 0, secondary];

	return [(rgb[0] + offset) * 255, (rgb[1] + offset) * 255, (rgb[2] + offset) * 255];
}

/** Expands `#rgb`, `#rgba`, `#rrggbb` and `#rrggbbaa` into channels. */
function parseHex(digits: string): HubRgb | null {
	const expanded =
		digits.length === 3 || digits.length === 4
			? digits
					.split('')
					.map((digit) => digit + digit)
					.join('')
			: digits;

	if (expanded.length !== 6 && expanded.length !== 8) {
		return null;
	}

	const channel = (index: number) => Number.parseInt(expanded.slice(index * 2, index * 2 + 2), 16);

	return {
		r: channel(0),
		g: channel(1),
		b: channel(2),
		a: expanded.length === 8 ? channel(3) / 255 : 1
	};
}

/**
 * Parses any CSS colour string into sRGB channels, with no DOM involved.
 *
 * Accepts hex (3/4/6/8 digits), `rgb()`/`rgba()`, `hsl()`/`hsla()`, `oklch()`, `oklab()`,
 * the 148 CSS named colours and `transparent`, in both modern and legacy syntax. Anything
 * else — including `var(...)`, `currentColor` and CIE `lab()`/`lch()` — returns `null`
 * rather than throwing, because every caller here has a sensible fallback and none of them
 * can act on an exception.
 *
 * Colours outside the sRGB gamut (an `oklch()` with excess chroma) come back clamped per
 * channel; use the OKLCh helpers directly when the overflow itself matters.
 *
 * @param value The CSS colour string.
 * @returns The parsed colour, or `null` when the string is not a resolvable colour.
 */
export function parseColor(value: string | null | undefined): HubRgb | null {
	const input = value?.trim().toLowerCase();
	if (!input) {
		return null;
	}

	if (input === 'transparent') {
		return { r: 0, g: 0, b: 0, a: 0 };
	}

	const named = HUB_NAMED_COLORS[input];
	if (named) {
		return parseHex(named.slice(1));
	}

	const hex = HEX_PATTERN.exec(input);
	if (hex) {
		return parseHex(hex[1]);
	}

	const fn = FUNCTION_PATTERN.exec(input);
	if (!fn) {
		return null;
	}

	const [, name, body] = fn;
	const { components, alpha: rawAlpha } = splitComponents(body);
	const alpha = readAlpha(rawAlpha);

	if (alpha === null || components.length !== 3) {
		return null;
	}

	if (name === 'rgb' || name === 'rgba') {
		const channels = components.map((component) => readNumber(component, 255));
		if (channels.some((channel) => channel === null)) {
			return null;
		}
		const [r, g, b] = channels as number[];
		return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: alpha };
	}

	if (name === 'hsl' || name === 'hsla') {
		const h = readHue(components[0]);
		const s = readNumber(components[1], 1);
		const l = readNumber(components[2], 1);
		if (h === null || s === null || l === null) {
			return null;
		}
		const [r, g, b] = hslToRgbChannels(h, clamp(s, 0, 1), clamp(l, 0, 1));
		return { r, g, b, a: alpha };
	}

	if (name === 'oklch' || name === 'oklab') {
		// Percentages on the chroma and a/b axes are relative to a 0.4 reference per CSS Color 4.
		const l = readNumber(components[0], 1);
		const second = readNumber(components[1], 0.4);
		const third = name === 'oklch' ? readHue(components[2]) : readNumber(components[2], 0.4);
		if (l === null || second === null || third === null) {
			return null;
		}

		const polar =
			name === 'oklch'
				? { c: second, h: third }
				: { c: Math.hypot(second, third), h: ((Math.atan2(third, second) * 180) / Math.PI + 360) % 360 };

		const { r, g, b } = oklchToRgb({ l, c: polar.c, h: polar.h, a: alpha });
		return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: alpha };
	}

	return null;
}

/**
 * Normalises any accepted colour to a {@link HubRgb}, so helpers can take strings or
 * already-parsed colours without each of them repeating the check.
 */
export function toRgb(color: HubColor): HubRgb | null {
	return typeof color === 'string' ? parseColor(color) : color;
}

/**
 * Renders a colour as a `#rrggbb` hex string, or `#rrggbbaa` when it is translucent.
 *
 * @param color A CSS colour string or parsed colour.
 * @returns The hex string, or `null` when the input could not be parsed.
 */
export function toHex(color: HubColor): string | null {
	const rgb = toRgb(color);
	if (!rgb) {
		return null;
	}

	const pair = (channel: number) =>
		Math.round(clamp(channel, 0, 255))
			.toString(16)
			.padStart(2, '0');

	const alpha = rgb.a < 1 ? pair(rgb.a * 255) : '';
	return `#${pair(rgb.r)}${pair(rgb.g)}${pair(rgb.b)}${alpha}`;
}

/**
 * Whether a string is a colour this parser can resolve.
 *
 * Note this is narrower than "valid CSS": `var(--x)` and `currentColor` are valid in a
 * stylesheet but have no value outside the cascade, so they are reported as invalid here.
 */
export function isValidColor(value: string | null | undefined): boolean {
	return parseColor(value) !== null;
}
