import * as publicApi from '../public-api';

/**
 * No directive of this package may claim a bare attribute.
 *
 * An unprefixed selector such as `[tooltip]` is a name in the application's own namespace,
 * not the library's. Angular hands one attribute to every directive on the element that
 * declares an input of that name, so a consumer who wants their own `tooltip` — or a sibling
 * component that already owns a `tooltip` input, as `<hub-badge>` does — collides with a
 * library they did not ask to negotiate with, and the collision is a compile error rather
 * than something they can style around.
 *
 * This is written over the whole entry point on purpose. Deleting the one directive that
 * broke the rule fixes today; the check is what stops the next one being added.
 *
 * The same argument holds for a pipe's template name, and it used to be waved away here on
 * the grounds that pipe names live in their own namespace. They do — the consumer's namespace.
 * `translate` is the name transloco and ngx-translate give their own pipe, and `get` is a word
 * any application may want; so the pipes are checked too, with the pre-22.16.0 spellings named
 * one by one as the aliases that survive until 23.0.0 removes them.
 */
const PREFIX = 'hub';

/**
 * Unprefixed pipe names still exported as deprecated aliases of their `hub*` spelling.
 *
 * `ucfirst` is on the list without a replacement of its own: `ng-hub-ui-forms` already ships a
 * pipe named `hubUcfirst` with a different rule, so a second one here would leave the family
 * with two pipes of the same name. Which package owns it is still open.
 */
const DEPRECATED_PIPE_NAMES = ['get', 'isObject', 'isObservable', 'isString', 'translate', 'ucfirst', 'unwrapAsync'];

/** Angular's compiled definition for a directive or a component, whichever the symbol is. */
interface CompiledSelectors {
	readonly selectors: readonly (readonly (string | number)[])[];
}

/**
 * Every exported directive/component paired with the CSS selectors it matches.
 *
 * Reads Angular's own compiled `ɵdir` / `ɵcmp` definition rather than a hand-kept list, so a
 * directive added to the entry point tomorrow is covered without anyone remembering to add it.
 */
const declarations = (): { name: string; selectors: readonly (readonly (string | number)[])[] }[] =>
	Object.entries(publicApi as Record<string, unknown>)
		.map(([name, symbol]) => {
			const def = ((symbol as Record<string, unknown>)?.['ɵdir'] ?? (symbol as Record<string, unknown>)?.['ɵcmp']) as
				CompiledSelectors | undefined;

			return def ? { name, selectors: def.selectors } : null;
		})
		.filter((entry): entry is { name: string; selectors: readonly (readonly (string | number)[])[] } => entry !== null);

describe('the public directive selectors of ng-hub-ui-utils', () => {
	it('finds directives to check at all, so an empty list cannot pass as a clean bill', () => {
		expect(declarations().length).toBeGreaterThan(0);
	});

	it('claims no bare attribute, which would be a name in the consumer namespace', () => {
		const offenders: string[] = [];

		declarations().forEach(({ name, selectors }) => {
			selectors.forEach((selector) => {
				// A compiled selector is [element, attr, value, attr, value, …]; an empty
				// element slot means the directive matches by attribute alone.
				const [element, ...attributes] = selector;

				for (let index = 0; index < attributes.length; index += 2) {
					const attribute = String(attributes[index]);

					if (attribute && !attribute.toLowerCase().startsWith(PREFIX)) {
						offenders.push(`${name} matches [${attribute}]${element ? ` on <${element}>` : ''}`);
					}
				}
			});
		});

		expect(offenders).toEqual([]);
	});
});

/** Angular's compiled definition for a pipe. */
interface CompiledPipe {
	readonly name: string;
}

/** Every exported pipe paired with the template name it answers to. */
const pipes = (): { symbol: string; name: string }[] =>
	Object.entries(publicApi as Record<string, unknown>)
		.map(([symbol, value]) => {
			const def = (value as Record<string, unknown>)?.['ɵpipe'] as CompiledPipe | undefined;

			return def ? { symbol, name: def.name } : null;
		})
		.filter((entry): entry is { symbol: string; name: string } => entry !== null);

describe('the public pipe names of ng-hub-ui-utils', () => {
	it('finds pipes to check at all, so an empty list cannot pass as a clean bill', () => {
		expect(pipes().length).toBeGreaterThan(0);
	});

	it('claims no unprefixed name beyond the aliases kept until 23.0.0', () => {
		const offenders = pipes()
			.filter(({ name }) => !name.startsWith(PREFIX) && !DEPRECATED_PIPE_NAMES.includes(name))
			.map(({ symbol, name }) => `${symbol} answers to |${name}`);

		expect(offenders).toEqual([]);
	});

	it('gives every kept alias a prefixed name to move to, so the deprecation has a destination', () => {
		const names = pipes().map(({ name }) => name);
		// `ucfirst` is the documented exception: `ng-hub-ui-forms` holds `hubUcfirst`.
		const orphans = DEPRECATED_PIPE_NAMES.filter((name) => name !== 'ucfirst')
			.filter((name) => names.includes(name))
			.filter((name) => !names.includes(`${PREFIX}${name[0].toUpperCase()}${name.slice(1)}`));

		expect(orphans).toEqual([]);
	});
});
