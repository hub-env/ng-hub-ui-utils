import { effect, NgZone, Signal, signal } from '@angular/core';
import { Observable, OperatorFunction } from 'rxjs';

/**
 * Converts a value to an integer using parseInt.
 *
 * @param {any} value - The `value` parameter in the `toInteger` function is the input value that needs to be converted to an
 * integer.
 *
 * @returns Is returning the parsed integer value of the input `value`.
 */
export function toInteger(value: any): number {
	return parseInt(`${value}`, 10);
}

export function toString(value: any): string {
	return value !== undefined && value !== null ? `${value}` : '';
}

export function getValueInRange(value: number, max: number, min = 0): number {
	return Math.max(Math.min(value, max), min);
}

export function isString(value: any): value is string {
	return typeof value === 'string';
}

export function isNumber(value: any): value is number {
	return !isNaN(toInteger(value));
}

export function isInteger(value: any): value is number {
	return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
}

export function isDefined(value: any): boolean {
	return value !== undefined && value !== null;
}

/**
 * Determines if two objects or values are equivalent.
 *
 * @param o1 Object or value to compare.
 * @param o2 Object or value to compare.
 * @returns true if arguments are equal.
 */
export function equals(o1: any, o2: any): boolean {
	if (o1 === o2) {
		return true;
	}
	if (o1 === null || o2 === null) {
		return false;
	}
	if (o1 !== o1 && o2 !== o2) {
		return true;
	} // NaN === NaN
	let t1 = typeof o1,
		t2 = typeof o2,
		length: number,
		key: any,
		keySet: any;
	if (t1 == t2 && t1 == 'object') {
		if (Array.isArray(o1)) {
			if (!Array.isArray(o2)) {
				return false;
			}
			if ((length = o1.length) == o2.length) {
				for (key = 0; key < length; key++) {
					if (!equals(o1[key], o2[key])) {
						return false;
					}
				}
				return true;
			}
		} else {
			if (Array.isArray(o2)) {
				return false;
			}
			keySet = Object.create(null);
			for (key in o1) {
				if (!equals(o1[key], o2[key])) {
					return false;
				}
				keySet[key] = true;
			}
			for (key in o2) {
				if (!(key in keySet) && typeof o2[key] !== 'undefined') {
					return false;
				}
			}
			return true;
		}
	}
	return false;
}

/**
 * Checks if a value is a Promise.
 *
 * @param {any} v - The parameter `v` in the `isPromise` function represents any value that is being checked to determine if it is
 * a Promise.
 *
 * @returns A boolean value indicating whether the input `v` is a Promise or not. If `v` has a `then` property, it is considered
 * a Promise and the function returns `true`. Otherwise, it returns `false`.
 */
export function isPromise<T>(v: any): v is Promise<T> {
	return v && v.then;
}

/**
 * Pads a number with a leading zero if it is a valid number.
 *
 * @param {number} value - The `padNumber` function takes a number as input and pads it with a leading zero if it is a valid
 * number. If the input is not a number, it returns an empty string.
 *
 * @returns Takes a number as input and pads it with a leading zero if it is a valid number. If the input is a number, the function
 * returns the input value padded with a leading zero and sliced to keep only the last two characters. If the input is not a number,
 * an empty string is returned.
 */
export function padNumber(value: number) {
	if (isNumber(value)) {
		return `0${value}`.slice(-2);
	} else {
		return '';
	}
}

/**
 * Escapes special characters in a given text to be used in a regular expression.
 *
 * @param text - The `regExpEscape` function takes a `text` parameter as input. This function is designed to escape special
 * characters in a given text so that it can be safely used within a regular expression pattern.
 *
 * @returns A new string with any special characters in the input `text` escaped with a backslash.
 */
