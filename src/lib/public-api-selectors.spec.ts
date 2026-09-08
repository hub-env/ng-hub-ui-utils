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
 * Pipes are out of scope here: their names live in a separate namespace and no pipe in this
 * package has been reported to collide.
 */
const PREFIX = 'hub';

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