export function regExpEscape(text: string): string {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function closest(element: HTMLElement, selector?: string): HTMLElement | null {
	if (!selector) {
		return null;
	}

	/*
	 * In certain browsers (e.g. Edge 44.18362.449.0) HTMLDocument does
	 * not support `Element.prototype.closest`. To emulate the correct behaviour
	 * we return null when the method is missing.
	 *
	 * Note that in evergreen browsers `closest(document.documentElement, 'html')`
	 * will return the document element whilst in Edge null will be returned. This
	 * compromise was deemed good enough.
	 */
	if (typeof element.closest === 'undefined') {
		return null;
	}

	return element.closest(selector);
}

/**
 * Force a browser reflow
 *
 * @param element element where to apply the reflow
 */
export function reflow(element: HTMLElement) {
	return (element || document.body).getBoundingClientRect();
}

/**
 * Creates an observable where all callbacks are executed inside a given zone
 *
 * @param zone
 */
export function runInZone<T>(zone: NgZone): OperatorFunction<T, T> {
	return (source) => {
		return new Observable((observer) => {
			const next = (value: T) => zone.run(() => observer.next(value));
			const error = (e: any) => zone.run(() => observer.error(e));
			const complete = () => zone.run(() => observer.complete());
			return source.subscribe({ next, error, complete });
		});
	};
}

export function removeAccents(str: string): string {
	return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Replaces placeholders in a string with corresponding values from a given object.
 *
 * @param expr a string that represents the expression to be interpolated.
 * @param params an optional object that contains the values to be interpolated into the expr string.
 * @returns the interpolated string.
 */
export function interpolateString(expr: string = '', params: any = {}, templateMatcher: RegExp = /{{\s?([^{}\s]*)\s?}}/g) {
	if (!params) {
		return expr;
	}

	return expr.replace(templateMatcher, (substring: string, b: string) => {
		let r = getValue(params, b);
		return isDefined(r) ? r : substring;
	});
}

/**
 * Retrieves the value of a nested property from an object using dot notation.
 *
 * @param target the object from which you want to retrieve a value.
 * @param key a string that represents the property or nested properties of the target object.
 * @returns the value of the specified key in the target object.
 */
export function getValue(target: any, key: string): any {
	let keys = typeof key === 'string' ? key.split('.') : [key];
	key = '';
	do {
		key += keys.shift();
		if (isDefined(target) && isDefined(target[key]) && (typeof target[key] === 'object' || !keys.length)) {
			target = target[key];
			key = '';
		} else if (!keys.length) {
			target = undefined;
		} else {
			key += '.';
		}
	} while (keys.length);

	return target;
}

/**
 * Checks if the given item is a plain object (not an array, null, or primitive).
 *
 * @param item Value to test.
 * @returns true when item is a non-null, non-array object.
 */
export function isObject(item: any): boolean {
	return item !== null && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Recursively deep-merges source into target, producing a new object.
 * Arrays are replaced, not merged. Primitives from source win.
 *
 * @param target Base object.
 * @param source Overrides to apply on top of target.
 * @returns New merged object.
 */
export function mergeDeep(target: any, source: any): any {
	const output = Object.assign({}, target);
	if (isObject(target) && isObject(source)) {
		Object.keys(source).forEach((key: any) => {
			if (isObject(source[key])) {
				if (!(key in target)) {
					Object.assign(output, { [key]: source[key] });
				} else {
					output[key] = mergeDeep(target[key], source[key]);
				}
			} else {
				Object.assign(output, { [key]: source[key] });
			}
		});
	}
	return output;
}

/**
 * Generates a random alphanumeric string of the requested length.
 * Not cryptographically secure — intended for transient DOM ids and keys.
 *
 * @param length Desired character count.
 * @returns Random alphanumeric string.
 */
export function generateUniqueId(length: number): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

/**
 * Creates a read-only signal that mirrors sourceSignal but only updates
 * after debounceDelay ms have elapsed since the last emission.
 * Cleans up the pending timer via the Angular effect cleanup mechanism.
 *
 * @template T Type of the signal value.
 * @param sourceSignal Signal to debounce.
 * @param debounceDelay Milliseconds to wait, or a signal that provides the delay.
 * @returns Debounced read-only signal.
 */
export function debouncedSignal<T>(sourceSignal: Signal<T>, debounceDelay: number | Signal<number> = 0): Signal<T> {
	const debounced = signal(sourceSignal());

	effect((onCleanup) => {
		const delay = typeof debounceDelay === 'number' ? debounceDelay : debounceDelay();
		const value = sourceSignal();

		const timeout = setTimeout(() => {
			debounced.set(value);
		}, delay);

		onCleanup(() => clearTimeout(timeout));
	});

	return debounced;
}

/**
 * Returns the active element in the given root.
 *
 * If the active element is inside a shadow root, it is searched recursively.
 */
export function getActiveElement(root: Document | ShadowRoot = document): Element | null {
	const activeEl = root?.activeElement;

	if (!activeEl) {
		return null;
	}

	return activeEl.shadowRoot ? getActiveElement(activeEl.shadowRoot) : activeEl;
}
